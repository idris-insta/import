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
6. System-wide Settings page for managing dropdowns and document templates
7. Enhanced Item Master fields: Category, Adhesive Type, Liner Color, Shipping Mark, Marking
8. Enhanced PO features: Edit, Delete, Duplicate, Item Search, Shipping Date

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
        │   ├── Reports/ReportsAnalytics.js
        │   ├── Settings/SystemSettings.js  ✨ NEW
        │   └── Layout/
```

## What's Been Implemented ✅

### Phase 0: Foundation (COMPLETE ✅)
- [x] JWT-based authentication with RBAC
- [x] User roles: Owner, Logistics, Accounts, Purchase
- [x] Role-based permissions system
- [x] SKU Master with enhanced fields (color, width, length, micron)
- [x] **NEW:** SKU fields: Category, Adhesive Type, Liner Color, Shipping Mark, Marking
- [x] Supplier Master with currency, contact details
- [x] Port Master with transit days, demurrage settings
- [x] Container Master with type, capacity, freight rates
- [x] Full CRUD operations for all masters
- [x] Excel Export/Import for all masters

### Phase 1: Planning (COMPLETE ✅)
- [x] Import Order creation with detailed item specifications
- [x] **NEW:** Edit existing orders
- [x] **NEW:** Delete orders
- [x] **NEW:** Duplicate orders
- [x] **NEW:** Item search by SKU code or name
- [x] **NEW:** Shipping Date / Schedule field
- [x] Container utilization calculation
- [x] ETA calculation based on port transit days
- [x] PDF-format fields (thickness, size, liner/color, qty/carton, total rolls/cartons)
- [x] PDF export with configurable duty rate visibility

### Phase 2: Execution (COMPLETE ✅)
- [x] Actual Loading page with variance tracking
- [x] Record Loading dialog to input actual quantities
- [x] Variance calculation (Quantity, Weight, Value)
- [x] Auto-update order status to "Loaded"
- [x] **FIXED:** PO dropdown now shows all orders including Draft

### Phase 3: Financials (COMPLETE ✅)
- [x] Payment recording with multi-currency support
- [x] Automatic FX rate conversion
- [x] FX Rates management
- [x] Financial Dashboard with 4 tabs
- [x] Supplier balance updates on payment
- [x] **FIXED:** PO dropdown now shows all orders including Draft

### Phase 4: Documents & Landed Costing (COMPLETE ✅)
- [x] Document Vault with file upload
- [x] Document linking to import orders
- [x] Compliance status tracking
- [x] Landed Cost calculation API

### Phase 5: Intelligence Dashboard (COMPLETE ✅)
- [x] KPI Summary API
- [x] Demurrage Clock tracking
- [x] Pipeline Value calculation
- [x] Container Utilization statistics
- [x] FX Exposure breakdown

### Phase 6: ERP Integration (COMPLETE ✅)
- [x] ERP Export endpoint
- [x] Clean JSON format export

### System Settings (NEW ✅)
- [x] Settings page at /settings route
- [x] **Company Tab:** Company name, address, phone, email, logo upload
- [x] **Documents Tab:** Header text, footer text, show/hide duty rate on PDF
- [x] **Dropdowns Tab:** Manage categories, adhesive types, liner colors, shipping marks, order statuses

## Test Results (January 2026)
- **Backend:** All tests passed
- **Frontend:** 100% working (iteration_4.json)
- Test files:
  - `/app/test_reports/iteration_4.json` - Latest comprehensive frontend test

## Test Credentials
- **Email:** owner@icms.com
- **Password:** owner123

## API Endpoints

### New/Updated Endpoints
- GET `/api/settings` - Get system settings
- PUT `/api/settings` - Update system settings
- POST `/api/settings/logo` - Upload company logo
- GET `/api/settings/dropdown-options` - Get all dropdown options for forms
- PUT `/api/import-orders/{order_id}` - Edit existing order
- DELETE `/api/import-orders/{order_id}` - Delete order
- POST `/api/import-orders/{order_id}/duplicate` - Duplicate order
- GET `/api/import-orders/{order_id}/pdf` - Export PDF (respects duty rate setting)

## Database Schema (MongoDB Collections)
- `users` - User accounts with roles and permissions
- `skus` - Stock Keeping Units with new fields (category, adhesive_type, liner_color, shipping_mark, marking)
- `suppliers` - Supplier information
- `ports` - Port details
- `containers` - Container specifications
- `import_orders` - Purchase orders with shipping_date field
- `actual_loadings` - Actual loading records
- `payments` - Payment records
- `documents` - Document metadata
- `fx_rates` - Currency exchange rates
- `system_settings` - System-wide settings and dropdown options

## Prioritized Backlog

### P0 - Critical (Completed ✅)
- [x] System Settings page
- [x] Enhanced SKU fields
- [x] PO Edit/Delete/Duplicate
- [x] Fix empty PO dropdown bug

### P1 - High Priority
- [ ] Supplier-wise detailed ledger view (with payment history per supplier)
- [ ] Advanced reporting charts and KPIs enhancement
- [ ] Mobile responsiveness optimization

### P2 - Medium Priority  
- [ ] Real-time ExchangeRate-API integration
- [ ] Batch document upload
- [ ] Email notifications for demurrage alerts

### P3 - Future Enhancements
- [ ] Multi-entity/warehouse support
- [ ] Refactor server.py into modular files (routes, models, db)
- [ ] Add pytest test suite in /app/backend/tests

## Known Issues
None - All reported issues have been resolved.

## Changelog

### January 10, 2026 (Session 2)
- Added comprehensive Reports & Analytics page with 4 tabs:
  - **Supplier-wise:** Summary cards + supplier table with Ledger button
  - **Container-wise:** Container type breakdown (pending/shipped/in-transit/delivered)
  - **Payments:** Payments Made and Payments Due tables with overdue highlighting
  - **Notifications:** Payment due alerts with severity levels (critical/high/medium)
- Added Supplier Ledger dialog showing complete transaction history with running balance
- Added Payment Terms to Supplier Master:
  - Payment Type dropdown (NET, COD, ADVANCE, LC, TT)
  - Payment Days input (default 30)
- New backend APIs:
  - `/api/reports/container-wise` - Container status breakdown
  - `/api/reports/supplier-ledger/{id}` - Full supplier transaction ledger
  - `/api/reports/payments-summary` - Payments made vs due
  - `/api/reports/notifications` - Payment due alerts
- Testing agent created pytest suite at `/app/tests/test_reports_features.py`

### January 10, 2026 (Session 1)
- Added System Settings page with 3 tabs (Company, Documents, Dropdowns)
- Added new SKU fields: Category, Adhesive Type, Liner Color, Shipping Mark, Marking
- Added Edit, Delete, Duplicate functionality to Purchase Orders
- Added SKU search by name/code when adding items to POs
- Added Shipping Date field to Purchase Orders
- Fixed empty PO dropdown in Actual Loading and Financial modules
- Added Settings navigation item to sidebar (Owner role only)
- PDF export now respects "Show Duty Rate" setting

### Previous Updates
- Full CRUD for all master data
- Excel import/export for all masters
- PDF export for Purchase Orders
- Reports & Analytics page
- All 6 phases implemented (Foundation through ERP Integration)
