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
- Projects: Full CRUD with API key generation, project-scoped isolation, domain whitelist
- Knowledge: Text + URL scraping with chunking & local embeddings (sentence-transformers)
- Golden Rules: Preset toggles + custom rules, injected into system prompt
- Chat: RAG pipeline (embed → search → prompt assembly → GPT-4o-mini → lead extraction)
- Widget API: init, message, feedback endpoints with x-project-key auth
- **SSE Streaming**: /api/widget/message/stream - token-by-token streaming via Server-Sent Events
- **Widget Bundle**: /api/widget.js - production-ready embeddable JS with voice mode, streaming, session persistence
- **Domain Whitelist**: Validates Origin/Referer against project's whitelisted_domains
- Sandbox: Dashboard chat testing with streaming support
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
  - **Sandbox (streaming SSE chat, cinematic Voice Island mode)**
  - **Deploy (production embed script, domain whitelist management, API key, React code snippet)**
  - Analytics (stats, charts, recent conversations)
  - Leads (kanban board with status management)
  - Feedback (rated responses, correction dialog)
- Auth flow (Google OAuth callback, protected routes)
- Responsive, dark theme dashboard

### Voice Island v2 (Feb 2026) - Cinematic Redesign
- **Positioning**: Fixed bottom-center pill (bottom:24px, left:50%, transform:translateX(-50%))
- **Morph animation**: FAB → bottom-center island via CSS `@keyframes epViIn/epViOut` with JS-computed `--vi-dx` CSS var (320ms cubic-bezier(.4,0,.2,1))
- **Dark glassmorphism**: rgba(0,0,0,.75) bg + backdrop-filter:blur(24px) + accent glow
- **State machine**: IDLE → LISTENING → PROCESSING → SPEAKING (strict, no overlaps)
- **Audio bars**: 7 vertical bars, fast-energetic (listening) vs smooth-rhythmic (speaking)
- **Live transcript**: SpeechRecognition with interimResults:true, live user speech shown
- **isFinal debounce**: 800ms silence before sending + 1.5s duplicate dedup
- **Interrupt**: Orb tap during SPEAKING → stop TTS → switch to LISTENING
- **Unified store**: Voice messages go into same MSGS array as text messages
- **Auto-listen**: After TTS ends, auto-restarts listening (650ms delay)
- **Close**: Island morphs back to FAB, chat reopens with full history
- **Backdrop**: Semi-transparent overlay with backdrop-filter:blur(4px)
- **Bottom wave**: SVG wave strips with state-driven colors (red=listening, teal=speaking, purple=idle/processing)
- **Both files updated**: widget.js (production embed) + SandboxTab.js (React dashboard)

### Widget System (widget.js) — Voice Island v2
- Self-initializing via script tag with data-project-key
- Floating bottom-right chat bubble with morph animations (chat↔fab↔oval)
- Streaming SSE responses with real-time token display
- **Voice Island**: Centered oval overlay with:
  - Animated orb (color-coded: purple=idle, red=listening, yellow=processing, teal=speaking, gray=muted)
  - Pulsing ring animations synced to voice state
  - Last user message (translucent) + last AI response (translucent)
  - Mute button (stops mic without exiting voice mode)
  - Close button (restores chat with full history preserved)
  - Full-width 3-layer bottom wave animation (SVG) reacting to voice state
  - Auto-listen loop: user speaks → AI thinks → AI speaks → auto-listen again
- STT via Web Speech API (SpeechRecognition)
- TTS via Web Speech API (speechSynthesis)
- Feedback thumbs up/down on every response
- **localStorage** persistence (conversation survives page navigation)
- Async loading, no external dependencies, ~24KB

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
