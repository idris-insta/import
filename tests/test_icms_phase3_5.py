"""
ICMS Backend API Tests - Phase 3-5 Features
Tests for:
- Phase 3: Financials/Payments (POST /api/payments, FX conversion)
- Phase 4: Documents (upload, list, delete)
- Phase 5: Intelligence/Dashboard KPIs (kpi-summary, demurrage-clock, landed-cost, erp-export)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cargomaster-2.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "owner@icms.com"
TEST_PASSWORD = "owner123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def test_order_id(auth_headers):
    """Get or create a test import order for payment/document tests"""
    # First try to get existing orders
    response = requests.get(f"{BASE_URL}/api/import-orders", headers=auth_headers)
    if response.status_code == 200:
        orders = response.json()
        if orders:
            return orders[0]["id"]
    
    # If no orders, create one
    suppliers_response = requests.get(f"{BASE_URL}/api/suppliers", headers=auth_headers)
    skus_response = requests.get(f"{BASE_URL}/api/skus", headers=auth_headers)
    
    suppliers = suppliers_response.json()
    skus = skus_response.json()
    
    if not suppliers or not skus:
        pytest.skip("Need at least one supplier and SKU to create test order")
    
    unique_po = f"TEST-PO-{uuid.uuid4().hex[:8].upper()}"
    payload = {
        "po_number": unique_po,
        "supplier_id": suppliers[0]["id"],
        "container_type": "40FT",
        "currency": "USD",
        "items": [
            {
                "sku_id": skus[0]["id"],
                "quantity": 100,
                "unit_price": 10.0,
                "total_value": 1000.0
            }
        ],
        "duty_rate": 0.1,
        "freight_charges": 500.0,
        "insurance_charges": 100.0,
        "other_charges": 50.0
    }
    
    response = requests.post(f"{BASE_URL}/api/import-orders", json=payload, headers=auth_headers)
    if response.status_code == 200:
        return response.json()["id"]
    
    pytest.skip("Could not create test order")


class TestDashboardKPIs:
    """Phase 5: Dashboard KPI endpoints tests"""
    
    def test_kpi_summary(self, auth_headers):
        """Test enhanced KPI summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpi-summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify KPI structure
        assert "total_orders" in data
        assert "pipeline_value" in data
        assert "container_utilization" in data
        assert "active_suppliers" in data
        
        # Verify data types
        assert isinstance(data["total_orders"], int)
        assert isinstance(data["pipeline_value"], (int, float))
        assert isinstance(data["container_utilization"], (int, float))
        assert isinstance(data["active_suppliers"], int)
        
        print(f"✓ KPI Summary: {data['total_orders']} orders, ${data['pipeline_value']:.2f} pipeline, {data['container_utilization']:.1f}% utilization, {data['active_suppliers']} suppliers")
    
    def test_demurrage_clock(self, auth_headers):
        """Test demurrage tracking endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/demurrage-clock", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "orders_at_risk" in data
        assert "total_demurrage_exposure" in data
        assert "demurrage_details" in data
        
        # Verify data types
        assert isinstance(data["orders_at_risk"], int)
        assert isinstance(data["total_demurrage_exposure"], (int, float))
        assert isinstance(data["demurrage_details"], list)
        
        print(f"✓ Demurrage Clock: {data['orders_at_risk']} orders at risk, ${data['total_demurrage_exposure']:.2f} exposure")
    
    def test_landed_cost(self, auth_headers, test_order_id):
        """Test landed cost breakdown endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/landed-cost/{test_order_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "order_id" in data
        assert "po_number" in data
        assert "cost_breakdown" in data
        assert "total_landed_cost" in data
        
        # Verify cost breakdown structure
        breakdown = data["cost_breakdown"]
        assert "fob_value" in breakdown
        assert "freight" in breakdown
        assert "insurance" in breakdown
        assert "duty" in breakdown
        assert "other_charges" in breakdown
        
        print(f"✓ Landed Cost for {data['po_number']}: Total ${data['total_landed_cost']:.2f}")
    
    def test_landed_cost_invalid_order(self, auth_headers):
        """Test landed cost with invalid order ID"""
        response = requests.get(f"{BASE_URL}/api/dashboard/landed-cost/invalid-order-id", headers=auth_headers)
        assert response.status_code == 404
        print("✓ Landed cost returns 404 for invalid order")


class TestERPExport:
    """Phase 5: ERP Export endpoint tests"""
    
    def test_erp_export(self, auth_headers, test_order_id):
        """Test ERP JSON export endpoint"""
        response = requests.get(f"{BASE_URL}/api/erp-export/{test_order_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify ERP export structure
        assert "export_timestamp" in data
        assert "order_data" in data
        assert "financial_data" in data
        assert "items_data" in data
        
        # Verify order data
        order_data = data["order_data"]
        assert "po_number" in order_data
        assert "status" in order_data
        assert "supplier_id" in order_data
        
        # Verify financial data
        financial_data = data["financial_data"]
        assert "total_value" in financial_data
        assert "currency" in financial_data
        
        # Verify items data
        assert isinstance(data["items_data"], list)
        
        print(f"✓ ERP Export for order: {order_data['po_number']}")
    
    def test_erp_export_invalid_order(self, auth_headers):
        """Test ERP export with invalid order ID"""
        response = requests.get(f"{BASE_URL}/api/erp-export/invalid-order-id", headers=auth_headers)
        assert response.status_code == 404
        print("✓ ERP export returns 404 for invalid order")


class TestFXRates:
    """Phase 3: FX Rates tests"""
    
    def test_get_fx_rates(self, auth_headers):
        """Test getting FX rates"""
        response = requests.get(f"{BASE_URL}/api/fx-rates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        # Check if we have USD/INR rate
        usd_inr_rate = None
        for rate in data:
            if rate.get("from_currency") == "USD" and rate.get("to_currency") == "INR":
                usd_inr_rate = rate
                break
        
        if usd_inr_rate:
            assert "rate" in usd_inr_rate
            assert usd_inr_rate["rate"] > 0
            print(f"✓ FX Rates: USD/INR = {usd_inr_rate['rate']}")
        else:
            print(f"✓ FX Rates: {len(data)} rates found")
    
    def test_refresh_fx_rates(self, auth_headers):
        """Test refreshing FX rates"""
        response = requests.post(f"{BASE_URL}/api/fx-rates/refresh", headers=auth_headers)
        # May return 200 or 500 depending on external API availability
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            print("✓ FX rates refreshed successfully")
        else:
            print("✓ FX rates refresh attempted (external API may be unavailable)")


class TestPayments:
    """Phase 3: Payments CRUD tests"""
    
    def test_list_payments(self, auth_headers):
        """Test listing payments"""
        response = requests.get(f"{BASE_URL}/api/payments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} payments")
    
    def test_create_payment(self, auth_headers, test_order_id):
        """Test creating a payment with FX conversion"""
        # Get order details to get supplier_id
        order_response = requests.get(f"{BASE_URL}/api/import-orders/{test_order_id}", headers=auth_headers)
        assert order_response.status_code == 200
        order = order_response.json()
        
        unique_ref = f"TT-TEST-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "import_order_id": test_order_id,
            "amount": 500.0,
            "currency": "USD",
            "payment_date": datetime.now().isoformat(),
            "reference": unique_ref
        }
        
        response = requests.post(f"{BASE_URL}/api/payments", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify payment structure
        assert "id" in data
        assert data["import_order_id"] == test_order_id
        assert data["amount"] == 500.0
        assert data["currency"] == "USD"
        assert data["reference"] == unique_ref
        
        # Verify FX conversion
        assert "fx_rate" in data
        assert "inr_amount" in data
        assert data["fx_rate"] > 0
        assert data["inr_amount"] > 0
        
        print(f"✓ Created payment: {unique_ref}, Amount: ${data['amount']}, FX Rate: {data['fx_rate']}, INR: ₹{data['inr_amount']:.2f}")
        
        return data["id"]
    
    def test_create_payment_eur(self, auth_headers, test_order_id):
        """Test creating a payment in EUR with FX conversion"""
        unique_ref = f"TT-EUR-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "import_order_id": test_order_id,
            "amount": 200.0,
            "currency": "EUR",
            "payment_date": datetime.now().isoformat(),
            "reference": unique_ref
        }
        
        response = requests.post(f"{BASE_URL}/api/payments", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["currency"] == "EUR"
        assert data["fx_rate"] > 0
        assert data["inr_amount"] > 0
        
        print(f"✓ Created EUR payment: {unique_ref}, FX Rate: {data['fx_rate']}, INR: ₹{data['inr_amount']:.2f}")
    
    def test_create_payment_cny(self, auth_headers, test_order_id):
        """Test creating a payment in CNY with FX conversion"""
        unique_ref = f"TT-CNY-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "import_order_id": test_order_id,
            "amount": 1000.0,
            "currency": "CNY",
            "payment_date": datetime.now().isoformat(),
            "reference": unique_ref
        }
        
        response = requests.post(f"{BASE_URL}/api/payments", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["currency"] == "CNY"
        assert data["fx_rate"] > 0
        assert data["inr_amount"] > 0
        
        print(f"✓ Created CNY payment: {unique_ref}, FX Rate: {data['fx_rate']}, INR: ₹{data['inr_amount']:.2f}")
    
    def test_get_payment(self, auth_headers):
        """Test getting a specific payment"""
        # First list payments
        list_response = requests.get(f"{BASE_URL}/api/payments", headers=auth_headers)
        payments = list_response.json()
        
        if not payments:
            pytest.skip("No payments to test")
        
        payment_id = payments[0]["id"]
        response = requests.get(f"{BASE_URL}/api/payments/{payment_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == payment_id
        assert "amount" in data
        assert "currency" in data
        assert "fx_rate" in data
        
        print(f"✓ Retrieved payment: {data['reference']}")
    
    def test_get_payment_invalid_id(self, auth_headers):
        """Test getting payment with invalid ID"""
        response = requests.get(f"{BASE_URL}/api/payments/invalid-payment-id", headers=auth_headers)
        assert response.status_code == 404
        print("✓ Payment returns 404 for invalid ID")


class TestDocuments:
    """Phase 4: Documents CRUD tests"""
    
    def test_list_documents(self, auth_headers):
        """Test listing documents"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} documents")
    
    def test_list_documents_by_order(self, auth_headers, test_order_id):
        """Test listing documents for a specific order"""
        response = requests.get(f"{BASE_URL}/api/documents?order_id={test_order_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} documents for order {test_order_id}")
    
    def test_upload_document(self, auth_headers, test_order_id):
        """Test uploading a document"""
        # Create a test file content
        file_content = b"Test document content for ICMS testing"
        
        # Prepare multipart form data
        files = {
            'file': ('test_document.txt', file_content, 'text/plain')
        }
        data = {
            'import_order_id': test_order_id,
            'document_type': 'Commercial Invoice',
            'notes': 'Test document uploaded via automated testing'
        }
        
        # Remove Content-Type from headers for multipart
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 200
        doc_data = response.json()
        
        # Verify document structure
        assert "id" in doc_data
        assert doc_data["import_order_id"] == test_order_id
        assert doc_data["document_type"] == "Commercial Invoice"
        assert "filename" in doc_data
        assert "original_filename" in doc_data
        assert "file_size" in doc_data
        
        print(f"✓ Uploaded document: {doc_data['original_filename']}, Size: {doc_data['file_size']} bytes")
        
        return doc_data["id"]
    
    def test_upload_document_bill_of_lading(self, auth_headers, test_order_id):
        """Test uploading a Bill of Lading document"""
        file_content = b"Bill of Lading test content"
        
        files = {
            'file': ('bill_of_lading.pdf', file_content, 'application/pdf')
        }
        data = {
            'import_order_id': test_order_id,
            'document_type': 'Bill of Lading',
            'notes': 'Test BL document'
        }
        
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 200
        doc_data = response.json()
        assert doc_data["document_type"] == "Bill of Lading"
        
        print(f"✓ Uploaded Bill of Lading: {doc_data['original_filename']}")
    
    def test_get_document(self, auth_headers, test_order_id):
        """Test getting a specific document"""
        # First upload a document
        file_content = b"Test document for GET test"
        files = {'file': ('get_test.txt', file_content, 'text/plain')}
        data = {
            'import_order_id': test_order_id,
            'document_type': 'Other',
            'notes': 'Document for GET test'
        }
        headers = {"Authorization": auth_headers["Authorization"]}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            data=data,
            headers=headers
        )
        
        if upload_response.status_code != 200:
            pytest.skip("Could not upload document for GET test")
        
        doc_id = upload_response.json()["id"]
        
        # Now get the document
        response = requests.get(f"{BASE_URL}/api/documents/{doc_id}", headers=auth_headers)
        assert response.status_code == 200
        doc_data = response.json()
        
        assert doc_data["id"] == doc_id
        assert "filename" in doc_data
        assert "document_type" in doc_data
        
        print(f"✓ Retrieved document: {doc_data['original_filename']}")
    
    def test_delete_document(self, auth_headers, test_order_id):
        """Test deleting a document"""
        # First upload a document
        file_content = b"Test document for DELETE test"
        files = {'file': ('delete_test.txt', file_content, 'text/plain')}
        data = {
            'import_order_id': test_order_id,
            'document_type': 'Other',
            'notes': 'Document to be deleted'
        }
        headers = {"Authorization": auth_headers["Authorization"]}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            data=data,
            headers=headers
        )
        
        if upload_response.status_code != 200:
            pytest.skip("Could not upload document for DELETE test")
        
        doc_id = upload_response.json()["id"]
        
        # Delete the document
        delete_response = requests.delete(f"{BASE_URL}/api/documents/{doc_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/documents/{doc_id}", headers=auth_headers)
        assert get_response.status_code == 404
        
        print(f"✓ Deleted document: {doc_id}")


class TestActualLoading:
    """Phase 2: Actual Loading tests"""
    
    def test_list_actual_loadings(self, auth_headers):
        """Test listing actual loadings"""
        response = requests.get(f"{BASE_URL}/api/actual-loadings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} actual loadings")
    
    def test_create_actual_loading(self, auth_headers):
        """Test creating an actual loading record"""
        # Get confirmed orders
        orders_response = requests.get(f"{BASE_URL}/api/import-orders", headers=auth_headers)
        orders = orders_response.json()
        
        # Find a confirmed order
        confirmed_order = None
        for order in orders:
            if order["status"] in ["Confirmed", "Loaded"]:
                confirmed_order = order
                break
        
        if not confirmed_order:
            pytest.skip("No confirmed orders available for actual loading test")
        
        # Build loading items from order items
        loading_items = []
        for item in confirmed_order["items"]:
            loading_items.append({
                "sku_id": item["sku_id"],
                "planned_quantity": item["quantity"],
                "actual_quantity": item["quantity"],  # Same as planned
                "variance_quantity": 0,
                "planned_weight": item.get("total_kg", 100.0),
                "actual_weight": item.get("total_kg", 100.0),
                "variance_weight": 0,
                "planned_value": item["total_value"],
                "actual_value": item["total_value"],
                "variance_value": 0
            })
        
        payload = {
            "import_order_id": confirmed_order["id"],
            "items": loading_items
        }
        
        response = requests.post(f"{BASE_URL}/api/actual-loadings", json=payload, headers=auth_headers)
        
        # May fail if loading already exists for this order
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert data["import_order_id"] == confirmed_order["id"]
            print(f"✓ Created actual loading for order: {confirmed_order['po_number']}")
        elif response.status_code == 400:
            print(f"✓ Actual loading already exists for order (expected behavior)")
        else:
            assert False, f"Unexpected status code: {response.status_code}"


class TestDashboardStats:
    """Additional dashboard stats tests"""
    
    def test_dashboard_stats(self, auth_headers):
        """Test main dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total_orders" in data
        assert "pipeline_value" in data
        assert "total_suppliers" in data
        assert "total_skus" in data
        assert "utilization_stats" in data
        
        print(f"✓ Dashboard Stats: {data['total_orders']} orders, ${data['pipeline_value']:.2f} pipeline")
    
    def test_financial_overview(self, auth_headers):
        """Test financial overview endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/financial-overview", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "value_in_transit" in data
        assert "payment_summary" in data
        assert "fx_exposure" in data
        assert "supplier_balances" in data
        
        print("✓ Financial overview endpoint working")
    
    def test_logistics_overview(self, auth_headers):
        """Test logistics overview endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/logistics-overview", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "container_utilization" in data
        assert "arriving_soon" in data
        assert "demurrage_alerts" in data
        
        print("✓ Logistics overview endpoint working")
    
    def test_variance_analysis(self, auth_headers):
        """Test variance analysis endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/variance-analysis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        assert "top_sku_variances" in data
        assert "trends" in data
        
        print("✓ Variance analysis endpoint working")
    
    def test_cash_flow_forecast(self, auth_headers):
        """Test cash flow forecast endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/cash-flow-forecast", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "duty_forecasts" in data
        assert "demurrage_costs" in data
        assert "supplier_payments" in data
        
        print("✓ Cash flow forecast endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
