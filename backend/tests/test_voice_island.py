"""
Backend tests for Voice Island feature - testing widget.js endpoint, 
sandbox API, and related endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

SESSION_TOKEN = "test_session_voice_1771688361699"
PROJECT_ID = "proj_b9a5b20fcba54b4d"
API_KEY = "ep_815100d4a7e74b3cb2e3243cc7ad5e07"


@pytest.fixture
def auth_headers():
    return {"Authorization": f"Bearer {SESSION_TOKEN}"}


@pytest.fixture
def api_key_headers():
    return {
        "Content-Type": "application/json",
        "x-project-key": API_KEY
    }


# ── Widget.js Endpoint Tests ──
class TestWidgetJs:
    """Tests for /api/widget.js endpoint and its content"""

    def test_widget_js_returns_200(self):
        """GET /api/widget.js should return 200"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print(f"PASS: /api/widget.js returns 200")

    def test_widget_js_returns_js_content_type(self):
        """GET /api/widget.js should return JavaScript content type"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        ct = resp.headers.get("content-type", "")
        assert "javascript" in ct or "text" in ct, f"Unexpected content-type: {ct}"
        print(f"PASS: /api/widget.js content-type: {ct}")

    def test_widget_js_contains_vi_island_class(self):
        """widget.js must contain ep-vi-island CSS class"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "ep-vi-island" in resp.text, "Missing ep-vi-island class in widget.js"
        print("PASS: widget.js contains ep-vi-island class")

    def test_widget_js_contains_epViIn_keyframes(self):
        """widget.js must contain epViIn morph animation keyframe"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "epViIn" in resp.text, "Missing epViIn keyframe in widget.js"
        print("PASS: widget.js contains epViIn keyframe")

    def test_widget_js_contains_epViOut_keyframes(self):
        """widget.js must contain epViOut morph animation keyframe"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "epViOut" in resp.text, "Missing epViOut keyframe in widget.js"
        print("PASS: widget.js contains epViOut keyframe")

    def test_widget_js_contains_voice_state_machine(self):
        """widget.js must implement VSTATE variable (voice state machine)"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "VSTATE" in resp.text, "Missing VSTATE in widget.js"
        print("PASS: widget.js contains VSTATE voice state machine")

    def test_widget_js_contains_orb_element(self):
        """widget.js must define ep-vi-orb DOM element"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "ep-vi-orb" in resp.text, "Missing ep-vi-orb in widget.js"
        print("PASS: widget.js contains ep-vi-orb element")

    def test_widget_js_contains_vi_bars(self):
        """widget.js must define ep-vi-bars (audio bars)"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "ep-vi-bars" in resp.text, "Missing ep-vi-bars in widget.js"
        print("PASS: widget.js contains ep-vi-bars element")

    def test_widget_js_contains_vi_wave(self):
        """widget.js must define ep-vi-wave (bottom wave SVG)"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "ep-vi-wave" in resp.text, "Missing ep-vi-wave in widget.js"
        print("PASS: widget.js contains ep-vi-wave element")

    def test_widget_js_contains_bottom_center_positioning(self):
        """widget.js must position island at bottom: 24px"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "bottom:24px" in resp.text or "bottom: 24px" in resp.text, \
            "Missing bottom:24px positioning in widget.js"
        print("PASS: widget.js contains bottom:24px positioning")

    def test_widget_js_contains_left_50_percent(self):
        """widget.js must center island with left:50%"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "left:50%" in resp.text or "left: 50%" in resp.text, \
            "Missing left:50% centering in widget.js"
        print("PASS: widget.js contains left:50% centering")

    def test_widget_js_contains_glassmorphism(self):
        """widget.js must have backdrop-filter blur (glassmorphism)"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "backdrop-filter:blur(24px)" in resp.text or "backdropFilter" in resp.text, \
            "Missing backdrop-filter blur in widget.js"
        print("PASS: widget.js contains glassmorphism backdrop-filter")

    def test_widget_js_contains_mute_button(self):
        """widget.js must define ep-vi-mute button"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "ep-vi-mute" in resp.text, "Missing ep-vi-mute button in widget.js"
        print("PASS: widget.js contains mute button")

    def test_widget_js_contains_speech_recognition(self):
        """widget.js must reference SpeechRecognition for STT"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "SpeechRecognition" in resp.text or "webkitSpeechRecognition" in resp.text, \
            "Missing SpeechRecognition in widget.js"
        print("PASS: widget.js contains SpeechRecognition")

    def test_widget_js_contains_speech_synthesis(self):
        """widget.js must reference speechSynthesis for TTS"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "speechSynthesis" in resp.text, "Missing speechSynthesis in widget.js"
        print("PASS: widget.js contains speechSynthesis")

    def test_widget_js_contains_silence_debounce(self):
        """widget.js must have 800ms silence debounce"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "800" in resp.text, "Missing 800ms silence debounce in widget.js"
        print("PASS: widget.js contains 800ms silence debounce")

    def test_widget_js_contains_interim_results(self):
        """widget.js must enable interimResults:true for live STT"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "interimResults" in resp.text, "Missing interimResults in widget.js"
        print("PASS: widget.js contains interimResults")

    def test_widget_js_contains_localstorage(self):
        """widget.js must use localStorage (not sessionStorage) for persistence"""
        resp = requests.get(f"{BASE_URL}/api/widget.js")
        assert resp.status_code == 200
        assert "localStorage" in resp.text, "Missing localStorage in widget.js"
        print("PASS: widget.js uses localStorage")


# ── Widget API Endpoints ──
class TestWidgetApi:
    """Tests for widget init and message streaming endpoints"""

    def test_widget_init(self, api_key_headers):
        """POST /api/widget/init should return session_id"""
        resp = requests.post(
            f"{BASE_URL}/api/widget/init",
            headers=api_key_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "session_id" in data, "Missing session_id in init response"
        assert "welcome_message" in data, "Missing welcome_message in init response"
        print(f"PASS: widget init returns session_id: {data['session_id']}")

    def test_widget_feedback(self, api_key_headers):
        """POST /api/widget/feedback should accept feedback"""
        # First create a session
        init_resp = requests.post(f"{BASE_URL}/api/widget/init", headers=api_key_headers)
        assert init_resp.status_code == 200
        # Feedback with a fake message id (should accept gracefully)
        resp = requests.post(
            f"{BASE_URL}/api/widget/feedback",
            headers=api_key_headers,
            json={"message_id": "test_msg_id", "feedback": 1}
        )
        assert resp.status_code in [200, 404], f"Unexpected status: {resp.status_code}"
        print(f"PASS: widget feedback endpoint returns {resp.status_code}")


# ── Sandbox API Endpoints ──
class TestSandboxApi:
    """Tests for sandbox init and message endpoints"""

    def test_sandbox_init(self, auth_headers):
        """POST /api/projects/{id}/sandbox/init should return session_id"""
        resp = requests.post(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/sandbox/init",
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "session_id" in data, "Missing session_id in sandbox init"
        assert "welcome_message" in data, "Missing welcome_message in sandbox init"
        print(f"PASS: sandbox init session_id: {data['session_id']}")
        return data["session_id"]

    def test_sandbox_message_stream(self, auth_headers):
        """POST sandbox message/stream should stream SSE response"""
        # Init first
        init_resp = requests.post(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/sandbox/init",
            headers=auth_headers
        )
        assert init_resp.status_code == 200
        sid = init_resp.json()["session_id"]

        # Send a message
        headers = dict(auth_headers)
        headers["Content-Type"] = "application/json"
        resp = requests.post(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/sandbox/message/stream",
            headers=headers,
            json={"session_id": sid, "content": "Hello, testing voice island", "current_url": "http://localhost"},
            stream=True,
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        # Read first chunk to verify SSE format
        got_data = False
        for line in resp.iter_lines(decode_unicode=True):
            if line and line.startswith("data: "):
                got_data = True
                break
        assert got_data, "No SSE data received from sandbox stream"
        print("PASS: sandbox message stream returns SSE data")


# ── Project API Tests ──
class TestProjectApi:
    """Tests for project CRUD APIs"""

    def test_get_projects(self, auth_headers):
        """GET /api/projects should return list"""
        resp = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list), "Projects should be a list"
        print(f"PASS: GET /api/projects returns {len(data)} projects")

    def test_get_specific_project(self, auth_headers):
        """GET /api/projects/{id} should return project details"""
        resp = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_id"] == PROJECT_ID
        assert "name" in data
        assert "api_key" in data
        print(f"PASS: GET /api/projects/{PROJECT_ID} returns project: {data['name']}")

    def test_auth_me(self, auth_headers):
        """GET /api/auth/me should return user info"""
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "user_id" in data
        assert "email" in data
        print(f"PASS: GET /api/auth/me returns user: {data['email']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
