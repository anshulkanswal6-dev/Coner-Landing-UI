import requests
import json
import sys
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

    def run_test(self, name, method, endpoint, expected_status, headers=None, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text[:200]}...")

            return success, response

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, None

    def test_widget_js_voice_island(self):
        """Test widget.js contains Voice Island implementation"""
        success, response = self.run_test(
            "GET /api/widget.js (Voice Island code)",
            "GET",
            "widget.js",
            200
        )
        
        if not success or not response:
            return False
            
        widget_code = response.text
        
        # Check for Voice Island DOM elements
        voice_island_checks = [
            ("ep-vi DOM element", "ep-vi" in widget_code),
            ("ep-vi-oval container", "ep-vi-oval" in widget_code),
            ("ep-vi-orb element", "ep-vi-orb" in widget_code),
            ("ep-vi-mute button", "ep-vi-mute" in widget_code),
            ("ep-vi-close button", "ep-vi-close" in widget_code),
            ("ep-vi-wave element", "ep-vi-wave" in widget_code),
            ("Voice Island CSS classes", ".ep-vi{" in widget_code),
            ("Morph animation CSS", "morphing-out" in widget_code),
            ("epChatIn keyframes", "epChatIn" in widget_code),
            ("epChatOut keyframes", "epChatOut" in widget_code),
            ("localStorage usage", "localStorage" in widget_code and "sessionStorage" not in widget_code),
            ("Bottom wave 3 SVG layers", "w1" in widget_code and "w2" in widget_code and "w3" in widget_code),
            ("Voice state management", "VSTATE" in widget_code),
            ("SpeechRecognition", "SpeechRecognition" in widget_code or "webkitSpeechRecognition" in widget_code),
            ("speechSynthesis", "speechSynthesis" in widget_code),
        ]
        
        print("📋 Voice Island Structure Check:")
        all_passed = True
        for check_name, passed in voice_island_checks:
            status = "✅" if passed else "❌"
            print(f"   {status} {check_name}")
            if not passed:
                all_passed = False
        
        return all_passed

    def test_backend_endpoints(self):
        """Test key backend endpoints are still working"""
        auth_headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        api_key_headers = {"x-project-key": API_KEY}
        
        endpoints = [
            ("Root API", "GET", "", 200, {}),
            ("Auth me", "GET", "auth/me", 200, auth_headers),
            ("Projects list", "GET", "projects", 200, auth_headers),
            ("Widget init", "POST", "widget/init", 200, api_key_headers),
            ("Project analytics", "GET", f"projects/{PROJECT_ID}/analytics", 200, auth_headers),
            ("Project golden rules", "GET", f"projects/{PROJECT_ID}/golden-rules", 200, auth_headers),
            ("Project knowledge", "GET", f"projects/{PROJECT_ID}/knowledge", 200, auth_headers),
            ("Project leads", "GET", f"projects/{PROJECT_ID}/leads", 200, auth_headers),
            ("Project feedback", "GET", f"projects/{PROJECT_ID}/feedback", 200, auth_headers),
        ]
        
        backend_passed = 0
        for name, method, endpoint, expected, headers in endpoints:
            success, _ = self.run_test(name, method, endpoint, expected, headers)
            if success:
                backend_passed += 1
        
        return backend_passed, len(endpoints)

    def test_sandbox_endpoints(self):
        """Test sandbox/testing endpoints work"""
        auth_headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        
        # Test sandbox init
        success, response = self.run_test(
            "Sandbox Init",
            "POST",
            f"projects/{PROJECT_ID}/sandbox/init",
            200,
            auth_headers
        )
        
        if not success or not response:
            return False, None
            
        init_data = response.json()
        session_id = init_data.get("session_id")
        
        if not session_id:
            print("❌ No session_id in sandbox init response")
            return False, None
            
        # Test sandbox message
        message_data = {
            "session_id": session_id,
            "content": "Hello, this is a test message",
            "current_url": "https://test.example.com"
        }
        
        success, response = self.run_test(
            "Sandbox Message",
            "POST",
            f"projects/{PROJECT_ID}/sandbox/message",
            200,
            auth_headers,
            message_data
        )
        
        return success, session_id

def main():
    print("🚀 Starting Voice Island Backend Testing...")
    tester = VoiceIslandAPITester()
    
    # Test 1: Widget.js Voice Island structure
    print("\n" + "="*50)
    print("1. WIDGET.JS VOICE ISLAND STRUCTURE")
    print("="*50)
    widget_passed = tester.test_widget_js_voice_island()
    
    # Test 2: Backend endpoints functionality
    print("\n" + "="*50)
    print("2. BACKEND ENDPOINTS FUNCTIONALITY")
    print("="*50)
    backend_passed, backend_total = tester.test_backend_endpoints()
    
    # Test 3: Sandbox endpoints
    print("\n" + "="*50)
    print("3. SANDBOX ENDPOINTS")
    print("="*50)
    sandbox_passed, session_id = tester.test_sandbox_endpoints()
    
    # Results
    print("\n" + "="*50)
    print("📊 FINAL RESULTS")
    print("="*50)
    print(f"Widget.js Voice Island Structure: {'✅ PASSED' if widget_passed else '❌ FAILED'}")
    print(f"Backend Endpoints: {backend_passed}/{backend_total} passed")
    print(f"Sandbox Functionality: {'✅ PASSED' if sandbox_passed else '❌ FAILED'}")
    print(f"Total API Tests: {tester.tests_passed}/{tester.tests_run} passed")
    
    # Determine overall success
    overall_success = (
        widget_passed and
        backend_passed >= backend_total * 0.8 and  # Allow 20% failure for backend 
        sandbox_passed
    )
    
    print(f"\n🎯 OVERALL: {'✅ SUCCESS' if overall_success else '❌ FAILED'}")
    
    if not overall_success:
        print("\n❌ Issues found:")
        if not widget_passed:
            print("- Widget.js missing Voice Island components")
        if backend_passed < backend_total * 0.8:
            print(f"- Backend endpoints failing ({backend_total - backend_passed} failed)")
        if not sandbox_passed:
            print("- Sandbox endpoints not working")
    
    return 0 if overall_success else 1

if __name__ == "__main__":
    sys.exit(main())