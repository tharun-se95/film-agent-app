# 🎬 Film Script Agent — Developer Documentation

> A production-grade, streaming Multi-Agent AI system that autonomously writes, critiques, and iteratively rewrites film scripts using LangGraph, Groq, and Supabase.

---

## 🧠 What This Project Is

This application is a **Director Dashboard** — a real-time interface where a multi-agent AI team collaborates to produce a polished screenplay from a single-sentence idea.

The user types a concept (e.g., *"A rogue AI that falls in love with its creator"*), and three autonomous agents — the **Outliner**, **Drafter**, and **Critic** — debate and rewrite the script until it passes a quality threshold, all streamed live to the UI.

---

## 🏗️ Architecture Overview

```
User Prompt
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                  LangGraph State Machine                 │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ Outliner │───▶│  Drafter │───▶│  Critic  │          │
│  └──────────┘    └──────────┘    └──────────┘          │
│                       ▲               │                  │
│                       │  score < 8    │                  │
│                       └───────────────┘                  │
│                             OR iterations >= 3 → END     │
└─────────────────────────────────────────────────────────┘
    │                              │
    ▼                              ▼
Server-Sent Events (SSE)      Supabase Postgres
  streamed to Next.js UI       (draft persistence)
```

### Agent Roles

| Agent | LLM Temperature | Responsibility |
|---|---|---|
| **Outliner** | 0.8 (Creative) | Generates a rich 3-act beat sheet with character motivations |
| **Drafter** | 0.8 (Creative) | Writes full screenplay scenes, incorporates critic's historical feedback |
| **Critic** | 0.0 (Deterministic) | Evaluates the draft via Zod-structured JSON output, scores 1–10 |

---

## 🗂️ Project Structure

```
film-agent-app/
├── src/
│   ├── agent/
│   │   └── graph.ts              # LangGraph state machine (all 3 agents)
│   ├── app/
│   │   ├── api/agent/route.ts    # SSE streaming API route
│   │   ├── page.tsx              # Director Dashboard UI
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Tailwind v4 design system
│   └── utils/
│       └── supabase.ts           # Safe Supabase client wrapper
├── supabase-schema.sql           # DB schema for reproducing the setup
├── test-groq.mjs                 # Standalone Groq API sanity test
├── test-zod.mjs                  # Standalone Zod structured output test
├── .env.local                    # API keys (not committed)
└── package.json
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **AI Orchestration** | LangGraph (`@langchain/langgraph`) |
| **LLM Provider** | Groq API — `llama-3.3-70b-versatile` |
| **LLM Wrapper** | LangChain OpenAI-compatible (`@langchain/openai`) |
| **Structured Output** | Zod + `.withStructuredOutput()` via function calling |
| **Streaming** | Server-Sent Events (SSE) from Next.js API Route |
| **Database** | Supabase (Postgres) |
| **Styling** | Tailwind CSS v4 |
| **Icons** | Lucide React |
| **Diff Viewer** | `react-diff-viewer-continued` |

---

## 🗄️ Database Schema (Supabase)

```sql
CREATE TABLE drafts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  prompt_context   TEXT,           -- The outline used to generate this draft
  iteration        INTEGER,        -- Draft version number (1, 2, 3...)
  content          TEXT,           -- The full screenplay text
  critic_score     INTEGER,        -- Score out of 10 from the Critic agent
  critic_notes     TEXT            -- Full text critique from the Critic agent
);
```

Row Level Security is enabled with public read/insert/update policies for the anon key.

---

## 🖥️ Key UI Features

### 1. Director Dashboard (Left Panel)
- **Live Architecture Flow**: animated node badges (Outliner → Drafter → Critic) with active glow and completion state
- **Agent Logs**: real-time chat-style event stream, color-coded by agent type
- **Commit History Timeline**: vertical list of every draft iteration with its score badge and a clickable **diff →** button

### 2. Screenplay Preview (Right Panel)
- **Full Script View**: cinema-style A4 paper layout with "CONFIDENTIAL DRAFT" watermark
- **Outliner Beat Sheet**: rendered separately above the script
- **Draft Metadata Bar**: shows active draft version, score, and critic notes preview

### 3. Side-by-Side Visual Diff
- Click  **diff →** on any commit in the history
- Opens a full side-by-side diff using `ReactDiffViewer` with word-level highlighting
- Red = what the Critic made the Drafter remove, Green = what was added in the rewrite

---

## 🔑 Environment Variables

Create a `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qpwyxbtozlqbdpdjmnis.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SECRET_KEY=your_service_role_key_here
```

The Groq API key is currently hardcoded in `src/agent/graph.ts` — move it to `.env.local` before production.

```env
GROQ_API_KEY=gsk_...
```

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open the app
# http://localhost:3000
```

---

## 🗺️ Backlog & Future Implementations

### 🔴 High Priority

- [ ] **Move API keys to `.env.local`** — The Groq API key is currently hardcoded in `graph.ts`. This is a security issue and must be moved to environment variables before any deployment.

- [ ] **User Authentication** — Add Supabase Auth (GitHub/Google OAuth) so each user only sees their own script history. Right now all drafts go into a single shared table.

- [ ] **Project Management** — Add a `projects` table to associate a set of drafts with a single user prompt/session, so users can manage multiple films simultaneously.

### 🟡 Medium Priority

- [ ] **Script Export** — Add PDF/FDX (Final Draft) export for the completed screenplay. A "Download Script" button using `jsPDF` or a serverless PDF generation API would make this genuinely useful to filmmakers.

- [ ] **Drafter + Critic Temperature Tuning UI** — Expose temperature sliders in the UI so the user can dial the creativity vs. precision of each agent without touching code.

- [ ] **Streaming Token-by-Token Output** — Instead of waiting for an entire draft to complete before streaming it, pipe LangChain's streaming tokens directly to the SSE channel so the user watches the Drafter write character-by-character in real time.

- [ ] **"Restore Version" Button** — Allow the user to select an older commit and restore it as the current canonical draft, then resume the critic loop from that point.

### 🟢 Low Priority / Nice-to-Have

- [ ] **Agent Tool Use** — Equip the Outliner with web search capabilities (using Tavily API) so it can look up real-world references. For example, if the film is set in 1920s Chicago, the Outliner can research actual historical context.

- [ ] **Multi-Scene Script Structure** — Currently the system generates a single scene. Extend the LangGraph graph so the Outliner creates a full act breakdown, and the Drafter iterates scene-by-scene, storing each scene as a separate node in Supabase.

- [ ] **Critic Persona Selection** — Let users choose their Critic's persona (e.g., "Quentin Tarantino", "Christopher Nolan", "Hallmark Movie Exec"). The system prompt for the Critic agent would dynamically change to match the chosen style.

- [ ] **Collaboration Mode** — Add Supabase Realtime so two users can share a session and watch the same script being generated in real time, with one user acting as producer and the other as director.

- [ ] **Voice Input** — Add browser Web Speech API support for the input so users can speak their film idea instead of typing it.

---

## 🧪 Testing

Two standalone test scripts exist at the project root:

```bash
# Test bare Groq API connectivity
node test-groq.mjs

# Test Zod structured output via Groq function calling
node test-zod.mjs
```

---

## 📝 Known Issues & Decisions

| Issue | Decision |
|---|---|
| Groq does not support OpenAI `json_schema` strict mode | Using `method: "functionCalling"` with Zod instead |
| `llama-3.1-70b-versatile` was decommissioned | Migrated to `llama-3.3-70b-versatile` |
| Critic LLM needs zero temperature for deterministic scoring | Two separate LLM instances: `creativeLlm` (0.8) and `evaluatorLlm` (0.0) |
| Infinite loop risk if Critic never scores >= 8 | Guardrail: max 3 iterations before forcing `__end__` |
