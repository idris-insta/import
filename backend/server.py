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
    marking: Optional[str] = None  # From PDF: ORDER NO MARKING

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
    loading_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
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
        **loading_data.model_dump(),
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