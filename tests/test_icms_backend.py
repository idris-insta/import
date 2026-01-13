"""
ICMS Backend API Tests
Tests for Import & Container Management System APIs
- Authentication
- SKUs CRUD
- Suppliers CRUD
- Ports CRUD
- Containers CRUD
- Import Orders CRUD
- Dashboard Stats
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://freightflow-90.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "owner@icms.com"
TEST_PASSWORD = "owner123"


class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "ICMS API is running" in data["message"]
        print("✓ API root check passed")
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["role"] == "Owner"
        print("✓ Login success test passed")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login test passed")


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


class TestDashboard:
    """Dashboard API tests"""
    
    def test_dashboard_stats(self, auth_headers):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_orders" in data
        assert "pipeline_value" in data
        assert "total_suppliers" in data
        assert "total_skus" in data
        assert "utilization_stats" in data
        print(f"✓ Dashboard stats: {data['total_orders']} orders, {data['total_suppliers']} suppliers")
    
    def test_financial_overview(self, auth_headers):
        """Test financial overview endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/financial-overview", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "value_in_transit" in data
        assert "payment_summary" in data
        print("✓ Financial overview test passed")
    
    def test_logistics_overview(self, auth_headers):
        """Test logistics overview endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/logistics-overview", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "container_utilization" in data
        assert "arriving_soon" in data
        print("✓ Logistics overview test passed")


class TestSKUs:
    """SKU CRUD tests"""
    
    def test_list_skus(self, auth_headers):
        """Test listing SKUs"""
        response = requests.get(f"{BASE_URL}/api/skus", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} SKUs")
    
    def test_create_sku(self, auth_headers):
        """Test creating a new SKU"""
        unique_code = f"TEST-SKU-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "sku_code": unique_code,
            "description": "Test SKU for automated testing",
            "color": "Blue",
            "hsn_code": "39201090",
            "micron": 50.0,
            "width_mm": 500.0,
            "length_m": 1000.0,
            "weight_per_unit": 25.0,
            "cbm_per_unit": 0.5,
            "unit_cost": 100.0,
            "category": "Test Category"
        }
        response = requests.post(f"{BASE_URL}/api/skus", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["sku_code"] == unique_code
        assert data["description"] == "Test SKU for automated testing"
        assert "id" in data
        print(f"✓ Created SKU: {unique_code}")
        return data["id"]
    
    def test_create_and_get_sku(self, auth_headers):
        """Test creating and then fetching a SKU"""
        unique_code = f"TEST-SKU-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "sku_code": unique_code,
            "description": "Test SKU for GET verification",
            "hsn_code": "39201090",
            "weight_per_unit": 20.0,
            "cbm_per_unit": 0.4
        }
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/skus", json=payload, headers=auth_headers)
        assert create_response.status_code == 200
        created_sku = create_response.json()
        sku_id = created_sku["id"]
        
        # Get to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/skus/{sku_id}", headers=auth_headers)
        assert get_response.status_code == 200
        fetched_sku = get_response.json()
        assert fetched_sku["sku_code"] == unique_code
        assert fetched_sku["description"] == "Test SKU for GET verification"
        print(f"✓ Created and verified SKU: {unique_code}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/skus/{sku_id}", headers=auth_headers)
    
    def test_update_sku(self, auth_headers):
        """Test updating a SKU"""
        # First create a SKU
        unique_code = f"TEST-SKU-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "sku_code": unique_code,
            "description": "Original description",
            "hsn_code": "39201090",
            "weight_per_unit": 20.0,
            "cbm_per_unit": 0.4
        }
        create_response = requests.post(f"{BASE_URL}/api/skus", json=payload, headers=auth_headers)
        assert create_response.status_code == 200
        sku_id = create_response.json()["id"]
        
        # Update
        update_payload = {
            "description": "Updated description",
            "color": "Red"
        }
        update_response = requests.put(f"{BASE_URL}/api/skus/{sku_id}", json=update_payload, headers=auth_headers)
        assert update_response.status_code == 200
        updated_sku = update_response.json()
        assert updated_sku["description"] == "Updated description"
        assert updated_sku["color"] == "Red"
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/skus/{sku_id}", headers=auth_headers)
        assert get_response.status_code == 200
        assert get_response.json()["description"] == "Updated description"
        print(f"✓ Updated SKU: {unique_code}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/skus/{sku_id}", headers=auth_headers)
    
    def test_delete_sku(self, auth_headers):
        """Test deleting a SKU"""
        # First create a SKU
        unique_code = f"TEST-SKU-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "sku_code": unique_code,
            "description": "SKU to be deleted",
            "hsn_code": "39201090",
            "weight_per_unit": 20.0,
            "cbm_per_unit": 0.4
        }
        create_response = requests.post(f"{BASE_URL}/api/skus", json=payload, headers=auth_headers)
        assert create_response.status_code == 200
        sku_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/skus/{sku_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/skus/{sku_id}", headers=auth_headers)
        assert get_response.status_code == 404
        print(f"✓ Deleted SKU: {unique_code}")


class TestSuppliers:
    """Supplier CRUD tests"""
    
    def test_list_suppliers(self, auth_headers):
        """Test listing suppliers"""
        response = requests.get(f"{BASE_URL}/api/suppliers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} suppliers")
    
    def test_create_supplier(self, auth_headers):
        """Test creating a new supplier"""
        unique_code = f"TEST-SUP-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "name": "Test Supplier Inc",
            "code": unique_code,
            "base_currency": "USD",
            "contact_email": "test@supplier.com",
            "contact_phone": "+1234567890",
            "address": "123 Test Street, Test City",
            "description": "Test supplier for automated testing",
            "country": "China",
            "opening_balance": 0.0
        }
        response = requests.post(f"{BASE_URL}/api/suppliers", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == unique_code
        assert data["name"] == "Test Supplier Inc"
        assert "id" in data
        print(f"✓ Created supplier: {unique_code}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/suppliers/{data['id']}", headers=auth_headers)
    
    def test_create_and_update_supplier(self, auth_headers):
        """Test creating and updating a supplier"""
        unique_code = f"TEST-SUP-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "name": "Original Supplier Name",
            "code": unique_code,
            "base_currency": "USD",
            "contact_email": "original@supplier.com",
            "contact_phone": "+1234567890",
            "address": "Original Address"
        }
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/suppliers", json=payload, headers=auth_headers)
        assert create_response.status_code == 200
        supplier_id = create_response.json()["id"]
        
        # Update
        update_payload = {
            "name": "Updated Supplier Name",
            "contact_email": "updated@supplier.com"
        }
        update_response = requests.put(f"{BASE_URL}/api/suppliers/{supplier_id}", json=update_payload, headers=auth_headers)
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "Updated Supplier Name"
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=auth_headers)
        assert get_response.status_code == 200
        assert get_response.json()["name"] == "Updated Supplier Name"
        print(f"✓ Created and updated supplier: {unique_code}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=auth_headers)
    
    def test_delete_supplier(self, auth_headers):
        """Test deleting a supplier"""
        unique_code = f"TEST-SUP-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "name": "Supplier to Delete",
            "code": unique_code,
            "base_currency": "USD",
            "contact_email": "delete@supplier.com",
            "contact_phone": "+1234567890",
            "address": "Delete Address"
        }
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/suppliers", json=payload, headers=auth_headers)
        assert create_response.status_code == 200
        supplier_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=auth_headers)
        assert get_response.status_code == 404
        print(f"✓ Deleted supplier: {unique_code}")


class TestPorts:
    """Port CRUD tests"""
    
    def test_list_ports(self, auth_headers):
        """Test listing ports"""
        response = requests.get(f"{BASE_URL}/api/ports", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} ports")
    
    def test_create_port(self, auth_headers):
        """Test creating a new port"""
        unique_code = f"TST{uuid.uuid4().hex[:3].upper()}"
        payload = {
            "name": "Test Port",
            "code": unique_code,
            "country": "Test Country",
            "transit_days": 25,
            "demurrage_free_days": 7,
            "demurrage_rate": 50.0
        }
        response = requests.post(f"{BASE_URL}/api/ports", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == unique_code
        assert data["transit_days"] == 25
        print(f"✓ Created port: {unique_code}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/ports/{data['id']}", headers=auth_headers)
    
    def test_update_port(self, auth_headers):
        """Test updating a port"""
        unique_code = f"TST{uuid.uuid4().hex[:3].upper()}"
        payload = {
            "name": "Original Port",
            "code": unique_code,
            "country": "Original Country",
            "transit_days": 30
        }
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/ports", json=payload, headers=auth_headers)
        assert create_response.status_code == 200
        port_id = create_response.json()["id"]
        
        # Update
        update_payload = {
            "name": "Updated Port",
            "transit_days": 20
        }
        update_response = requests.put(f"{BASE_URL}/api/ports/{port_id}", json=update_payload, headers=auth_headers)
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "Updated Port"
        assert update_response.json()["transit_days"] == 20
        print(f"✓ Updated port: {unique_code}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/ports/{port_id}", headers=auth_headers)
    
    def test_delete_port(self, auth_headers):
        """Test deleting a port"""
        unique_code = f"TST{uuid.uuid4().hex[:3].upper()}"
        payload = {
            "name": "Port to Delete",
            "code": unique_code,
            "country": "Delete Country"
        }
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/ports", json=payload, headers=auth_headers)
        assert create_response.status_code == 200
        port_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/ports/{port_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/ports/{port_id}", headers=auth_headers)
        assert get_response.status_code == 404
        print(f"✓ Deleted port: {unique_code}")


class TestContainers:
    """Container CRUD tests"""
    
    def test_list_containers(self, auth_headers):
        """Test listing containers"""
        response = requests.get(f"{BASE_URL}/api/containers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} containers")
    
    def test_create_container(self, auth_headers):
        """Test creating a new container"""
        payload = {
            "container_type": "20FT",
            "max_weight": 18000.0,
            "max_cbm": 28.0,
            "freight_rate": 1500.0
        }
        response = requests.post(f"{BASE_URL}/api/containers", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["container_type"] == "20FT"
        assert data["max_weight"] == 18000.0
        print(f"✓ Created container: {data['container_type']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/containers/{data['id']}", headers=auth_headers)
    
    def test_update_container(self, auth_headers):
        """Test updating a container"""
        payload = {
            "container_type": "40FT",
            "max_weight": 26000.0,
            "max_cbm": 58.0,
            "freight_rate": 2000.0
        }
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/containers", json=payload, headers=auth_headers)
        assert create_response.status_code == 200
        container_id = create_response.json()["id"]
        
        # Update
        update_payload = {
            "freight_rate": 2500.0
        }
        update_response = requests.put(f"{BASE_URL}/api/containers/{container_id}", json=update_payload, headers=auth_headers)
        assert update_response.status_code == 200
        assert update_response.json()["freight_rate"] == 2500.0
        print(f"✓ Updated container freight rate")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/containers/{container_id}", headers=auth_headers)


class TestImportOrders:
    """Import Order tests"""
    
    def test_list_import_orders(self, auth_headers):
        """Test listing import orders"""
        response = requests.get(f"{BASE_URL}/api/import-orders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} import orders")
    
    def test_create_import_order(self, auth_headers):
        """Test creating a new import order"""
        # First, we need a supplier, SKU, and container
        # Get existing data
        suppliers_response = requests.get(f"{BASE_URL}/api/suppliers", headers=auth_headers)
        skus_response = requests.get(f"{BASE_URL}/api/skus", headers=auth_headers)
        containers_response = requests.get(f"{BASE_URL}/api/containers", headers=auth_headers)
        
        suppliers = suppliers_response.json()
        skus = skus_response.json()
        containers = containers_response.json()
        
        if not suppliers or not skus or not containers:
            pytest.skip("Need at least one supplier, SKU, and container to test import orders")
        
        supplier_id = suppliers[0]["id"]
        sku_id = skus[0]["id"]
        container_type = containers[0]["container_type"]
        
        unique_po = f"TEST-PO-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "po_number": unique_po,
            "supplier_id": supplier_id,
            "container_type": container_type,
            "currency": "USD",
            "items": [
                {
                    "sku_id": sku_id,
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
        assert response.status_code == 200
        data = response.json()
        assert data["po_number"] == unique_po
        assert data["total_quantity"] == 100
        assert data["total_value"] == 1000.0
        assert "utilization_percentage" in data
        print(f"✓ Created import order: {unique_po} with {data['utilization_percentage']:.1f}% utilization")
    
    def test_get_import_order(self, auth_headers):
        """Test getting a specific import order"""
        # Get list first
        list_response = requests.get(f"{BASE_URL}/api/import-orders", headers=auth_headers)
        orders = list_response.json()
        
        if not orders:
            pytest.skip("No import orders to test")
        
        order_id = orders[0]["id"]
        response = requests.get(f"{BASE_URL}/api/import-orders/{order_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == order_id
        assert "items" in data
        print(f"✓ Retrieved import order: {data['po_number']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
