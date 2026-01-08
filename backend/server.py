from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import jwt
from passlib.context import CryptContext
from enum import Enum

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

# Create the main app
app = FastAPI(title="Import & Container Management System")
api_router = APIRouter(prefix="/api")

# Enums
class UserRole(str, Enum):
    OWNER = "Owner"
    LOGISTICS = "Logistics"
    ACCOUNTS = "Accounts"
    PURCHASE = "Purchase"

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
    CLEARED = "Cleared"

class Currency(str, Enum):
    USD = "USD"
    CNY = "CNY"
    EUR = "EUR"
    INR = "INR"

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    weight_per_unit: float  # in KG
    cbm_per_unit: float  # cubic meter
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SKUCreate(BaseModel):
    sku_code: str
    description: str
    hsn_code: str
    micron: Optional[float] = None
    weight_per_unit: float
    cbm_per_unit: float

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PortCreate(BaseModel):
    name: str
    code: str
    country: str

class Container(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    container_type: ContainerType
    max_weight: float  # in KG
    max_cbm: float  # cubic meter
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContainerCreate(BaseModel):
    container_type: ContainerType
    max_weight: float
    max_cbm: float

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
    container_type: ContainerType
    currency: Currency
    items: List[ImportOrderItem]
    total_quantity: int
    total_weight: float
    total_cbm: float
    total_value: float
    utilization_percentage: float
    status: OrderStatus = OrderStatus.DRAFT
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ImportOrderCreate(BaseModel):
    po_number: str
    supplier_id: str
    container_type: ContainerType
    currency: Currency
    items: List[ImportOrderItem]

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
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ActualLoadingCreate(BaseModel):
    import_order_id: str
    items: List[ActualLoadingItem]

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
    return User(**user)

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "ICMS API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ICMS API"}

# Auth endpoints
@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.model_dump()
    user_dict.pop('password')
    user = User(**user_dict)
    
    # Store in database
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
    
    # Convert timestamp back to datetime
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    user_obj = User(**{k: v for k, v in user.items() if k != 'password'})
    access_token = create_access_token(data={"sub": user_obj.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# SKU endpoints
@api_router.post("/skus", response_model=SKU)
async def create_sku(sku_data: SKUCreate, current_user: User = Depends(get_current_user)):
    # Check if SKU code exists
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

# Supplier endpoints
@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(supplier_data: SupplierCreate, current_user: User = Depends(get_current_user)):
    existing_supplier = await db.suppliers.find_one({"code": supplier_data.code})
    if existing_supplier:
        raise HTTPException(status_code=400, detail="Supplier code already exists")
    
    supplier = Supplier(**supplier_data.model_dump())
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

# Port endpoints
@api_router.post("/ports", response_model=Port)
async def create_port(port_data: PortCreate, current_user: User = Depends(get_current_user)):
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

# Container endpoints
@api_router.post("/containers", response_model=Container)
async def create_container(container_data: ContainerCreate, current_user: User = Depends(get_current_user)):
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

# Import Order endpoints
@api_router.post("/import-orders", response_model=ImportOrder)
async def create_import_order(order_data: ImportOrderCreate, current_user: User = Depends(get_current_user)):
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
    
    order = ImportOrder(
        **order_data.model_dump(),
        total_quantity=total_quantity,
        total_weight=total_weight,
        total_cbm=total_cbm,
        total_value=total_value,
        utilization_percentage=utilization_percentage,
        created_by=current_user.id
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.import_orders.insert_one(doc)
    return order

@api_router.get("/import-orders", response_model=List[ImportOrder])
async def get_import_orders(current_user: User = Depends(get_current_user)):
    orders = await db.import_orders.find({}, {"_id": 0}).to_list(1000)
    for order in orders:
        if isinstance(order['created_at'], str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    return orders

@api_router.get("/import-orders/{order_id}", response_model=ImportOrder)
async def get_import_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = await db.import_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Import order not found")
    if isinstance(order['created_at'], str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    return ImportOrder(**order)

# Actual Loading endpoints
@api_router.post("/actual-loadings", response_model=ActualLoading)
async def create_actual_loading(loading_data: ActualLoadingCreate, current_user: User = Depends(get_current_user)):
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
    
    await db.actual_loadings.insert_one(doc)
    
    # Update import order status to LOADED
    await db.import_orders.update_one(
        {"id": loading_data.import_order_id},
        {"$set": {"status": OrderStatus.LOADED}}
    )
    
    return loading

@api_router.get("/actual-loadings", response_model=List[ActualLoading])
async def get_actual_loadings(current_user: User = Depends(get_current_user)):
    loadings = await db.actual_loadings.find({}, {"_id": 0}).to_list(1000)
    for loading in loadings:
        if isinstance(loading['created_at'], str):
            loading['created_at'] = datetime.fromisoformat(loading['created_at'])
    return loadings

# Dashboard endpoint
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Basic stats
    total_orders = await db.import_orders.count_documents({})
    pending_orders = await db.import_orders.count_documents({"status": {"$in": ["Draft", "Tentative", "Confirmed"]}})
    total_suppliers = await db.suppliers.count_documents({})
    total_skus = await db.skus.count_documents({})
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_suppliers": total_suppliers,
        "total_skus": total_skus
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