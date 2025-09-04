#!/usr/bin/env python3
"""
Comprehensive test script for the Rust backend API
Tests all endpoints for functionality and compatibility with the frontend
"""

import requests
import json
import time
import sys
from typing import Optional, Dict, Any

class APITester:
    def __init__(self, base_url: str = "http://127.0.0.1:1337"):
        self.base_url = base_url
        self.session = requests.Session()
        self.token: Optional[str] = None
        self.user_id: Optional[int] = None
        self.project_id: Optional[int] = None
        
        # Test data
        self.test_user = {
            "username": "testuser_api",
            "email": "testapi@example.com",
            "password": "testpass123"
        }
        
        self.test_project = {
            "name": "API Test Project",
            "description": "Project created by API test script",
            "is_private": False,
            "tags": "api, test, rust, backend"
        }
        
        # Counters
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0

    def log(self, message: str, level: str = "INFO"):
        """Log messages with timestamp"""
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def assert_response(self, response: requests.Response, expected_status: int, test_name: str) -> Dict[Any, Any]:
        """Assert response status and return JSON data"""
        self.tests_run += 1
        
        try:
            if response.status_code != expected_status:
                self.log(f"❌ {test_name} - Expected {expected_status}, got {response.status_code}", "ERROR")
                self.log(f"Response: {response.text}", "ERROR")
                self.tests_failed += 1
                return {}
            
            if response.headers.get('content-type', '').startswith('application/json'):
                data = response.json()
            else:
                data = {"text": response.text}
            
            self.log(f"✅ {test_name} - PASSED", "SUCCESS")
            self.tests_passed += 1
            return data
            
        except Exception as e:
            self.log(f"❌ {test_name} - Exception: {str(e)}", "ERROR")
            self.tests_failed += 1
            return {}

    def test_server_health(self):
        """Test if server is running"""
        self.log("Testing server health...")
        try:
            response = self.session.get(f"{self.base_url}/", timeout=5)
            if response.status_code in [200, 404]:  # 404 is OK for SPA routing
                self.log("✅ Server is running", "SUCCESS")
                return True
            else:
                self.log(f"❌ Server responded with {response.status_code}", "ERROR")
                return False
        except requests.exceptions.ConnectionError:
            self.log("❌ Cannot connect to server. Is it running?", "ERROR")
            return False

    def test_auth_register(self):
        """Test user registration"""
        self.log("Testing user registration...")
        
        response = self.session.post(
            f"{self.base_url}/api/auth/register",
            json=self.test_user,
            headers={"Content-Type": "application/json"}
        )
        
        data = self.assert_response(response, 201, "User Registration")
        
        if data and "token" in data and "user" in data:
            self.token = data["token"]
            self.user_id = data["user"]["id"]
            self.log(f"Got token and user ID: {self.user_id}")
            
            # Verify response structure
            user = data["user"]
            required_fields = ["id", "username", "email", "created_at"]
            for field in required_fields:
                if field not in user:
                    self.log(f"❌ Missing field in user response: {field}", "ERROR")
                    return False
            
            return True
        return False

    def test_auth_login(self):
        """Test user login"""
        self.log("Testing user login...")
        
        login_data = {
            "email": self.test_user["email"],
            "password": self.test_user["password"]
        }
        
        response = self.session.post(
            f"{self.base_url}/api/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        data = self.assert_response(response, 200, "User Login")
        
        if data and "token" in data:
            # Update token (should be fresh)
            self.token = data["token"]
            return True
        return False

    def test_auth_invalid_login(self):
        """Test login with invalid credentials"""
        self.log("Testing invalid login...")
        
        invalid_login = {
            "email": self.test_user["email"],
            "password": "wrongpassword"
        }
        
        response = self.session.post(
            f"{self.base_url}/api/auth/login",
            json=invalid_login,
            headers={"Content-Type": "application/json"}
        )
        
        self.assert_response(response, 401, "Invalid Login")

    def test_protected_without_token(self):
        """Test protected endpoint without token"""
        self.log("Testing protected endpoint without token...")
        
        response = self.session.get(f"{self.base_url}/api/user/profile")
        self.assert_response(response, 401, "Protected Route Without Token")

    def test_user_profile(self):
        """Test get user profile"""
        self.log("Testing user profile...")
        
        if not self.token:
            self.log("❌ No token available for profile test", "ERROR")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.session.get(f"{self.base_url}/api/user/profile", headers=headers)
        
        data = self.assert_response(response, 200, "Get User Profile")
        
        if data:
            required_fields = ["id", "username", "email", "created_at"]
            for field in required_fields:
                if field not in data:
                    self.log(f"❌ Missing field in profile: {field}", "ERROR")
                    return False
            return True
        return False

    def test_user_update_email(self):
        """Test update user email"""
        self.log("Testing email update...")
        
        if not self.token:
            self.log("❌ No token available for email update test", "ERROR")
            return False
        
        new_email = "updated_" + self.test_user["email"]
        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        
        response = self.session.put(
            f"{self.base_url}/api/user/update-email",
            json={"email": new_email},
            headers=headers
        )
        
        data = self.assert_response(response, 200, "Update User Email")
        
        if data and "data" in data and data["data"]:
            if data["data"]["email"] == new_email:
                self.log("✅ Email updated successfully")
                return True
            else:
                self.log("❌ Email not updated in response", "ERROR")
        return False

    def test_project_create(self):
        """Test create project"""
        self.log("Testing project creation...")
        
        if not self.token:
            self.log("❌ No token available for project creation", "ERROR")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        
        response = self.session.post(
            f"{self.base_url}/api/projects",
            json=self.test_project,
            headers=headers
        )
        
        data = self.assert_response(response, 200, "Create Project")
        
        if data and "id" in data:
            self.project_id = data["id"]
            self.log(f"Created project with ID: {self.project_id}")
            
            # Verify project structure
            required_fields = ["id", "name", "description", "is_private", "user_id", "created_at", "tags"]
            for field in required_fields:
                if field not in data:
                    self.log(f"❌ Missing field in project: {field}", "ERROR")
                    return False
            
            # Verify tags were parsed correctly
            if len(data["tags"]) != 4:  # "api, test, rust, backend"
                self.log(f"❌ Expected 4 tags, got {len(data['tags'])}", "ERROR")
                return False
            
            return True
        return False

    def test_projects_list(self):
        """Test get projects list"""
        self.log("Testing projects list...")
        
        if not self.token:
            self.log("❌ No token available for projects list", "ERROR")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.session.get(f"{self.base_url}/api/projects", headers=headers)
        
        data = self.assert_response(response, 200, "Get Projects List")
        
        if isinstance(data, list) and len(data) > 0:
            # Should contain our created project
            project = data[0]
            if project.get("id") == self.project_id:
                self.log("✅ Projects list contains created project")
                return True
            else:
                self.log("❌ Created project not found in list", "ERROR")
        return False

    def test_project_get(self):
        """Test get single project"""
        self.log("Testing get single project...")
        
        if not self.token or not self.project_id:
            self.log("❌ No token or project ID available", "ERROR")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.session.get(f"{self.base_url}/api/projects/{self.project_id}", headers=headers)
        
        data = self.assert_response(response, 200, "Get Single Project")
        
        if data and data.get("id") == self.project_id:
            return True
        return False

    def test_project_update(self):
        """Test update project"""
        self.log("Testing project update...")
        
        if not self.token or not self.project_id:
            self.log("❌ No token or project ID available", "ERROR")
            return False
        
        update_data = {
            "name": "Updated API Test Project",
            "description": "Updated description",
            "tags": ["updated", "test"]
        }
        
        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        response = self.session.put(
            f"{self.base_url}/api/projects/{self.project_id}",
            json=update_data,
            headers=headers
        )
        
        data = self.assert_response(response, 200, "Update Project")
        
        if data:
            if data.get("name") == update_data["name"] and len(data.get("tags", [])) == 2:
                return True
            else:
                self.log("❌ Project not updated correctly", "ERROR")
        return False

    def test_project_flow_save(self):
        """Test save project flow"""
        self.log("Testing project flow save...")
        
        if not self.token or not self.project_id:
            self.log("❌ No token or project ID available", "ERROR")
            return False
        
        flow_data = {
            "flow": json.dumps({
                "nodes": [
                    {"id": "1", "type": "note", "position": {"x": 100, "y": 100}, "data": {"label": "Test Node"}},
                    {"id": "2", "type": "image", "position": {"x": 300, "y": 100}, "data": {"label": "Image Node"}}
                ],
                "edges": [
                    {"id": "e1-2", "source": "1", "target": "2"}
                ]
            })
        }
        
        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        response = self.session.post(
            f"{self.base_url}/api/projects/{self.project_id}/flow",
            json=flow_data,
            headers=headers
        )
        
        data = self.assert_response(response, 200, "Save Project Flow")
        
        if data and data.get("message") == "Flow saved successfully":
            return True
        return False

    def test_project_flow_get(self):
        """Test get project flow"""
        self.log("Testing project flow get...")
        
        if not self.token or not self.project_id:
            self.log("❌ No token or project ID available", "ERROR")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.session.get(f"{self.base_url}/api/projects/{self.project_id}/flow", headers=headers)
        
        data = self.assert_response(response, 200, "Get Project Flow")
        
        if data and "flow" in data:
            # Verify flow data can be parsed as JSON
            try:
                flow_json = json.loads(data["flow"])
                if "nodes" in flow_json and "edges" in flow_json:
                    self.log("✅ Flow data is valid JSON with nodes and edges")
                    return True
            except json.JSONDecodeError:
                self.log("❌ Flow data is not valid JSON", "ERROR")
        return False

    def test_image_upload(self):
        """Test image upload"""
        self.log("Testing image upload...")
        
        if not self.token:
            self.log("❌ No token available for image upload", "ERROR")
            return False
        
        # Simple 1x1 red pixel PNG in base64
        test_image_data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        upload_data = {
            "nodeId": "test-node-123",
            "imageData": test_image_data
        }
        
        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        response = self.session.post(
            f"{self.base_url}/api/upload-image",
            json=upload_data,
            headers=headers
        )
        
        data = self.assert_response(response, 200, "Upload Image")
        
        if data and data.get("message") == "Image uploaded successfully":
            if "data" in data or "imageData" in data:  # Backend returns imageData in data field
                return True
        return False

    def test_project_delete(self):
        """Test delete project"""
        self.log("Testing project deletion...")
        
        if not self.token or not self.project_id:
            self.log("❌ No token or project ID available", "ERROR")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.session.delete(f"{self.base_url}/api/projects/{self.project_id}", headers=headers)
        
        data = self.assert_response(response, 200, "Delete Project")
        
        if data and data.get("message") == "Project deleted successfully":
            return True
        return False

    def test_user_delete_account(self):
        """Test delete user account"""
        self.log("Testing account deletion...")
        
        if not self.token:
            self.log("❌ No token available for account deletion", "ERROR")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.session.delete(f"{self.base_url}/api/user/delete-account", headers=headers)
        
        data = self.assert_response(response, 200, "Delete User Account")
        
        if data and data.get("message") == "Account deleted successfully":
            return True
        return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting comprehensive API tests...")
        self.log(f"Testing server at: {self.base_url}")
        
        # Check if server is running
        if not self.test_server_health():
            self.log("❌ Server is not accessible. Please start the Rust backend first.", "ERROR")
            return False
        
        # Test sequence
        tests = [
            # Authentication tests
            self.test_auth_register,
            self.test_auth_login,
            self.test_auth_invalid_login,
            self.test_protected_without_token,
            
            # User management tests
            self.test_user_profile,
            self.test_user_update_email,
            
            # Project management tests
            self.test_project_create,
            self.test_projects_list,
            self.test_project_get,
            self.test_project_update,
            
            # Flow management tests
            self.test_project_flow_save,
            self.test_project_flow_get,
            
            # Image upload test
            self.test_image_upload,
            
            # Cleanup tests
            self.test_project_delete,
            self.test_user_delete_account,
        ]
        
        self.log(f"Running {len(tests)} test scenarios...")
        
        for test in tests:
            try:
                test()
            except Exception as e:
                self.log(f"❌ Test {test.__name__} failed with exception: {str(e)}", "ERROR")
                self.tests_failed += 1
                self.tests_run += 1
            
            # Small delay between tests
            time.sleep(0.1)
        
        # Print summary
        self.print_summary()
        
        return self.tests_failed == 0

    def print_summary(self):
        """Print test results summary"""
        self.log("=" * 60)
        self.log("🧪 TEST SUMMARY")
        self.log("=" * 60)
        self.log(f"Total Tests: {self.tests_run}")
        self.log(f"✅ Passed: {self.tests_passed}")
        self.log(f"❌ Failed: {self.tests_failed}")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.tests_failed == 0:
            self.log("🎉 ALL TESTS PASSED! The Rust backend is fully compatible!", "SUCCESS")
        else:
            self.log(f"⚠️  {self.tests_failed} tests failed. Check the logs above for details.", "WARNING")
        
        self.log("=" * 60)


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test the Rust backend API")
    parser.add_argument("--url", default="http://127.0.0.1:1337", help="Backend URL (default: http://127.0.0.1:1337)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        import logging
        logging.basicConfig(level=logging.DEBUG)
    
    tester = APITester(args.url)
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        tester.log("\n⚠️  Tests interrupted by user", "WARNING")
        sys.exit(1)
    except Exception as e:
        tester.log(f"❌ Unexpected error: {str(e)}", "ERROR")
        sys.exit(1)


if __name__ == "__main__":
    main()
