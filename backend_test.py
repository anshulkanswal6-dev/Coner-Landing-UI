import requests
import sys
import json
from datetime import datetime

# Test credentials from review request
SESSION_TOKEN = "test_session_token_001"
API_KEY = "ep_efabd995e18a4096b89e68260b90cb74"
PROJECT_ID = "proj_9d10065d69634f87"

class VoiceIslandAPITester:
    def __init__(self, base_url="https://business-ai-platform-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

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

    # NEW FEATURE TESTS
    def test_widget_js_endpoint(self):
        """Test GET /api/widget.js returns JavaScript content"""
        url = f"{self.base_url}/api/widget.js"
        print(f"\n🔍 Testing Widget.js Endpoint...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url)
            print(f"   Status: {response.status_code}")
            print(f"   Content-Type: {response.headers.get('Content-Type')}")
            print(f"   Content Length: {len(response.text)} characters")
            
            success = (response.status_code == 200 and 
                      'application/javascript' in response.headers.get('Content-Type', '') and
                      'function()' in response.text and
                      'ep-widget' in response.text)
            
            if success:
                self.tests_passed += 1
                print("✅ Passed - Widget.js endpoint working correctly")
                # Check for voice and streaming features
                has_voice = 'voice' in response.text.lower()
                has_streaming = 'stream' in response.text.lower()
                has_stt = 'speechrecognition' in response.text.lower()
                print(f"   ✓ Voice features: {has_voice}")
                print(f"   ✓ Streaming: {has_streaming}")  
                print(f"   ✓ Speech recognition: {has_stt}")
                return True, {"has_voice": has_voice, "has_streaming": has_streaming}
            else:
                print(f"❌ Failed - Expected JS content with application/javascript content-type")
                print(f"   Content preview: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Exception: {str(e)}")
            return False, {}
        finally:
            self.tests_run += 1

    def test_widget_message_stream(self):
        """Test POST /api/widget/message/stream returns SSE"""
        if not hasattr(self, 'widget_session_id') or not self.widget_session_id:
            print("⚠️  Skipping widget stream test - no widget session ID")
            return False, {}
        
        url = f"{self.base_url}/api/widget/message/stream"
        headers = {
            'Content-Type': 'application/json',
            'x-project-key': self.api_key
        }
        
        message_data = {
            "session_id": self.widget_session_id,
            "content": "Tell me about AI in one sentence.",
            "current_url": "https://example.com"
        }
        
        print(f"\n🔍 Testing Widget Message Stream...")
        print(f"   URL: {url}")
        
        try:
            response = requests.post(url, json=message_data, headers=headers, stream=True)
            print(f"   Status: {response.status_code}")
            print(f"   Content-Type: {response.headers.get('Content-Type')}")
            
            if response.status_code == 200 and 'text/event-stream' in response.headers.get('Content-Type', ''):
                # Read streaming response
                tokens_received = 0
                done_received = False
                
                for line in response.iter_lines(decode_unicode=True):
                    if line and line.startswith('data: '):
                        try:
                            data = json.loads(line[6:])  # Remove 'data: '
                            if 'token' in data:
                                tokens_received += 1
                            if data.get('done') == True:
                                done_received = True
                                print(f"   ✓ Final event with done:true and message_id: {data.get('message_id')}")
                                break
                        except json.JSONDecodeError:
                            continue
                    
                    if tokens_received > 50:  # Stop after getting sufficient tokens
                        break
                
                success = tokens_received > 0 and done_received
                if success:
                    self.tests_passed += 1
                    print(f"✅ Passed - SSE streaming working, received {tokens_received} tokens")
                    return True, {"tokens_received": tokens_received, "done_received": done_received}
                else:
                    print(f"❌ Failed - Expected SSE tokens and done event, got {tokens_received} tokens, done: {done_received}")
                    return False, {}
            else:
                print(f"❌ Failed - Expected 200 with text/event-stream, got {response.status_code}")
                return False, {}
                
        except Exception as e:
            print(f"❌ Failed - Exception: {str(e)}")
            return False, {}
        finally:
            self.tests_run += 1

    def test_sandbox_message_stream(self):
        """Test POST /api/projects/{id}/sandbox/message/stream returns SSE"""
        if not self.session_id:
            print("⚠️  Skipping sandbox stream test - no session ID")
            return False, {}
        
        url = f"{self.base_url}/api/projects/{self.project_id}/sandbox/message/stream"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
        
        message_data = {
            "session_id": self.session_id,
            "content": "What is artificial intelligence?",
            "current_url": "https://example.com"
        }
        
        print(f"\n🔍 Testing Sandbox Message Stream...")
        print(f"   URL: {url}")
        
        try:
            response = requests.post(url, json=message_data, headers=headers, stream=True, cookies={'session_token': self.session_token})
            print(f"   Status: {response.status_code}")
            print(f"   Content-Type: {response.headers.get('Content-Type')}")
            
            if response.status_code == 200 and 'text/event-stream' in response.headers.get('Content-Type', ''):
                tokens_received = 0
                done_received = False
                
                for line in response.iter_lines(decode_unicode=True):
                    if line and line.startswith('data: '):
                        try:
                            data = json.loads(line[6:])
                            if 'token' in data:
                                tokens_received += 1
                            if data.get('done') == True:
                                done_received = True
                                print(f"   ✓ Final event with done:true and message_id: {data.get('message_id')}")
                                break
                        except json.JSONDecodeError:
                            continue
                    
                    if tokens_received > 50:
                        break
                
                success = tokens_received > 0
                if success:
                    self.tests_passed += 1
                    if done_received:
                        print(f"✅ Passed - Sandbox SSE streaming working, received {tokens_received} tokens with done event")
                    else:
                        print(f"✅ Passed - Sandbox SSE streaming working, received {tokens_received} tokens (stopped early)")
                    return True, {"tokens_received": tokens_received}
                else:
                    print(f"❌ Failed - No streaming tokens received")
                    return False, {}
            else:
                print(f"❌ Failed - Expected 200 with text/event-stream, got {response.status_code}")
                return False, {}
                
        except Exception as e:
            print(f"❌ Failed - Exception: {str(e)}")
            return False, {}
        finally:
            self.tests_run += 1

    def test_project_update_domains(self):
        """Test PUT /api/projects/{id} updates whitelisted_domains"""
        update_data = {
            "whitelisted_domains": ["example.com", "test.com", "mysite.org"]
        }
        
        success, response = self.run_test(
            "Update Project Domains", 
            "PUT", 
            f"projects/{self.project_id}", 
            200, 
            data=update_data
        )
        
        if success and response.get('whitelisted_domains') == update_data['whitelisted_domains']:
            print("   ✓ Whitelisted domains updated successfully")
            return True, response
        elif success:
            print(f"   ❌ Domains not updated correctly: {response.get('whitelisted_domains')}")
            return False, response
        else:
            return False, {}

def main():
    print("🚀 Starting EmergentPulse AI API Tests - NEW FEATURES")
    print("=" * 60)
    
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
    
    # NEW FEATURE: Project domain whitelist update
    test_results.append(("Update Project Domains", *tester.test_project_update_domains()))
    
    # Sandbox tests
    test_results.append(("Sandbox Init", *tester.test_sandbox_init()))
    test_results.append(("Sandbox Message", *tester.test_sandbox_message()))
    
    # NEW FEATURE: Sandbox SSE streaming
    test_results.append(("Sandbox Message Stream", *tester.test_sandbox_message_stream()))
    
    # Analytics and data tests
    test_results.append(("Get Analytics", *tester.test_get_analytics()))
    test_results.append(("Get Leads", *tester.test_get_leads()))
    test_results.append(("Get Feedback", *tester.test_get_feedback()))
    
    # Widget API tests (public with API key)
    test_results.append(("Widget Init", *tester.test_widget_init()))
    test_results.append(("Widget Message", *tester.test_widget_message()))
    
    # NEW FEATURES: Widget.js and SSE streaming
    test_results.append(("Widget.js Endpoint", *tester.test_widget_js_endpoint()))
    test_results.append(("Widget Message Stream", *tester.test_widget_message_stream()))
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY - NEW FEATURES FOCUS")
    print("=" * 60)
    
    failed_tests = []
    for test_name, success, response in test_results:
        status = "✅ PASS" if success else "❌ FAIL"
        # Highlight new features
        if any(keyword in test_name.lower() for keyword in ['stream', 'widget.js', 'domains']):
            status += " [NEW FEATURE]"
        print(f"{status} {test_name}")
        if not success:
            failed_tests.append(test_name)
    
    print(f"\n📈 Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    # Count new feature tests
    new_feature_tests = [t for t in test_results if any(keyword in t[0].lower() for keyword in ['stream', 'widget.js', 'domains'])]
    new_feature_passed = len([t for t in new_feature_tests if t[1]])
    print(f"🆕 New Features: {new_feature_passed}/{len(new_feature_tests)} tests passed")
    
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