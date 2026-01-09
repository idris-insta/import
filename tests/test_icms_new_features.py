"""
Test suite for ICMS new features:
- Supplier-wise PO tracking with Excel export
- Advanced Analytics
- PO Excel import/export
- PDF export for individual orders
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

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
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestSupplierWiseSummary:
    """Tests for Supplier-wise PO tracking API"""
    
    def test_get_supplier_wise_summary(self, auth_headers):
        """Test GET /api/reports/supplier-wise-summary returns supplier data"""
        response = requests.get(f"{BASE_URL}/api/reports/supplier-wise-summary", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "suppliers" in data, "Response should contain 'suppliers' key"
        assert "totals" in data, "Response should contain 'totals' key"
        
        # Validate totals structure
        totals = data["totals"]
        assert "total_suppliers" in totals
        assert "total_pending_value" in totals
        assert "total_shipped_value" in totals
        assert "total_delivered_value" in totals
        assert "total_paid" in totals
        assert "total_balance_due" in totals
        
        print(f"✓ Supplier summary returned {len(data['suppliers'])} suppliers")
        print(f"  Total pending value: {totals['total_pending_value']}")
        print(f"  Total shipped value: {totals['total_shipped_value']}")
    
    def test_supplier_summary_data_structure(self, auth_headers):
        """Test supplier summary has correct data structure for each supplier"""
        response = requests.get(f"{BASE_URL}/api/reports/supplier-wise-summary", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data["suppliers"]) > 0:
            supplier = data["suppliers"][0]
            required_fields = [
                "supplier_code", "supplier_name", "currency",
                "pending_pos", "pending_value",
                "shipped_pos", "shipped_value",
                "delivered_pos", "delivered_value",
                "total_orders", "total_value",
                "total_paid", "balance_due"
            ]
            for field in required_fields:
                assert field in supplier, f"Missing field: {field}"
            print(f"✓ Supplier data structure validated with all required fields")
    
    def test_export_supplier_summary_excel(self, auth_headers):
        """Test GET /api/reports/supplier-wise-summary/export returns Excel file"""
        response = requests.get(f"{BASE_URL}/api/reports/supplier-wise-summary/export", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Check content type is Excel
        content_type = response.headers.get("content-type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type, f"Expected Excel content type, got: {content_type}"
        
        # Check content disposition has filename
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, "Should be attachment download"
        assert ".xlsx" in content_disp, "Should be .xlsx file"
        
        # Check file has content
        assert len(response.content) > 0, "Excel file should have content"
        print(f"✓ Supplier summary Excel export successful ({len(response.content)} bytes)")


class TestAdvancedAnalytics:
    """Tests for Advanced Analytics API"""
    
    def test_get_analytics(self, auth_headers):
        """Test GET /api/reports/analytics returns analytics data"""
        response = requests.get(f"{BASE_URL}/api/reports/analytics", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Check main sections exist
        assert "order_analytics" in data, "Should have order_analytics"
        assert "status_distribution" in data, "Should have status_distribution"
        assert "utilization_analysis" in data, "Should have utilization_analysis"
        assert "currency_exposure" in data, "Should have currency_exposure"
        
        print(f"✓ Analytics API returned all required sections")
    
    def test_analytics_order_metrics(self, auth_headers):
        """Test analytics contains order metrics"""
        response = requests.get(f"{BASE_URL}/api/reports/analytics", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        order_analytics = data.get("order_analytics", {})
        
        # Check order analytics fields
        assert "total_orders" in order_analytics
        assert "total_value" in order_analytics
        assert "avg_order_value" in order_analytics
        assert "avg_utilization" in order_analytics
        
        print(f"✓ Order analytics: {order_analytics['total_orders']} orders, ${order_analytics['total_value']} total value")
    
    def test_analytics_utilization_ranges(self, auth_headers):
        """Test analytics contains utilization analysis with ranges"""
        response = requests.get(f"{BASE_URL}/api/reports/analytics", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        utilization = data.get("utilization_analysis", {})
        
        # Check utilization ranges exist
        expected_ranges = ["0-25%", "26-50%", "51-75%", "76-100%", ">100%"]
        for range_key in expected_ranges:
            assert range_key in utilization, f"Missing utilization range: {range_key}"
        
        print(f"✓ Utilization analysis has all expected ranges")


class TestImportOrdersExcelExport:
    """Tests for Import Orders Excel export"""
    
    def test_export_orders_excel(self, auth_headers):
        """Test GET /api/import-orders/export returns Excel file"""
        response = requests.get(f"{BASE_URL}/api/import-orders/export", headers=auth_headers)
        
        # May return 404 if no orders exist
        if response.status_code == 404:
            print("⚠ No orders to export (404)")
            pytest.skip("No orders to export")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Check content type is Excel
        content_type = response.headers.get("content-type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type, f"Expected Excel content type, got: {content_type}"
        
        # Check file has content
        assert len(response.content) > 0, "Excel file should have content"
        print(f"✓ Orders Excel export successful ({len(response.content)} bytes)")
    
    def test_download_po_import_template(self, auth_headers):
        """Test GET /api/import-orders/template returns Excel template"""
        response = requests.get(f"{BASE_URL}/api/import-orders/template", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Check content type is Excel
        content_type = response.headers.get("content-type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type, f"Expected Excel content type, got: {content_type}"
        
        # Check content disposition
        content_disp = response.headers.get("content-disposition", "")
        assert "po_import_template.xlsx" in content_disp, "Should be po_import_template.xlsx"
        
        # Check file has content
        assert len(response.content) > 0, "Template file should have content"
        print(f"✓ PO import template download successful ({len(response.content)} bytes)")


class TestImportOrdersExcelImport:
    """Tests for Import Orders Excel import"""
    
    def test_import_orders_requires_file(self, auth_headers):
        """Test POST /api/import-orders/import requires file"""
        response = requests.post(f"{BASE_URL}/api/import-orders/import", headers=auth_headers)
        # Should fail without file
        assert response.status_code in [400, 422], f"Should fail without file: {response.status_code}"
        print("✓ Import endpoint correctly requires file upload")
    
    def test_import_orders_rejects_non_excel(self, auth_headers):
        """Test POST /api/import-orders/import rejects non-Excel files"""
        # Create a fake text file
        files = {"file": ("test.txt", b"not an excel file", "text/plain")}
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/import-orders/import", headers=headers, files=files)
        assert response.status_code == 400, f"Should reject non-Excel: {response.status_code}"
        assert "Excel" in response.text or "xlsx" in response.text.lower(), "Error should mention Excel format"
        print("✓ Import endpoint correctly rejects non-Excel files")


class TestPDFExport:
    """Tests for PDF export of individual orders"""
    
    def test_pdf_export_requires_valid_order(self, auth_headers):
        """Test GET /api/import-orders/{id}/pdf requires valid order ID"""
        response = requests.get(f"{BASE_URL}/api/import-orders/invalid-id-12345/pdf", headers=auth_headers)
        assert response.status_code == 404, f"Should return 404 for invalid order: {response.status_code}"
        print("✓ PDF export correctly returns 404 for invalid order")
    
    def test_pdf_export_for_existing_order(self, auth_headers):
        """Test GET /api/import-orders/{id}/pdf returns PDF for valid order"""
        # First get list of orders
        orders_response = requests.get(f"{BASE_URL}/api/import-orders", headers=auth_headers)
        assert orders_response.status_code == 200
        
        orders = orders_response.json()
        if len(orders) == 0:
            print("⚠ No orders available for PDF export test")
            pytest.skip("No orders available")
        
        order_id = orders[0]["id"]
        po_number = orders[0]["po_number"]
        
        # Request PDF
        response = requests.get(f"{BASE_URL}/api/import-orders/{order_id}/pdf", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get PDF: {response.text}"
        
        # Check content type is PDF
        content_type = response.headers.get("content-type", "")
        assert "pdf" in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        
        # Check content disposition
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, "Should be attachment download"
        assert ".pdf" in content_disp, "Should be .pdf file"
        
        # Check file has content (PDF files start with %PDF)
        assert len(response.content) > 0, "PDF file should have content"
        assert response.content[:4] == b'%PDF', "File should start with PDF header"
        
        print(f"✓ PDF export successful for order {po_number} ({len(response.content)} bytes)")


class TestMasterDataExcelExport:
    """Tests for Master Data Excel export"""
    
    def test_export_skus_excel(self, auth_headers):
        """Test GET /api/masters/export/skus returns Excel file"""
        response = requests.get(f"{BASE_URL}/api/masters/export/skus", headers=auth_headers)
        
        if response.status_code == 404:
            print("⚠ No SKUs to export")
            pytest.skip("No SKUs to export")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        content_type = response.headers.get("content-type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type
        print(f"✓ SKUs Excel export successful ({len(response.content)} bytes)")
    
    def test_export_suppliers_excel(self, auth_headers):
        """Test GET /api/masters/export/suppliers returns Excel file"""
        response = requests.get(f"{BASE_URL}/api/masters/export/suppliers", headers=auth_headers)
        
        if response.status_code == 404:
            print("⚠ No suppliers to export")
            pytest.skip("No suppliers to export")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        content_type = response.headers.get("content-type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type
        print(f"✓ Suppliers Excel export successful ({len(response.content)} bytes)")
    
    def test_download_sku_template(self, auth_headers):
        """Test GET /api/masters/template/skus returns template"""
        response = requests.get(f"{BASE_URL}/api/masters/template/skus", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        content_type = response.headers.get("content-type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type
        print(f"✓ SKU template download successful ({len(response.content)} bytes)")
    
    def test_export_invalid_master_type(self, auth_headers):
        """Test export with invalid master type returns 400"""
        response = requests.get(f"{BASE_URL}/api/masters/export/invalid_type", headers=auth_headers)
        assert response.status_code == 400, f"Should return 400 for invalid type: {response.status_code}"
        print("✓ Export correctly rejects invalid master type")


class TestSupplierOrders:
    """Tests for supplier-specific order endpoints"""
    
    def test_get_supplier_orders(self, auth_headers):
        """Test GET /api/suppliers/{id}/orders returns supplier orders"""
        # First get a supplier
        suppliers_response = requests.get(f"{BASE_URL}/api/suppliers", headers=auth_headers)
        assert suppliers_response.status_code == 200
        
        suppliers = suppliers_response.json()
        if len(suppliers) == 0:
            print("⚠ No suppliers available")
            pytest.skip("No suppliers available")
        
        supplier_id = suppliers[0]["id"]
        supplier_name = suppliers[0]["name"]
        
        # Get supplier orders
        response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}/orders", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "supplier" in data, "Should contain supplier info"
        assert "summary" in data, "Should contain summary"
        assert "orders" in data, "Should contain orders list"
        
        summary = data["summary"]
        assert "total_orders" in summary
        assert "pending_count" in summary
        assert "shipped_count" in summary
        assert "delivered_count" in summary
        
        print(f"✓ Supplier orders for '{supplier_name}': {summary['total_orders']} total orders")
    
    def test_get_supplier_orders_invalid_id(self, auth_headers):
        """Test GET /api/suppliers/{id}/orders returns 404 for invalid supplier"""
        response = requests.get(f"{BASE_URL}/api/suppliers/invalid-supplier-id/orders", headers=auth_headers)
        assert response.status_code == 404, f"Should return 404: {response.status_code}"
        print("✓ Supplier orders correctly returns 404 for invalid supplier")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
