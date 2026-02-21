import requests
import sys
import json
from datetime import datetime

class EmergentPulseAPITester:
    def __init__(self, base_url="https://business-ai-platform-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = "test_session_token_001"  # From review_request
        self.api_key = "ep_efabd995e18a4096b89e68260b90cb74"  # From review_request
        self.project_id = "proj_9d10065d69634f87"  # From review_request
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_api_key=False):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        # Set up headers
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        
        if use_api_key:
            test_headers['x-project-key'] = self.api_key
        else:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        print(f"   Headers: {test_headers}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            print(f"   Status: {response.status_code}")
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.text else {}
                    if response_data:
                        print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    response_data = {}
                return True, response_data
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json() if response.text else {"error": "No response body"}
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error text: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Exception: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test GET /api/ returns API info"""
        return self.run_test("API Root", "GET", "", 200)

    def test_auth_me(self):
        """Test GET /api/auth/me with valid session token"""
        return self.run_test("Auth Me", "GET", "auth/me", 200)

    def test_create_project(self):
        """Test POST /api/projects creates a project"""
        project_data = {
            "name": f"Test Project {datetime.now().strftime('%H%M%S')}",
            "description": "Test project for API testing",
            "welcome_message": "Hello! I'm your test assistant."
        }
        return self.run_test("Create Project", "POST", "projects", 201, data=project_data)

    def test_list_projects(self):
        """Test GET /api/projects lists user's projects"""
        return self.run_test("List Projects", "GET", "projects", 200)

    def test_get_project_detail(self):
        """Test GET /api/projects/{id} returns project detail"""
        return self.run_test("Get Project Detail", "GET", f"projects/{self.project_id}", 200)

    def test_update_golden_rules(self):
        """Test PUT /api/projects/{id}/golden-rules updates rules"""
        rules_data = {
            "preset_rules": {
                "professional_tone": True,
                "never_mention_competitors": False,
                "dont_discuss_pricing": True,
                "stay_on_topic": True,
                "be_concise": True,
                "ask_before_assuming": False
            },
            "custom_rules": ["Always be helpful and friendly", "Focus on providing accurate information"]
        }
        return self.run_test("Update Golden Rules", "PUT", f"projects/{self.project_id}/golden-rules", 200, data=rules_data)

    def test_add_knowledge_text(self):
        """Test POST /api/projects/{id}/knowledge/text adds knowledge"""
        knowledge_data = {
            "title": "Company Information",
            "content": "Our company specializes in AI-powered solutions for businesses. We offer 24/7 support and have over 10 years of experience in the industry. Our main services include chatbot development, natural language processing, and machine learning consulting."
        }
        return self.run_test("Add Knowledge Text", "POST", f"projects/{self.project_id}/knowledge/text", 200, data=knowledge_data)

    def test_sandbox_init(self):
        """Test POST /api/projects/{id}/sandbox/init creates a session"""
        success, response = self.run_test("Sandbox Init", "POST", f"projects/{self.project_id}/sandbox/init", 200)
        if success and 'session_id' in response:
            self.session_id = response['session_id']
            print(f"   Session ID: {self.session_id}")
        return success, response

    def test_sandbox_message(self):
        """Test POST /api/projects/{id}/sandbox/message sends chat message"""
        if not self.session_id:
            print("⚠️  Skipping sandbox message test - no session ID")
            return False, {}
        
        message_data = {
            "session_id": self.session_id,
            "content": "Hello! Can you tell me about your company?",
            "current_url": "https://example.com"
        }
        return self.run_test("Sandbox Message", "POST", f"projects/{self.project_id}/sandbox/message", 200, data=message_data)

    def test_get_analytics(self):
        """Test GET /api/projects/{id}/analytics returns analytics data"""
        return self.run_test("Get Analytics", "GET", f"projects/{self.project_id}/analytics", 200)

    def test_get_leads(self):
        """Test GET /api/projects/{id}/leads returns leads list"""
        return self.run_test("Get Leads", "GET", f"projects/{self.project_id}/leads", 200)

    def test_get_feedback(self):
        """Test GET /api/projects/{id}/feedback returns feedback list"""
        return self.run_test("Get Feedback", "GET", f"projects/{self.project_id}/feedback", 200)

    def test_widget_init(self):
        """Test POST /api/widget/init with x-project-key header"""
        success, response = self.run_test("Widget Init", "POST", "widget/init", 200, use_api_key=True)
        if success and 'session_id' in response:
            self.widget_session_id = response['session_id']
            print(f"   Widget Session ID: {self.widget_session_id}")
        return success, response

    def test_widget_message(self):
        """Test POST /api/widget/message with x-project-key"""
        if not hasattr(self, 'widget_session_id') or not self.widget_session_id:
            print("⚠️  Skipping widget message test - no widget session ID")
            return False, {}
        
        message_data = {
            "session_id": self.widget_session_id,
            "content": "Hello! I'm interested in your services.",
            "current_url": "https://example.com"
        }
        return self.run_test("Widget Message", "POST", "widget/message", 200, data=message_data, use_api_key=True)

def main():
    print("🚀 Starting EmergentPulse AI API Tests")
    print("=" * 50)
    
    tester = EmergentPulseAPITester()
    
    # Run all tests
    test_results = []
    
    # Basic API tests
    test_results.append(("API Root", *tester.test_api_root()))
    test_results.append(("Auth Me", *tester.test_auth_me()))
    
    # Project management tests
    test_results.append(("List Projects", *tester.test_list_projects()))
    test_results.append(("Get Project Detail", *tester.test_get_project_detail()))
    test_results.append(("Update Golden Rules", *tester.test_update_golden_rules()))
    test_results.append(("Add Knowledge Text", *tester.test_add_knowledge_text()))
    
    # Sandbox tests
    test_results.append(("Sandbox Init", *tester.test_sandbox_init()))
    test_results.append(("Sandbox Message", *tester.test_sandbox_message()))
    
    # Analytics and data tests
    test_results.append(("Get Analytics", *tester.test_get_analytics()))
    test_results.append(("Get Leads", *tester.test_get_leads()))
    test_results.append(("Get Feedback", *tester.test_get_feedback()))
    
    # Widget API tests (public with API key)
    test_results.append(("Widget Init", *tester.test_widget_init()))
    test_results.append(("Widget Message", *tester.test_widget_message()))
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    failed_tests = []
    for test_name, success, response in test_results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if not success:
            failed_tests.append(test_name)
    
    print(f"\n📈 Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if failed_tests:
        print("\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"  - {test}")
        return 1
    else:
        print("\n🎉 All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())