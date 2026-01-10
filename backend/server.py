from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi import status as http_status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
from enum import Enum
import aiohttp
import asyncio
import json
from decimal import Decimal
import shutil
import pandas as pd
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI(title="Import & Container Management System - Complete")
api_router = APIRouter(prefix="/api")

# Static files for document serving
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Enhanced Enums
class UserRole(str, Enum):
    OWNER = "Owner"
    LOGISTICS = "Logistics"
    ACCOUNTS = "Accounts"
    PURCHASE = "Purchase"

class Permission(str, Enum):
    VIEW_DASHBOARD = "view_dashboard"
    MANAGE_MASTERS = "manage_masters"
    CREATE_ORDERS = "create_orders"
    VIEW_ORDERS = "view_orders"
    EDIT_ORDERS = "edit_orders"
    MANAGE_PAYMENTS = "manage_payments"
    VIEW_FINANCIALS = "view_financials"
    MANAGE_DOCUMENTS = "manage_documents"
    VIEW_ANALYTICS = "view_analytics"
    SYSTEM_ADMIN = "system_admin"

class ContainerType(str, Enum):
    TWENTY_FT = "20FT"
    FORTY_FT = "40FT"
    FORTY_HC = "40HC"

class OrderStatus(str, Enum):
    DRAFT = "Draft"
    TENTATIVE = "Tentative"
    CONFIRMED = "Confirmed"
    LOADED = "Loaded"
    SHIPPED = "Shipped"
    IN_TRANSIT = "In Transit"
    ARRIVED = "Arrived"
    CUSTOMS = "Customs Clearance"
    CLEARED = "Cleared"
    DELIVERED = "Delivered"

class PaymentStatus(str, Enum):
    PENDING = "Pending"
    PARTIAL = "Partial"
    PAID = "Paid"
    OVERDUE = "Overdue"

class Currency(str, Enum):
    USD = "USD"
    CNY = "CNY"
    EUR = "EUR"
    INR = "INR"

class DocumentType(str, Enum):
    BILL_OF_LADING = "Bill of Lading"
    COMMERCIAL_INVOICE = "Commercial Invoice"
    PACKING_LIST = "Packing List"
    BILL_OF_ENTRY = "Bill of Entry"
    CERTIFICATE = "Certificate"
    OTHER = "Other"

# Role Permissions Mapping
ROLE_PERMISSIONS = {
    UserRole.OWNER: [p.value for p in Permission],  # All permissions
    UserRole.LOGISTICS: [
        Permission.VIEW_DASHBOARD.value,
        Permission.MANAGE_MASTERS.value,
        Permission.CREATE_ORDERS.value,
        Permission.VIEW_ORDERS.value,
        Permission.EDIT_ORDERS.value,
        Permission.MANAGE_DOCUMENTS.value,
        Permission.VIEW_ANALYTICS.value
    ],
    UserRole.ACCOUNTS: [
        Permission.VIEW_DASHBOARD.value,
        Permission.VIEW_ORDERS.value,
        Permission.MANAGE_PAYMENTS.value,
        Permission.VIEW_FINANCIALS.value,
        Permission.VIEW_ANALYTICS.value
    ],
    UserRole.PURCHASE: [
        Permission.VIEW_DASHBOARD.value,
        Permission.MANAGE_MASTERS.value,
        Permission.CREATE_ORDERS.value,
        Permission.VIEW_ORDERS.value,
        Permission.VIEW_ANALYTICS.value
    ]
}

# Enhanced Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    role: UserRole
    permissions: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: UserRole

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class SKU(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku_code: str
    description: str
    color: Optional[str] = None
    hsn_code: str
    micron: Optional[float] = None
    width_mm: Optional[float] = None  # Width in millimeters
    length_m: Optional[float] = None  # Length in meters
    weight_per_unit: float  # in KG
    cbm_per_unit: float  # cubic meter
    unit_cost: Optional[float] = None
    category: Optional[str] = None
    adhesive_type: Optional[str] = None
    liner_color: Optional[str] = None
    shipping_mark: Optional[str] = None
    marking: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SKUCreate(BaseModel):
    sku_code: str
    description: str
    color: Optional[str] = None
    hsn_code: str
    micron: Optional[float] = None
    width_mm: Optional[float] = None
    length_m: Optional[float] = None
    weight_per_unit: float
    cbm_per_unit: float
    unit_cost: Optional[float] = None
    category: Optional[str] = None
    adhesive_type: Optional[str] = None
    liner_color: Optional[str] = None
    shipping_mark: Optional[str] = None
    marking: Optional[str] = None

class SKUUpdate(BaseModel):
    sku_code: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    hsn_code: Optional[str] = None
    micron: Optional[float] = None
    width_mm: Optional[float] = None
    length_m: Optional[float] = None
    weight_per_unit: Optional[float] = None
    cbm_per_unit: Optional[float] = None
    unit_cost: Optional[float] = None
    category: Optional[str] = None
    adhesive_type: Optional[str] = None
    liner_color: Optional[str] = None
    shipping_mark: Optional[str] = None
    marking: Optional[str] = None

# System Settings Models
class SystemSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="system_settings")
    company_name: str = "ICMS Company"
    company_address: str = ""
    company_phone: str = ""
    company_email: str = ""
    logo_url: Optional[str] = None
    header_text: str = "PURCHASE ORDER"
    footer_text: str = "Thank you for your business"
    show_duty_rate_on_pdf: bool = False
    # Dropdown options
    categories: List[str] = Field(default_factory=lambda: ["Raw Materials", "Finished Goods", "Packaging", "Components", "Other"])
    adhesive_types: List[str] = Field(default_factory=lambda: ["Acrylic", "Rubber", "Silicone", "Hot Melt", "Water Based", "Solvent Based"])
    liner_colors: List[str] = Field(default_factory=lambda: ["Clear", "White", "Blue", "Red", "Green", "Yellow", "Black", "Brown"])
    shipping_marks: List[str] = Field(default_factory=lambda: ["Standard", "Fragile", "This Side Up", "Handle with Care", "Keep Dry"])
    order_statuses: List[str] = Field(default_factory=lambda: ["Draft", "Tentative", "Confirmed", "Loaded", "Shipped", "In Transit", "Arrived", "Delivered", "Cancelled"])
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SystemSettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    logo_url: Optional[str] = None
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    show_duty_rate_on_pdf: Optional[bool] = None
    categories: Optional[List[str]] = None
    adhesive_types: Optional[List[str]] = None
    liner_colors: Optional[List[str]] = None
    shipping_marks: Optional[List[str]] = None
    order_statuses: Optional[List[str]] = None

class Supplier(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    base_currency: Currency
    contact_email: str
    contact_phone: str
    address: str
    description: Optional[str] = None
    country: Optional[str] = None
    opening_balance: float = 0.0
    current_balance: float = 0.0
    payment_terms_days: int = 30  # Payment due in X days
    payment_terms_type: str = "NET"  # NET, COD, ADVANCE, LC
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupplierCreate(BaseModel):
    name: str
    code: str
    base_currency: Currency
    contact_email: str
    contact_phone: str
    address: str
    description: Optional[str] = None
    country: Optional[str] = None
    opening_balance: float = 0.0
    payment_terms_days: int = 30
    payment_terms_type: str = "NET"

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    base_currency: Optional[Currency] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    country: Optional[str] = None
    opening_balance: Optional[float] = None
    payment_terms_days: Optional[int] = None
    payment_terms_type: Optional[str] = None

class Port(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    country: str
    transit_days: int = 30
    demurrage_free_days: int = 7
    demurrage_rate: float = 50.0  # USD per day
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PortCreate(BaseModel):
    name: str
    code: str
    country: str
    transit_days: int = 30
    demurrage_free_days: int = 7
    demurrage_rate: float = 50.0

class PortUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    country: Optional[str] = None
    transit_days: Optional[int] = None
    demurrage_free_days: Optional[int] = None
    demurrage_rate: Optional[float] = None

class Container(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    container_type: ContainerType
    max_weight: float
    max_cbm: float
    freight_rate: float = 0.0  # USD per container
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContainerCreate(BaseModel):
    container_type: ContainerType
    max_weight: float
    max_cbm: float
    freight_rate: float = 0.0

class ContainerUpdate(BaseModel):
    container_type: Optional[ContainerType] = None
    max_weight: Optional[float] = None
    max_cbm: Optional[float] = None
    freight_rate: Optional[float] = None

class FXRate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_currency: Currency
    to_currency: Currency = Currency.INR  # Base currency
    rate: float
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = "exchangerate-api"

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    import_order_id: str
    supplier_id: str
    amount: float
    currency: Currency
    fx_rate: float
    inr_amount: float
    payment_date: datetime
    reference: str
    status: PaymentStatus = PaymentStatus.PENDING
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    import_order_id: str
    amount: float
    currency: Currency
    payment_date: datetime
    reference: str

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    import_order_id: str
    document_type: DocumentType
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    uploaded_by: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None

class ImportOrderItem(BaseModel):
    sku_id: str
    item_description: Optional[str] = None  # From PDF: ITEM field
    thickness: Optional[str] = None  # From PDF: "55 MIC", "200 MIC"
    size: Optional[str] = None  # From PDF: "500MM X 2000M"
    liner_color: Optional[str] = None  # From PDF: "AMBER", "DARK GREEN"
    adhesive_type: Optional[str] = None  # New field
    shipping_mark: Optional[str] = None  # New field
    marking: Optional[str] = None  # From PDF: ORDER NO MARKING
    quantity: int
    qty_per_carton: Optional[int] = None  # From PDF: QTY/CTN
    total_cartons: Optional[int] = None  # From PDF: TOTAL CTN
    total_rolls: Optional[int] = None  # From PDF: TOTAL ROLL
    unit_price: float
    price_per_sqm: Optional[float] = None  # From PDF: PRICE/SQM
    total_value: float
    kg_per_package: Optional[float] = None  # From PDF: KG PKG
    total_kg: Optional[float] = None  # From PDF: TOTAL KG
    code: Optional[str] = None  # From PDF: Product code like "IS-52314W-060TRHBWL"

class ImportOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    po_number: str
    supplier_id: str
    port_id: Optional[str] = None
    container_type: ContainerType
    currency: Currency
    items: List[ImportOrderItem]
    total_quantity: int
    total_weight: float
    total_cbm: float
    total_value: float
    utilization_percentage: float
    status: OrderStatus = OrderStatus.DRAFT
    eta: Optional[datetime] = None
    shipping_date: Optional[datetime] = None  # New field for shipment schedule
    demurrage_start: Optional[datetime] = None
    customs_value: Optional[float] = None
    duty_rate: float = 0.1  # 10% default
    freight_charges: float = 0.0
    insurance_charges: float = 0.0
    other_charges: float = 0.0
    landed_cost_per_unit: Dict[str, float] = {}
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ImportOrderCreate(BaseModel):
    po_number: str
    supplier_id: str
    port_id: Optional[str] = None
    container_type: ContainerType
    currency: Currency
    items: List[ImportOrderItem]
    eta: Optional[datetime] = None
    duty_rate: float = 0.1
    freight_charges: float = 0.0
    insurance_charges: float = 0.0
    other_charges: float = 0.0

class ActualLoadingItem(BaseModel):
    sku_id: str
    planned_quantity: int
    actual_quantity: int
    variance_quantity: int
    planned_weight: float
    actual_weight: float
    variance_weight: float
    planned_value: float
    actual_value: float
    variance_value: float

class ActualLoading(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    import_order_id: str
    items: List[ActualLoadingItem]
    total_planned_quantity: int
    total_actual_quantity: int
    total_variance_quantity: int
    total_planned_weight: float
    total_actual_weight: float
    total_variance_weight: float
    total_planned_value: float
    total_actual_value: float
    total_variance_value: float
    is_locked: bool = False
    loading_date: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ActualLoadingCreate(BaseModel):
    import_order_id: str
    items: List[ActualLoadingItem]
    loading_date: Optional[datetime] = None

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Convert timestamp
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    if user.get('last_login') and isinstance(user['last_login'], str):
        user['last_login'] = datetime.fromisoformat(user['last_login'])
    
    return User(**user)

def check_permission(required_permission: str):
    async def permission_checker(current_user: User = Depends(get_current_user)):
        if required_permission not in current_user.permissions:
            raise HTTPException(
                status_code=403, 
                detail=f"Insufficient permissions. Required: {required_permission}"
            )
        return current_user
    return permission_checker

# FX Rate Service
async def fetch_fx_rates():
    """Fetch latest FX rates from external API"""
    try:
        async with aiohttp.ClientSession() as session:
            # Using exchangerate-api.com (free tier)
            async with session.get(
                "https://api.exchangerate-api.com/v4/latest/USD"
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    rates = data.get('rates', {})
                    
                    # Store rates in database
                    fx_rates = []
                    for currency in [Currency.USD, Currency.EUR, Currency.CNY]:
                        if currency.value in rates:
                            fx_rate = FXRate(
                                from_currency=currency,
                                to_currency=Currency.INR,
                                rate=rates['INR'] / rates[currency.value] if currency != Currency.USD else rates['INR'],
                                source="exchangerate-api"
                            )
                            fx_rates.append(fx_rate.model_dump())
                    
                    if fx_rates:
                        # Update rates
                        for rate_data in fx_rates:
                            rate_data['date'] = rate_data['date'].isoformat()
                            await db.fx_rates.update_one(
                                {
                                    "from_currency": rate_data["from_currency"],
                                    "to_currency": rate_data["to_currency"]
                                },
                                {"$set": rate_data},
                                upsert=True
                            )
                        
                        return True
    except Exception as e:
        logging.error(f"Failed to fetch FX rates: {e}")
        return False

async def get_fx_rate(from_currency: Currency, to_currency: Currency = Currency.INR) -> float:
    """Get latest FX rate for currency pair"""
    rate_doc = await db.fx_rates.find_one({
        "from_currency": from_currency.value,
        "to_currency": to_currency.value
    }, {"_id": 0}, sort=[("date", -1)])
    
    if rate_doc:
        return rate_doc['rate']
    
    # Fallback rates if API fails
    fallback_rates = {
        (Currency.USD, Currency.INR): 83.0,
        (Currency.EUR, Currency.INR): 90.0,
        (Currency.CNY, Currency.INR): 11.5,
        (Currency.INR, Currency.INR): 1.0
    }
    
    return fallback_rates.get((from_currency, to_currency), 1.0)

# Startup event to fetch FX rates
@app.on_event("startup")
async def startup_event():
    await fetch_fx_rates()
    # Schedule periodic FX rate updates (every hour)
    asyncio.create_task(periodic_fx_update())

async def periodic_fx_update():
    """Periodically update FX rates"""
    while True:
        await asyncio.sleep(3600)  # 1 hour
        await fetch_fx_rates()

# API Routes
@api_router.get("/")
async def root():
    return {"message": "ICMS API is running", "version": "2.0.0", "features": "Complete system with all phases"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ICMS Complete API"}

# Auth endpoints
@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.model_dump()
    user_dict.pop('password')
    
    # Assign permissions based on role
    permissions = ROLE_PERMISSIONS.get(user_data.role, [])
    user_dict['permissions'] = permissions
    
    user = User(**user_dict)
    
    doc = user.model_dump()
    doc['password'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user

@api_router.post("/auth/login", response_model=Token)
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not verify_password(login_data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Update last login
    await db.users.update_one(
        {"email": login_data.email},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    if user.get('last_login') and isinstance(user['last_login'], str):
        user['last_login'] = datetime.fromisoformat(user['last_login'])
    
    user_obj = User(**{k: v for k, v in user.items() if k != 'password'})
    access_token = create_access_token(data={"sub": user_obj.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# FX Rate endpoints
@api_router.get("/fx-rates")
async def get_fx_rates(current_user: User = Depends(check_permission(Permission.VIEW_FINANCIALS.value))):
    rates = await db.fx_rates.find({}, {"_id": 0}, sort=[("date", -1)]).to_list(100)
    for rate in rates:
        if isinstance(rate['date'], str):
            rate['date'] = datetime.fromisoformat(rate['date'])
    return rates

@api_router.post("/fx-rates/refresh")
async def refresh_fx_rates(current_user: User = Depends(check_permission(Permission.VIEW_FINANCIALS.value))):
    success = await fetch_fx_rates()
    if success:
        return {"message": "FX rates updated successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to update FX rates")

# SKU endpoints
@api_router.post("/skus", response_model=SKU)
async def create_sku(sku_data: SKUCreate, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    existing_sku = await db.skus.find_one({"sku_code": sku_data.sku_code})
    if existing_sku:
        raise HTTPException(status_code=400, detail="SKU code already exists")
    
    sku = SKU(**sku_data.model_dump())
    doc = sku.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.skus.insert_one(doc)
    return sku

@api_router.get("/skus", response_model=List[SKU])
async def get_skus(current_user: User = Depends(get_current_user)):
    skus = await db.skus.find({}, {"_id": 0}).to_list(1000)
    for sku in skus:
        if isinstance(sku['created_at'], str):
            sku['created_at'] = datetime.fromisoformat(sku['created_at'])
    return skus

# ==================== SYSTEM SETTINGS ENDPOINTS ====================

@api_router.get("/settings")
async def get_settings(current_user: User = Depends(get_current_user)):
    """Get system settings including dropdown options"""
    settings = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    
    if not settings:
        # Create default settings
        default_settings = SystemSettings()
        await db.system_settings.insert_one(default_settings.model_dump())
        return default_settings
    
    return settings

@api_router.put("/settings")
async def update_settings(
    settings_data: SystemSettingsUpdate,
    current_user: User = Depends(check_permission(Permission.SYSTEM_ADMIN.value))
):
    """Update system settings"""
    existing = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    
    if not existing:
        # Create default settings first
        default_settings = SystemSettings()
        await db.system_settings.insert_one(default_settings.model_dump())
    
    # Update only provided fields
    update_data = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if update_data:
        await db.system_settings.update_one(
            {"id": "system_settings"},
            {"$set": update_data}
        )
    
    updated_settings = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    return updated_settings

@api_router.post("/settings/logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(check_permission(Permission.SYSTEM_ADMIN.value))
):
    """Upload company logo"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Save logo file
    file_ext = Path(file.filename).suffix
    logo_filename = f"company_logo{file_ext}"
    logo_path = UPLOADS_DIR / logo_filename
    
    with open(logo_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update settings with logo URL
    logo_url = f"/uploads/{logo_filename}"
    await db.system_settings.update_one(
        {"id": "system_settings"},
        {"$set": {"logo_url": logo_url, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"message": "Logo uploaded successfully", "logo_url": logo_url}

@api_router.get("/settings/dropdown-options")
async def get_dropdown_options(current_user: User = Depends(get_current_user)):
    """Get all dropdown options for forms"""
    settings = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    
    if not settings:
        default_settings = SystemSettings()
        return {
            "categories": default_settings.categories,
            "adhesive_types": default_settings.adhesive_types,
            "liner_colors": default_settings.liner_colors,
            "shipping_marks": default_settings.shipping_marks,
            "order_statuses": default_settings.order_statuses
        }
    
    return {
        "categories": settings.get('categories', []),
        "adhesive_types": settings.get('adhesive_types', []),
        "liner_colors": settings.get('liner_colors', []),
        "shipping_marks": settings.get('shipping_marks', []),
        "order_statuses": settings.get('order_statuses', [])
    }

@api_router.get("/skus/{sku_id}", response_model=SKU)
async def get_sku(sku_id: str, current_user: User = Depends(get_current_user)):
    sku = await db.skus.find_one({"id": sku_id}, {"_id": 0})
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    
    if isinstance(sku['created_at'], str):
        sku['created_at'] = datetime.fromisoformat(sku['created_at'])
    
    return SKU(**sku)

@api_router.put("/skus/{sku_id}", response_model=SKU)
async def update_sku(sku_id: str, sku_data: SKUUpdate, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    existing_sku = await db.skus.find_one({"id": sku_id}, {"_id": 0})
    if not existing_sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    
    # Check if sku_code is being updated and if it conflicts
    if sku_data.sku_code and sku_data.sku_code != existing_sku['sku_code']:
        code_exists = await db.skus.find_one({"sku_code": sku_data.sku_code, "id": {"$ne": sku_id}})
        if code_exists:
            raise HTTPException(status_code=400, detail="SKU code already exists")
    
    # Update only provided fields
    update_data = {k: v for k, v in sku_data.model_dump().items() if v is not None}
    
    if update_data:
        await db.skus.update_one(
            {"id": sku_id},
            {"$set": update_data}
        )
    
    # Fetch updated SKU
    updated_sku = await db.skus.find_one({"id": sku_id}, {"_id": 0})
    if isinstance(updated_sku['created_at'], str):
        updated_sku['created_at'] = datetime.fromisoformat(updated_sku['created_at'])
    
    return SKU(**updated_sku)

@api_router.delete("/skus/{sku_id}")
async def delete_sku(sku_id: str, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    # Check if SKU exists
    existing_sku = await db.skus.find_one({"id": sku_id})
    if not existing_sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    
    # Check if SKU is referenced in any import orders
    orders_with_sku = await db.import_orders.find({"items.sku_id": sku_id}).to_list(1)
    if orders_with_sku:
        raise HTTPException(status_code=400, detail="Cannot delete SKU: referenced in import orders")
    
    # Delete SKU
    await db.skus.delete_one({"id": sku_id})
    return {"message": "SKU deleted successfully"}

# Supplier endpoints
@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(supplier_data: SupplierCreate, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    existing_supplier = await db.suppliers.find_one({"code": supplier_data.code})
    if existing_supplier:
        raise HTTPException(status_code=400, detail="Supplier code already exists")
    
    supplier_dict = supplier_data.model_dump()
    supplier_dict['current_balance'] = supplier_dict['opening_balance']
    supplier = Supplier(**supplier_dict)
    
    doc = supplier.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.suppliers.insert_one(doc)
    return supplier

@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(current_user: User = Depends(get_current_user)):
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(1000)
    for supplier in suppliers:
        if isinstance(supplier['created_at'], str):
            supplier['created_at'] = datetime.fromisoformat(supplier['created_at'])
    return suppliers

@api_router.get("/suppliers/{supplier_id}", response_model=Supplier)
async def get_supplier(supplier_id: str, current_user: User = Depends(get_current_user)):
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    if isinstance(supplier['created_at'], str):
        supplier['created_at'] = datetime.fromisoformat(supplier['created_at'])
    
    return Supplier(**supplier)

@api_router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(supplier_id: str, supplier_data: SupplierUpdate, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    existing_supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not existing_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Check if code is being updated and if it conflicts
    if supplier_data.code and supplier_data.code != existing_supplier['code']:
        code_exists = await db.suppliers.find_one({"code": supplier_data.code, "id": {"$ne": supplier_id}})
        if code_exists:
            raise HTTPException(status_code=400, detail="Supplier code already exists")
    
    # Update only provided fields
    update_data = {k: v for k, v in supplier_data.model_dump().items() if v is not None}
    
    if update_data:
        await db.suppliers.update_one(
            {"id": supplier_id},
            {"$set": update_data}
        )
    
    # Fetch updated supplier
    updated_supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if isinstance(updated_supplier['created_at'], str):
        updated_supplier['created_at'] = datetime.fromisoformat(updated_supplier['created_at'])
    
    return Supplier(**updated_supplier)

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    # Check if supplier exists
    existing_supplier = await db.suppliers.find_one({"id": supplier_id})
    if not existing_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Check if supplier is referenced in any import orders
    orders_count = await db.import_orders.count_documents({"supplier_id": supplier_id})
    if orders_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete supplier: referenced in import orders")
    
    # Delete supplier
    await db.suppliers.delete_one({"id": supplier_id})
    return {"message": "Supplier deleted successfully"}

# Port endpoints
@api_router.post("/ports", response_model=Port)
async def create_port(port_data: PortCreate, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    existing_port = await db.ports.find_one({"code": port_data.code})
    if existing_port:
        raise HTTPException(status_code=400, detail="Port code already exists")
    
    port = Port(**port_data.model_dump())
    doc = port.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.ports.insert_one(doc)
    return port

@api_router.get("/ports", response_model=List[Port])
async def get_ports(current_user: User = Depends(get_current_user)):
    ports = await db.ports.find({}, {"_id": 0}).to_list(1000)
    for port in ports:
        if isinstance(port['created_at'], str):
            port['created_at'] = datetime.fromisoformat(port['created_at'])
    return ports

@api_router.get("/ports/{port_id}", response_model=Port)
async def get_port(port_id: str, current_user: User = Depends(get_current_user)):
    port = await db.ports.find_one({"id": port_id}, {"_id": 0})
    if not port:
        raise HTTPException(status_code=404, detail="Port not found")
    
    if isinstance(port['created_at'], str):
        port['created_at'] = datetime.fromisoformat(port['created_at'])
    
    return Port(**port)

@api_router.put("/ports/{port_id}", response_model=Port)
async def update_port(port_id: str, port_data: PortUpdate, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    existing_port = await db.ports.find_one({"id": port_id}, {"_id": 0})
    if not existing_port:
        raise HTTPException(status_code=404, detail="Port not found")
    
    # Check if code is being updated and if it conflicts
    if port_data.code and port_data.code != existing_port['code']:
        code_exists = await db.ports.find_one({"code": port_data.code, "id": {"$ne": port_id}})
        if code_exists:
            raise HTTPException(status_code=400, detail="Port code already exists")
    
    # Update only provided fields
    update_data = {k: v for k, v in port_data.model_dump().items() if v is not None}
    
    if update_data:
        await db.ports.update_one(
            {"id": port_id},
            {"$set": update_data}
        )
    
    # Fetch updated port
    updated_port = await db.ports.find_one({"id": port_id}, {"_id": 0})
    if isinstance(updated_port['created_at'], str):
        updated_port['created_at'] = datetime.fromisoformat(updated_port['created_at'])
    
    return Port(**updated_port)

@api_router.delete("/ports/{port_id}")
async def delete_port(port_id: str, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    # Check if port exists
    existing_port = await db.ports.find_one({"id": port_id})
    if not existing_port:
        raise HTTPException(status_code=404, detail="Port not found")
    
    # Check if port is referenced in any import orders
    orders_count = await db.import_orders.count_documents({"port_id": port_id})
    if orders_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete port: referenced in import orders")
    
    # Delete port
    await db.ports.delete_one({"id": port_id})
    return {"message": "Port deleted successfully"}

# Container endpoints
@api_router.post("/containers", response_model=Container)
async def create_container(container_data: ContainerCreate, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    container = Container(**container_data.model_dump())
    doc = container.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.containers.insert_one(doc)
    return container

@api_router.get("/containers", response_model=List[Container])
async def get_containers(current_user: User = Depends(get_current_user)):
    containers = await db.containers.find({}, {"_id": 0}).to_list(1000)
    for container in containers:
        if isinstance(container['created_at'], str):
            container['created_at'] = datetime.fromisoformat(container['created_at'])
    return containers

@api_router.get("/containers/{container_id}", response_model=Container)
async def get_container(container_id: str, current_user: User = Depends(get_current_user)):
    container = await db.containers.find_one({"id": container_id}, {"_id": 0})
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    if isinstance(container['created_at'], str):
        container['created_at'] = datetime.fromisoformat(container['created_at'])
    
    return Container(**container)

@api_router.put("/containers/{container_id}", response_model=Container)
async def update_container(container_id: str, container_data: ContainerUpdate, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    existing_container = await db.containers.find_one({"id": container_id}, {"_id": 0})
    if not existing_container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    # Update only provided fields
    update_data = {k: v for k, v in container_data.model_dump().items() if v is not None}
    
    if update_data:
        await db.containers.update_one(
            {"id": container_id},
            {"$set": update_data}
        )
    
    # Fetch updated container
    updated_container = await db.containers.find_one({"id": container_id}, {"_id": 0})
    if isinstance(updated_container['created_at'], str):
        updated_container['created_at'] = datetime.fromisoformat(updated_container['created_at'])
    
    return Container(**updated_container)

@api_router.delete("/containers/{container_id}")
async def delete_container(container_id: str, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    # Check if container exists
    existing_container = await db.containers.find_one({"id": container_id})
    if not existing_container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    # Check if container type is referenced in any import orders
    orders_count = await db.import_orders.count_documents({"container_type": existing_container['container_type']})
    if orders_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete container: container type referenced in import orders")
    
    # Delete container
    await db.containers.delete_one({"id": container_id})
    return {"message": "Container deleted successfully"}

# ==================== EXCEL EXPORT/IMPORT ENDPOINTS ====================

@api_router.get("/masters/export/{master_type}")
async def export_master_to_excel(
    master_type: str,
    current_user: User = Depends(check_permission(Permission.VIEW_DASHBOARD.value))
):
    """Export master data to Excel file"""
    valid_types = ["skus", "suppliers", "ports", "containers"]
    if master_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid master type. Must be one of: {valid_types}")
    
    # Fetch data
    data = await db[master_type].find({}, {"_id": 0}).to_list(10000)
    
    if not data:
        raise HTTPException(status_code=404, detail=f"No {master_type} data found to export")
    
    # Define columns for each master type
    columns_map = {
        "skus": ["sku_code", "description", "color", "hsn_code", "micron", "width_mm", "length_m", 
                 "weight_per_unit", "cbm_per_unit", "unit_cost", "category"],
        "suppliers": ["code", "name", "base_currency", "country", "contact_email", "contact_phone", 
                     "address", "description", "opening_balance"],
        "ports": ["code", "name", "country", "transit_days", "demurrage_free_days", "demurrage_rate"],
        "containers": ["container_type", "max_weight", "max_cbm", "freight_rate"]
    }
    
    columns = columns_map[master_type]
    
    # Create DataFrame with selected columns
    df_data = []
    for item in data:
        row = {col: item.get(col, "") for col in columns}
        df_data.append(row)
    
    df = pd.DataFrame(df_data, columns=columns)
    
    # Create Excel file in memory
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name=master_type.upper(), index=False)
    output.seek(0)
    
    filename = f"{master_type}_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.post("/masters/import/{master_type}")
async def import_master_from_excel(
    master_type: str,
    file: UploadFile = File(...),
    mode: str = Query("add", description="Import mode: 'add' (add new only), 'update' (update existing), 'replace' (clear and replace all)"),
    current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))
):
    """Import master data from Excel file"""
    valid_types = ["skus", "suppliers", "ports", "containers"]
    if master_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid master type. Must be one of: {valid_types}")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
    
    # Read Excel file
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading Excel file: {str(e)}")
    
    # Define required columns and unique key for each master type
    config = {
        "skus": {
            "required": ["sku_code", "description", "hsn_code", "weight_per_unit", "cbm_per_unit"],
            "unique_key": "sku_code",
            "numeric_fields": ["micron", "width_mm", "length_m", "weight_per_unit", "cbm_per_unit", "unit_cost"],
            "string_fields": ["sku_code", "description", "color", "hsn_code", "category"]
        },
        "suppliers": {
            "required": ["code", "name", "base_currency", "contact_email", "contact_phone", "address"],
            "unique_key": "code",
            "numeric_fields": ["opening_balance"],
            "string_fields": ["code", "name", "base_currency", "country", "contact_email", "contact_phone", "address", "description"]
        },
        "ports": {
            "required": ["code", "name", "country"],
            "unique_key": "code",
            "numeric_fields": ["transit_days", "demurrage_free_days", "demurrage_rate"],
            "string_fields": ["code", "name", "country"]
        },
        "containers": {
            "required": ["container_type", "max_weight", "max_cbm"],
            "unique_key": "container_type",
            "numeric_fields": ["max_weight", "max_cbm", "freight_rate"],
            "string_fields": ["container_type"]
        }
    }
    
    cfg = config[master_type]
    
    # Validate required columns
    missing_cols = [col for col in cfg["required"] if col not in df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Missing required columns: {missing_cols}")
    
    # Clean and process data
    df = df.fillna("")
    records = df.to_dict('records')
    
    stats = {"added": 0, "updated": 0, "skipped": 0, "errors": []}
    
    if mode == "replace":
        # Clear all existing data
        await db[master_type].delete_many({})
        stats["cleared"] = True
    
    for idx, record in enumerate(records):
        try:
            # Skip empty rows
            if not record.get(cfg["unique_key"]):
                continue
            
            # Convert string fields to ensure they are strings
            for field in cfg.get("string_fields", []):
                if field in record and record[field] != "":
                    record[field] = str(record[field])
            
            # Convert numeric fields
            for field in cfg["numeric_fields"]:
                if field in record and record[field] != "":
                    try:
                        record[field] = float(record[field])
                    except (ValueError, TypeError):
                        record[field] = None
            
            unique_value = str(record[cfg["unique_key"]]).strip()
            
            # Check if exists
            existing = await db[master_type].find_one({cfg["unique_key"]: unique_value}, {"_id": 0})
            
            if existing:
                if mode in ["update", "replace"]:
                    # Update existing record
                    update_data = {k: v for k, v in record.items() if v != "" and v is not None}
                    await db[master_type].update_one(
                        {cfg["unique_key"]: unique_value},
                        {"$set": update_data}
                    )
                    stats["updated"] += 1
                else:
                    stats["skipped"] += 1
            else:
                # Add new record
                new_record = {
                    "id": str(uuid.uuid4()),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    **{k: v for k, v in record.items() if v != ""}
                }
                
                # Set defaults for suppliers
                if master_type == "suppliers":
                    new_record.setdefault("current_balance", new_record.get("opening_balance", 0))
                
                await db[master_type].insert_one(new_record)
                stats["added"] += 1
                
        except Exception as e:
            stats["errors"].append(f"Row {idx + 2}: {str(e)}")
    
    return {
        "message": f"Import completed for {master_type}",
        "statistics": stats,
        "total_processed": len(records)
    }

@api_router.get("/masters/template/{master_type}")
async def download_import_template(
    master_type: str,
    current_user: User = Depends(get_current_user)
):
    """Download Excel template for master data import"""
    valid_types = ["skus", "suppliers", "ports", "containers"]
    if master_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid master type. Must be one of: {valid_types}")
    
    # Define template columns with sample data
    templates = {
        "skus": {
            "columns": ["sku_code", "description", "color", "hsn_code", "micron", "width_mm", "length_m", 
                       "weight_per_unit", "cbm_per_unit", "unit_cost", "category"],
            "sample": ["SKU001", "Sample Product", "Red", "39201010", 50, 500, 2000, 0.5, 0.001, 10.50, "Raw Materials"]
        },
        "suppliers": {
            "columns": ["code", "name", "base_currency", "country", "contact_email", "contact_phone", 
                       "address", "description", "opening_balance"],
            "sample": ["SUP001", "Sample Supplier", "USD", "China", "contact@supplier.com", "+86-123-456-7890",
                      "123 Business Street, Shanghai", "Sample supplier description", 0]
        },
        "ports": {
            "columns": ["code", "name", "country", "transit_days", "demurrage_free_days", "demurrage_rate"],
            "sample": ["SHA", "Shanghai Port", "China", 25, 7, 75.00]
        },
        "containers": {
            "columns": ["container_type", "max_weight", "max_cbm", "freight_rate"],
            "sample": ["20FT", 18000, 28, 1500.00]
        }
    }
    
    template = templates[master_type]
    
    # Create DataFrame with headers and sample row
    df = pd.DataFrame([template["sample"]], columns=template["columns"])
    
    # Create Excel file in memory
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name=f'{master_type.upper()}_TEMPLATE', index=False)
        
        # Add instructions sheet
        instructions = pd.DataFrame({
            "Instructions": [
                f"Template for importing {master_type.upper()} data",
                "",
                "Required fields (must not be empty):",
                *[f"  - {col}" for col in templates[master_type]["columns"][:5]],
                "",
                "Optional fields:",
                *[f"  - {col}" for col in templates[master_type]["columns"][5:]],
                "",
                "Notes:",
                "1. Do not change column headers",
                "2. Delete the sample row before uploading",
                "3. Numeric fields should contain only numbers",
                "4. Currency codes: USD, EUR, CNY, INR",
                "5. Container types: 20FT, 40FT, 40HC"
            ]
        })
        instructions.to_excel(writer, sheet_name='INSTRUCTIONS', index=False, header=False)
    
    output.seek(0)
    
    filename = f"{master_type}_import_template.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== IMPORT ORDER EXCEL OPERATIONS ====================

@api_router.get("/import-orders/export")
async def export_import_orders_excel(
    current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))
):
    """Export all import orders to Excel"""
    orders = await db.import_orders.find({}, {"_id": 0}).to_list(10000)
    
    if not orders:
        raise HTTPException(status_code=404, detail="No import orders found to export")
    
    # Flatten orders for export
    export_data = []
    for order in orders:
        supplier = await db.suppliers.find_one({"id": order.get('supplier_id')}, {"_id": 0, "name": 1, "code": 1})
        
        for item in order.get('items', []):
            sku = await db.skus.find_one({"id": item.get('sku_id')}, {"_id": 0, "sku_code": 1, "description": 1})
            export_data.append({
                "po_number": order.get('po_number'),
                "supplier_code": supplier.get('code') if supplier else '',
                "supplier_name": supplier.get('name') if supplier else '',
                "status": order.get('status'),
                "container_type": order.get('container_type'),
                "currency": order.get('currency'),
                "sku_code": sku.get('sku_code') if sku else '',
                "item_description": item.get('item_description') or (sku.get('description') if sku else ''),
                "thickness": item.get('thickness', ''),
                "size": item.get('size', ''),
                "liner_color": item.get('liner_color', ''),
                "quantity": item.get('quantity'),
                "unit_price": item.get('unit_price'),
                "total_value": item.get('total_value'),
                "freight_charges": order.get('freight_charges', 0),
                "duty_rate": order.get('duty_rate', 0),
                "created_at": order.get('created_at', ''),
                "eta": order.get('eta', '')
            })
    
    df = pd.DataFrame(export_data)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='IMPORT_ORDERS', index=False)
    output.seek(0)
    
    filename = f"import_orders_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.post("/import-orders/import")
async def import_orders_from_excel(
    file: UploadFile = File(...),
    current_user: User = Depends(check_permission(Permission.CREATE_ORDERS.value))
):
    """Import multiple purchase orders from Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
    
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading Excel file: {str(e)}")
    
    required_cols = ["po_number", "supplier_code", "sku_code", "quantity", "unit_price"]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Missing required columns: {missing_cols}")
    
    df = df.fillna("")
    records = df.to_dict('records')
    
    # Group by PO number
    po_groups = {}
    for record in records:
        po_num = str(record.get('po_number', '')).strip()
        if not po_num:
            continue
        if po_num not in po_groups:
            po_groups[po_num] = {"items": [], "record": record}
        po_groups[po_num]["items"].append(record)
    
    stats = {"created": 0, "skipped": 0, "errors": []}
    
    for po_num, po_data in po_groups.items():
        try:
            # Check if PO already exists
            existing = await db.import_orders.find_one({"po_number": po_num}, {"_id": 0})
            if existing:
                stats["skipped"] += 1
                continue
            
            first_record = po_data["record"]
            
            # Get supplier
            supplier = await db.suppliers.find_one(
                {"code": str(first_record.get('supplier_code', '')).strip()},
                {"_id": 0}
            )
            if not supplier:
                stats["errors"].append(f"PO {po_num}: Supplier not found")
                continue
            
            # Process items
            items = []
            total_quantity = 0
            total_weight = 0
            total_cbm = 0
            total_value = 0
            
            for item_record in po_data["items"]:
                sku = await db.skus.find_one(
                    {"sku_code": str(item_record.get('sku_code', '')).strip()},
                    {"_id": 0}
                )
                if not sku:
                    stats["errors"].append(f"PO {po_num}: SKU {item_record.get('sku_code')} not found")
                    continue
                
                qty = float(item_record.get('quantity', 0))
                unit_price = float(item_record.get('unit_price', 0))
                item_value = qty * unit_price
                
                items.append({
                    "sku_id": sku['id'],
                    "quantity": qty,
                    "unit_price": unit_price,
                    "total_value": item_value,
                    "item_description": str(item_record.get('item_description', '')),
                    "thickness": str(item_record.get('thickness', '')),
                    "size": str(item_record.get('size', '')),
                    "liner_color": str(item_record.get('liner_color', ''))
                })
                
                total_quantity += qty
                total_weight += qty * sku.get('weight_per_unit', 0)
                total_cbm += qty * sku.get('cbm_per_unit', 0)
                total_value += item_value
            
            if not items:
                stats["errors"].append(f"PO {po_num}: No valid items")
                continue
            
            # Get container for utilization
            container_type = str(first_record.get('container_type', '20FT'))
            container = await db.containers.find_one({"container_type": container_type}, {"_id": 0})
            utilization = 0
            if container:
                weight_util = (total_weight / container.get('max_weight', 1)) * 100
                cbm_util = (total_cbm / container.get('max_cbm', 1)) * 100
                utilization = max(weight_util, cbm_util)
            
            # Create order
            order = {
                "id": str(uuid.uuid4()),
                "po_number": po_num,
                "supplier_id": supplier['id'],
                "container_type": container_type,
                "currency": str(first_record.get('currency', 'USD')),
                "status": "Draft",
                "items": items,
                "total_quantity": total_quantity,
                "total_weight": total_weight,
                "total_cbm": total_cbm,
                "total_value": total_value,
                "utilization_percentage": round(utilization, 2),
                "freight_charges": float(first_record.get('freight_charges', 0)),
                "duty_rate": float(first_record.get('duty_rate', 0.1)),
                "insurance_charges": float(first_record.get('insurance_charges', 0)),
                "other_charges": float(first_record.get('other_charges', 0)),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user.id
            }
            
            await db.import_orders.insert_one(order)
            stats["created"] += 1
            
        except Exception as e:
            stats["errors"].append(f"PO {po_num}: {str(e)}")
    
    return {
        "message": "Import completed",
        "statistics": stats,
        "total_pos_processed": len(po_groups)
    }

@api_router.get("/import-orders/template")
async def download_po_import_template(current_user: User = Depends(get_current_user)):
    """Download Excel template for import order creation"""
    columns = ["po_number", "supplier_code", "container_type", "currency", "sku_code", 
               "item_description", "thickness", "size", "liner_color", "quantity", 
               "unit_price", "freight_charges", "duty_rate"]
    
    sample_data = [
        ["PO-2024-001", "SUP001", "20FT", "USD", "SKU001", "Product A", "55 MIC", "500MM X 2000M", "Clear", 100, 25.50, 500, 0.10],
        ["PO-2024-001", "SUP001", "20FT", "USD", "SKU002", "Product B", "75 MIC", "600MM X 1500M", "Blue", 50, 30.00, 500, 0.10],
        ["PO-2024-002", "SUP002", "40FT", "EUR", "SKU003", "Product C", "100 MIC", "700MM X 1000M", "Red", 200, 15.00, 800, 0.12]
    ]
    
    df = pd.DataFrame(sample_data, columns=columns)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='PO_TEMPLATE', index=False)
        
        instructions = pd.DataFrame({
            "Instructions": [
                "Template for importing multiple Purchase Orders",
                "",
                "IMPORTANT:",
                "1. Each row represents one item in a PO",
                "2. Multiple rows with same po_number = multiple items in one PO",
                "3. supplier_code and sku_code must exist in Masters",
                "",
                "Required fields:",
                "  - po_number: Unique PO identifier",
                "  - supplier_code: Must match supplier code in Masters",
                "  - sku_code: Must match SKU code in Masters",
                "  - quantity: Number of units",
                "  - unit_price: Price per unit",
                "",
                "Optional fields:",
                "  - container_type: 20FT, 40FT, or 40HC (default: 20FT)",
                "  - currency: USD, EUR, CNY, INR (default: USD)",
                "  - item_description, thickness, size, liner_color",
                "  - freight_charges, duty_rate (applied to whole PO)"
            ]
        })
        instructions.to_excel(writer, sheet_name='INSTRUCTIONS', index=False, header=False)
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=po_import_template.xlsx"}
    )

# ==================== SUPPLIER-WISE PO TRACKING ====================

@api_router.get("/suppliers/{supplier_id}/orders")
async def get_supplier_orders(
    supplier_id: str,
    current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))
):
    """Get all orders for a specific supplier with summary"""
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    orders = await db.import_orders.find({"supplier_id": supplier_id}, {"_id": 0}).to_list(1000)
    
    # Calculate summary
    pending_orders = [o for o in orders if o.get('status') in ['Draft', 'Tentative', 'Confirmed']]
    shipped_orders = [o for o in orders if o.get('status') in ['Shipped', 'In Transit', 'Arrived']]
    delivered_orders = [o for o in orders if o.get('status') == 'Delivered']
    
    return {
        "supplier": supplier,
        "summary": {
            "total_orders": len(orders),
            "pending_count": len(pending_orders),
            "pending_value": sum(o.get('total_value', 0) for o in pending_orders),
            "shipped_count": len(shipped_orders),
            "shipped_value": sum(o.get('total_value', 0) for o in shipped_orders),
            "delivered_count": len(delivered_orders),
            "delivered_value": sum(o.get('total_value', 0) for o in delivered_orders),
            "total_value": sum(o.get('total_value', 0) for o in orders)
        },
        "orders": orders
    }

@api_router.get("/reports/supplier-wise-summary")
async def get_supplier_wise_summary(
    current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))
):
    """Get supplier-wise PO summary with pending and shipped breakdown"""
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(1000)
    
    summary = []
    for supplier in suppliers:
        orders = await db.import_orders.find({"supplier_id": supplier['id']}, {"_id": 0}).to_list(1000)
        
        pending = [o for o in orders if o.get('status') in ['Draft', 'Tentative', 'Confirmed']]
        shipped = [o for o in orders if o.get('status') in ['Shipped', 'In Transit', 'Arrived', 'Loaded']]
        delivered = [o for o in orders if o.get('status') == 'Delivered']
        
        # Get payments for this supplier
        payments = await db.payments.find({"supplier_id": supplier['id']}, {"_id": 0}).to_list(1000)
        total_paid = sum(p.get('amount', 0) for p in payments)
        
        summary.append({
            "supplier_code": supplier.get('code'),
            "supplier_name": supplier.get('name'),
            "currency": supplier.get('base_currency'),
            "pending_pos": len(pending),
            "pending_value": sum(o.get('total_value', 0) for o in pending),
            "shipped_pos": len(shipped),
            "shipped_value": sum(o.get('total_value', 0) for o in shipped),
            "delivered_pos": len(delivered),
            "delivered_value": sum(o.get('total_value', 0) for o in delivered),
            "total_orders": len(orders),
            "total_value": sum(o.get('total_value', 0) for o in orders),
            "total_paid": total_paid,
            "balance_due": sum(o.get('total_value', 0) for o in orders) - total_paid,
            "current_balance": supplier.get('current_balance', 0)
        })
    
    return {
        "suppliers": summary,
        "totals": {
            "total_suppliers": len(suppliers),
            "total_pending_value": sum(s['pending_value'] for s in summary),
            "total_shipped_value": sum(s['shipped_value'] for s in summary),
            "total_delivered_value": sum(s['delivered_value'] for s in summary),
            "total_paid": sum(s['total_paid'] for s in summary),
            "total_balance_due": sum(s['balance_due'] for s in summary)
        }
    }

@api_router.get("/reports/supplier-wise-summary/export")
async def export_supplier_wise_summary_excel(
    current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))
):
    """Export supplier-wise summary to Excel"""
    summary_data = await get_supplier_wise_summary(current_user)
    
    df = pd.DataFrame(summary_data['suppliers'])
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='SUPPLIER_SUMMARY', index=False)
        
        # Add totals sheet
        totals_df = pd.DataFrame([summary_data['totals']])
        totals_df.to_excel(writer, sheet_name='TOTALS', index=False)
    
    output.seek(0)
    
    filename = f"supplier_wise_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== ADVANCED ANALYTICS & REPORTING ====================

@api_router.get("/reports/analytics")
async def get_advanced_analytics(
    current_user: User = Depends(check_permission(Permission.VIEW_DASHBOARD.value))
):
    """Get advanced analytics and KPIs"""
    
    # Order analytics
    orders = await db.import_orders.find({}, {"_id": 0}).to_list(10000)
    
    # Monthly trends
    monthly_data = {}
    for order in orders:
        created = order.get('created_at', '')
        if created:
            try:
                month_key = created[:7] if isinstance(created, str) else created.strftime('%Y-%m')
                if month_key not in monthly_data:
                    monthly_data[month_key] = {"count": 0, "value": 0}
                monthly_data[month_key]["count"] += 1
                monthly_data[month_key]["value"] += order.get('total_value', 0)
            except:
                pass
    
    # Status distribution
    status_dist = {}
    for order in orders:
        status = order.get('status', 'Unknown')
        if status not in status_dist:
            status_dist[status] = {"count": 0, "value": 0}
        status_dist[status]["count"] += 1
        status_dist[status]["value"] += order.get('total_value', 0)
    
    # Container utilization analysis
    utilization_ranges = {"0-25%": 0, "26-50%": 0, "51-75%": 0, "76-100%": 0, ">100%": 0}
    for order in orders:
        util = order.get('utilization_percentage', 0)
        if util <= 25:
            utilization_ranges["0-25%"] += 1
        elif util <= 50:
            utilization_ranges["26-50%"] += 1
        elif util <= 75:
            utilization_ranges["51-75%"] += 1
        elif util <= 100:
            utilization_ranges["76-100%"] += 1
        else:
            utilization_ranges[">100%"] += 1
    
    # Currency exposure
    currency_exposure = {}
    for order in orders:
        if order.get('status') not in ['Delivered', 'Cancelled']:
            curr = order.get('currency', 'USD')
            if curr not in currency_exposure:
                currency_exposure[curr] = {"orders": 0, "value": 0}
            currency_exposure[curr]["orders"] += 1
            currency_exposure[curr]["value"] += order.get('total_value', 0)
    
    # Payment analytics
    payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
    payment_by_month = {}
    for payment in payments:
        p_date = payment.get('payment_date', '')
        if p_date:
            try:
                month_key = p_date[:7] if isinstance(p_date, str) else p_date.strftime('%Y-%m')
                if month_key not in payment_by_month:
                    payment_by_month[month_key] = {"count": 0, "amount": 0, "inr_amount": 0}
                payment_by_month[month_key]["count"] += 1
                payment_by_month[month_key]["amount"] += payment.get('amount', 0)
                payment_by_month[month_key]["inr_amount"] += payment.get('inr_amount', 0)
            except:
                pass
    
    # Top suppliers by value
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(100)
    supplier_values = []
    for supplier in suppliers:
        supplier_orders = [o for o in orders if o.get('supplier_id') == supplier.get('id')]
        supplier_values.append({
            "supplier_code": supplier.get('code'),
            "supplier_name": supplier.get('name'),
            "order_count": len(supplier_orders),
            "total_value": sum(o.get('total_value', 0) for o in supplier_orders)
        })
    supplier_values.sort(key=lambda x: x['total_value'], reverse=True)
    
    return {
        "order_analytics": {
            "total_orders": len(orders),
            "total_value": sum(o.get('total_value', 0) for o in orders),
            "avg_order_value": sum(o.get('total_value', 0) for o in orders) / len(orders) if orders else 0,
            "avg_utilization": sum(o.get('utilization_percentage', 0) for o in orders) / len(orders) if orders else 0
        },
        "monthly_trends": dict(sorted(monthly_data.items())),
        "status_distribution": status_dist,
        "utilization_analysis": utilization_ranges,
        "currency_exposure": currency_exposure,
        "payment_trends": dict(sorted(payment_by_month.items())),
        "top_suppliers": supplier_values[:10]
    }

# ==================== COMPREHENSIVE REPORTS ====================

@api_router.get("/reports/container-wise")
async def get_container_wise_report(
    current_user: User = Depends(check_permission(Permission.VIEW_DASHBOARD.value))
):
    """Get container-wise report with shipped, pending, and delivered breakdown"""
    orders = await db.import_orders.find({}, {"_id": 0}).to_list(10000)
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(100)
    supplier_map = {s['id']: s for s in suppliers}
    
    # Group by container type and status
    container_data = {}
    for order in orders:
        container_type = order.get('container_type', 'Unknown')
        status = order.get('status', 'Unknown')
        
        if container_type not in container_data:
            container_data[container_type] = {
                "shipped": {"count": 0, "value": 0, "orders": []},
                "pending": {"count": 0, "value": 0, "orders": []},
                "delivered": {"count": 0, "value": 0, "orders": []},
                "in_transit": {"count": 0, "value": 0, "orders": []}
            }
        
        order_summary = {
            "po_number": order.get('po_number'),
            "supplier": supplier_map.get(order.get('supplier_id'), {}).get('name', 'Unknown'),
            "value": order.get('total_value', 0),
            "currency": order.get('currency', 'USD'),
            "status": status,
            "shipping_date": order.get('shipping_date'),
            "eta": order.get('eta')
        }
        
        if status in ['Shipped']:
            container_data[container_type]["shipped"]["count"] += 1
            container_data[container_type]["shipped"]["value"] += order.get('total_value', 0)
            container_data[container_type]["shipped"]["orders"].append(order_summary)
        elif status in ['Draft', 'Tentative', 'Confirmed', 'Loaded']:
            container_data[container_type]["pending"]["count"] += 1
            container_data[container_type]["pending"]["value"] += order.get('total_value', 0)
            container_data[container_type]["pending"]["orders"].append(order_summary)
        elif status in ['Delivered']:
            container_data[container_type]["delivered"]["count"] += 1
            container_data[container_type]["delivered"]["value"] += order.get('total_value', 0)
            container_data[container_type]["delivered"]["orders"].append(order_summary)
        elif status in ['In Transit', 'Arrived']:
            container_data[container_type]["in_transit"]["count"] += 1
            container_data[container_type]["in_transit"]["value"] += order.get('total_value', 0)
            container_data[container_type]["in_transit"]["orders"].append(order_summary)
    
    # Calculate totals
    totals = {
        "total_shipped": sum(c["shipped"]["count"] for c in container_data.values()),
        "total_pending": sum(c["pending"]["count"] for c in container_data.values()),
        "total_delivered": sum(c["delivered"]["count"] for c in container_data.values()),
        "total_in_transit": sum(c["in_transit"]["count"] for c in container_data.values()),
        "shipped_value": sum(c["shipped"]["value"] for c in container_data.values()),
        "pending_value": sum(c["pending"]["value"] for c in container_data.values()),
        "delivered_value": sum(c["delivered"]["value"] for c in container_data.values()),
        "in_transit_value": sum(c["in_transit"]["value"] for c in container_data.values())
    }
    
    return {
        "containers": container_data,
        "totals": totals
    }

@api_router.get("/reports/supplier-ledger/{supplier_id}")
async def get_supplier_ledger(
    supplier_id: str,
    current_user: User = Depends(check_permission(Permission.VIEW_FINANCIALS.value))
):
    """Get detailed supplier ledger with all transactions"""
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Get all orders for this supplier
    orders = await db.import_orders.find({"supplier_id": supplier_id}, {"_id": 0}).to_list(1000)
    
    # Get all payments for orders of this supplier
    order_ids = [o['id'] for o in orders]
    payments = await db.payments.find({"import_order_id": {"$in": order_ids}}, {"_id": 0}).to_list(1000)
    
    # Build ledger entries
    ledger_entries = []
    running_balance = supplier.get('opening_balance', 0)
    
    # Add opening balance entry
    ledger_entries.append({
        "date": supplier.get('created_at', datetime.now(timezone.utc).isoformat()),
        "type": "opening_balance",
        "reference": "Opening Balance",
        "description": "Initial balance",
        "debit": supplier.get('opening_balance', 0) if supplier.get('opening_balance', 0) > 0 else 0,
        "credit": abs(supplier.get('opening_balance', 0)) if supplier.get('opening_balance', 0) < 0 else 0,
        "balance": running_balance
    })
    
    # Add orders as debits (we owe supplier)
    for order in orders:
        running_balance += order.get('total_value', 0)
        ledger_entries.append({
            "date": order.get('created_at', ''),
            "type": "order",
            "reference": order.get('po_number'),
            "description": f"Purchase Order - {order.get('container_type')} - {order.get('status')}",
            "debit": order.get('total_value', 0),
            "credit": 0,
            "balance": running_balance,
            "order_id": order.get('id'),
            "currency": order.get('currency', 'USD')
        })
    
    # Add payments as credits (we paid supplier)
    for payment in payments:
        running_balance -= payment.get('inr_amount', payment.get('amount', 0))
        ledger_entries.append({
            "date": payment.get('payment_date', ''),
            "type": "payment",
            "reference": payment.get('reference', 'Payment'),
            "description": f"Payment - {payment.get('currency', 'USD')} {payment.get('amount', 0)}",
            "debit": 0,
            "credit": payment.get('inr_amount', payment.get('amount', 0)),
            "balance": running_balance,
            "payment_id": payment.get('id'),
            "original_amount": payment.get('amount', 0),
            "original_currency": payment.get('currency', 'USD')
        })
    
    # Sort by date
    ledger_entries.sort(key=lambda x: x.get('date', ''))
    
    # Recalculate running balance after sorting
    running_balance = 0
    for entry in ledger_entries:
        running_balance += entry.get('debit', 0) - entry.get('credit', 0)
        entry['balance'] = running_balance
    
    return {
        "supplier": {
            "id": supplier.get('id'),
            "name": supplier.get('name'),
            "code": supplier.get('code'),
            "currency": supplier.get('base_currency'),
            "payment_terms_days": supplier.get('payment_terms_days', 30),
            "payment_terms_type": supplier.get('payment_terms_type', 'NET')
        },
        "summary": {
            "opening_balance": supplier.get('opening_balance', 0),
            "total_orders": len(orders),
            "total_order_value": sum(o.get('total_value', 0) for o in orders),
            "total_payments": len(payments),
            "total_paid": sum(p.get('inr_amount', p.get('amount', 0)) for p in payments),
            "current_balance": running_balance
        },
        "ledger": ledger_entries
    }

@api_router.get("/reports/payments-summary")
async def get_payments_summary(
    current_user: User = Depends(check_permission(Permission.VIEW_FINANCIALS.value))
):
    """Get comprehensive payments summary - made and due"""
    orders = await db.import_orders.find({}, {"_id": 0}).to_list(10000)
    payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(100)
    supplier_map = {s['id']: s for s in suppliers}
    
    # Calculate payments made
    payments_made = []
    for payment in payments:
        order = next((o for o in orders if o.get('id') == payment.get('import_order_id')), None)
        supplier = supplier_map.get(order.get('supplier_id') if order else None, {})
        payments_made.append({
            "payment_id": payment.get('id'),
            "reference": payment.get('reference'),
            "date": payment.get('payment_date'),
            "po_number": order.get('po_number') if order else 'N/A',
            "supplier_name": supplier.get('name', 'Unknown'),
            "amount": payment.get('amount', 0),
            "currency": payment.get('currency', 'USD'),
            "inr_amount": payment.get('inr_amount', 0),
            "payment_type": payment.get('payment_type', 'TT')
        })
    
    # Calculate payments due based on payment terms
    payments_due = []
    today = datetime.now(timezone.utc)
    
    for order in orders:
        if order.get('status') in ['Cancelled', 'Delivered']:
            continue
            
        supplier = supplier_map.get(order.get('supplier_id'), {})
        payment_terms_days = supplier.get('payment_terms_days', 30)
        
        # Get total paid for this order
        order_payments = [p for p in payments if p.get('import_order_id') == order.get('id')]
        total_paid = sum(p.get('inr_amount', p.get('amount', 0)) for p in order_payments)
        
        order_value = order.get('total_value', 0)
        balance_due = order_value - total_paid
        
        if balance_due <= 0:
            continue
        
        # Calculate due date based on shipping date or creation date
        base_date = order.get('shipping_date') or order.get('created_at')
        if isinstance(base_date, str):
            try:
                base_date = datetime.fromisoformat(base_date.replace('Z', '+00:00'))
            except:
                base_date = today
        
        due_date = base_date + timedelta(days=payment_terms_days) if base_date else today + timedelta(days=payment_terms_days)
        days_overdue = (today - due_date).days if today > due_date else 0
        days_until_due = (due_date - today).days if due_date > today else 0
        
        payments_due.append({
            "order_id": order.get('id'),
            "po_number": order.get('po_number'),
            "supplier_id": supplier.get('id'),
            "supplier_name": supplier.get('name', 'Unknown'),
            "supplier_code": supplier.get('code', ''),
            "order_value": order_value,
            "paid_amount": total_paid,
            "balance_due": balance_due,
            "currency": order.get('currency', 'USD'),
            "status": order.get('status'),
            "due_date": due_date.isoformat() if due_date else None,
            "days_overdue": days_overdue,
            "days_until_due": days_until_due,
            "is_overdue": days_overdue > 0,
            "payment_terms": f"{supplier.get('payment_terms_type', 'NET')} {payment_terms_days}"
        })
    
    # Sort payments due by overdue status and days
    payments_due.sort(key=lambda x: (-x['days_overdue'], x['days_until_due']))
    
    # Summary stats
    total_due = sum(p['balance_due'] for p in payments_due)
    total_overdue = sum(p['balance_due'] for p in payments_due if p['is_overdue'])
    total_paid = sum(p.get('inr_amount', 0) for p in payments)
    
    return {
        "payments_made": {
            "records": payments_made,
            "total_count": len(payments_made),
            "total_amount": total_paid
        },
        "payments_due": {
            "records": payments_due,
            "total_count": len(payments_due),
            "total_due": total_due,
            "overdue_count": len([p for p in payments_due if p['is_overdue']]),
            "overdue_amount": total_overdue
        },
        "summary": {
            "total_paid": total_paid,
            "total_due": total_due,
            "total_overdue": total_overdue,
            "payments_count": len(payments_made),
            "pending_orders_count": len(payments_due)
        }
    }

@api_router.get("/reports/notifications")
async def get_payment_notifications(
    current_user: User = Depends(check_permission(Permission.VIEW_FINANCIALS.value))
):
    """Get payment due notifications and alerts"""
    orders = await db.import_orders.find({}, {"_id": 0}).to_list(10000)
    payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(100)
    supplier_map = {s['id']: s for s in suppliers}
    
    notifications = []
    today = datetime.now(timezone.utc)
    
    for order in orders:
        if order.get('status') in ['Cancelled', 'Delivered']:
            continue
            
        supplier = supplier_map.get(order.get('supplier_id'), {})
        payment_terms_days = supplier.get('payment_terms_days', 30)
        
        # Get total paid for this order
        order_payments = [p for p in payments if p.get('import_order_id') == order.get('id')]
        total_paid = sum(p.get('inr_amount', p.get('amount', 0)) for p in order_payments)
        
        order_value = order.get('total_value', 0)
        balance_due = order_value - total_paid
        
        if balance_due <= 0:
            continue
        
        # Calculate due date
        base_date = order.get('shipping_date') or order.get('created_at')
        if isinstance(base_date, str):
            try:
                base_date = datetime.fromisoformat(base_date.replace('Z', '+00:00'))
            except:
                base_date = today
        
        due_date = base_date + timedelta(days=payment_terms_days) if base_date else today + timedelta(days=payment_terms_days)
        days_until_due = (due_date - today).days
        
        # Create notifications based on urgency
        if days_until_due < 0:  # Overdue
            notifications.append({
                "type": "overdue",
                "severity": "critical",
                "title": f"OVERDUE: Payment for {order.get('po_number')}",
                "message": f"Payment of {order.get('currency')} {balance_due:,.2f} to {supplier.get('name')} is {abs(days_until_due)} days overdue",
                "po_number": order.get('po_number'),
                "supplier_name": supplier.get('name'),
                "amount": balance_due,
                "currency": order.get('currency'),
                "days_overdue": abs(days_until_due),
                "due_date": due_date.isoformat()
            })
        elif days_until_due <= 3:  # Due in 3 days
            notifications.append({
                "type": "due_soon",
                "severity": "high",
                "title": f"URGENT: Payment due in {days_until_due} days",
                "message": f"Payment of {order.get('currency')} {balance_due:,.2f} to {supplier.get('name')} for {order.get('po_number')}",
                "po_number": order.get('po_number'),
                "supplier_name": supplier.get('name'),
                "amount": balance_due,
                "currency": order.get('currency'),
                "days_until_due": days_until_due,
                "due_date": due_date.isoformat()
            })
        elif days_until_due <= 7:  # Due in a week
            notifications.append({
                "type": "upcoming",
                "severity": "medium",
                "title": f"Payment due in {days_until_due} days",
                "message": f"Payment of {order.get('currency')} {balance_due:,.2f} to {supplier.get('name')} for {order.get('po_number')}",
                "po_number": order.get('po_number'),
                "supplier_name": supplier.get('name'),
                "amount": balance_due,
                "currency": order.get('currency'),
                "days_until_due": days_until_due,
                "due_date": due_date.isoformat()
            })
    
    # Sort by severity
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    notifications.sort(key=lambda x: severity_order.get(x['severity'], 99))
    
    return {
        "notifications": notifications,
        "counts": {
            "critical": len([n for n in notifications if n['severity'] == 'critical']),
            "high": len([n for n in notifications if n['severity'] == 'high']),
            "medium": len([n for n in notifications if n['severity'] == 'medium']),
            "total": len(notifications)
        }
    }

# ==================== PURCHASE ORDER PDF EXPORT ====================

@api_router.get("/import-orders/{order_id}/pdf")
async def export_order_to_pdf(
    order_id: str,
    current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))
):
    """Export a purchase order to PDF"""
    order = await db.import_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    supplier = await db.suppliers.find_one({"id": order.get('supplier_id')}, {"_id": 0})
    
    # Get system settings for PDF customization
    settings = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    if not settings:
        settings = SystemSettings().model_dump()
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, alignment=TA_CENTER, spaceAfter=20)
    header_style = ParagraphStyle('Header', parent=styles['Heading2'], fontSize=12, spaceAfter=10)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10)
    
    elements = []
    
    # Company Header
    if settings.get('company_name'):
        elements.append(Paragraph(settings.get('company_name'), title_style))
    if settings.get('company_address'):
        elements.append(Paragraph(settings.get('company_address'), normal_style))
    elements.append(Spacer(1, 10))
    
    # Title
    header_text = settings.get('header_text', 'PURCHASE ORDER')
    elements.append(Paragraph(header_text, title_style))
    elements.append(Paragraph(f"PO Number: {order.get('po_number')}", header_style))
    elements.append(Spacer(1, 10))
    
    # Order details table
    order_info = [
        ["Supplier:", supplier.get('name') if supplier else 'N/A', "Status:", order.get('status', 'N/A')],
        ["Container:", order.get('container_type', 'N/A'), "Currency:", order.get('currency', 'USD')],
        ["Created:", str(order.get('created_at', ''))[:10], "ETA:", str(order.get('eta', ''))[:10] if order.get('eta') else 'N/A'],
    ]
    
    # Add shipping date if available
    if order.get('shipping_date'):
        order_info.append(["Shipping Date:", str(order.get('shipping_date'))[:10], "", ""])
    
    info_table = Table(order_info, colWidths=[80, 180, 80, 180])
    info_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Items table
    elements.append(Paragraph("ORDER ITEMS", header_style))
    
    # Table header
    items_data = [["#", "SKU Code", "Description", "Size", "Qty", "Unit Price", "Total"]]
    
    for idx, item in enumerate(order.get('items', []), 1):
        sku = await db.skus.find_one({"id": item.get('sku_id')}, {"_id": 0})
        items_data.append([
            str(idx),
            sku.get('sku_code') if sku else 'N/A',
            (item.get('item_description') or (sku.get('description') if sku else ''))[:30],
            item.get('size', '-'),
            str(item.get('quantity', 0)),
            f"{order.get('currency', 'USD')} {item.get('unit_price', 0):.2f}",
            f"{order.get('currency', 'USD')} {item.get('total_value', 0):.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[25, 70, 120, 80, 45, 80, 80])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 20))
    
    # Summary
    elements.append(Paragraph("ORDER SUMMARY", header_style))
    
    summary_data = [
        ["Total Quantity:", f"{order.get('total_quantity', 0)}", "Total Weight:", f"{order.get('total_weight', 0):.2f} KG"],
        ["Total CBM:", f"{order.get('total_cbm', 0):.3f}", "Utilization:", f"{order.get('utilization_percentage', 0):.1f}%"],
        ["Goods Value:", f"{order.get('currency', 'USD')} {order.get('total_value', 0):.2f}", "Freight:", f"{order.get('currency', 'USD')} {order.get('freight_charges', 0):.2f}"],
    ]
    
    # Only show duty rate if enabled in settings
    if settings.get('show_duty_rate_on_pdf', False):
        summary_data.append(["Duty Rate:", f"{(order.get('duty_rate', 0) * 100):.1f}%", "Insurance:", f"{order.get('currency', 'USD')} {order.get('insurance_charges', 0):.2f}"])
    else:
        summary_data.append(["Insurance:", f"{order.get('currency', 'USD')} {order.get('insurance_charges', 0):.2f}", "", ""])
    
    summary_table = Table(summary_data, colWidths=[100, 140, 100, 140])
    summary_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Footer
    footer_text = settings.get('footer_text', '')
    if footer_text:
        elements.append(Paragraph(footer_text, normal_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"PO_{order.get('po_number')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Enhanced Dashboard endpoints
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(check_permission(Permission.VIEW_DASHBOARD.value))):
    total_orders = await db.import_orders.count_documents({})
    pending_orders = await db.import_orders.count_documents({
        "status": {"$in": ["Draft", "Tentative", "Confirmed", "Loaded", "Shipped", "In Transit"]}
    })
    total_suppliers = await db.suppliers.count_documents({})
    total_skus = await db.skus.count_documents({})
    
    # Financial metrics
    total_pipeline = await db.import_orders.aggregate([
        {"$match": {"status": {"$ne": "Delivered"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_value"}}}
    ]).to_list(1)
    pipeline_value = total_pipeline[0]['total'] if total_pipeline else 0
    
    # Orders by status
    status_pipeline = await db.import_orders.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(100)
    
    # Utilization metrics
    utilization_pipeline = await db.import_orders.aggregate([
        {"$match": {"utilization_percentage": {"$exists": True}}},
        {"$group": {
            "_id": None,
            "avg_utilization": {"$avg": "$utilization_percentage"},
            "underutilized": {
                "$sum": {"$cond": [{"$lt": ["$utilization_percentage", 70]}, 1, 0]}
            },
            "optimal": {
                "$sum": {"$cond": [
                    {"$and": [
                        {"$gte": ["$utilization_percentage", 70]},
                        {"$lte": ["$utilization_percentage", 90]}
                    ]}, 1, 0
                ]}
            },
            "overutilized": {
                "$sum": {"$cond": [{"$gt": ["$utilization_percentage", 90]}, 1, 0]}
            }
        }}
    ]).to_list(1)
    
    utilization_stats = utilization_pipeline[0] if utilization_pipeline else {
        "avg_utilization": 0, "underutilized": 0, "optimal": 0, "overutilized": 0
    }
    
    # Recent orders
    recent_orders = await db.import_orders.find(
        {}, {"_id": 0, "po_number": 1, "status": 1, "total_value": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_suppliers": total_suppliers,
        "total_skus": total_skus,
        "pipeline_value": pipeline_value,
        "recent_orders": recent_orders,
        "orders_by_status": {item['_id']: item['count'] for item in status_pipeline},
        "utilization_stats": utilization_stats
    }

@api_router.get("/dashboard/financial-overview")
async def get_financial_overview(current_user: User = Depends(check_permission(Permission.VIEW_FINANCIALS.value))):
    return {
        "value_in_transit": {},
        "payment_summary": {},
        "fx_exposure": {},
        "supplier_balances": []
    }

@api_router.get("/dashboard/logistics-overview")
async def get_logistics_overview(current_user: User = Depends(check_permission(Permission.VIEW_DASHBOARD.value))):
    return {
        "container_utilization": {},
        "arriving_soon": [],
        "demurrage_alerts": [],
        "port_performance": {}
    }

@api_router.get("/dashboard/variance-analysis")
async def get_variance_analysis(current_user: User = Depends(check_permission(Permission.VIEW_ANALYTICS.value))):
    return {
        "summary": {},
        "top_sku_variances": [],
        "trends": []
    }

@api_router.get("/dashboard/cash-flow-forecast")
async def get_cash_flow_forecast(current_user: User = Depends(check_permission(Permission.VIEW_FINANCIALS.value))):
    return {
        "duty_forecasts": [],
        "demurrage_costs": [],
        "supplier_payments": [],
        "forecast_period": 30
    }

# Import Order endpoints
@api_router.post("/import-orders", response_model=ImportOrder)
async def create_import_order(order_data: ImportOrderCreate, current_user: User = Depends(check_permission(Permission.CREATE_ORDERS.value))):
    # Get container specifications
    container = await db.containers.find_one({"container_type": order_data.container_type}, {"_id": 0})
    if not container:
        raise HTTPException(status_code=400, detail="Container type not found")
    
    # Calculate totals
    total_quantity = sum(item.quantity for item in order_data.items)
    total_value = sum(item.total_value for item in order_data.items)
    
    # Calculate weight and CBM by fetching SKU data
    total_weight = 0.0
    total_cbm = 0.0
    for item in order_data.items:
        sku = await db.skus.find_one({"id": item.sku_id}, {"_id": 0})
        if not sku:
            raise HTTPException(status_code=400, detail=f"SKU {item.sku_id} not found")
        total_weight += sku['weight_per_unit'] * item.quantity
        total_cbm += sku['cbm_per_unit'] * item.quantity
    
    # Calculate utilization
    weight_utilization = (total_weight / container['max_weight']) * 100
    cbm_utilization = (total_cbm / container['max_cbm']) * 100
    utilization_percentage = max(weight_utilization, cbm_utilization)
    
    # Calculate ETA: if port is specified, calculate from transit_days; otherwise use provided eta
    calculated_eta = order_data.eta
    if order_data.port_id:
        port = await db.ports.find_one({"id": order_data.port_id}, {"_id": 0})
        if port:
            calculated_eta = datetime.now(timezone.utc) + timedelta(days=port.get('transit_days', 30))
    
    # Build order data dictionary excluding eta to avoid duplicate
    order_dict = order_data.model_dump()
    order_dict.pop('eta', None)  # Remove eta to set it explicitly
    
    order = ImportOrder(
        **order_dict,
        total_quantity=total_quantity,
        total_weight=total_weight,
        total_cbm=total_cbm,
        total_value=total_value,
        utilization_percentage=utilization_percentage,
        eta=calculated_eta,
        created_by=current_user.id
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc['eta']:
        doc['eta'] = doc['eta'].isoformat()
    
    await db.import_orders.insert_one(doc)
    return order

@api_router.get("/import-orders", response_model=List[ImportOrder])
async def get_import_orders(current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    orders = await db.import_orders.find({}, {"_id": 0}).to_list(1000)
    for order in orders:
        if isinstance(order['created_at'], str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if order.get('updated_at') and isinstance(order['updated_at'], str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
        elif not order.get('updated_at'):
            order['updated_at'] = order['created_at']  # Default to created_at if missing
        if order.get('eta') and isinstance(order['eta'], str):
            order['eta'] = datetime.fromisoformat(order['eta'])
        
        # Set default values for missing fields
        if not order.get('landed_cost_per_unit'):
            order['landed_cost_per_unit'] = {}
        if not order.get('port_id'):
            order['port_id'] = None
        if not order.get('eta'):
            order['eta'] = None
        if not order.get('demurrage_start'):
            order['demurrage_start'] = None
        if not order.get('customs_value'):
            order['customs_value'] = None
    return orders

@api_router.get("/import-orders/{order_id}", response_model=ImportOrder)
async def get_import_order(order_id: str, current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    order = await db.import_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Import order not found")
    
    if isinstance(order['created_at'], str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    if order.get('updated_at') and isinstance(order['updated_at'], str):
        order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    elif not order.get('updated_at'):
        order['updated_at'] = order['created_at']  # Default to created_at if missing
    if order.get('eta') and isinstance(order['eta'], str):
        order['eta'] = datetime.fromisoformat(order['eta'])
    
    # Set default values for missing optional fields
    if not order.get('landed_cost_per_unit'):
        order['landed_cost_per_unit'] = {}
    if not order.get('port_id'):
        order['port_id'] = None
    if not order.get('eta'):
        order['eta'] = None
    if not order.get('demurrage_start'):
        order['demurrage_start'] = None
    if not order.get('customs_value'):
        order['customs_value'] = None
    
    return ImportOrder(**order)

# ==================== IMPORT ORDER EDIT/DELETE/DUPLICATE ====================

@api_router.put("/import-orders/{order_id}", response_model=ImportOrder)
async def update_import_order(
    order_id: str,
    order_update: dict,
    current_user: User = Depends(check_permission(Permission.CREATE_ORDERS.value))
):
    """Update an existing import order"""
    existing = await db.import_orders.find_one({"id": order_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Import order not found")
    
    # Prevent updating if already shipped/delivered
    if existing.get('status') in ['Shipped', 'In Transit', 'Arrived', 'Delivered']:
        raise HTTPException(status_code=400, detail=f"Cannot edit order with status: {existing.get('status')}")
    
    # Update allowed fields
    allowed_fields = ['po_number', 'supplier_id', 'port_id', 'container_type', 'currency', 
                      'items', 'status', 'eta', 'shipping_date', 'duty_rate', 'freight_charges', 
                      'insurance_charges', 'other_charges']
    
    update_data = {k: v for k, v in order_update.items() if k in allowed_fields and v is not None}
    
    # Recalculate totals if items changed
    if 'items' in update_data:
        items = update_data['items']
        total_quantity = sum(item.get('quantity', 0) for item in items)
        total_value = sum(item.get('total_value', 0) for item in items)
        
        # Calculate weight and CBM from SKUs
        total_weight = 0
        total_cbm = 0
        for item in items:
            sku = await db.skus.find_one({"id": item.get('sku_id')}, {"_id": 0})
            if sku:
                total_weight += item.get('quantity', 0) * sku.get('weight_per_unit', 0)
                total_cbm += item.get('quantity', 0) * sku.get('cbm_per_unit', 0)
        
        update_data['total_quantity'] = total_quantity
        update_data['total_value'] = total_value
        update_data['total_weight'] = total_weight
        update_data['total_cbm'] = total_cbm
        
        # Recalculate utilization
        container = await db.containers.find_one({"container_type": update_data.get('container_type', existing.get('container_type'))}, {"_id": 0})
        if container:
            weight_util = (total_weight / container.get('max_weight', 1)) * 100
            cbm_util = (total_cbm / container.get('max_cbm', 1)) * 100
            update_data['utilization_percentage'] = round(max(weight_util, cbm_util), 2)
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.import_orders.update_one({"id": order_id}, {"$set": update_data})
    
    updated_order = await db.import_orders.find_one({"id": order_id}, {"_id": 0})
    if isinstance(updated_order['created_at'], str):
        updated_order['created_at'] = datetime.fromisoformat(updated_order['created_at'])
    if updated_order.get('updated_at') and isinstance(updated_order['updated_at'], str):
        updated_order['updated_at'] = datetime.fromisoformat(updated_order['updated_at'])
    
    return ImportOrder(**updated_order)

@api_router.delete("/import-orders/{order_id}")
async def delete_import_order(
    order_id: str,
    current_user: User = Depends(check_permission(Permission.CREATE_ORDERS.value))
):
    """Delete an import order"""
    existing = await db.import_orders.find_one({"id": order_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Import order not found")
    
    # Prevent deleting if already shipped/delivered
    if existing.get('status') in ['Shipped', 'In Transit', 'Arrived', 'Delivered']:
        raise HTTPException(status_code=400, detail=f"Cannot delete order with status: {existing.get('status')}")
    
    # Delete related records
    await db.payments.delete_many({"import_order_id": order_id})
    await db.documents.delete_many({"import_order_id": order_id})
    await db.actual_loadings.delete_many({"import_order_id": order_id})
    
    result = await db.import_orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Import order not found")
    
    return {"message": "Import order deleted successfully"}

@api_router.post("/import-orders/{order_id}/duplicate", response_model=ImportOrder)
async def duplicate_import_order(
    order_id: str,
    new_po_number: str = None,
    current_user: User = Depends(check_permission(Permission.CREATE_ORDERS.value))
):
    """Duplicate an existing import order with a new PO number"""
    existing = await db.import_orders.find_one({"id": order_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Import order not found")
    
    # Generate new PO number if not provided
    if not new_po_number:
        base_po = existing.get('po_number', 'PO')
        new_po_number = f"{base_po}-COPY-{str(uuid.uuid4())[:8].upper()}"
    
    # Check if new PO number already exists
    po_exists = await db.import_orders.find_one({"po_number": new_po_number})
    if po_exists:
        raise HTTPException(status_code=400, detail="PO number already exists")
    
    # Create new order
    new_order = {
        **existing,
        "id": str(uuid.uuid4()),
        "po_number": new_po_number,
        "status": "Draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.id,
        "eta": None,
        "shipping_date": None,
        "demurrage_start": None
    }
    
    await db.import_orders.insert_one(new_order)
    
    if isinstance(new_order['created_at'], str):
        new_order['created_at'] = datetime.fromisoformat(new_order['created_at'])
    if isinstance(new_order['updated_at'], str):
        new_order['updated_at'] = datetime.fromisoformat(new_order['updated_at'])
    
    return ImportOrder(**new_order)

@api_router.put("/import-orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: str,
    shipping_date: str = None,
    current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))
):
    """Update order status (for tracking shipped orders)"""
    existing = await db.import_orders.find_one({"id": order_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Import order not found")
    
    # Validate status
    valid_statuses = ["Draft", "Tentative", "Confirmed", "Loaded", "Shipped", "In Transit", "Arrived", "Delivered", "Cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if shipping_date:
        update_data["shipping_date"] = shipping_date
    
    await db.import_orders.update_one({"id": order_id}, {"$set": update_data})
    
    return {"message": f"Order status updated to {status}"}

# Actual Loading endpoints
@api_router.post("/actual-loadings", response_model=ActualLoading)
async def create_actual_loading(loading_data: ActualLoadingCreate, current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    # Calculate totals
    total_planned_quantity = sum(item.planned_quantity for item in loading_data.items)
    total_actual_quantity = sum(item.actual_quantity for item in loading_data.items)
    total_variance_quantity = total_actual_quantity - total_planned_quantity
    
    total_planned_weight = sum(item.planned_weight for item in loading_data.items)
    total_actual_weight = sum(item.actual_weight for item in loading_data.items)
    total_variance_weight = total_actual_weight - total_planned_weight
    
    total_planned_value = sum(item.planned_value for item in loading_data.items)
    total_actual_value = sum(item.actual_value for item in loading_data.items)
    total_variance_value = total_actual_value - total_planned_value
    
    loading = ActualLoading(
        import_order_id=loading_data.import_order_id,
        items=loading_data.items,
        loading_date=loading_data.loading_date or datetime.now(timezone.utc),
        total_planned_quantity=total_planned_quantity,
        total_actual_quantity=total_actual_quantity,
        total_variance_quantity=total_variance_quantity,
        total_planned_weight=total_planned_weight,
        total_actual_weight=total_actual_weight,
        total_variance_weight=total_variance_weight,
        total_planned_value=total_planned_value,
        total_actual_value=total_actual_value,
        total_variance_value=total_variance_value,
        created_by=current_user.id
    )
    
    doc = loading.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('loading_date'):
        doc['loading_date'] = doc['loading_date'].isoformat()
    
    await db.actual_loadings.insert_one(doc)
    
    # Update import order status to LOADED
    await db.import_orders.update_one(
        {"id": loading_data.import_order_id},
        {"$set": {"status": OrderStatus.LOADED.value}}
    )
    
    return loading

@api_router.get("/actual-loadings", response_model=List[ActualLoading])
async def get_actual_loadings(current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    loadings = await db.actual_loadings.find({}, {"_id": 0}).to_list(1000)
    for loading in loadings:
        if isinstance(loading['created_at'], str):
            loading['created_at'] = datetime.fromisoformat(loading['created_at'])
        if loading.get('loading_date') and isinstance(loading['loading_date'], str):
            loading['loading_date'] = datetime.fromisoformat(loading['loading_date'])
    return loadings

# ==================== PAYMENT ENDPOINTS ====================

@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, current_user: User = Depends(check_permission(Permission.MANAGE_PAYMENTS.value))):
    # Get the import order to find supplier_id
    order = await db.import_orders.find_one({"id": payment_data.import_order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Import order not found")
    
    # Get current FX rate
    fx_rate = await db.fx_rates.find_one(
        {"from_currency": payment_data.currency.value, "to_currency": "INR"},
        {"_id": 0}
    )
    current_fx_rate = fx_rate['rate'] if fx_rate else 1.0
    
    # Calculate INR amount
    inr_amount = payment_data.amount * current_fx_rate
    
    payment = Payment(
        import_order_id=payment_data.import_order_id,
        supplier_id=order['supplier_id'],
        amount=payment_data.amount,
        currency=payment_data.currency,
        fx_rate=current_fx_rate,
        inr_amount=inr_amount,
        payment_date=payment_data.payment_date,
        reference=payment_data.reference,
        status=PaymentStatus.PAID,
        created_by=current_user.id
    )
    
    doc = payment.model_dump()
    doc['currency'] = doc['currency'].value if hasattr(doc['currency'], 'value') else doc['currency']
    doc['status'] = doc['status'].value if hasattr(doc['status'], 'value') else doc['status']
    doc['created_at'] = doc['created_at'].isoformat()
    doc['payment_date'] = doc['payment_date'].isoformat()
    
    await db.payments.insert_one(doc)
    
    # Update supplier balance
    await db.suppliers.update_one(
        {"id": order['supplier_id']},
        {"$inc": {"current_balance": -payment_data.amount}}
    )
    
    return payment

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    for payment in payments:
        if isinstance(payment['created_at'], str):
            payment['created_at'] = datetime.fromisoformat(payment['created_at'])
        if isinstance(payment['payment_date'], str):
            payment['payment_date'] = datetime.fromisoformat(payment['payment_date'])
    return payments

@api_router.get("/payments/by-order/{order_id}", response_model=List[Payment])
async def get_payments_by_order(order_id: str, current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    payments = await db.payments.find({"import_order_id": order_id}, {"_id": 0}).to_list(1000)
    for payment in payments:
        if isinstance(payment['created_at'], str):
            payment['created_at'] = datetime.fromisoformat(payment['created_at'])
        if isinstance(payment['payment_date'], str):
            payment['payment_date'] = datetime.fromisoformat(payment['payment_date'])
    return payments

@api_router.get("/payments/by-supplier/{supplier_id}", response_model=List[Payment])
async def get_payments_by_supplier(supplier_id: str, current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    payments = await db.payments.find({"supplier_id": supplier_id}, {"_id": 0}).to_list(1000)
    for payment in payments:
        if isinstance(payment['created_at'], str):
            payment['created_at'] = datetime.fromisoformat(payment['created_at'])
        if isinstance(payment['payment_date'], str):
            payment['payment_date'] = datetime.fromisoformat(payment['payment_date'])
    return payments

@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, current_user: User = Depends(check_permission(Permission.MANAGE_PAYMENTS.value))):
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Restore supplier balance
    await db.suppliers.update_one(
        {"id": payment['supplier_id']},
        {"$inc": {"current_balance": payment['amount']}}
    )
    
    result = await db.payments.delete_one({"id": payment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment deleted successfully"}

# ==================== DOCUMENT ENDPOINTS ====================

@api_router.post("/documents/upload", response_model=Document)
async def upload_document(
    file: UploadFile = File(...),
    import_order_id: str = None,
    document_type: str = None,
    notes: str = None,
    current_user: User = Depends(check_permission(Permission.MANAGE_DOCUMENTS.value))
):
    # Validate order exists
    order = await db.import_orders.find_one({"id": import_order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Import order not found")
    
    # Validate document type
    try:
        doc_type = DocumentType(document_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {[e.value for e in DocumentType]}")
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOADS_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get file size
    file_size = file_path.stat().st_size
    
    document = Document(
        import_order_id=import_order_id,
        document_type=doc_type,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=file_size,
        uploaded_by=current_user.id,
        notes=notes
    )
    
    doc = document.model_dump()
    doc['document_type'] = doc['document_type'].value if hasattr(doc['document_type'], 'value') else doc['document_type']
    doc['uploaded_at'] = doc['uploaded_at'].isoformat()
    
    await db.documents.insert_one(doc)
    
    return document

@api_router.get("/documents", response_model=List[Document])
async def get_all_documents(current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    documents = await db.documents.find({}, {"_id": 0}).to_list(1000)
    for doc in documents:
        if isinstance(doc['uploaded_at'], str):
            doc['uploaded_at'] = datetime.fromisoformat(doc['uploaded_at'])
    return documents

@api_router.get("/documents/order/{order_id}", response_model=List[Document])
async def get_documents_by_order(order_id: str, current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    documents = await db.documents.find({"import_order_id": order_id}, {"_id": 0}).to_list(1000)
    for doc in documents:
        if isinstance(doc['uploaded_at'], str):
            doc['uploaded_at'] = datetime.fromisoformat(doc['uploaded_at'])
    return documents

@api_router.get("/documents/{document_id}", response_model=Document)
async def get_document(document_id: str, current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    document = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if isinstance(document['uploaded_at'], str):
        document['uploaded_at'] = datetime.fromisoformat(document['uploaded_at'])
    return Document(**document)

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, current_user: User = Depends(check_permission(Permission.MANAGE_DOCUMENTS.value))):
    document = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from disk
    file_path = Path(document['file_path'])
    if file_path.exists():
        file_path.unlink()
    
    result = await db.documents.delete_one({"id": document_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}

# ==================== ENHANCED DASHBOARD ENDPOINTS ====================

@api_router.get("/dashboard/demurrage-clock")
async def get_demurrage_clock(current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    """Get demurrage status for all orders in transit or at port"""
    orders = await db.import_orders.find(
        {"status": {"$in": ["Shipped", "Arrived"]}},
        {"_id": 0}
    ).to_list(1000)
    
    demurrage_items = []
    for order in orders:
        if order.get('eta'):
            eta = datetime.fromisoformat(order['eta']) if isinstance(order['eta'], str) else order['eta']
            
            # Get port demurrage settings
            port = await db.ports.find_one({"id": order.get('port_id')}, {"_id": 0})
            free_days = port.get('demurrage_free_days', 7) if port else 7
            rate = port.get('demurrage_rate', 50.0) if port else 50.0
            
            days_since_arrival = (datetime.now(timezone.utc) - eta).days
            demurrage_days = max(0, days_since_arrival - free_days)
            demurrage_cost = demurrage_days * rate
            
            demurrage_items.append({
                "po_number": order['po_number'],
                "eta": eta.isoformat(),
                "days_since_arrival": days_since_arrival,
                "free_days": free_days,
                "demurrage_days": demurrage_days,
                "daily_rate": rate,
                "total_demurrage": demurrage_cost,
                "status": "Accruing" if demurrage_days > 0 else "Free Period"
            })
    
    return {
        "items": demurrage_items,
        "total_demurrage": sum(item['total_demurrage'] for item in demurrage_items),
        "orders_with_demurrage": len([i for i in demurrage_items if i['demurrage_days'] > 0])
    }

@api_router.get("/dashboard/landed-cost/{order_id}")
async def get_landed_cost(order_id: str, current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    """Calculate landed cost breakdown for an order"""
    order = await db.import_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get container details for freight allocation
    container = await db.containers.find_one({"container_type": order.get('container_type')}, {"_id": 0})
    
    # Calculate cost components
    goods_value = order.get('total_value', 0)
    freight = order.get('freight_charges', 0)
    insurance = order.get('insurance_charges', 0)
    duty_rate = order.get('duty_rate', 0.1)
    other_charges = order.get('other_charges', 0)
    
    # CIF value
    cif_value = goods_value + freight + insurance
    
    # Duty calculation
    duty_amount = cif_value * duty_rate
    
    # Total landed cost
    total_landed_cost = cif_value + duty_amount + other_charges
    
    # Per-unit cost (if quantity available)
    total_quantity = order.get('total_quantity', 1)
    per_unit_cost = total_landed_cost / total_quantity if total_quantity > 0 else 0
    
    # Cost breakdown by type (hybrid allocation)
    # Freight by CBM, Duty by Value, Port Charges by Weight
    items_breakdown = []
    for item in order.get('items', []):
        sku = await db.skus.find_one({"id": item.get('sku_id')}, {"_id": 0})
        if sku:
            item_cbm = sku.get('cbm_per_unit', 0) * item.get('quantity', 0)
            item_weight = sku.get('weight_per_unit', 0) * item.get('quantity', 0)
            item_value = item.get('total_value', 0)
            
            # Allocation ratios
            total_cbm = order.get('total_cbm', 1)
            total_weight = order.get('total_weight', 1)
            total_value_ratio = item_value / goods_value if goods_value > 0 else 0
            cbm_ratio = item_cbm / total_cbm if total_cbm > 0 else 0
            weight_ratio = item_weight / total_weight if total_weight > 0 else 0
            
            items_breakdown.append({
                "sku_code": sku.get('sku_code'),
                "quantity": item.get('quantity'),
                "goods_value": item_value,
                "freight_allocated": freight * cbm_ratio,
                "duty_allocated": duty_amount * total_value_ratio,
                "other_allocated": other_charges * weight_ratio,
                "total_cost": item_value + (freight * cbm_ratio) + (duty_amount * total_value_ratio) + (other_charges * weight_ratio),
                "per_unit_cost": (item_value + (freight * cbm_ratio) + (duty_amount * total_value_ratio) + (other_charges * weight_ratio)) / item.get('quantity', 1)
            })
    
    return {
        "order_id": order_id,
        "po_number": order.get('po_number'),
        "cost_summary": {
            "goods_value": goods_value,
            "freight": freight,
            "insurance": insurance,
            "cif_value": cif_value,
            "duty_rate": duty_rate,
            "duty_amount": duty_amount,
            "other_charges": other_charges,
            "total_landed_cost": total_landed_cost,
            "per_unit_cost": per_unit_cost
        },
        "items_breakdown": items_breakdown
    }

@api_router.get("/dashboard/kpi-summary")
async def get_kpi_summary(current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    """Get comprehensive KPI summary for the owner's dashboard"""
    
    # Orders metrics
    total_orders = await db.import_orders.count_documents({})
    orders_by_status = {}
    for status in OrderStatus:
        count = await db.import_orders.count_documents({"status": status.value})
        if count > 0:
            orders_by_status[status.value] = count
    
    # Pipeline value (orders not yet delivered)
    pipeline_orders = await db.import_orders.find(
        {"status": {"$nin": ["Delivered", "Cancelled"]}},
        {"_id": 0, "total_value": 1, "currency": 1}
    ).to_list(1000)
    pipeline_value = sum(o.get('total_value', 0) for o in pipeline_orders)
    
    # Container utilization
    orders_with_util = await db.import_orders.find(
        {"utilization_percentage": {"$exists": True}},
        {"_id": 0, "utilization_percentage": 1}
    ).to_list(1000)
    avg_utilization = sum(o.get('utilization_percentage', 0) for o in orders_with_util) / len(orders_with_util) if orders_with_util else 0
    
    # Supplier metrics
    suppliers = await db.suppliers.find({}, {"_id": 0, "current_balance": 1, "base_currency": 1}).to_list(1000)
    total_payables = sum(s.get('current_balance', 0) for s in suppliers)
    
    # FX exposure
    orders = await db.import_orders.find({"status": {"$nin": ["Delivered", "Cancelled"]}}, {"_id": 0}).to_list(1000)
    fx_exposure = {}
    for order in orders:
        currency = order.get('currency', 'USD')
        if currency not in fx_exposure:
            fx_exposure[currency] = {"total_value": 0, "order_count": 0}
        fx_exposure[currency]['total_value'] += order.get('total_value', 0)
        fx_exposure[currency]['order_count'] += 1
    
    # Variance metrics
    loadings = await db.actual_loadings.find({}, {"_id": 0}).to_list(1000)
    total_variance_value = sum(l.get('total_variance_value', 0) for l in loadings)
    
    # Payment metrics
    payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    total_payments = sum(p.get('inr_amount', 0) for p in payments)
    
    return {
        "orders": {
            "total": total_orders,
            "by_status": orders_by_status,
            "pipeline_value": pipeline_value
        },
        "container": {
            "avg_utilization": round(avg_utilization, 1)
        },
        "financial": {
            "total_payables": total_payables,
            "total_payments": total_payments,
            "fx_exposure": fx_exposure,
            "variance_impact": total_variance_value
        },
        "suppliers": {
            "total": len(suppliers),
            "with_balance": len([s for s in suppliers if s.get('current_balance', 0) > 0])
        }
    }

# ==================== ERP EXPORT ENDPOINT ====================

@api_router.get("/erp-export/{order_id}")
async def export_order_for_erp(order_id: str, current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    """Generate clean JSON export for ERP integration"""
    order = await db.import_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get related data
    supplier = await db.suppliers.find_one({"id": order.get('supplier_id')}, {"_id": 0})
    payments = await db.payments.find({"import_order_id": order_id}, {"_id": 0}).to_list(1000)
    documents = await db.documents.find({"import_order_id": order_id}, {"_id": 0}).to_list(1000)
    loading = await db.actual_loadings.find_one({"import_order_id": order_id}, {"_id": 0})
    
    # Get SKU details for items
    items_with_sku = []
    for item in order.get('items', []):
        sku = await db.skus.find_one({"id": item.get('sku_id')}, {"_id": 0})
        items_with_sku.append({
            "sku_code": sku.get('sku_code') if sku else 'N/A',
            "description": sku.get('description') if sku else item.get('item_description'),
            "hsn_code": sku.get('hsn_code') if sku else '',
            "quantity": item.get('quantity'),
            "unit_price": item.get('unit_price'),
            "total_value": item.get('total_value'),
            "actual_quantity": None,
            "variance": None
        })
    
    # Add actual loading data if available
    if loading:
        for i, item in enumerate(items_with_sku):
            if i < len(loading.get('items', [])):
                load_item = loading['items'][i]
                item['actual_quantity'] = load_item.get('actual_quantity')
                item['variance'] = load_item.get('variance_quantity')
    
    # Calculate landed cost
    landed_cost_response = await get_landed_cost(order_id, current_user)
    
    return {
        "export_type": "ICMS_ERP_EXPORT",
        "export_version": "1.0",
        "export_date": datetime.now(timezone.utc).isoformat(),
        "order": {
            "po_number": order.get('po_number'),
            "status": order.get('status'),
            "container_type": order.get('container_type'),
            "currency": order.get('currency'),
            "created_at": order.get('created_at'),
            "eta": order.get('eta')
        },
        "supplier": {
            "name": supplier.get('name') if supplier else 'N/A',
            "code": supplier.get('code') if supplier else 'N/A',
            "currency": supplier.get('base_currency') if supplier else 'N/A'
        },
        "items": items_with_sku,
        "financials": {
            "total_value": order.get('total_value'),
            "landed_cost": landed_cost_response.get('cost_summary'),
            "payments": [{
                "reference": p.get('reference'),
                "amount": p.get('amount'),
                "currency": p.get('currency'),
                "fx_rate": p.get('fx_rate'),
                "inr_amount": p.get('inr_amount'),
                "date": p.get('payment_date')
            } for p in payments]
        },
        "logistics": {
            "total_weight": order.get('total_weight'),
            "total_cbm": order.get('total_cbm'),
            "utilization_percentage": order.get('utilization_percentage')
        },
        "compliance": {
            "documents": [{
                "type": d.get('document_type'),
                "filename": d.get('original_filename'),
                "uploaded_at": d.get('uploaded_at')
            } for d in documents]
        }
    }

# Include the router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()