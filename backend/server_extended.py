# Extended API endpoints - Part 2 of server.py
# This contains the remaining API endpoints

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

@api_router.put("/skus/{sku_id}", response_model=SKU)
async def update_sku(sku_id: str, sku_data: SKUCreate, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    existing_sku = await db.skus.find_one({"id": sku_id})
    if not existing_sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    
    update_data = sku_data.model_dump()
    await db.skus.update_one({"id": sku_id}, {"$set": update_data})
    
    updated_sku = await db.skus.find_one({"id": sku_id}, {"_id": 0})
    if isinstance(updated_sku['created_at'], str):
        updated_sku['created_at'] = datetime.fromisoformat(updated_sku['created_at'])
    
    return SKU(**updated_sku)

@api_router.delete("/skus/{sku_id}")
async def delete_sku(sku_id: str, current_user: User = Depends(check_permission(Permission.MANAGE_MASTERS.value))):
    result = await db.skus.delete_one({"id": sku_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SKU not found")
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

# Port endpoints with enhanced features
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

# Container endpoints with freight rates
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

# Enhanced Import Order endpoints
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
    
    # Calculate ETA if port is specified
    eta = None
    if order_data.port_id:
        port = await db.ports.find_one({"id": order_data.port_id}, {"_id": 0})
        if port:
            eta = datetime.now(timezone.utc) + timedelta(days=port['transit_days'])
    
    order = ImportOrder(
        **order_data.model_dump(),
        total_quantity=total_quantity,
        total_weight=total_weight,
        total_cbm=total_cbm,
        total_value=total_value,
        utilization_percentage=utilization_percentage,
        eta=eta,
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
        if isinstance(order['updated_at'], str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
        if order.get('eta') and isinstance(order['eta'], str):
            order['eta'] = datetime.fromisoformat(order['eta'])
        if order.get('demurrage_start') and isinstance(order['demurrage_start'], str):
            order['demurrage_start'] = datetime.fromisoformat(order['demurrage_start'])
    return orders

@api_router.get("/import-orders/{order_id}", response_model=ImportOrder)
async def get_import_order(order_id: str, current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))):
    order = await db.import_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Import order not found")
    
    if isinstance(order['created_at'], str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    if isinstance(order['updated_at'], str):
        order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    if order.get('eta') and isinstance(order['eta'], str):
        order['eta'] = datetime.fromisoformat(order['eta'])
    if order.get('demurrage_start') and isinstance(order['demurrage_start'], str):
        order['demurrage_start'] = datetime.fromisoformat(order['demurrage_start'])
    
    return ImportOrder(**order)

@api_router.put("/import-orders/{order_id}/status")
async def update_order_status(
    order_id: str, 
    status: OrderStatus,
    current_user: User = Depends(check_permission(Permission.EDIT_ORDERS.value))
):
    order = await db.import_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Import order not found")
    
    update_data = {
        "status": status.value,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Set demurrage start when status changes to "Arrived"
    if status == OrderStatus.ARRIVED:
        update_data["demurrage_start"] = datetime.now(timezone.utc).isoformat()
    
    await db.import_orders.update_one(
        {"id": order_id},
        {"$set": update_data}
    )
    
    return {"message": "Order status updated successfully"}

# Payment endpoints
@api_router.post("/payments", response_model=Payment)
async def create_payment(
    payment_data: PaymentCreate, 
    current_user: User = Depends(check_permission(Permission.MANAGE_PAYMENTS.value))
):
    # Get import order
    order = await db.import_orders.find_one({"id": payment_data.import_order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Import order not found")
    
    # Get current FX rate
    fx_rate = await get_fx_rate(payment_data.currency)
    inr_amount = payment_data.amount * fx_rate
    
    payment = Payment(
        **payment_data.model_dump(),
        supplier_id=order['supplier_id'],
        fx_rate=fx_rate,
        inr_amount=inr_amount,
        created_by=current_user.id
    )
    
    doc = payment.model_dump()
    doc['payment_date'] = doc['payment_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.payments.insert_one(doc)
    
    # Update supplier balance
    await db.suppliers.update_one(
        {"id": order['supplier_id']},
        {"$inc": {"current_balance": payment_data.amount}}
    )
    
    return payment

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(current_user: User = Depends(check_permission(Permission.VIEW_FINANCIALS.value))):
    payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    for payment in payments:
        if isinstance(payment['payment_date'], str):
            payment['payment_date'] = datetime.fromisoformat(payment['payment_date'])
        if isinstance(payment['created_at'], str):
            payment['created_at'] = datetime.fromisoformat(payment['created_at'])
    return payments

@api_router.get("/payments/order/{order_id}")
async def get_order_payments(
    order_id: str,
    current_user: User = Depends(check_permission(Permission.VIEW_FINANCIALS.value))
):
    payments = await db.payments.find({"import_order_id": order_id}, {"_id": 0}).to_list(1000)
    for payment in payments:
        if isinstance(payment['payment_date'], str):
            payment['payment_date'] = datetime.fromisoformat(payment['payment_date'])
        if isinstance(payment['created_at'], str):
            payment['created_at'] = datetime.fromisoformat(payment['created_at'])
    return payments

# Document Management endpoints
@api_router.post("/documents/upload")
async def upload_document(
    import_order_id: str,
    document_type: DocumentType,
    file: UploadFile = File(...),
    notes: Optional[str] = None,
    current_user: User = Depends(check_permission(Permission.MANAGE_DOCUMENTS.value))
):
    # Validate order exists
    order = await db.import_orders.find_one({"id": import_order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Import order not found")
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOADS_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create document record
    document = Document(
        import_order_id=import_order_id,
        document_type=document_type,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=file_path.stat().st_size,
        uploaded_by=current_user.id,
        notes=notes
    )
    
    doc = document.model_dump()
    doc['uploaded_at'] = doc['uploaded_at'].isoformat()
    
    await db.documents.insert_one(doc)
    
    return {"message": "Document uploaded successfully", "document_id": document.id}

@api_router.get("/documents/order/{order_id}")
async def get_order_documents(
    order_id: str,
    current_user: User = Depends(check_permission(Permission.VIEW_ORDERS.value))
):
    documents = await db.documents.find({"import_order_id": order_id}, {"_id": 0}).to_list(1000)
    for doc in documents:
        if isinstance(doc['uploaded_at'], str):
            doc['uploaded_at'] = datetime.fromisoformat(doc['uploaded_at'])
    return documents

@api_router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(check_permission(Permission.MANAGE_DOCUMENTS.value))
):
    document = await db.documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from filesystem
    file_path = Path(document['file_path'])
    if file_path.exists():
        file_path.unlink()
    
    # Delete from database
    await db.documents.delete_one({"id": document_id})
    
    return {"message": "Document deleted successfully"}

# Continue with additional endpoints...