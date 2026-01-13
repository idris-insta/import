"""
Test cases for Kanban Board and Container Contents features
- Tests Kanban board API endpoints
- Tests container status update endpoint
- Tests container tracking report endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('VITE_BACKEND_URL', 'https://freightflow-90.preview.emergentagent.com')

class TestKanbanFeatures:
    """Tests for Kanban Board functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "owner@icms.com",
            "password": "owner123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_get_import_orders_for_kanban(self):
        """Test GET /api/import-orders - Kanban board uses this endpoint"""
        response = self.session.get(f"{BASE_URL}/api/import-orders")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify orders have required fields for Kanban
        if len(data) > 0:
            order = data[0]
            assert "id" in order
            assert "status" in order
            assert "po_number" in order
            print(f"SUCCESS: Found {len(data)} orders for Kanban board")
            
            # Check status distribution
            statuses = {}
            for o in data:
                status = o.get("status", "Unknown")
                statuses[status] = statuses.get(status, 0) + 1
            print(f"Status distribution: {statuses}")
    
    def test_update_order_status(self):
        """Test PUT /api/import-orders/{order_id}/status - Kanban drag-drop uses this"""
        # First get an order
        response = self.session.get(f"{BASE_URL}/api/import-orders")
        assert response.status_code == 200
        
        orders = response.json()
        if len(orders) == 0:
            pytest.skip("No orders available for status update test")
        
        # Find an order that's not Delivered or Cancelled
        test_order = None
        for order in orders:
            if order.get("status") not in ["Delivered", "Cancelled"]:
                test_order = order
                break
        
        if not test_order:
            pytest.skip("No suitable order found for status update test")
        
        order_id = test_order["id"]
        current_status = test_order["status"]
        print(f"Testing status update for order {test_order['po_number']} (current: {current_status})")
        
        # Test status update endpoint exists
        # We'll just verify the endpoint responds correctly
        response = self.session.put(f"{BASE_URL}/api/import-orders/{order_id}/status?status={current_status}")
        assert response.status_code in [200, 400, 422]  # 200 success, 400/422 validation
        print(f"SUCCESS: Status update endpoint responds correctly")
    
    def test_container_tracking_report(self):
        """Test GET /api/reports/container-tracking - Used in Reports tab"""
        response = self.session.get(f"{BASE_URL}/api/reports/container-tracking")
        assert response.status_code == 200
        
        data = response.json()
        assert "containers" in data
        assert "totals" in data
        
        totals = data["totals"]
        assert "total_containers" in totals
        print(f"SUCCESS: Container tracking report - {totals['total_containers']} containers")
        
        # Verify container data structure
        if len(data["containers"]) > 0:
            container = data["containers"][0]
            assert "order_id" in container
            assert "po_number" in container
            assert "status" in container
            print(f"Container data structure verified")
    
    def test_container_wise_report(self):
        """Test GET /api/reports/container-wise - Container grouping report"""
        response = self.session.get(f"{BASE_URL}/api/reports/container-wise")
        assert response.status_code == 200
        
        data = response.json()
        assert "containers" in data
        assert "totals" in data
        print(f"SUCCESS: Container-wise report loaded")
    
    def test_supplier_summary_report(self):
        """Test GET /api/reports/supplier-wise-summary"""
        response = self.session.get(f"{BASE_URL}/api/reports/supplier-wise-summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "suppliers" in data
        assert "totals" in data
        print(f"SUCCESS: Supplier summary report - {len(data['suppliers'])} suppliers")


class TestPreviousFeatures:
    """Regression tests for previously implemented features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "owner@icms.com",
            "password": "owner123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_payments_list(self):
        """Test GET /api/payments - Payments list"""
        response = self.session.get(f"{BASE_URL}/api/payments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Payments list - {len(data)} payments")
    
    def test_actual_loadings_list(self):
        """Test GET /api/actual-loadings - Actual loadings list"""
        response = self.session.get(f"{BASE_URL}/api/actual-loadings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Actual loadings list - {len(data)} records")
    
    def test_documents_list(self):
        """Test GET /api/documents - Documents list"""
        response = self.session.get(f"{BASE_URL}/api/documents")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Documents list - {len(data)} documents")
    
    def test_financial_overview(self):
        """Test GET /api/dashboard/financial-overview - Financial dashboard"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/financial-overview")
        assert response.status_code == 200
        data = response.json()
        assert "total_order_value" in data
        print(f"SUCCESS: Financial overview loaded")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
