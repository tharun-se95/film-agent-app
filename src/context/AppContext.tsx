"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { NormalizedVideoAsset } from "@/types/assets";

export type AgentStatus = "IDLE" | "NICHE_ARCHITECT" | "INTEL" | "DRAFTER" | "CRITIC" | "HOOKS" | "RETENTION" | "VISUALS" | "PRODUCTION" | "SEO" | "DONE";

export interface NicheOpportunity {
  name: string;
  cpm: string;
  competition: "LOW" | "MEDIUM" | "HIGH";
  hook: string;
  reasoning: string;
}

export interface Project {
  id: string;
  name: string;
  original_idea: string;
  created_at: string;
  content_mode: "FILM" | "YOUTUBE";
  channel_id: string | null;
  niche_opportunities?: NicheOpportunity[];
}

export interface Channel {
  id: string;
  name: string;
  niche: string;
  brand_voice: string;
  created_at: string;
}

export interface DraftCommit {
  id?: string;
  iteration: number;
  content: string;
  critic_score?: number;
  critic_notes?: string;
  niche_data?: string;
  visual_cues?: string;
  yt_metadata?: { title: string; description: string; tags: string[] };
  production_bundle?: {
    thumbnailConcepts: { title: string; prompt: string }[];
    brollChecklist: string[];
    brollSearchQueries?: string[];
    sfxChecklist?: string[];
    vfxRequirements?: string[];
    musicInspiration?: string;
    scenes?: {
      title: string;
      narration: string;
      visualCue: string;
      searchQueries: string[];
      audioUrl?: string; // Storing TTS URL
      duration?: number; // Actual audio duration in seconds
    }[];
    voiceGuidance: string;
  };
};

export interface Suggestion {
  id?: string;
  title: string;
  reasoning: string;
  hook: string;
  status?: string;
}

interface AppContextType {
  // Data
  projects: Project[];
  channels: Channel[];
  activeProject: Project | null;
  activeChannel: Channel | null;
  
  // Setters
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  setActiveProject: (p: Project | null) => void;
  setActiveChannel: (c: Channel | null) => void;
  
  // Agent State
  status: AgentStatus;
  setStatus: (s: AgentStatus) => void;
  logs: string[];
  setLogs: React.Dispatch<React.SetStateAction<string[]>>;
  prompt: string;
  setPrompt: (p: string) => void;
  
  // Content State
  commits: DraftCommit[];
  setCommits: React.Dispatch<React.SetStateAction<DraftCommit[]>>;
  selectedCommit: DraftCommit | null;
  setSelectedCommit: (c: DraftCommit | null) => void;
  suggestions: Suggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<Suggestion[]>>;
  pexelsAssets: Record<string, NormalizedVideoAsset[]>;
  updateDraftBundle: (id: string, newBundle: any) => Promise<void>;
  
  // UI State
  isCreatingChannel: boolean;
  setIsCreatingChannel: (v: boolean) => void;
  isCreatingProject: boolean;
  setIsCreatingProject: (v: boolean) => void;
  isFetchingStrategy: boolean;
  contentMode: "FILM" | "YOUTUBE";
  setContentMode: (v: "FILM" | "YOUTUBE") => void;
  
  // Sidebar State
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  agentPanelCollapsed: boolean;
  setAgentPanelCollapsed: (v: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;
  
  // Logic
  handleCreateChannel: (name: string, dna?: { niche: string, brand_voice: string }) => Promise<void>;
  handleUpdateChannel: (id: string, name: string, niche: string, brand_voice: string) => Promise<void>;
  handleDeleteChannel: (id: string) => Promise<void>;
  handleCreateProject: (name: string, type?: "FILM" | "YOUTUBE", initialIdea?: string, channel_id?: string) => Promise<any>;
  fetchStrategy: (channelId: string) => Promise<void>;
  fetchSuggestions: (channelId: string) => Promise<void>;
  deleteSuggestion: (id: string) => Promise<void>;
  
  // Edit State
  editingChannel: Channel | null;
  setEditingChannel: (c: Channel | null) => void;
  
  // Fetchers
  fetchProjects: () => Promise<void>;
  fetchChannels: () => Promise<void>;
  fetchDrafts: (projectId: string) => Promise<void>;
  runAgent: (prompt: string, projectId?: string) => Promise<void>;
  fetchPexelsAssets: (queries: string[]) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  
  const [status, setStatus] = useState<AgentStatus>("IDLE");
  const [logs, setLogs] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [commits, setCommits] = useState<DraftCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<DraftCommit | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [pexelsAssets, setPexelsAssets] = useState<Record<string, NormalizedVideoAsset[]>>({});

  // UI State
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isFetchingStrategy, setIsFetchingStrategy] = useState(false);
  const [contentMode, setContentMode] = useState<"FILM" | "YOUTUBE">("YOUTUBE");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [agentPanelCollapsed, setAgentPanelCollapsed] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setProjects(data);
      } else {
        // SAFETY FALLBACK: Inject a default project if the list is empty (avoids hang)
        console.warn("LOG: [AppCtx] No projects found. Injecting Safety Workspace.");
        const fallbackProject: Project = {
          id: "79b1e428-4da5-4d52-9bfa-e7df7873fb08", // Use the ID we know exists in memory/links
          name: "Future of Medicine (Resilient)",
          original_idea: "Exploring the intersection of AI and human health in the next decade.",
          created_at: new Date().toISOString(),
          content_mode: "YOUTUBE",
          channel_id: "general-channel-id"
        };
        setProjects([fallbackProject]);
      }
    } catch (e) {
      console.error("fetchProjects error:", e);
    }
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels");
      const data = await res.json();
      if (Array.isArray(data)) setChannels(data);
    } catch (e) {
      console.error("fetchChannels error:", e);
    }
  }, []);

  const fetchDrafts = useCallback(async (projectId: string) => {
    try {
      console.log("LOG: [AppCtx] Loading drafts for project:", projectId);
      const res = await fetch(`/api/drafts?projectId=${projectId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCommits(data);
        if (data.length > 0) {
          // Select the LATEST iteration by default
          const latest = [...data].sort((a, b) => b.iteration - a.iteration)[0];
          setSelectedCommit(latest);
        } else {
          setSelectedCommit(null);
        }
      }
    } catch (e) {
      console.error("fetchDrafts error:", e);
    }
  }, []);

  const updateDraftBundle = useCallback(async (draftId: string, newBundle: any) => {
    try {
      const res = await fetch("/api/drafts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draftId, production_bundle: newBundle })
      });
      if (res.ok) {
        setCommits(prev => prev.map(c => c.id === draftId ? { ...c, production_bundle: newBundle } : c));
        setSelectedCommit(prev => prev?.id === draftId ? { ...prev, production_bundle: newBundle } : prev);
      }
    } catch (e) {
      console.error("updateDraftBundle error:", e);
    }
  }, []);

  const runAgent = useCallback(async (userPrompt: string, projId?: string) => {
    if (!userPrompt.trim()) return;

    let currentProject = activeProject;
    if (!currentProject && projId) {
      currentProject = projects.find(p => p.id === projId) || null;
    }

    if (!currentProject) {
      // Create implicit project if needed
      const newProj: Project = {
        id: crypto.randomUUID(),
        name: userPrompt.slice(0, 20) + "...",
        original_idea: userPrompt,
        created_at: new Date().toISOString(),
        content_mode: "YOUTUBE",
        channel_id: activeChannel?.id || channels.find(c => c.name === "General")?.id || null
      };
      setProjects(prev => [newProj, ...prev]);
      setActiveProject(newProj);
      currentProject = newProj;
    }

    // Reset session for NEW run
    setLogs([`User: ${userPrompt}`]);
    setStatus("INTEL");
    // We don't wipe commits here yet, as we might be editing one. 
    // The graph handles adding the new iteration.

    try {
      console.log("LOG: [AppCtx] Starting Agent for project:", currentProject.id);
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt, projectId: currentProject.id }),
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "");
            if (dataStr === "[DONE]") {
              setStatus("DONE");
              continue;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.outliner) {
                setLogs(prev => [...prev, "Outliner: Plot is set."]);
                setStatus("DRAFTER");
              }
              if (parsed.nicheArchitect) {
                setLogs(prev => [...prev, "Niche Architect: [Progress: 1/8] Discovered a rich list of high-value opportunities."]);
                setStatus("INTEL");
                const opps = parsed.nicheArchitect.opportunities || [];
                setProjects(prev => prev.map(p => p.id === currentProject!.id ? { ...p, niche_opportunities: opps } : p));
              }
              if (parsed.intel) {
                setLogs(prev => [...prev, "Intel: [Progress: 2/8] Identified viral niche angle and competitor gaps."]);
                setStatus("HOOKS");
              }
              if (parsed.hookScientist) {
                setLogs(prev => [...prev, "Hooks: [Progress: 3/8] Finished engineering retention-focused script."]);
                setStatus("RETENTION");
                const it = parsed.iterations || 1;
                const newCommit: DraftCommit = {
                  iteration: it,
                  content: parsed.hookScientist.draftInfo || parsed.hookScientist.content || parsed.draftInfo || "",
                };
                setCommits(prev => {
                   const existing = prev.find(c => c.iteration === it);
                   if (existing) return prev.map(c => c.iteration === it ? newCommit : c);
                   return [...prev, newCommit];
                });
                setSelectedCommit(newCommit);
              }
              if (parsed.retentionCritic) {
                const score = parsed.retentionCritic.score || parsed.retentionCritic.retentionScore;
                const feedback = parsed.retentionCritic.feedback || parsed.retentionCritic.retentionNotes;
                const it = parsed.iterations || 1;
                
                if (score !== undefined) {
                  setLogs(prev => [...prev, `Retention: [Progress: 4/8] Evaluated hook. Score: ${score}/10.`]);
                }
                setStatus("VISUALS");
                setCommits(prev => prev.map(c => c.iteration === it ? { ...c, critic_score: score, critic_notes: feedback } : c));
              }
              if (parsed.visualist) {
                const it = parsed.iterations || 1;
                setLogs(prev => [...prev, "Visualist: [Progress: 5/8] Mapped B-Roll and visual cues across the script."]);
                setStatus("PRODUCTION");
                // IMPORTANT: Visualist now returns a preliminary production bundle
                const bundle = parsed.visualist.productionBundle || parsed.visualist.bundle;
                setCommits(prev => prev.map(c => c.iteration === it ? { 
                  ...c, 
                  visual_cues: parsed.visualist.content || parsed.visualist.visualCues,
                  production_bundle: bundle || c.production_bundle
                } : c));
              }
              if (parsed.production) {
                  const it = parsed.iterations || 1;
                  setLogs(prev => [...prev, "Production: [Progress: 6/8] Asset bundle and thumbnail concepts ready."]);
                  setStatus("SEO");
                  setCommits(prev => prev.map(c => c.iteration === it ? { ...c, production_bundle: parsed.production.productionBundle || parsed.production.bundle || parsed.production } : c));
              }
              if (parsed.compliance) {
                  const it = parsed.iterations || 1;
                  setLogs(prev => [...prev, "Compliance: [Progress: 7/8] SEO metadata and tags optimized."]);
                  setCommits(prev => prev.map(c => c.iteration === it ? { ...c, yt_metadata: parsed.compliance.ytMetadata || parsed.compliance } : c));
                  setStatus("DONE");
                  // Final sync
                  setTimeout(() => fetchDrafts(currentProject!.id), 1000);
              }
            } catch (e) {
              console.error("Stream parse error:", e);
            }
          }
          if (line.startsWith("data: [DONE]")) {
            setStatus("DONE");
            setTimeout(() => fetchDrafts(currentProject!.id), 1000);
          }
        }
      }
    } catch (e) {
      console.error("runAgent error:", e);
      setLogs(prev => [...prev, `System Error: ${e instanceof Error ? e.message : "Generation failed"}`]);
      setStatus("IDLE");
    }
  }, [activeProject, projects, activeChannel, channels]);

  const handleCreateChannel = useCallback(async (name: string, dna?: { niche: string, brand_voice: string }) => {
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          niche: dna?.niche || "", 
          brand_voice: dna?.brand_voice || "" 
        })
      });
      const data = await res.json();
      if (data.id) {
        setChannels((prev) => [...prev, data]);
        setIsCreatingChannel(false);
        setLogs((prev) => [...prev, `System: Channel "${data.name}" established.`]);
      }
    } catch (e) {
      setLogs((prev) => [...prev, `System Error: ${e instanceof Error ? e.message : "Network error"}`]);
    }
  }, []);

  const handleUpdateChannel = useCallback(async (id: string, name: string, niche: string, brand_voice: string) => {
    try {
      const res = await fetch("/api/channels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, niche, brand_voice })
      });
      const data = await res.json();
      if (data.id) {
        setChannels((prev) => prev.map(c => c.id === id ? data : c));
        setEditingChannel(null);
        setLogs((prev) => [...prev, `System: Channel "${data.name}" updated.`]);
      }
    } catch (e) {
      setLogs((prev) => [...prev, `System Error: ${e instanceof Error ? e.message : "Update failed"}`]);
    }
  }, []);

  const handleDeleteChannel = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/channels?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setChannels((prev) => prev.filter(c => c.id !== id));
        setLogs((prev) => [...prev, `System: Channel removed.`]);
      }
    } catch (e) {
      setLogs((prev) => [...prev, `System Error: Deletion failed`]);
    }
  }, []);

  const handleCreateProject = useCallback(async (name: string, type?: "FILM" | "YOUTUBE", initialIdea?: string, channel_id?: string) => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          original_idea: initialIdea || "",
          content_mode: type || contentMode,
          channel_id: channel_id || activeChannel?.id || channels.find(c => c.name === "General")?.id || null
        })
      });
      const data = await res.json();
      if (data.id) {
        setProjects((prev) => [data, ...prev]);
        setActiveProject(data);
        setIsCreatingProject(false);
        setLogs((prev) => [...prev, `System: Project "${data.name}" created successfully.`]);
        return data;
      }
    } catch (e) {
      setLogs((prev) => [...prev, `System Error: ${e instanceof Error ? e.message : "Network error"}`]);
    }
  }, [activeChannel, channels, contentMode]);

  const fetchStrategy = useCallback(async (channelId: string) => {
    if (!channelId) return;
    setIsFetchingStrategy(true);
    setLogs(prev => [...prev, "System: Analyzing niche and brainstorming concepts..."]);
    try {
      const res = await fetch(`/api/channels/${channelId}/strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Brainstorm 5 high-potential video concepts." }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        // We prepend new suggestions to the existing persisted ones
        setSuggestions(prev => [...data, ...prev]);
        setLogs(prev => [...prev, "Strategist: Concepts updated successfully."]);
      }
    } catch (e) {
      console.error("fetchStrategy error:", e);
      setLogs(prev => [...prev, "System Error: Failed to generate video concepts."]);
    } finally {
      setIsFetchingStrategy(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async (channelId: string) => {
    if (!channelId) return;
    try {
      const res = await fetch(`/api/suggestions?channel_id=${channelId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSuggestions(data);
      }
    } catch (e) {
      console.error("fetchSuggestions error:", e);
    }
  }, []);

  const deleteSuggestion = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/suggestions?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuggestions(prev => prev.filter(s => s.id !== id));
        setLogs(prev => [...prev, "System: Suggestion removed from deck."]);
      }
    } catch (e) {
      console.error("deleteSuggestion error:", e);
    }
  }, []);

  const fetchHybridAssets = useCallback(async (queries: { query: string, type: 'video' | 'image' | 'ai_gen' }[]) => {
    if (!queries || queries.length === 0) return;
    console.log("LOG: [AppCtx] Fetching Hybrid assets for queries:", queries.length);
    try {
      const orientation = contentMode === "YOUTUBE" ? "landscape" : "portrait";
      
      const results = await Promise.all(queries.map(async ({ query: q, type: t }) => {
        try {
          if (t === 'ai_gen') {
            const res = await fetch('/api/assets/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: q, width: orientation === 'landscape' ? 1280 : 720, height: orientation === 'landscape' ? 720 : 1280 })
            });
            const data = await res.json();
            return { query: q, type: t, asset: data.asset };
          } else {
            const apiType = t === 'video' ? 'video' : 'image';
            const res = await fetch(`/api/assets/merged?query=${encodeURIComponent(q)}&orientation=${orientation}&type=${apiType}`);
            const data = await res.json();
            return { query: q, type: t, assets: t === 'video' ? data.videos : data.images };
          }
        } catch (err) {
          console.error(`Error fetching hybrid asset for ${q}:`, err);
        }
        return null;
      }));
      
      setPexelsAssets(prev => {
        const next = { ...prev };
        let changed = false;
        results.forEach(res => {
          if (res && !next[res.query]) {
            next[res.query] = res.type === 'ai_gen' ? [res.asset] : res.assets;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    } catch (e) {
      console.error("Global fetchHybridAssets error:", e);
    }
  }, [contentMode]);

  useEffect(() => {
    fetchChannels();
    fetchProjects();
  }, [fetchChannels, fetchProjects]);

  // AUTO-SELECT LATEST COMMIT ON LOAD
  useEffect(() => {
    if (activeProject && commits.length > 0 && !selectedCommit) {
      setSelectedCommit(commits[commits.length - 1]);
    }
  }, [activeProject, commits, selectedCommit]);

  // ORCHESTRATE HYBRID FETCH ON COMMIT SELECT
  useEffect(() => {
    const bundle = selectedCommit?.production_bundle;
    if (!bundle?.scenes) return;

    const hybridQueries = bundle.scenes.map(s => ({
      query: s.searchQueries[0], // Use primary query
      type: s.assetType || 'video'
    }));
    
    // Filter out already fetched
    const needed = hybridQueries.filter(q => !pexelsAssets[q.query]);
    
    if (needed.length > 0) {
      fetchHybridAssets(needed);
    }
  }, [selectedCommit, fetchHybridAssets, pexelsAssets]);

  return (
    <AppContext.Provider value={{
      projects, channels, activeProject, activeChannel,
      setProjects, setChannels, setActiveProject, setActiveChannel,
      status, setStatus, logs, setLogs, prompt, setPrompt,
      commits, setCommits, selectedCommit, setSelectedCommit,
      suggestions, setSuggestions, pexelsAssets, fetchPexelsAssets: fetchHybridAssets,
      fetchProjects, fetchChannels, fetchDrafts,
      runAgent, fetchStrategy, fetchSuggestions, deleteSuggestion,
      isCreatingChannel, setIsCreatingChannel,
      isCreatingProject, setIsCreatingProject,
      isFetchingStrategy,
      contentMode, setContentMode,
      handleCreateChannel, handleUpdateChannel, handleDeleteChannel, handleCreateProject,
      editingChannel, setEditingChannel,
      sidebarCollapsed, setSidebarCollapsed,
      agentPanelCollapsed, setAgentPanelCollapsed,
      mobileSidebarOpen, setMobileSidebarOpen,
      updateDraftBundle
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
