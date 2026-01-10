"""
Test suite for Reports & Analytics features
- Supplier-wise summary with ledger
- Container-wise report
- Payments summary (made and due)
- Payment notifications
- Supplier payment terms
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://freight-master-9.preview.emergentagent.com')

class TestReportsFeatures:
    """Test Reports & Analytics API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "owner@icms.com",
            "password": "owner123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_supplier_wise_summary(self):
        """Test supplier-wise summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/supplier-wise-summary", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "suppliers" in data
        assert "totals" in data
        
        # Check supplier data structure
        if data["suppliers"]:
            supplier = data["suppliers"][0]
            assert "supplier_id" in supplier, "supplier_id missing from response"
            assert "supplier_code" in supplier
            assert "supplier_name" in supplier
            assert "pending_pos" in supplier
            assert "pending_value" in supplier
            assert "shipped_pos" in supplier
            assert "shipped_value" in supplier
            assert "total_paid" in supplier
            assert "balance_due" in supplier
        
        # Check totals
        totals = data["totals"]
        assert "total_suppliers" in totals
        assert "total_pending_value" in totals
        assert "total_shipped_value" in totals
        assert "total_balance_due" in totals
        
        print(f"Supplier-wise summary: {len(data['suppliers'])} suppliers, Total balance due: {totals['total_balance_due']}")
    
    def test_container_wise_report(self):
        """Test container-wise report endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/container-wise", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "containers" in data
        assert "totals" in data
        
        # Check container data structure
        for container_type, container_data in data["containers"].items():
            assert "shipped" in container_data
            assert "pending" in container_data
            assert "delivered" in container_data
            assert "in_transit" in container_data
            
            # Check each status has count, value, and orders
            for status in ["shipped", "pending", "delivered", "in_transit"]:
                assert "count" in container_data[status]
                assert "value" in container_data[status]
                assert "orders" in container_data[status]
        
        # Check totals
        totals = data["totals"]
        assert "total_shipped" in totals
        assert "total_pending" in totals
        assert "total_delivered" in totals
        assert "total_in_transit" in totals
        
        print(f"Container-wise report: {len(data['containers'])} container types")
        print(f"  Pending: {totals['total_pending']}, Shipped: {totals['total_shipped']}, In Transit: {totals['total_in_transit']}, Delivered: {totals['total_delivered']}")
    
    def test_supplier_ledger(self):
        """Test supplier ledger endpoint"""
        # First get suppliers
        suppliers_response = requests.get(f"{BASE_URL}/api/suppliers", headers=self.headers)
        assert suppliers_response.status_code == 200
        suppliers = suppliers_response.json()
        
        if suppliers:
            supplier_id = suppliers[0]["id"]
            
            # Get ledger for first supplier
            response = requests.get(f"{BASE_URL}/api/reports/supplier-ledger/{supplier_id}", headers=self.headers)
            assert response.status_code == 200
            
            data = response.json()
            assert "supplier" in data
            assert "summary" in data
            assert "ledger" in data
            
            # Check supplier info
            supplier_info = data["supplier"]
            assert "id" in supplier_info
            assert "name" in supplier_info
            assert "payment_terms_days" in supplier_info
            assert "payment_terms_type" in supplier_info
            
            # Check summary
            summary = data["summary"]
            assert "opening_balance" in summary
            assert "total_orders" in summary
            assert "total_order_value" in summary
            assert "total_paid" in summary
            assert "current_balance" in summary
            
            # Check ledger entries
            if data["ledger"]:
                entry = data["ledger"][0]
                assert "date" in entry
                assert "type" in entry
                assert "reference" in entry
                assert "debit" in entry
                assert "credit" in entry
                assert "balance" in entry
            
            print(f"Supplier ledger for {supplier_info['name']}: {len(data['ledger'])} entries, Current balance: {summary['current_balance']}")
    
    def test_payments_summary(self):
        """Test payments summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/payments-summary", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "payments_made" in data
        assert "payments_due" in data
        assert "summary" in data
        
        # Check payments made structure
        payments_made = data["payments_made"]
        assert "records" in payments_made
        assert "total_count" in payments_made
        assert "total_amount" in payments_made
        
        if payments_made["records"]:
            payment = payments_made["records"][0]
            assert "payment_id" in payment
            assert "reference" in payment
            assert "po_number" in payment
            assert "amount" in payment
            assert "currency" in payment
            assert "inr_amount" in payment
        
        # Check payments due structure
        payments_due = data["payments_due"]
        assert "records" in payments_due
        assert "total_count" in payments_due
        assert "total_due" in payments_due
        assert "overdue_count" in payments_due
        
        if payments_due["records"]:
            due = payments_due["records"][0]
            assert "order_id" in due
            assert "po_number" in due
            assert "balance_due" in due
            assert "due_date" in due
            assert "is_overdue" in due
        
        # Check summary
        summary = data["summary"]
        assert "total_paid" in summary
        assert "total_due" in summary
        assert "total_overdue" in summary
        
        print(f"Payments summary: {payments_made['total_count']} payments made, {payments_due['total_count']} payments due")
        print(f"  Total paid: {summary['total_paid']}, Total due: {summary['total_due']}, Overdue: {summary['total_overdue']}")
    
    def test_payment_notifications(self):
        """Test payment notifications endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/notifications", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "notifications" in data
        assert "counts" in data
        
        # Check counts structure
        counts = data["counts"]
        assert "critical" in counts
        assert "high" in counts
        assert "medium" in counts
        assert "total" in counts
        
        # Check notification structure if any exist
        if data["notifications"]:
            notification = data["notifications"][0]
            assert "type" in notification
            assert "severity" in notification
            assert "title" in notification
            assert "message" in notification
            assert "po_number" in notification
            assert "amount" in notification
        
        print(f"Payment notifications: {counts['total']} total (Critical: {counts['critical']}, High: {counts['high']}, Medium: {counts['medium']})")


class TestSupplierPaymentTerms:
    """Test Supplier Payment Terms functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "owner@icms.com",
            "password": "owner123"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_supplier_has_payment_terms(self):
        """Test that suppliers have payment terms fields"""
        response = requests.get(f"{BASE_URL}/api/suppliers", headers=self.headers)
        assert response.status_code == 200
        
        suppliers = response.json()
        if suppliers:
            supplier = suppliers[0]
            assert "payment_terms_days" in supplier, "payment_terms_days missing from supplier"
            assert "payment_terms_type" in supplier, "payment_terms_type missing from supplier"
            
            print(f"Supplier {supplier['name']}: Payment terms = {supplier['payment_terms_type']} {supplier['payment_terms_days']} days")
    
    def test_create_supplier_with_payment_terms(self):
        """Test creating supplier with payment terms"""
        import uuid
        test_code = f"TEST-{uuid.uuid4().hex[:8].upper()}"
        
        supplier_data = {
            "name": "Test Payment Terms Supplier",
            "code": test_code,
            "base_currency": "USD",
            "contact_email": "test@paymentterms.com",
            "contact_phone": "+1-555-0199",
            "address": "Test Address",
            "payment_terms_days": 45,
            "payment_terms_type": "LC"
        }
        
        response = requests.post(f"{BASE_URL}/api/suppliers", json=supplier_data, headers=self.headers)
        assert response.status_code == 200
        
        created = response.json()
        assert created["payment_terms_days"] == 45
        assert created["payment_terms_type"] == "LC"
        
        # Cleanup - delete the test supplier
        delete_response = requests.delete(f"{BASE_URL}/api/suppliers/{created['id']}", headers=self.headers)
        assert delete_response.status_code == 200
        
        print(f"Created and deleted test supplier with payment terms: {supplier_data['payment_terms_type']} {supplier_data['payment_terms_days']} days")
    
    def test_update_supplier_payment_terms(self):
        """Test updating supplier payment terms"""
        # Get existing supplier
        response = requests.get(f"{BASE_URL}/api/suppliers", headers=self.headers)
        assert response.status_code == 200
        suppliers = response.json()
        
        if suppliers:
            supplier = suppliers[0]
            original_days = supplier.get("payment_terms_days", 30)
            original_type = supplier.get("payment_terms_type", "NET")
            
            # Update payment terms
            update_data = {
                "payment_terms_days": 60,
                "payment_terms_type": "TT"
            }
            
            update_response = requests.put(
                f"{BASE_URL}/api/suppliers/{supplier['id']}", 
                json=update_data, 
                headers=self.headers
            )
            assert update_response.status_code == 200
            
            updated = update_response.json()
            assert updated["payment_terms_days"] == 60
            assert updated["payment_terms_type"] == "TT"
            
            # Restore original values
            restore_data = {
                "payment_terms_days": original_days,
                "payment_terms_type": original_type
            }
            requests.put(f"{BASE_URL}/api/suppliers/{supplier['id']}", json=restore_data, headers=self.headers)
            
            print(f"Updated supplier payment terms: {original_type} {original_days} -> TT 60 -> restored")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
