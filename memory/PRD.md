# Import & Container Management System (ICMS)

## Original Problem Statement
Build a comprehensive Import & Container Management System (ICMS) with the following phases:
- **Phase 0: Foundation:** Role-Based Access Control (RBAC) and Master Data Management (SKU, Supplier, Port, Container)
- **Phase 1: Planning:** Import Order creation and Container Planning Engine
- **Phase 2: Execution:** Track actual loaded goods vs. planned with Variance Engine
- **Phase 3: Financials:** Precision Payment Engine with FX rates and multi-currency supplier ledger
- **Phase 4: Landed Costing & Compliance:** Hybrid cost allocation and Document Vault
- **Phase 5: Intelligence:** Owner's Dashboard with KPIs, Demurrage Clock, cash flow forecasting
- **Phase 6: Continuity:** ERP interface (JSON export) and multi-entity/warehouse scaling

## User Requirements
1. Professional dashboard with insights for each module
2. Team-based access with role segregation
3. Integration with exchange rate API and document management
4. Editable master data modules
5. Additional fields (width, meter, color, description) in masters and purchase orders

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB, JWT Authentication
- **Frontend:** React, Tailwind CSS, Shadcn UI
- **Database:** MongoDB with motor async driver

## Current Architecture
```
/app/
├── backend/
│   ├── server.py         # FastAPI app with all models and routes
│   ├── requirements.txt
│   └── .env
└── frontend/
    └── src/
        ├── App.js
        ├── components/
        │   ├── Auth/Login.js
        │   ├── Dashboard/EnhancedDashboard.js
        │   ├── MasterData/EnhancedMasterData.js
        │   ├── ImportOrders/EnhancedImportOrders.js
        │   ├── ActualLoading/ActualLoading.js
        │   ├── Financial/FinancialDashboard.js
        │   ├── DocumentVault/DocumentVault.js
        │   └── Layout/
```

## What's Been Implemented ✅

### Phase 0: Foundation (Complete)
- [x] JWT-based authentication with RBAC
- [x] User roles: Owner, Logistics, Accounts, Purchase
- [x] Role-based permissions system
- [x] SKU Master with enhanced fields (color, width, length, micron)
- [x] Supplier Master with currency, contact details
- [x] Port Master with transit days, demurrage settings
- [x] Container Master with type, capacity, freight rates
- [x] Full CRUD operations for all masters (Create, Read, Update, Delete)

### Phase 1: Planning (Complete)
- [x] Import Order creation with detailed item specifications
- [x] Container utilization calculation
- [x] ETA calculation based on port transit days
- [x] Support for multiple items per order
- [x] PDF-format fields (thickness, size, liner/color, qty/carton, total rolls/cartons)

### Dashboard (Complete)
- [x] Overview tab with KPIs (Total Orders, Pipeline Value, Utilization, Suppliers)
- [x] Orders by Status breakdown
- [x] Container Utilization statistics
- [x] Recent Orders display
- [x] Financial, Logistics, Analytics, Alerts tabs (shell)

## Issues Fixed This Session
1. **EnhancedMasterData.js corrupted syntax** - File had escaped newlines and quotes, completely rewrote
2. **Import Order creation failing** - Fixed duplicate `eta` parameter issue in backend
3. **Ports and Containers not displaying** - Fixed by rewriting frontend component

## Test Results (January 2026)
- Backend: 96% passing (25/26 tests)
- Frontend: 100% working
- Test file: `/app/tests/test_icms_backend.py`

## Test Credentials
- **Email:** owner@icms.com
- **Password:** owner123

## Remaining Tasks (P0 - High Priority)

### Phase 2: Execution Module
- [ ] Actual Loading tracking
- [ ] Variance Engine (planned vs actual)
- [ ] Variance reports

### Phase 3: Financials
- [ ] Payment recording against orders
- [ ] FX rate tracking per payment
- [ ] Supplier ledger with multi-currency support

### Phase 4: Document Vault
- [ ] File upload functionality
- [ ] Link documents to import orders
- [ ] Document type categorization

## Future Tasks (P1/P2)

### Phase 4: Landed Costing
- [ ] Hybrid cost allocation (Freight by CBM, Duty by Value, Port Charges by Weight)
- [ ] Per-unit landed cost calculation

### Phase 5: Intelligence
- [ ] Real KPIs with live data
- [ ] Demurrage Clock
- [ ] Cash flow forecasting
- [ ] FX gain/loss analysis

### Phase 6: ERP Integration
- [ ] JSON export endpoint for ERP systems
- [ ] Multi-entity/warehouse support

## API Endpoints

### Authentication
- POST `/api/auth/login` - User login
- POST `/api/auth/register` - User registration
- GET `/api/auth/me` - Get current user

### Master Data
- GET/POST/PUT/DELETE `/api/skus` - SKU management
- GET/POST/PUT/DELETE `/api/suppliers` - Supplier management
- GET/POST/PUT/DELETE `/api/ports` - Port management
- GET/POST/PUT/DELETE `/api/containers` - Container management

### Orders
- GET/POST `/api/import-orders` - Import order management
- GET `/api/import-orders/{id}` - Get specific order

### Dashboard
- GET `/api/dashboard/stats` - Main stats
- GET `/api/dashboard/financial-overview` - Financial metrics
- GET `/api/dashboard/logistics-overview` - Logistics metrics

## Database Schema (MongoDB Collections)
- `users` - User accounts with roles and permissions
- `skus` - Stock Keeping Units
- `suppliers` - Supplier information
- `ports` - Port details
- `containers` - Container specifications
- `import_orders` - Purchase orders
- `fx_rates` - Currency exchange rates

## Known Issues
- Intermittent 520 errors when fetching order details (transient network issue)
