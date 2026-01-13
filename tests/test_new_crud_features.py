"""
Test suite for new CRUD features in ICMS:
- Payments Edit (PUT /api/payments/{id})
- Payments Delete (DELETE /api/payments/{id})
- Actual Loadings Edit (PUT /api/actual-loadings/{id})
- Actual Loadings Delete (DELETE /api/actual-loadings/{id})
- Document Batch Upload (POST /api/documents/batch-upload)
- Document Status API (GET /api/documents/status/{order_id})
- Document Edit (PUT /api/documents/{id})
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('VITE_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "owner@icms.com"
TEST_PASSWORD = "owner123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture(scope="module")
def test_order_id(api_client):
    """Get an existing order ID for testing"""
    response = api_client.get(f"{BASE_URL}/api/import-orders")
    assert response.status_code == 200
    orders = response.json()
    if orders:
        return orders[0]['id']
    pytest.skip("No orders available for testing")


@pytest.fixture(scope="module")
def test_supplier_id(api_client):
    """Get an existing supplier ID for testing"""
    response = api_client.get(f"{BASE_URL}/api/suppliers")
    assert response.status_code == 200
    suppliers = response.json()
    if suppliers:
        return suppliers[0]['id']
    pytest.skip("No suppliers available for testing")


class TestPaymentsCRUD:
    """Test Payment Edit and Delete functionality"""
    
    def test_create_payment_for_testing(self, api_client, test_order_id):
        """Create a test payment to use for edit/delete tests"""
        payment_data = {
            "import_order_id": test_order_id,
            "amount": 1000.00,
            "currency": "USD",
            "payment_date": datetime.now().isoformat(),
            "reference": "TEST_PAYMENT_REF_001"
        }
        response = api_client.post(f"{BASE_URL}/api/payments", json=payment_data)
        assert response.status_code == 200, f"Failed to create payment: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["amount"] == 1000.00
        assert data["reference"] == "TEST_PAYMENT_REF_001"
        
        # Store for later tests
        pytest.test_payment_id = data["id"]
        return data["id"]
    
    def test_get_payments_list(self, api_client):
        """Verify payments list endpoint works"""
        response = api_client.get(f"{BASE_URL}/api/payments")
        assert response.status_code == 200
        payments = response.json()
        assert isinstance(payments, list)
    
    def test_update_payment_amount(self, api_client):
        """Test PUT /api/payments/{id} - Update payment amount"""
        payment_id = getattr(pytest, 'test_payment_id', None)
        if not payment_id:
            pytest.skip("No test payment created")
        
        update_data = {
            "amount": 1500.00,
            "reference": "TEST_PAYMENT_REF_UPDATED"
        }
        response = api_client.put(f"{BASE_URL}/api/payments/{payment_id}", json=update_data)
        assert response.status_code == 200, f"Failed to update payment: {response.text}"
        
        data = response.json()
        assert data["amount"] == 1500.00
        assert data["reference"] == "TEST_PAYMENT_REF_UPDATED"
    
    def test_update_payment_currency(self, api_client):
        """Test updating payment currency"""
        payment_id = getattr(pytest, 'test_payment_id', None)
        if not payment_id:
            pytest.skip("No test payment created")
        
        update_data = {
            "currency": "EUR"
        }
        response = api_client.put(f"{BASE_URL}/api/payments/{payment_id}", json=update_data)
        assert response.status_code == 200, f"Failed to update payment currency: {response.text}"
        
        data = response.json()
        assert data["currency"] == "EUR"
    
    def test_update_payment_not_found(self, api_client):
        """Test updating non-existent payment returns 404"""
        update_data = {"amount": 100.00}
        response = api_client.put(f"{BASE_URL}/api/payments/non-existent-id", json=update_data)
        assert response.status_code == 404
    
    def test_delete_payment(self, api_client):
        """Test DELETE /api/payments/{id}"""
        payment_id = getattr(pytest, 'test_payment_id', None)
        if not payment_id:
            pytest.skip("No test payment created")
        
        response = api_client.delete(f"{BASE_URL}/api/payments/{payment_id}")
        assert response.status_code == 200, f"Failed to delete payment: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "deleted" in data["message"].lower()
        
        # Verify payment is actually deleted
        get_response = api_client.get(f"{BASE_URL}/api/payments")
        payments = get_response.json()
        payment_ids = [p["id"] for p in payments]
        assert payment_id not in payment_ids, "Payment was not actually deleted"
    
    def test_delete_payment_not_found(self, api_client):
        """Test deleting non-existent payment returns 404"""
        response = api_client.delete(f"{BASE_URL}/api/payments/non-existent-id")
        assert response.status_code == 404


class TestActualLoadingsCRUD:
    """Test Actual Loading Edit and Delete functionality"""
    
    def test_get_actual_loadings_list(self, api_client):
        """Verify actual loadings list endpoint works"""
        response = api_client.get(f"{BASE_URL}/api/actual-loadings")
        assert response.status_code == 200
        loadings = response.json()
        assert isinstance(loadings, list)
    
    def test_create_actual_loading_for_testing(self, api_client, test_order_id):
        """Create a test actual loading record"""
        # First get order details to build items
        order_response = api_client.get(f"{BASE_URL}/api/import-orders/{test_order_id}")
        if order_response.status_code != 200:
            pytest.skip("Could not get order details")
        
        order = order_response.json()
        items = order.get('items', [])
        
        if not items:
            pytest.skip("Order has no items")
        
        loading_items = []
        for item in items[:1]:  # Just use first item
            loading_items.append({
                "sku_id": item['sku_id'],
                "planned_quantity": item['quantity'],
                "actual_quantity": item['quantity'],
                "variance_quantity": 0,
                "planned_weight": 100.0,
                "actual_weight": 100.0,
                "variance_weight": 0.0,
                "planned_value": item['total_value'],
                "actual_value": item['total_value'],
                "variance_value": 0.0
            })
        
        loading_data = {
            "import_order_id": test_order_id,
            "items": loading_items
        }
        
        response = api_client.post(f"{BASE_URL}/api/actual-loadings", json=loading_data)
        
        # May fail if loading already exists for this order
        if response.status_code == 400 and "already exists" in response.text.lower():
            # Get existing loading
            loadings_response = api_client.get(f"{BASE_URL}/api/actual-loadings")
            loadings = loadings_response.json()
            for loading in loadings:
                if loading.get('import_order_id') == test_order_id and not loading.get('is_locked'):
                    pytest.test_loading_id = loading['id']
                    return loading['id']
            pytest.skip("No unlocked loading available for testing")
        
        assert response.status_code == 200, f"Failed to create loading: {response.text}"
        data = response.json()
        pytest.test_loading_id = data["id"]
        return data["id"]
    
    def test_update_actual_loading(self, api_client):
        """Test PUT /api/actual-loadings/{id}"""
        loading_id = getattr(pytest, 'test_loading_id', None)
        if not loading_id:
            # Try to get an existing unlocked loading
            response = api_client.get(f"{BASE_URL}/api/actual-loadings")
            loadings = response.json()
            for loading in loadings:
                if not loading.get('is_locked'):
                    loading_id = loading['id']
                    pytest.test_loading_id = loading_id
                    break
        
        if not loading_id:
            pytest.skip("No unlocked loading available for testing")
        
        # Get current loading to update
        get_response = api_client.get(f"{BASE_URL}/api/actual-loadings/{loading_id}")
        if get_response.status_code != 200:
            pytest.skip("Could not get loading details")
        
        current_loading = get_response.json()
        items = current_loading.get('items', [])
        
        if items:
            # Update actual quantity
            items[0]['actual_quantity'] = items[0]['planned_quantity'] + 5
            items[0]['variance_quantity'] = 5
        
        update_data = {
            "items": items
        }
        
        response = api_client.put(f"{BASE_URL}/api/actual-loadings/{loading_id}", json=update_data)
        
        if response.status_code == 400 and "locked" in response.text.lower():
            pytest.skip("Loading is locked, cannot update")
        
        assert response.status_code == 200, f"Failed to update loading: {response.text}"
        
        data = response.json()
        assert "items" in data
    
    def test_update_actual_loading_not_found(self, api_client):
        """Test updating non-existent loading returns 404"""
        update_data = {"items": []}
        response = api_client.put(f"{BASE_URL}/api/actual-loadings/non-existent-id", json=update_data)
        assert response.status_code == 404
    
    def test_delete_actual_loading(self, api_client):
        """Test DELETE /api/actual-loadings/{id}"""
        loading_id = getattr(pytest, 'test_loading_id', None)
        if not loading_id:
            pytest.skip("No test loading created")
        
        response = api_client.delete(f"{BASE_URL}/api/actual-loadings/{loading_id}")
        
        if response.status_code == 400 and "locked" in response.text.lower():
            pytest.skip("Loading is locked, cannot delete")
        
        assert response.status_code == 200, f"Failed to delete loading: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "deleted" in data["message"].lower()
    
    def test_delete_actual_loading_not_found(self, api_client):
        """Test deleting non-existent loading returns 404"""
        response = api_client.delete(f"{BASE_URL}/api/actual-loadings/non-existent-id")
        assert response.status_code == 404


class TestDocumentBatchUpload:
    """Test Document Batch Upload functionality"""
    
    def test_batch_upload_documents(self, api_client, test_order_id):
        """Test POST /api/documents/batch-upload"""
        import io
        
        # Create test files
        file1_content = b"Test document content 1"
        file2_content = b"Test document content 2"
        
        files = [
            ('files', ('test_doc1.txt', io.BytesIO(file1_content), 'text/plain')),
            ('files', ('test_doc2.txt', io.BytesIO(file2_content), 'text/plain'))
        ]
        
        data = {
            'import_order_id': test_order_id,
            'document_types': '["Bill of Lading", "Commercial Invoice"]',
            'notes': '["Test note 1", "Test note 2"]'
        }
        
        # Remove Content-Type header for multipart
        headers = {"Authorization": api_client.headers.get("Authorization")}
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-upload",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Batch upload failed: {response.text}"
        
        result = response.json()
        assert "uploaded" in result
        assert "message" in result
        assert len(result["uploaded"]) == 2
        
        # Store document IDs for later tests
        pytest.test_doc_ids = [doc["id"] for doc in result["uploaded"]]
    
    def test_batch_upload_with_invalid_order(self, api_client):
        """Test batch upload with non-existent order returns 404"""
        import io
        
        file_content = b"Test content"
        files = [('files', ('test.txt', io.BytesIO(file_content), 'text/plain'))]
        data = {'import_order_id': 'non-existent-order-id'}
        
        headers = {"Authorization": api_client.headers.get("Authorization")}
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-upload",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 404


class TestDocumentStatus:
    """Test Document Status API"""
    
    def test_get_document_status(self, api_client, test_order_id):
        """Test GET /api/documents/status/{order_id}"""
        response = api_client.get(f"{BASE_URL}/api/documents/status/{test_order_id}")
        assert response.status_code == 200, f"Failed to get document status: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "order_id" in data
        assert "po_number" in data
        assert "total_documents" in data
        assert "completeness_percentage" in data
        assert "status" in data
        assert "can_proceed" in data
        assert "document_checklist" in data
        assert "note" in data
        
        # Verify can_proceed is always True (documents not mandatory)
        assert data["can_proceed"] == True
        
        # Verify document_checklist structure
        checklist = data["document_checklist"]
        assert isinstance(checklist, list)
        
        for item in checklist:
            assert "type" in item
            assert "status" in item
            assert "is_recommended" in item
            assert "is_mandatory" in item
            assert item["is_mandatory"] == False  # All documents are non-mandatory
    
    def test_get_document_status_not_found(self, api_client):
        """Test document status for non-existent order returns 404"""
        response = api_client.get(f"{BASE_URL}/api/documents/status/non-existent-order-id")
        assert response.status_code == 404


class TestDocumentEdit:
    """Test Document Edit functionality"""
    
    def test_update_document(self, api_client):
        """Test PUT /api/documents/{id}"""
        doc_ids = getattr(pytest, 'test_doc_ids', None)
        if not doc_ids or len(doc_ids) == 0:
            # Get an existing document
            response = api_client.get(f"{BASE_URL}/api/documents")
            docs = response.json()
            if docs:
                doc_ids = [docs[0]['id']]
            else:
                pytest.skip("No documents available for testing")
        
        doc_id = doc_ids[0]
        
        # Update document using form data
        headers = {"Authorization": api_client.headers.get("Authorization")}
        
        response = requests.put(
            f"{BASE_URL}/api/documents/{doc_id}",
            data={
                'document_type': 'Packing List',
                'notes': 'Updated test notes'
            },
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to update document: {response.text}"
        
        data = response.json()
        assert data["document_type"] == "Packing List"
        assert data["notes"] == "Updated test notes"
    
    def test_update_document_not_found(self, api_client):
        """Test updating non-existent document returns 404"""
        headers = {"Authorization": api_client.headers.get("Authorization")}
        
        response = requests.put(
            f"{BASE_URL}/api/documents/non-existent-id",
            data={'document_type': 'Other'},
            headers=headers
        )
        
        assert response.status_code == 404
    
    def test_update_document_invalid_type(self, api_client):
        """Test updating document with invalid type returns 400"""
        doc_ids = getattr(pytest, 'test_doc_ids', None)
        if not doc_ids or len(doc_ids) == 0:
            pytest.skip("No documents available for testing")
        
        doc_id = doc_ids[0]
        headers = {"Authorization": api_client.headers.get("Authorization")}
        
        response = requests.put(
            f"{BASE_URL}/api/documents/{doc_id}",
            data={'document_type': 'Invalid Type'},
            headers=headers
        )
        
        assert response.status_code == 400


class TestFinancialDashboardData:
    """Test that financial dashboard data doesn't have NaN values"""
    
    def test_financial_overview_no_nan(self, api_client):
        """Test GET /api/dashboard/financial-overview returns valid numbers"""
        response = api_client.get(f"{BASE_URL}/api/dashboard/financial-overview")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check that numeric fields are not NaN
        def check_no_nan(obj, path=""):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    check_no_nan(value, f"{path}.{key}")
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    check_no_nan(item, f"{path}[{i}]")
            elif isinstance(obj, float):
                assert obj == obj, f"NaN found at {path}"  # NaN != NaN
        
        check_no_nan(data)
    
    def test_payments_no_nan_values(self, api_client):
        """Test that payments don't have NaN values"""
        response = api_client.get(f"{BASE_URL}/api/payments")
        assert response.status_code == 200
        
        payments = response.json()
        for payment in payments:
            if payment.get('amount') is not None:
                assert payment['amount'] == payment['amount'], "NaN in payment amount"
            if payment.get('inr_amount') is not None:
                assert payment['inr_amount'] == payment['inr_amount'], "NaN in payment inr_amount"
            if payment.get('fx_rate') is not None:
                assert payment['fx_rate'] == payment['fx_rate'], "NaN in payment fx_rate"


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_documents(self, api_client):
        """Delete test documents created during testing"""
        doc_ids = getattr(pytest, 'test_doc_ids', [])
        for doc_id in doc_ids:
            try:
                api_client.delete(f"{BASE_URL}/api/documents/{doc_id}")
            except:
                pass  # Ignore cleanup errors


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
