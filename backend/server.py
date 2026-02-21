from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import re
import hashlib
import numpy as np
import httpx
import litellm
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bs4 import BeautifulSoup
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
EMERGENT_PROXY_URL = "https://integrations.emergentagent.com/llm"

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Pydantic Models ───
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    welcome_message: Optional[str] = "Hi! How can I help you today?"
    primary_color: Optional[str] = "#7C3AED"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    welcome_message: Optional[str] = None
    primary_color: Optional[str] = None
    status: Optional[str] = None

class GoldenRulesUpdate(BaseModel):
    preset_rules: Optional[Dict[str, bool]] = None
    custom_rules: Optional[List[str]] = None

class KnowledgeTextInput(BaseModel):
    title: str
    content: str

class KnowledgeUrlInput(BaseModel):
    url: str

class ChatInitRequest(BaseModel):
    pass

class ChatMessageRequest(BaseModel):
    session_id: str
    content: str
    current_url: Optional[str] = ""

class FeedbackRequest(BaseModel):
    message_id: str
    feedback: int  # 1 or -1

class CorrectionCreate(BaseModel):
    message_id: str
    corrected_response: str

class LeadStatusUpdate(BaseModel):
    status: str  # New, Contacted, Qualified, Closed

# ─── Helper Functions ───
def gen_id(prefix=""):
    return f"{prefix}{uuid.uuid4().hex[:16]}"

def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))

async def get_embedding(text: str) -> List[float]:
    try:
        text = text.replace("\n", " ").strip()[:8000]
        response = litellm.embedding(
            model="text-embedding-3-small",
            input=[text],
            api_key=EMERGENT_LLM_KEY,
            api_base=EMERGENT_PROXY_URL,
            custom_llm_provider="openai"
        )
        return response.data[0]['embedding']
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate embedding")

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        i += chunk_size - overlap
    return chunks if chunks else [text[:2000]]

async def get_current_user(request: Request) -> dict:
    token = None
    cookie_token = request.cookies.get("session_token")
    auth_header = request.headers.get("Authorization", "")
    if cookie_token:
        token = cookie_token
    elif auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_project_for_user(project_id: str, user: dict) -> dict:
    project = await db.projects.find_one({"project_id": project_id, "user_id": user["user_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

async def get_project_by_api_key(api_key: str) -> dict:
    project = await db.projects.find_one({"api_key": api_key}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Invalid API key")
    return project

async def search_similar_chunks(project_id: str, query_embedding: List[float], top_k: int = 5) -> List[dict]:
    chunks = await db.knowledge_chunks.find(
        {"project_id": project_id},
        {"_id": 0, "content": 1, "embedding": 1, "source_title": 1, "chunk_index": 1}
    ).to_list(500)
    if not chunks:
        return []
    scored = []
    for c in chunks:
        if c.get("embedding"):
            sim = cosine_similarity(query_embedding, c["embedding"])
            scored.append({"content": c["content"], "source": c.get("source_title", ""), "score": sim})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]

async def search_corrections(project_id: str, query_embedding: List[float]) -> Optional[str]:
    corrections = await db.corrections.find(
        {"project_id": project_id},
        {"_id": 0, "corrected_response": 1, "embedding": 1}
    ).to_list(100)
    for c in corrections:
        if c.get("embedding"):
            sim = cosine_similarity(query_embedding, c["embedding"])
            if sim > 0.90:
                return c["corrected_response"]
    return None

# ─── Auth Routes ───
@api_router.post("/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = resp.json()
    email = data.get("email")
    name = data.get("name", "")
    picture = data.get("picture", "")
    session_token = data.get("session_token", f"st_{uuid.uuid4().hex}")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = gen_id("user_")
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    response.set_cookie(
        key="session_token", value=session_token, httponly=True,
        secure=True, samesite="none", path="/", max_age=7*24*60*60
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

# ─── Project Routes ───
@api_router.get("/projects")
async def list_projects(user: dict = Depends(get_current_user)):
    projects = await db.projects.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    for p in projects:
        p["knowledge_count"] = await db.knowledge_sources.count_documents({"project_id": p["project_id"]})
        p["lead_count"] = await db.leads.count_documents({"project_id": p["project_id"]})
        p["conversation_count"] = await db.conversations.count_documents({"project_id": p["project_id"]})
    return projects

@api_router.post("/projects")
async def create_project(data: ProjectCreate, user: dict = Depends(get_current_user)):
    project_id = gen_id("proj_")
    api_key = f"ep_{uuid.uuid4().hex}"
    project = {
        "project_id": project_id, "user_id": user["user_id"],
        "name": data.name, "description": data.description,
        "api_key": api_key, "welcome_message": data.welcome_message,
        "primary_color": data.primary_color, "status": "draft",
        "golden_rules": {"preset_rules": {
            "professional_tone": True, "never_mention_competitors": False,
            "dont_discuss_pricing": False, "stay_on_topic": True,
            "be_concise": True, "ask_before_assuming": False
        }, "custom_rules": []},
        "agent_mode": "support",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.projects.insert_one(project)
    project.pop("_id", None)
    return project

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await get_project_for_user(project_id, user)
    project["knowledge_count"] = await db.knowledge_sources.count_documents({"project_id": project_id})
    project["lead_count"] = await db.leads.count_documents({"project_id": project_id})
    project["conversation_count"] = await db.conversations.count_documents({"project_id": project_id})
    return project

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, user: dict = Depends(get_current_user)):
    await get_project_for_user(project_id, user)
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        await db.projects.update_one({"project_id": project_id}, {"$set": updates})
    return await db.projects.find_one({"project_id": project_id}, {"_id": 0})

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    await get_project_for_user(project_id, user)
    await db.projects.delete_one({"project_id": project_id})
    await db.knowledge_sources.delete_many({"project_id": project_id})
    await db.knowledge_chunks.delete_many({"project_id": project_id})
    await db.conversations.delete_many({"project_id": project_id})
    await db.messages.delete_many({"project_id": project_id})
    await db.leads.delete_many({"project_id": project_id})
    await db.feedback.delete_many({"project_id": project_id})
    await db.corrections.delete_many({"project_id": project_id})
    return {"message": "Project deleted"}

# ─── Golden Rules Routes ───
@api_router.get("/projects/{project_id}/golden-rules")
async def get_golden_rules(project_id: str, user: dict = Depends(get_current_user)):
    project = await get_project_for_user(project_id, user)
    return project.get("golden_rules", {"preset_rules": {}, "custom_rules": []})

@api_router.put("/projects/{project_id}/golden-rules")
async def update_golden_rules(project_id: str, data: GoldenRulesUpdate, user: dict = Depends(get_current_user)):
    await get_project_for_user(project_id, user)
    updates = {}
    if data.preset_rules is not None:
        updates["golden_rules.preset_rules"] = data.preset_rules
    if data.custom_rules is not None:
        updates["golden_rules.custom_rules"] = data.custom_rules
    if updates:
        await db.projects.update_one({"project_id": project_id}, {"$set": updates})
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    return project.get("golden_rules", {})

# ─── Knowledge Routes ───
@api_router.get("/projects/{project_id}/knowledge")
async def list_knowledge(project_id: str, user: dict = Depends(get_current_user)):
    await get_project_for_user(project_id, user)
    sources = await db.knowledge_sources.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    return sources

@api_router.post("/projects/{project_id}/knowledge/text")
async def add_knowledge_text(project_id: str, data: KnowledgeTextInput, user: dict = Depends(get_current_user)):
    await get_project_for_user(project_id, user)
    source_id = gen_id("ks_")
    source = {
        "source_id": source_id, "project_id": project_id, "type": "text",
        "title": data.title, "status": "processing",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.knowledge_sources.insert_one(source)
    try:
        chunks = chunk_text(data.content)
        for i, chunk in enumerate(chunks):
            embedding = await get_embedding(chunk)
            await db.knowledge_chunks.insert_one({
                "chunk_id": gen_id("ck_"), "source_id": source_id, "project_id": project_id,
                "content": chunk, "embedding": embedding, "source_title": data.title,
                "chunk_index": i, "created_at": datetime.now(timezone.utc).isoformat()
            })
        await db.knowledge_sources.update_one(
            {"source_id": source_id},
            {"$set": {"status": "completed", "chunk_count": len(chunks)}}
        )
    except Exception as e:
        logger.error(f"Knowledge processing error: {e}")
        await db.knowledge_sources.update_one({"source_id": source_id}, {"$set": {"status": "failed", "error": str(e)}})
        raise HTTPException(status_code=500, detail=f"Failed to process knowledge: {str(e)}")
    source_doc = await db.knowledge_sources.find_one({"source_id": source_id}, {"_id": 0})
    return source_doc

@api_router.post("/projects/{project_id}/knowledge/url")
async def add_knowledge_url(project_id: str, data: KnowledgeUrlInput, user: dict = Depends(get_current_user)):
    await get_project_for_user(project_id, user)
    source_id = gen_id("ks_")
    source = {
        "source_id": source_id, "project_id": project_id, "type": "url",
        "title": data.url, "url": data.url, "status": "processing",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.knowledge_sources.insert_one(source)
    try:
        async with httpx.AsyncClient(timeout=30) as http_client:
            resp = await http_client.get(data.url, follow_redirects=True)
            html = resp.text
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        title = soup.title.string if soup.title else data.url
        text = re.sub(r'\n{3,}', '\n\n', text)
        await db.knowledge_sources.update_one({"source_id": source_id}, {"$set": {"title": title}})
        chunks = chunk_text(text)
        for i, chunk in enumerate(chunks):
            embedding = await get_embedding(chunk)
            await db.knowledge_chunks.insert_one({
                "chunk_id": gen_id("ck_"), "source_id": source_id, "project_id": project_id,
                "content": chunk, "embedding": embedding, "source_title": title,
                "chunk_index": i, "created_at": datetime.now(timezone.utc).isoformat()
            })
        await db.knowledge_sources.update_one(
            {"source_id": source_id},
            {"$set": {"status": "completed", "chunk_count": len(chunks)}}
        )
    except Exception as e:
        logger.error(f"URL scraping error: {e}")
        await db.knowledge_sources.update_one({"source_id": source_id}, {"$set": {"status": "failed", "error": str(e)}})
        raise HTTPException(status_code=500, detail=f"Failed to scrape URL: {str(e)}")
    source_doc = await db.knowledge_sources.find_one({"source_id": source_id}, {"_id": 0})
    return source_doc

@api_router.delete("/projects/{project_id}/knowledge/{source_id}")
async def delete_knowledge(project_id: str, source_id: str, user: dict = Depends(get_current_user)):
    await get_project_for_user(project_id, user)
    await db.knowledge_sources.delete_one({"source_id": source_id, "project_id": project_id})
    await db.knowledge_chunks.delete_many({"source_id": source_id, "project_id": project_id})
    return {"message": "Knowledge source deleted"}

# ─── Widget API (Public, auth via API key) ───
@api_router.post("/widget/init")
async def widget_init(request: Request):
    api_key = request.headers.get("x-project-key", "")
    project = await get_project_by_api_key(api_key)
    session_id = gen_id("ses_")
    await db.conversations.insert_one({
        "session_id": session_id, "project_id": project["project_id"],
        "started_at": datetime.now(timezone.utc).isoformat(), "message_count": 0
    })
    return {
        "session_id": session_id,
        "project_name": project["name"],
        "welcome_message": project.get("welcome_message", "Hi! How can I help you?"),
        "primary_color": project.get("primary_color", "#7C3AED"),
        "agent_mode": project.get("agent_mode", "support")
    }

@api_router.post("/widget/message")
async def widget_message(data: ChatMessageRequest, request: Request):
    api_key = request.headers.get("x-project-key", "")
    project = await get_project_by_api_key(api_key)
    project_id = project["project_id"]
    conv = await db.conversations.find_one({"session_id": data.session_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Session not found")

    # Store user message
    user_msg_id = gen_id("msg_")
    await db.messages.insert_one({
        "message_id": user_msg_id, "session_id": data.session_id, "project_id": project_id,
        "role": "user", "content": data.content, "current_url": data.current_url,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # RAG: embed query, search chunks, search corrections
    query_embedding = await get_embedding(data.content)

    # Check corrections first
    correction = await search_corrections(project_id, query_embedding)
    if correction:
        assistant_msg_id = gen_id("msg_")
        await db.messages.insert_one({
            "message_id": assistant_msg_id, "session_id": data.session_id, "project_id": project_id,
            "role": "assistant", "content": correction, "source": "correction",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.conversations.update_one({"session_id": data.session_id}, {"$inc": {"message_count": 2}})
        return {"message_id": assistant_msg_id, "content": correction, "source": "correction"}

    # Search knowledge
    relevant_chunks = await search_similar_chunks(project_id, query_embedding, top_k=5)
    context = "\n\n".join([f"[Source: {c['source']}]\n{c['content']}" for c in relevant_chunks if c['score'] > 0.3])

    # Get conversation history
    history = await db.messages.find(
        {"session_id": data.session_id},
        {"_id": 0, "role": 1, "content": 1}
    ).sort("created_at", 1).to_list(20)

    # Build system prompt with golden rules
    rules = project.get("golden_rules", {})
    preset = rules.get("preset_rules", {})
    custom = rules.get("custom_rules", [])
    rules_text = ""
    if preset.get("professional_tone"):
        rules_text += "- Always maintain a professional and friendly tone.\n"
    if preset.get("never_mention_competitors"):
        rules_text += "- Never mention or compare with competitors.\n"
    if preset.get("dont_discuss_pricing"):
        rules_text += "- Do not discuss specific pricing details. Direct to sales team.\n"
    if preset.get("stay_on_topic"):
        rules_text += "- Stay on topic. Only answer questions related to the business.\n"
    if preset.get("be_concise"):
        rules_text += "- Keep responses concise and clear.\n"
    if preset.get("ask_before_assuming"):
        rules_text += "- Ask clarifying questions before making assumptions.\n"
    for r in custom:
        rules_text += f"- {r}\n"

    mode = project.get("agent_mode", "support")
    mode_instruction = ""
    if mode == "acquisition":
        mode_instruction = """You are in ACQUISITION mode. Your goal is to qualify the visitor as a lead.
Naturally collect: name, email, phone, and requirements through conversation.
When you have this information, include it as JSON at the end: {"lead": {"name": "...", "email": "...", "phone": "...", "requirements": "..."}}"""
    else:
        mode_instruction = "You are in SUPPORT mode. Help the user with their questions using the knowledge base."

    system_prompt = f"""You are an AI assistant for "{project['name']}". {project.get('description', '')}

{mode_instruction}

RULES:
{rules_text}

KNOWLEDGE BASE CONTEXT:
{context if context else "No relevant knowledge found. Answer based on general knowledge but stay within the business scope."}

If the user's current page URL is provided, you can suggest navigation.
Current URL: {data.current_url or 'Not provided'}

Respond in markdown format when helpful. Be helpful, accurate, and follow all rules strictly."""

    # Build messages for LLM
    chat_messages = [{"role": "system", "content": system_prompt}]
    for h in history[-10:]:
        chat_messages.append({"role": h["role"], "content": h["content"] if isinstance(h["content"], str) else str(h["content"])})

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"widget_{data.session_id}",
            system_message=system_prompt,
            initial_messages=chat_messages
        ).with_model("openai", "gpt-4o-mini")
        response_text = await chat.send_message(UserMessage(text=data.content))
    except Exception as e:
        logger.error(f"LLM error: {e}")
        response_text = "I'm having trouble processing your request right now. Please try again in a moment."

    # Extract lead if present
    lead_match = re.search(r'\{"lead":\s*\{[^}]+\}\}', response_text)
    if lead_match:
        try:
            import json
            lead_data = json.loads(lead_match.group())["lead"]
            await db.leads.insert_one({
                "lead_id": gen_id("lead_"), "project_id": project_id,
                "session_id": data.session_id, "name": lead_data.get("name", ""),
                "email": lead_data.get("email", ""), "phone": lead_data.get("phone", ""),
                "requirements": lead_data.get("requirements", ""), "status": "New",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            response_text = response_text.replace(lead_match.group(), "").strip()
        except Exception:
            pass

    assistant_msg_id = gen_id("msg_")
    await db.messages.insert_one({
        "message_id": assistant_msg_id, "session_id": data.session_id, "project_id": project_id,
        "role": "assistant", "content": response_text,
        "chunks_used": len(relevant_chunks),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.conversations.update_one({"session_id": data.session_id}, {"$inc": {"message_count": 2}})
    return {"message_id": assistant_msg_id, "content": response_text, "source": "rag"}

@api_router.post("/widget/feedback")
async def widget_feedback(data: FeedbackRequest, request: Request):
    api_key = request.headers.get("x-project-key", "")
    await get_project_by_api_key(api_key)
    await db.messages.update_one({"message_id": data.message_id}, {"$set": {"feedback": data.feedback}})
    return {"message": "Feedback recorded"}

# ─── Dashboard Chat (Sandbox) ───
@api_router.post("/projects/{project_id}/sandbox/message")
async def sandbox_message(project_id: str, data: ChatMessageRequest, user: dict = Depends(get_current_user)):
    project = await get_project_for_user(project_id, user)
    # Reuse widget message logic with project's api_key
    from starlette.datastructures import MutableHeaders
    class FakeRequest:
        def __init__(self, api_key):
            self._headers = {"x-project-key": api_key}
        @property
        def headers(self):
            return self._headers
    fake_req = FakeRequest(project["api_key"])
    return await widget_message(data, fake_req)

@api_router.post("/projects/{project_id}/sandbox/init")
async def sandbox_init(project_id: str, user: dict = Depends(get_current_user)):
    project = await get_project_for_user(project_id, user)
    class FakeRequest:
        def __init__(self, api_key):
            self._headers = {"x-project-key": api_key}
        @property
        def headers(self):
            return self._headers
    fake_req = FakeRequest(project["api_key"])
    return await widget_init(fake_req)

# ─── Leads Routes ───
@api_router.get("/projects/{project_id}/leads")
async def list_leads(project_id: str, user: dict = Depends(get_current_user)):
    await get_project_for_user(project_id, user)
    leads = await db.leads.find({"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return leads

@api_router.put("/projects/{project_id}/leads/{lead_id}")
async def update_lead(project_id: str, lead_id: str, data: LeadStatusUpdate, user: dict = Depends(get_current_user)):
    await get_project_for_user(project_id, user)
    await db.leads.update_one({"lead_id": lead_id, "project_id": project_id}, {"$set": {"status": data.status}})
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    return lead

# ─── Analytics Routes ───
@api_router.get("/projects/{project_id}/analytics")
async def get_analytics(project_id: str, user: dict = Depends(get_current_user)):
    await get_project_for_user(project_id, user)
    total_conversations = await db.conversations.count_documents({"project_id": project_id})
    total_messages = await db.messages.count_documents({"project_id": project_id})
    total_leads = await db.leads.count_documents({"project_id": project_id})
    positive_feedback = await db.messages.count_documents({"project_id": project_id, "feedback": 1})
    negative_feedback = await db.messages.count_documents({"project_id": project_id, "feedback": -1})
    total_feedback = positive_feedback + negative_feedback
    satisfaction_rate = round((positive_feedback / total_feedback * 100), 1) if total_feedback > 0 else 0

    # Recent conversations
    recent = await db.conversations.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("started_at", -1).to_list(10)

    # Lead stats by status
    lead_pipeline = [
        {"$match": {"project_id": project_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    lead_stats = {}
    async for doc in db.leads.aggregate(lead_pipeline):
        lead_stats[doc["_id"]] = doc["count"]

    return {
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "total_leads": total_leads,
        "satisfaction_rate": satisfaction_rate,
        "positive_feedback": positive_feedback,
        "negative_feedback": negative_feedback,
        "lead_stats": lead_stats,
        "recent_conversations": recent
    }

# ─── Feedback & Corrections ───
@api_router.get("/projects/{project_id}/feedback")
async def list_feedback(project_id: str, user: dict = Depends(get_current_user)):
    await get_project_for_user(project_id, user)
    messages = await db.messages.find(
        {"project_id": project_id, "feedback": {"$exists": True, "$ne": 0}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    results = []
    for msg in messages:
        if msg["role"] == "assistant":
            user_msg = await db.messages.find_one(
                {"session_id": msg["session_id"], "role": "user", "created_at": {"$lt": msg["created_at"]}},
                {"_id": 0}
            )
            results.append({
                "message_id": msg["message_id"],
                "session_id": msg["session_id"],
                "user_query": user_msg["content"] if user_msg else "",
                "assistant_response": msg["content"],
                "feedback": msg.get("feedback", 0),
                "created_at": msg["created_at"]
            })
    return results

@api_router.post("/projects/{project_id}/corrections")
async def create_correction(project_id: str, data: CorrectionCreate, user: dict = Depends(get_current_user)):
    await get_project_for_user(project_id, user)
    msg = await db.messages.find_one({"message_id": data.message_id}, {"_id": 0})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    user_msg = await db.messages.find_one(
        {"session_id": msg["session_id"], "role": "user", "created_at": {"$lt": msg["created_at"]}},
        {"_id": 0}
    )
    query_text = user_msg["content"] if user_msg else ""
    embedding = await get_embedding(query_text + " " + data.corrected_response)
    correction_id = gen_id("cor_")
    await db.corrections.insert_one({
        "correction_id": correction_id, "project_id": project_id,
        "message_id": data.message_id, "original_query": query_text,
        "corrected_response": data.corrected_response, "embedding": embedding,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"correction_id": correction_id, "message": "Correction saved"}

# ─── Root ───
@api_router.get("/")
async def root():
    return {"message": "EmergentPulse AI API", "version": "1.0.0"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token")
    await db.projects.create_index("user_id")
    await db.projects.create_index("api_key", unique=True)
    await db.knowledge_sources.create_index("project_id")
    await db.knowledge_chunks.create_index("project_id")
    await db.knowledge_chunks.create_index("source_id")
    await db.conversations.create_index("project_id")
    await db.conversations.create_index("session_id", unique=True)
    await db.messages.create_index("session_id")
    await db.messages.create_index("project_id")
    await db.leads.create_index("project_id")
    await db.corrections.create_index("project_id")
    logger.info("EmergentPulse AI backend started")

@app.on_event("shutdown")
async def shutdown():
    client.close()
