from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
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
    hsn_code: str
    micron: Optional[float] = None
    weight_per_unit: float
    cbm_per_unit: float
    unit_cost: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SKUCreate(BaseModel):
    sku_code: str
    description: str
    hsn_code: str
    micron: Optional[float] = None
    weight_per_unit: float
    cbm_per_unit: float
    unit_cost: Optional[float] = None

class Supplier(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    base_currency: Currency
    contact_email: str
    contact_phone: str
    address: str
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
    opening_balance: float = 0.0

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
    quantity: int
    unit_price: float
    total_value: float

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
async def refresh_fx_rates(current_user: User = Depends(check_permission(Permission.SYSTEM_ADMIN.value))):
    success = await fetch_fx_rates()
    if success:
        return {"message": "FX rates updated successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to update FX rates")

# Continue with other endpoints...
# [Rest of the enhanced API endpoints will be in the next file parts due to length]

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