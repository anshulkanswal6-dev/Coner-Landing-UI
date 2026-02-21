# EmergentPulse AI - Product Requirements Document

## Problem Statement
Build a multi-tenant AI SaaS platform (EmergentPulse AI / Coner AI) where business users can create AI agents, inject business knowledge, configure behavior using golden rules, test bots, deploy via embed script, capture leads, view conversation intelligence, and continuously improve responses via feedback loop.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/UI + recharts
- **Backend**: FastAPI (Python) 
- **Database**: MongoDB (motor async driver)
- **LLM**: GPT-4o-mini via Emergent LLM Key (emergentintegrations library)
- **Embeddings**: Local sentence-transformers (all-MiniLM-L6-v2) for semantic search
- **Auth**: Emergent-managed Google OAuth

## User Personas
- Non-technical business owners (SaaS startups, e-commerce, agencies, clinics, law firms)
- Want zero-code AI deployment in under 5 minutes

## Core Requirements
1. Multi-tenant project isolation (knowledge, conversations, leads, analytics)
2. Knowledge injection (text, URL scraping)
3. RAG pipeline (chunking, embeddings, semantic search, prompt orchestration)
4. Golden rules engine (preset + custom behavioral guardrails)
5. Dual-mode AI agent (support + acquisition/lead capture)
6. Embeddable widget (script tag + React component)
7. Lead capture and management (kanban board)
8. Analytics dashboard (conversations, satisfaction, feedback)
9. Feedback & corrections system (RLHF-style self-improvement)
10. Voice mode (browser Web Speech API)

## What's Been Implemented (Feb 21, 2026)

### Backend (server.py)
- Auth: Google OAuth (Emergent), session management, /api/auth/session, /api/auth/me, /api/auth/logout
- Projects: Full CRUD with API key generation, project-scoped isolation
- Knowledge: Text + URL scraping with chunking & local embeddings
- Golden Rules: Preset toggles + custom rules, injected into system prompt
- Chat: RAG pipeline (embed → search → prompt assembly → GPT-4o-mini → lead extraction)
- Widget API: init, message, feedback endpoints with x-project-key auth
- Sandbox: Dashboard chat testing with debug info
- Leads: CRUD + status management
- Analytics: Aggregated stats (conversations, messages, leads, satisfaction)
- Feedback: View rated messages + submit corrections (stored for RLHF retrieval)
- Corrections: Semantic search with 0.90 threshold for automatic correction serving

### Frontend
- Landing page (hero, features, how-it-works, CTA) - Light theme
- Dashboard (project list, stats cards, search, create dialog) - Dark theme
- Project Detail with 7 tabs:
  - Knowledge (text/URL upload, source list with status)
  - Golden Rules (toggle presets, custom rules)
  - Sandbox (real-time chat, voice input, feedback buttons)
  - Deploy (embed script, API key, React component code)
  - Analytics (stats, charts, recent conversations)
  - Leads (kanban board with status management)
  - Feedback (rated responses, correction dialog)
- Auth flow (Google OAuth callback, protected routes)
- Responsive, dark theme dashboard with glassmorphism sidebar

## P0 Remaining
- None critical - all core flows functional

## P1 Backlog
- File upload (PDF/DOCX) for knowledge injection
- Website domain whitelisting for widget
- Streaming SSE for chat responses
- Real widget.js bundle served from CDN
- RBAC (Owner, Admin, Editor, Viewer roles)

## P2 Backlog
- Multi-language support
- External webhooks (Zapier, HubSpot)
- Advanced analytics (topic clustering, knowledge gap detection)
- Omnichannel (WhatsApp, Slack integration)
- A/B testing for agent configurations
