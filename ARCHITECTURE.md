# 🏛️ Technical Architecture: Gravity Studio 1.0

This document outlines the system design and technical workflows that power the Gravity Studio agentic content factory.

## 1. The Agentic Core (LangGraph)

The heart of the studio is a stateful, cyclic directed graph built with **LangGraph.js**. The graph manages the coordination between multiple specialized LLM agents.

### 🔄 The Production Pipeline
1.  **Niche Intel Agent**: Performs a "zero-shot" market analysis.
2.  **Hook Scientist**: Responsible for the narrative "Pattern Interrupt".
3.  **Retention Critic**: An adversarial agent that evaluates the script for potential viewer drop-off. If the score is below 7/10, the script is sent back for one iteration.
4.  **Visualist**: A multimodal specialist that translates narrative into production shot lists.
5.  **Compliance Officer**: Maps the final output to platform-specific SEO requirements.

## 2. Persistence & Real-time State (Supabase)

The studio handles complex, long-running processes using a "Sync-and-Stream" architecture.

*   **Projects Table**: Stores the strategic brief and global settings.
*   **Channels Table**: Tracks the DNA (Niche, Voice) for each studio portfolio.
*   **Drafts Table**: Captures Every iteration of the agentic process to ensure zero data loss during generation.
*   **Real-time Logs**: Agent execution traces are streamed directly to the frontend via Server-Sent Events (SSE).

## 3. Frontend Architecture (Next.js 14)

The UI is designed for high-density information management and focused creative work.

### 🎨 Modular Components
*   **Sidebar**: Global workspace navigation with "Icon Only" collapsible modes.
*   **Channel Page**: Dashboard for channel-specific intelligence and video concept decks.
*   **Project Editor**: The primary workspace. Features a "Zen Mode" for focused script review and "Assets Mode" for production collateral.

### 🏗️ Global Provider (AppContext)
A centralized React context manages:
*   Global UI states (Collapses, Modals).
*   Data fetching and sync loops with the Supabase API.
*   The Agentic run-loop (managing the SSE stream from `/api/agent`).

## 4. Design Philosophy: The Industrial SaaS Aesthetic
Gravity Studio avoids generic UI patterns in favor of a **Dark "Command Center"** aesthetic.
*   **Typography**: Inter/Roboto Monospace for a technical, high-precision feel.
*   **Color Palette**: Deep Obsidian (#050505) with Electric Blue (primary) and High-Contrast Neutrals.
*   **Interactions**: Micro-animations using Framer Motion to provide feedback during long agentic runs.

---
*For internal developer reference only. Version 1.0.0*
