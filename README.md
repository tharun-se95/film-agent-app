# 🎬 Gravity Studio 1.0
### *The Agentic AI Content Factory*

Gravity Studio is a professional-grade workspace for content creators and filmmakers, powered by a multi-agent AI engine. It automates the entire creative lifecycle—from market research and niche strategy to scriptwriting, visual prompt mapping, and SEO optimization.

## 🚀 Core Features

### 🧠 Strategic Intelligence
*   **Market Sentiment Analysis**: Deploys intel agents to identify viral gaps and competitive advantages in your niche.
*   **Dynamic Suggestion Deck**: Generates actionable video concepts based on trending strategic intel.

### 🔬 Hook Science & Scriptwriting
*   **Retention Engineering**: Every script is scrutinized by a "Retention Critic" to ensure high-engagement hooks (the critical first 3 seconds).
*   **Multi-Agent Collaborative Writing**: Utilizes an Outliner, Drafter, and Critic loop to produce cinematic-quality scripts.

### 🎞️ Production Bundling & Storyboarding
*   **Interactive Storyboard**: Transforms static scripts into section-aware storyboards, mapping narration directly to visual cues.
*   **Scene-Aware Hydration**: Live-hydrates the storyboard with Pexels stock footage keywords mapped to every scene.
*   **Thumbnail Ideation**: Pattern-interrupt thumbnail concepts with AI-ready prompts.
*   **SEO Compliance**: Automatic metadata, title, and tag generation optimized for platform algorithms.
*   **SFX & VFX Checklists**: Automated technical cues for editors.

### 🧘 Zen Workspace
*   **Minimalist Interface**: Collapsible sidebars and agent controls allow for a distraction-free "Producer Mode".
*   **Version History**: Seamlessly navigate through iterations of your scripts with integrated feedback logs.

## 🛠️ Tech Stack

*   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
*   **AI Orchestration**: [LangGraph](https://langchain-ai.github.io/langgraphjs/) for multi-agent workflows.
*   **Database & Auth**: [Supabase](https://supabase.com/) for persistence and state.
*   **Styling**: Vanilla CSS with modern SaaS aesthetics.
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Animations**: [Framer Motion](https://www.framer.com/motion/)

## 🏁 Getting Started

1.  **Environment Setup**:
    ```bash
    cp .env.example .env.local
    # Required keys: GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
4.  **Database Migration**:
    Apply the schema provided in `supabase-schema.sql` to your Supabase project.

## 🏛️ Architecture

Gravity Studio operates as a **Stateful Factory**. Each project moves through an agentic graph:

1.  **Intel**: Analyzes the niche.
2.  **Hook Scientist**: Writes the high-engagement script.
3.  **Retention Critic**: Grades the hook and provides feedback for iteration.
4.  **Visualist**: Maps imagery and B-roll.
5.  **Compliance**: Finalizes SEO and metadata.

---
*Built with ❤️ for the next generation of storytellers.*
