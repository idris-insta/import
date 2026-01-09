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
│   ├── uploads/          # Document storage
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

### Phase 0: Foundation (COMPLETE ✅)
- [x] JWT-based authentication with RBAC
- [x] User roles: Owner, Logistics, Accounts, Purchase
- [x] Role-based permissions system
- [x] SKU Master with enhanced fields (color, width, length, micron)
- [x] Supplier Master with currency, contact details
- [x] Port Master with transit days, demurrage settings
- [x] Container Master with type, capacity, freight rates
- [x] Full CRUD operations for all masters (Create, Read, Update, Delete)

### Phase 1: Planning (COMPLETE ✅)
- [x] Import Order creation with detailed item specifications
- [x] Container utilization calculation
- [x] ETA calculation based on port transit days
- [x] Support for multiple items per order
- [x] PDF-format fields (thickness, size, liner/color, qty/carton, total rolls/cartons)

### Phase 2: Execution (COMPLETE ✅)
- [x] Actual Loading page with variance tracking
- [x] Record Loading dialog to input actual quantities
- [x] Variance calculation (Quantity, Weight, Value)
- [x] Auto-update order status to "Loaded"

### Phase 3: Financials (COMPLETE ✅)
- [x] Payment recording with multi-currency support (USD, EUR, CNY, INR)
- [x] Automatic FX rate conversion
- [x] FX Rates management (list, refresh)
- [x] Financial Dashboard with 4 tabs (Overview, Payments, FX Rates, Analytics)
- [x] Supplier balance updates on payment
- [x] Payment history with reference tracking

### Phase 4: Documents & Landed Costing (COMPLETE ✅)
- [x] Document Vault with file upload
- [x] Document types: Bill of Lading, Commercial Invoice, Packing List, Bill of Entry, Certificate
- [x] Document linking to import orders
- [x] Compliance status tracking (Complete/Partial/Incomplete)
- [x] Landed Cost calculation API with hybrid allocation:
  - Freight by CBM
  - Duty by Value
  - Port Charges by Weight

### Phase 5: Intelligence Dashboard (COMPLETE ✅)
- [x] KPI Summary API with comprehensive metrics
- [x] Demurrage Clock tracking orders at port
- [x] Pipeline Value calculation
- [x] Container Utilization statistics
- [x] FX Exposure breakdown by currency

### Phase 6: ERP Integration (COMPLETE ✅)
- [x] ERP Export endpoint (`/api/erp-export/{order_id}`)
- [x] Clean JSON format with order, supplier, items, financials, logistics, compliance

## Test Results (January 2026)
- **Backend: 52/52 tests passed (100%)**
- **Frontend: 100% working**
- Test files:
  - `/app/tests/test_icms_backend.py` - Original CRUD tests
  - `/app/tests/test_icms_phase3_5.py` - Phase 3-5 feature tests

## Test Credentials
- **Email:** owner@icms.com
- **Password:** owner123

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

### Orders & Loading
- GET/POST `/api/import-orders` - Import order management
- GET `/api/import-orders/{id}` - Get specific order
- GET/POST `/api/actual-loadings` - Actual loading records

### Payments
- GET/POST `/api/payments` - Payment management
- GET `/api/payments/by-order/{order_id}` - Payments for order
- GET `/api/payments/by-supplier/{supplier_id}` - Payments for supplier
- DELETE `/api/payments/{id}` - Delete payment

### Documents
- POST `/api/documents/upload` - Upload document
- GET `/api/documents` - List all documents
- GET `/api/documents/order/{order_id}` - Documents for order
- GET `/api/documents/{id}` - Get specific document
- DELETE `/api/documents/{id}` - Delete document

### Dashboard & Intelligence
- GET `/api/dashboard/stats` - Main stats
- GET `/api/dashboard/kpi-summary` - Comprehensive KPIs
- GET `/api/dashboard/demurrage-clock` - Demurrage tracking
- GET `/api/dashboard/landed-cost/{order_id}` - Landed cost breakdown
- GET `/api/dashboard/financial-overview` - Financial metrics
- GET `/api/dashboard/logistics-overview` - Logistics metrics
- GET `/api/erp-export/{order_id}` - ERP JSON export

### FX Rates
- GET `/api/fx-rates` - List FX rates
- POST `/api/fx-rates/refresh` - Update FX rates

## Database Schema (MongoDB Collections)
- `users` - User accounts with roles and permissions
- `skus` - Stock Keeping Units
- `suppliers` - Supplier information
- `ports` - Port details
- `containers` - Container specifications
- `import_orders` - Purchase orders
- `actual_loadings` - Actual loading records
- `payments` - Payment records
- `documents` - Document metadata
- `fx_rates` - Currency exchange rates

## Future Enhancements (Backlog)
- [ ] Real-time ExchangeRate-API integration (currently using stored rates)
- [ ] Multi-entity/warehouse support
- [ ] Advanced analytics and reporting
- [ ] Email notifications for demurrage alerts
- [ ] Batch document upload
- [ ] Mobile-responsive optimization
