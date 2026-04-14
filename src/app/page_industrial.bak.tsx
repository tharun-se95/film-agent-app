"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Send, Clapperboard, PenTool, Search, Bot, GitCommit, 
  ChevronRight, ChevronDown, RotateCcw, Folder, Plus, Trash2, Download, 
  ChevronLeft, LayoutDashboard, History, FileText, Globe, Radio
} from "lucide-react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";

type AgentStatus = "IDLE" | "OUTLINER" | "DRAFTER" | "CRITIC" | "INTEL" | "HOOKS" | "RETENTION" | "VISUALS" | "PRODUCTION" | "SEO" | "DONE";

interface Project {
  id: string;
  name: string;
  original_idea: string;
  created_at: string;
  content_mode: "FILM" | "YOUTUBE";
  channel_id: string | null;
}

interface Channel {
  id: string;
  name: string;
  niche: string;
  brand_voice: string;
  created_at: string;
}

interface DraftCommit {
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
    voiceGuidance: string;
  };
}

type ViewMode = "latest" | "diff" | "production" | "strategy";

interface Suggestion {
  title: string; reasoning: string; hook: string;
}

export default function Home() {
  // Projects & Channels state
  const [projects, setProjects] = useState<Project[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  // Agent/Draft state
  const [prompt, setPrompt] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [outline, setOutline] = useState("");
  const [status, setStatus] = useState<AgentStatus>("IDLE");
  const [iterations, setIterations] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [contentMode, setContentMode] = useState<"FILM" | "YOUTUBE">("FILM");
  
  // YouTube specific state
  const [nicheData, setNicheData] = useState("");
  const [visualCues, setVisualCues] = useState("");
  const [ytMetadata, setYtMetadata] = useState<{ title: string; description: string; tags: string[] } | null>(null);
  const [productionBundle, setProductionBundle] = useState<DraftCommit["production_bundle"] | null>(null);

  // Commit history
  const [commits, setCommits] = useState<DraftCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<DraftCommit | null>(null);
  const [compareCommit, setCompareCommit] = useState<DraftCommit | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("latest");
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (Array.isArray(data)) setProjects(data);
    } catch (e) {
      console.error("fetchProjects error:", e);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/channels");
      const data = await res.json();
      if (Array.isArray(data)) {
        setChannels(data);
        // Auto-expand the General channel
        const general = data.find((c: any) => c.name === "General");
        if (general) setExpandedChannels(new Set([general.id]));
      }
    } catch (e) {
      console.error("fetchChannels error:", e);
    }
  };

  const fetchDrafts = async (projectId: string) => {
    if (!projectId) return;
    console.log("FETCH: Hydrating project", projectId);

    try {
      const res = await fetch(`/api/drafts?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch drafts");
      const data = await res.json();
      console.log("FETCH: Received drafts:", data.length);
      
      if (Array.isArray(data)) {
        const mapped: DraftCommit[] = data.map((d: any) => ({
          iteration: d.iteration,
          content: d.content,
          critic_score: d.critic_score,
          critic_notes: d.critic_notes,
          niche_data: d.niche_data || "",
          visual_cues: d.visual_cues || "",
          yt_metadata: d.yt_metadata || null,
          production_bundle: d.production_bundle || null
        }));
        
        setCommits(mapped);
        if (mapped.length > 0) {
          const last = mapped[mapped.length - 1];
          console.log("FETCH: Auto-selecting latest commit", last.iteration);
          setSelectedCommit(last);
          setNicheData(last.niche_data || "");
          setVisualCues(last.visual_cues || "");
          setYtMetadata(last.yt_metadata || null);
          setProductionBundle(last.production_bundle || null);
        }
      }
    } catch (e) {
      console.error("fetchDrafts error:", e);
    }
  };

  // Load projects & channels on mount
  useEffect(() => {
    fetchChannels();
    fetchProjects();
  }, []);

  // Load drafts when active project changes
  useEffect(() => {
    if (activeProject) {
      console.log("Switching to project:", activeProject.name, activeProject.content_mode);
      
      // STRICT RESET: Clear all content-related state immediately
      setCommits([]);
      setSelectedCommit(null);
      setViewMode("latest");
      setOutline("");
      setIterations(0);
      setScore(null);
      setNicheData("");
      setVisualCues("");
      setYtMetadata(null);
      setProductionBundle(null);
      setLogs([`System: Project "${activeProject.name}" loaded.`]);

      setContentMode(activeProject.content_mode);
      fetchDrafts(activeProject.id);
    } else {
      setCommits([]);
      setSelectedCommit(null);
      setOutline("");
    }
  }, [activeProject]);

  const toggleChannel = (channelId: string) => {
    const next = new Set(expandedChannels);
    if (next.has(channelId)) next.delete(channelId);
    else next.add(channelId);
    setExpandedChannels(next);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newProjectName, 
          original_idea: prompt,
          content_mode: contentMode,
          channel_id: activeChannel?.id || channels.find(c => c.name === "General")?.id || null
        })
      });
      const data = await res.json();
      if (data.id) {
        setProjects((prev) => [data, ...prev]);
        setActiveProject(data);
        setIsCreatingProject(false);
        setNewProjectName("");
        setLogs((prev) => [...prev, `System: Project "${data.name}" created successfully.`]);
      } else {
        setLogs((prev) => [...prev, `System Error: Failed to create project. ${data.error || ""}`]);
      }
    } catch (e) {
      setLogs((prev) => [...prev, `System Error: ${e instanceof Error ? e.message : "Network error"}`]);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChannelName })
      });
      const data = await res.json();
      if (data.id) {
        setChannels((prev) => [...prev, data]);
        toggleChannel(data.id);
        setIsCreatingChannel(false);
        setNewChannelName("");
        setLogs((prev) => [...prev, `System: Channel "${data.name}" established.`]);
      }
    } catch (e) {
      setLogs((prev) => [...prev, `System Error: ${e instanceof Error ? e.message : "Network error"}`]);
    }
  };

  const handleSuggestionApproval = async (s: Suggestion) => {
    if (!activeChannel) return;
    
    setLogs((prev) => [...prev, `System: Commissioning project "${s.title}" from strategist suggestion...`]);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: s.title, 
          original_idea: `${s.reasoning}\n\nCore Hook: ${s.hook}`,
          content_mode: "YOUTUBE",
          channel_id: activeChannel.id
        })
      });
      const data = await res.json();
      if (data.id) {
        setProjects((prev) => [data, ...prev]);
        setActiveProject(data);
        setLogs((prev) => [...prev, `System: Project "${data.name}" successfully assigned to ${activeChannel.name}.`]);
      }
    } catch (e) {
      console.error("handleSuggestionApproval error:", e);
    }
  };

  const handleDeleteClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(project);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    const projectId = projectToDelete.id;
    setProjectToDelete(null); // Close modal immediately

    try {
      const res = await fetch(`/api/projects?id=${projectId}`, {
        method: "DELETE",
      });
      // Even if the server returns 500 (Legacy ID format), we remove it locally
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      
      if (activeProject?.id === projectId) {
        setActiveProject(null);
        setCommits([]);
        setSelectedCommit(null);
        setOutline("");
      }

      if (res.ok) {
        setLogs((prev) => [...prev, `System: Project "${projectToDelete.name}" deleted.`]);
      } else {
        setLogs((prev) => [...prev, `System: Removed project "${projectToDelete.name}" from view.`]);
      }
    } catch (e) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setLogs((prev) => [...prev, `System Error: Deletion failed for "${projectToDelete.name}".`]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // If no active project, create one implicitly
    let currentProject = activeProject;
    if (!currentProject) {
      const newProj: Project = {
        id: crypto.randomUUID(),
        name: prompt.slice(0, 20) + "...",
        original_idea: prompt,
        created_at: new Date().toISOString(),
        content_mode: contentMode,
        channel_id: activeChannel?.id || channels.find(c => c.name === "General")?.id || null
      };
      setProjects([newProj, ...projects]);
      setActiveProject(newProj);
      currentProject = newProj;
    }

    // Reset session state
    setLogs((prev) => [...prev, `User: ${prompt}`]);
    setPrompt(""); // CLEAR PROMPT IMMEDIATELY
    setStatus(contentMode === "YOUTUBE" ? "INTEL" : "OUTLINER");
    setIterations(0);
    setCommits([]);
    setSelectedCommit(null);
    setCompareCommit(null);
    setViewMode("latest");

    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, projectId: currentProject.id }),
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
              setOutline(parsed.outliner.outline);
              setLogs((prev) => [...prev, "Outliner: Plot is set."]);
              setStatus("DRAFTER");
            }
            if (parsed.drafter) {
              const it = parsed.drafter.iterations || parsed.iterations || 1;
              const newCommit: DraftCommit = {
                iteration: it,
                content: parsed.drafter.draftInfo,
              };
              setCommits((prev) => {
                const existing = prev.find(c => c.iteration === it);
                if (existing) {
                  return prev.map(c => c.iteration === it ? newCommit : c);
                }
                return [...prev, newCommit];
              });
              setSelectedCommit(newCommit);
              setIterations(it);
              setLogs((prev) => [...prev, `Drafter: Finished Draft #${it}.`]);
              setStatus("CRITIC");
            }
            if (parsed.critic) {
              const s = parsed.critic.criticScore;
              const notes = parsed.critic.criticNotes;
              setScore(s);
              setCommits((prev) => {
                const updated = [...prev];
                if (updated.length > 0) {
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    critic_score: s,
                    critic_notes: notes,
                  };
                  setSelectedCommit(updated[updated.length - 1]);
                }
                return updated;
              });
              setLogs((prev) => [...prev, `Critic: Reviewed draft. Score: ${s}/10.`]);
              if (s < 8) {
                setLogs((prev) => [...prev, `System: Score too low! Routing back to Drafter for Rewrite.`]);
                setStatus("DRAFTER");
              } else {
                setLogs((prev) => [...prev, `System: Screenplay approved!`]);
              }
            }
            if (parsed.intel) {
              setNicheData(parsed.intel.nicheData);
              setLogs((prev) => [...prev, "Intel: Market research and viral angle identified."]);
              setStatus("HOOKS");
            }
            if (parsed.hookScientist) {
              const it = parsed.iterations || 1;
              const newCommit: DraftCommit = {
                iteration: it,
                content: parsed.hookScientist.draftInfo,
              };
              setCommits((prev) => {
                const existing = prev.find(c => c.iteration === it);
                if (existing) {
                  return prev.map(c => c.iteration === it ? newCommit : c);
                }
                return [...prev, newCommit];
              });
              setSelectedCommit(newCommit);
              setLogs((prev) => [...prev, `Hook Scientist: Drafted Version ${it}.`]);
              setStatus("RETENTION");
            }
            if (parsed.retentionCritic) {
              const s = parsed.retentionCritic.retentionScore;
              setLogs((prev) => [...prev, `Retention Critic: Evaluated script. Score: ${s}/10.`]);
              if (s < 0) { // Future error handling
                setLogs((prev) => [...prev, "System: Critical error in retention evaluation."]);
              } else if (s < 8) {
                setLogs((prev) => [...prev, "System: Hook too weak. Routing back to Scientist for Optimization."]);
                setStatus("HOOKS");
              } else {
                setLogs((prev) => [...prev, "System: Hook approved! Proceeding to Visuals."]);
                setStatus("VISUALS");
              }
            }
            if (parsed.visualist) {
              setVisualCues(parsed.visualist.visualCues);
              setLogs((prev) => [...prev, "Visualist: B-Roll and visual cues mapped."]);
              setStatus("PRODUCTION");
            }
            if (parsed.production) {
              setProductionBundle(parsed.production.productionBundle);
              setCommits((prev) => {
                const updated = [...prev];
                if (updated.length > 0) {
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    production_bundle: parsed.production.productionBundle
                  };
                  setSelectedCommit(updated[updated.length - 1]);
                }
                return updated;
              });
              setLogs((prev) => [...prev, "Production: Generated Thumbnail concepts and B-Roll checklist."]);
              setStatus("SEO");
            }
            if (parsed.compliance) {
              setYtMetadata(parsed.compliance.ytMetadata);
              setLogs((prev) => [...prev, "Compliance: SEO metadata ready! Platform-optimized."]);
              setStatus("DONE");
            }
          } catch (err) {
            console.error("Error parsing stream data:", err, dataStr);
          }
        }
      }
    }
  };

  const handleDownload = () => {
    if (!selectedCommit) return;
    const element = document.createElement("a");
    const file = new Blob([selectedCommit.content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${activeProject?.name || "script"}_v${selectedCommit.iteration}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCommitClick = (commit: DraftCommit) => {
    setSelectedCommit(commit);
    if (viewMode === "diff") setViewMode("latest");
    
    // Hydrate YouTube states
    setNicheData(commit.niche_data || "");
    setVisualCues(commit.visual_cues || "");
    setYtMetadata(commit.yt_metadata || null);
    setProductionBundle(commit.production_bundle || null);
    
    if (viewMode === "diff") {
      if (!compareCommit) {
        setCompareCommit(commit);
      } else {
        setSelectedCommit(commit);
        setCompareCommit(null);
        setViewMode("latest");
      }
    } else {
      setSelectedCommit(commit);
    }
  };

  const startDiff = (older: DraftCommit, newer: DraftCommit) => {
    setCompareCommit(older);
    setSelectedCommit(newer);
    setViewMode("diff");
  };

  const activeContent = selectedCommit?.content || "";

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[#050505] text-white">
      
      {/* 1. PROJECTS SIDEBAR (Far Left) */}
      <nav className="w-16 hover:w-64 transition-all duration-300 border-r border-white/5 bg-black/40 flex flex-col items-stretch overflow-hidden group z-50">
        <div className="p-4 flex items-center gap-4 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Clapperboard className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Film Studio</span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-2 py-4">
          <div className="flex gap-1 px-2">
            <button 
              onClick={() => setIsCreatingProject(true)}
              className="flex-1 flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-primary border border-primary/20"
            >
              <Plus className="w-5 h-5 shrink-0" />
              <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Video</span>
            </button>
            <button 
              onClick={() => setIsCreatingChannel(true)}
              className="px-3 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-neutral-400 border border-white/5"
              title="New Channel"
            >
              <Globe className="w-4 h-4 shrink-0" />
            </button>
          </div>
          
          <div className="h-px bg-white/5 mx-2 my-2" />
          
          <div className="space-y-1">
            {channels.map((channel) => (
              <div key={channel.id} className="space-y-1">
                <button
                  onClick={() => {
                    toggleChannel(channel.id);
                    setActiveChannel(channel);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors group/channel
                    ${activeChannel?.id === channel.id ? "bg-white/10 text-white ring-1 ring-white/10" : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"}`}
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    {expandedChannels.has(channel.id) ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                    <Radio className="w-5 h-5 shrink-0 text-primary" />
                    <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity truncate leading-none">
                      {channel.name}
                    </span>
                  </div>
                </button>

                {expandedChannels.has(channel.id) && (
                  <div className="pl-6 space-y-1 mt-1 transition-all">
                    {projects
                      .filter((p) => p.channel_id === channel.id)
                      .map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setActiveProject(p)}
                          role="button"
                          className={`w-full group/item flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer outline-none
                            ${activeProject?.id === p.id 
                              ? "text-primary bg-primary/10" 
                              : "hover:bg-white/5 text-neutral-400"}`}
                        >
                          <div className="flex items-center gap-4 overflow-hidden">
                            <Folder className="w-5 h-5 shrink-0 opacity-50" />
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-left overflow-hidden">
                              <p className="text-[11px] font-medium truncate">{p.name}</p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => handleDeleteClick(p, e)}
                            className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-all shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/5">
           <div className="flex items-center gap-4 text-neutral-500 hover:text-white cursor-pointer transition-colors">
              <Bot className="w-6 h-6 shrink-0" />
              <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">Agent Settings</span>
           </div>
        </div>
      </nav>

      {/* 2. ORCHESTRATOR PANEL (Middle) */}
      <section className="w-[400px] min-w-[400px] border-r border-white/5 flex flex-col bg-[#0a0a0a] relative">
        <header className="p-6 border-b border-white/5 shrink-0 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
               Director Dashboard
            </h1>
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
              <button 
                onClick={() => setContentMode("FILM")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${contentMode === "FILM" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-neutral-500 hover:text-neutral-300"}`}
              >
                <Clapperboard className="w-3.5 h-3.5" /> FILMMAKER
              </button>
              <button 
                onClick={() => setContentMode("YOUTUBE")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${contentMode === "YOUTUBE" ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-neutral-500 hover:text-neutral-300"}`}
              >
                <Bot className="w-3.5 h-3.5" /> YOUTUBER
              </button>
            </div>
          </div>
          
          {contentMode === "FILM" ? (
            <div className="flex justify-between items-center px-2 py-4 bg-white/[0.02] rounded-xl border border-white/5 shadow-inner">
              <NodeBadge active={status === "OUTLINER"} done={status !== "IDLE" && status !== "OUTLINER"} icon={<Search className="w-4 h-4"/>} label="Outliner" />
              <div className={`h-[1px] flex-1 mx-2 transition-all duration-1000 ${status === "DRAFTER" || status === "CRITIC" || status === "DONE" ? "bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-neutral-800"}`} />
              <NodeBadge active={status === "DRAFTER"} done={status === "CRITIC" || status === "DONE"} icon={<PenTool className="w-4 h-4"/>} label="Drafter" badge={iterations > 0 ? `v${iterations}` : undefined} />
              <div className={`h-[1px] flex-1 mx-2 transition-all duration-1000 ${status === "CRITIC" || status === "DONE" ? "bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-neutral-800"}`} />
              <NodeBadge active={status === "CRITIC"} done={status === "DONE"} icon={<Bot className="w-4 h-4"/>} label="Critic" badge={score ? `${score}/10` : undefined} />
            </div>
          ) : (
            <div className="flex justify-between items-center px-1 py-4 bg-white/[0.02] rounded-xl border border-white/5 shadow-inner">
              <NodeBadge active={status === "INTEL"} done={status !== "IDLE" && status !== "INTEL"} icon={<Search className="w-3 h-3"/>} label="Intel" />
              <div className={`h-[1px] flex-1 mx-0.5 transition-all duration-1000 ${status !== "IDLE" && status !== "INTEL" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-neutral-800"}`} />
              <NodeBadge active={status === "HOOKS"} done={status !== "IDLE" && status !== "INTEL" && status !== "HOOKS"} icon={<PenTool className="w-3 h-3"/>} label="Hooks" />
              <div className={`h-[1px] flex-1 mx-0.5 transition-all duration-1000 ${status !== "IDLE" && status !== "INTEL" && status !== "HOOKS" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-neutral-800"}`} />
              <NodeBadge active={status === "RETENTION"} done={status !== "IDLE" && ["VISUALS", "PRODUCTION", "SEO", "DONE"].includes(status)} icon={<Bot className="w-3 h-3"/>} label="Audit" />
              <div className={`h-[1px] flex-1 mx-0.5 transition-all duration-1000 ${["VISUALS", "PRODUCTION", "SEO", "DONE"].includes(status) ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-neutral-800"}`} />
              <NodeBadge active={status === "VISUALS"} done={["PRODUCTION", "SEO", "DONE"].includes(status)} icon={<GitCommit className="w-3 h-3"/>} label="Visuals" />
              <div className={`h-[1px] flex-1 mx-0.5 transition-all duration-1000 ${["PRODUCTION", "SEO", "DONE"].includes(status) ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-neutral-800"}`} />
              <NodeBadge active={status === "PRODUCTION"} done={["SEO", "DONE"].includes(status)} icon={<LayoutDashboard className="w-3 h-3"/>} label="Prod" />
              <div className={`h-[1px] flex-1 mx-0.5 transition-all duration-1000 ${["SEO", "DONE"].includes(status) ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-neutral-800"}`} />
              <NodeBadge active={status === "SEO"} done={status === "DONE"} icon={<Bot className="w-3 h-3"/>} label="SEO" />
            </div>
          )}
        </header>

        {/* LOGS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs text-center px-12 space-y-4 opacity-40">
              <Bot className="w-12 h-12 mb-2" />
              <p>Initialize a screenplay by typing your film concept below. The LangGraph team will iterate autonomously.</p>
            </div>
          )}
          {logs.map((log, i) => (
            <div key={i} className={`p-3 rounded-2xl text-[11px] leading-relaxed transition-all animate-in fade-in slide-in-from-left-2 ${log.startsWith("User") ? "bg-primary/10 text-blue-200 ml-8 border border-primary/20 shadow-[0_2px_10px_rgba(59,130,246,0.05)]" : log.startsWith("System") ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" : "bg-neutral-800/40 text-neutral-300 mr-8 border border-white/5"}`}>
              <div className="flex items-start gap-2">
                 <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${log.startsWith("User") ? "bg-primary" : log.startsWith("System") ? "bg-amber-400" : "bg-neutral-500"}`} />
                 {log}
              </div>
            </div>
          ))}
          {status !== "IDLE" && status !== "DONE" && (
            <div className="flex items-center gap-3 text-primary text-[10px] font-bold uppercase tracking-widest px-4 py-2 border border-primary/10 rounded-full w-fit mx-auto bg-primary/5 animate-pulse">
              <span className="flex gap-1">
                 <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                 <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                 <span className="w-1 h-1 rounded-full bg-primary animate-bounce" />
              </span>
              Agent {status} Working
            </div>
          )}
          <div ref={logsEndRef} />
        </div>

        {/* TIMELINE / HISTORY */}
        {commits.length > 0 && (
          <div className="bg-black/40 border-t border-white/5 pb-2">
             <div className="p-4 flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] flex items-center gap-2">
                   <History className="w-3 h-3" /> Commit History
                </h3>
                {viewMode === "diff" && (
                   <button onClick={() => { setViewMode("latest"); setCompareCommit(null); }} className="text-[10px] text-primary flex items-center gap-1 hover:underline font-bold uppercase tracking-tighter">
                      <RotateCcw className="w-3 h-3" /> Exit Diff
                   </button>
                )}
             </div>
             <div className="px-4 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {commits.map((commit, idx) => (
                   <div
                    key={idx}
                    onClick={() => handleCommitClick(commit)}
                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border text-xs ${selectedCommit?.iteration === commit.iteration && viewMode !== "diff" ? "bg-primary/10 border-primary/30 text-white shadow-lg" : "bg-neutral-900/40 border-white/5 text-neutral-400 hover:border-white/20 hover:text-white"}`}
                   >
                     <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${commit.critic_score !== undefined ? (commit.critic_score >= 8 ? "bg-green-500 shadow-[0_0_8px_#10b981]" : "bg-amber-500") : "bg-neutral-700 pulse-slow"}`} />
                        <span className="font-mono text-[10px]">v{commit.iteration}.0</span>
                        {commit.critic_score !== undefined && (
                          <span className={`text-[10px] font-black ${commit.critic_score >= 8 ? "text-green-400" : "text-amber-400"}`}>
                            {commit.critic_score}/10
                          </span>
                        )}
                     </div>
                     {idx > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); startDiff(commits[idx - 1], commit); }}
                          className="opacity-0 group-hover:opacity-100 transition-all text-primary flex items-center gap-1 text-[10px] font-bold uppercase"
                        >
                          Diff <ChevronRight className="w-3 h-3" />
                        </button>
                     )}
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* PROMPT INPUT */}
        <div className="p-6 border-t border-white/5 bg-gradient-to-t from-black to-transparent">
          <form className="relative group" onSubmit={handleSubmit}>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={activeProject ? "Update script concept..." : "A noir thriller set in futuristic Neo-Tokyo..."}
              className="w-full bg-neutral-900/50 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all pr-14 placeholder:text-neutral-600"
              disabled={status !== "IDLE" && status !== "DONE"}
            />
            <button
              type="submit"
              disabled={(status !== "IDLE" && status !== "DONE") || !prompt}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-primary rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-30"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      </section>

      {/* 3. SCREENPLAY PREVIEW (Right) */}
      <section className="flex-1 overflow-hidden flex flex-col bg-[#111111]">
        
        {/* TOP BAR / METADATA */}
        <header className="h-16 px-8 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-6">
              {viewMode === "diff" ? (
                 <div className="flex items-center gap-3 text-xs">
                    <History className="w-4 h-4 text-neutral-500" />
                    <span className="text-neutral-400">Comparing</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono">v{compareCommit?.iteration}.0</span>
                    <ChevronRight className="w-3 h-3 text-neutral-600" />
                    <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20 font-mono">v{selectedCommit?.iteration}.0</span>
                 </div>
              ) : selectedCommit || activeChannel ? (
                 <div className="flex items-center gap-2 bg-neutral-900 p-1 rounded-xl border border-white/10">
                    <button 
                      onClick={() => setViewMode("latest")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "latest" ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"}`}
                    >
                      Script
                    </button>
                    {contentMode === "YOUTUBE" && (
                       <button 
                         onClick={() => setViewMode("production")}
                         className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "production" ? "bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg shadow-red-500/5" : "text-neutral-500 hover:text-neutral-300"}`}
                       >
                         Assets
                         {productionBundle && <span className="ml-2 w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />}
                       </button>
                    )}
                    <button 
                      onClick={() => {
                        setViewMode("strategy");
                        if (activeChannel && suggestions.length === 0) {
                          setSuggestions([
                            { title: "The Hidden Tax on Intelligence", reasoning: "Scarcity of deep knowledge in the age of fast AI. High algorithmic tension.", hook: "Start with a blank screen. Wait 3 seconds." },
                            { title: "Why Your Bio-Clock is Broken", reasoning: "Tech-health intersection. Extreme relevancy to 18-35 demographic.", hook: "Show a fast-forward of a sunrise, then cut to pitch black." }
                          ]);
                        }
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "strategy" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-neutral-500 hover:text-neutral-300"}`}
                    >
                      <Bot className="w-3.5 h-3.5 mr-1" /> Strategy
                    </button>
                 </div>
              ) : (
                 <span className="text-xs text-neutral-500 tracking-widest uppercase">Select a project or channel</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {contentMode === "YOUTUBE" && ytMetadata && (
                <div className="flex items-center gap-2">
                   <div className="px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold">
                     SEO READY
                   </div>
                </div>
              )}
              <button 
                onClick={handleDownload}
                disabled={!selectedCommit}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-colors text-xs font-bold border border-white/5"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
        </header>

        {/* WORKSPACE CONTENT AREA */}
        <div className="flex-1 overflow-hidden">
          {viewMode === "strategy" ? (
             <div className="h-full p-8 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.03),transparent)]">
                <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <header>
                    <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                      <Bot className="w-8 h-8 text-primary" />
                      Strategic Command
                    </h2>
                    <p className="text-neutral-500 text-sm max-w-xl">
                      The agentic strategist has analyzed your Channel DNA and recent market trends. 
                      Approve a concept to commission a full project.
                    </p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                    {suggestions.map((s, i) => (
                      <div key={i} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/40 transition-all hover:shadow-2xl hover:shadow-primary/5 flex flex-col items-stretch relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                        <h3 className="text-lg font-bold mb-3 pr-8 group-hover:text-primary transition-colors">{s.title}</h3>
                        <p className="text-xs text-neutral-400 leading-relaxed mb-6 flex-1 italic opacity-80 group-hover:opacity-100">"{s.reasoning}"</p>
                        
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 mb-6">
                           <span className="block text-[8px] font-black text-primary uppercase tracking-widest mb-1">Proposed Hook</span>
                           <p className="text-[10px] text-blue-100/70">{s.hook}</p>
                        </div>

                        <button 
                          onClick={() => handleSuggestionApproval(s)}
                          className="w-full py-3 rounded-xl bg-white/5 group-hover:bg-primary group-hover:text-white transition-all text-neutral-400 font-bold text-xs flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> Commission Video
                        </button>
                      </div>
                    ))}
                    <div className="h-full min-h-[250px] border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-4 text-neutral-600">
                       <RotateCcw className="w-8 h-8" />
                       <span className="text-[10px] font-black uppercase tracking-widest text center">Strategic insights arrive<br/>periodically</span>
                    </div>
                  </div>
                </div>
             </div>
          ) : viewMode === "diff" && compareCommit && selectedCommit ? (
            <div className="h-full overflow-y-auto custom-scrollbar p-8">
              <ReactDiffViewer
                oldValue={compareCommit.content}
                newValue={selectedCommit.content}
                splitView={true}
                compareMethod={DiffMethod.WORDS}
                useDarkTheme={true}
              />
            </div>
          ) : viewMode === "production" && (productionBundle || selectedCommit?.production_bundle) ? (
            <div className="h-full overflow-y-auto custom-scrollbar p-12 max-w-4xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="space-y-6">
                  <h2 className="text-3xl font-black italic tracking-tighter text-white flex items-center gap-3">
                     <LayoutDashboard className="w-9 h-9 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]" /> Production Asset Bundle
                  </h2>
                  <p className="text-neutral-300 text-sm max-w-2xl leading-relaxed font-medium">
                     This bundle contains all the high-retention assets required for the filming and assembly phase. Use the prompts and checklists below to streamline your workflow.
                  </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
                  <div className="space-y-8">
                     <section>
                        <h3 className="text-[11px] font-black uppercase text-neutral-400 tracking-[0.3em] mb-4 border-l-2 border-red-500 pl-3">Thumbnail Strategy</h3>
                        <div className="space-y-4">
                           {(productionBundle || selectedCommit?.production_bundle)?.thumbnailConcepts.map((t: any, i: number) => (
                              <div key={i} className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-red-500/40 transition-all group shadow-xl">
                                 <p className="text-sm font-black text-white mb-2">{t.title}</p>
                                 <p className="text-xs text-neutral-300 leading-relaxed mb-4 italic font-medium bg-black/20 p-3 rounded-lg border border-white/5">“{t.prompt.slice(0, 150)}...”</p>
                                 <button 
                                   onClick={() => navigator.clipboard.writeText(t.prompt)}
                                   className="text-[10px] font-black uppercase text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5"
                                 >
                                   Copy Midjourney Prompt <ChevronRight className="w-3.5 h-3.5" />
                                 </button>
                              </div>
                           ))}
                        </div>
                     </section>

                     <section className="p-7 rounded-[2rem] bg-red-500/10 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)]">
                        <h3 className="text-[11px] font-black uppercase text-red-400 tracking-[0.3em] mb-4">Voiceover Guidance</h3>
                        <p className="text-sm text-neutral-100 leading-[1.8] font-medium">
                           {(productionBundle || selectedCommit?.production_bundle)?.voiceGuidance}
                        </p>
                     </section>
                  </div>

                  <div className="space-y-8">
                     <section className="bg-[#0c0c0c] p-10 rounded-[2.5rem] border border-white/10 h-full shadow-2xl">
                        <h3 className="text-[11px] font-black uppercase text-neutral-400 tracking-[0.3em] mb-8 border-l-2 border-red-500 pl-3">B-Roll Shoot List</h3>
                        <div className="space-y-5">
                           {(productionBundle || selectedCommit?.production_bundle)?.brollChecklist.map((item: string, i: number) => (
                              <label key={i} className="flex items-start gap-4 cursor-pointer group p-2 hover:bg-white/[0.02] rounded-xl transition-all">
                                 <input type="checkbox" className="mt-1 w-5 h-5 rounded-md border-white/20 bg-white/5 text-red-500 focus:ring-red-500/50 focus:ring-offset-0 transition-all cursor-pointer" />
                                 <span className="text-[12px] text-neutral-300 group-hover:text-white transition-colors leading-relaxed font-medium">{item}</span>
                              </label>
                           ))}
                        </div>
                     </section>
                  </div>
               </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto bg-[#fafaf8] custom-scrollbar">
              <div className={`mx-auto py-12 px-4 ${contentMode === "YOUTUBE" ? "max-w-[1200px]" : "max-w-[850px]"}`}>
                <div className={`bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] min-h-[1100px] p-8 lg:p-16 relative overflow-hidden rounded-sm text-black ${contentMode === "YOUTUBE" ? "flex flex-col gap-12" : ""}`}>
                  {/* WATERMARK */}
                  <div className="absolute top-12 left-0 right-0 flex justify-center opacity-[0.03] select-none pointer-events-none">
                    <span className="text-[120px] font-black tracking-[0.3em] rotate-[-25deg] uppercase">Confidential</span>
                  </div>

                  {contentMode === "YOUTUBE" && nicheData && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl animate-in fade-in slide-in-from-top-4">
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] mb-2 text-red-600">Viral Strategy & Intel</h2>
                      <p className="text-sm leading-relaxed text-red-900 font-medium whitespace-pre-wrap">{nicheData}</p>
                    </div>
                  )}

                  {contentMode === "FILM" && outline && (
                    <div className="mb-16 border-b border-black/10 pb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                      <h2 className="text-sm font-black uppercase tracking-[0.3em] mb-6 border-b-2 border-primary w-fit pb-1 text-primary">Beat Sheet</h2>
                      <p className="text-sm leading-relaxed text-neutral-600 font-script whitespace-pre-wrap">{outline}</p>
                    </div>
                  )}

                  {contentMode === "YOUTUBE" && ytMetadata && (
                    <div className="grid grid-cols-3 gap-6 mb-8 border-b border-black/5 pb-8">
                        <div className="col-span-2">
                          <h3 className="text-[10px] font-bold text-neutral-400 uppercase mb-2">Target Title</h3>
                          <p className="text-lg font-black leading-tight italic">“{ytMetadata.title}”</p>
                        </div>
                        <div>
                          <h3 className="text-[10px] font-bold text-neutral-400 uppercase mb-2">SEO Tokens</h3>
                          <div className="flex flex-wrap gap-1">
                              {ytMetadata.tags.map((tag, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-black/5 text-[9px] font-bold rounded border border-black/5">#{tag}</span>
                              ))}
                          </div>
                        </div>
                    </div>
                  )}

                  {selectedCommit?.content ? (
                    <div className={`animate-in fade-in zoom-in-95 duration-700 ${contentMode === "YOUTUBE" ? "grid grid-cols-5 gap-12" : ""}`}>
                      {contentMode === "YOUTUBE" && (
                        <div className="col-span-2 border-r border-black/5 pr-8 space-y-12">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 sticky top-4 bg-white/80 backdrop-blur py-2">Visual / B-Roll</h2>
                            <div className="font-script text-[13px] leading-[2.0] text-blue-800 whitespace-pre-wrap">
                                {visualCues || "Awaiting visual cues simulation..."}
                            </div>
                        </div>
                      )}
                      <div className={contentMode === "YOUTUBE" ? "col-span-3 space-y-12" : ""}>
                        {contentMode === "YOUTUBE" && (
                          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 sticky top-4 bg-white/80 backdrop-blur py-2">Audio / Narration</h2>
                        )}
                        <p className="font-script text-[14px] leading-[2.2] whitespace-pre-wrap text-[#1a1a1a]">
                          {selectedCommit.content}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[600px] flex flex-col items-center justify-center space-y-4 opacity-10">
                      <Clapperboard className="w-20 h-20" />
                      <p className="font-script text-xl font-bold">READY ON SET</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. CREATE CHANNEL MODAL */}
      {isCreatingChannel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary" />
              Establish New Channel
            </h2>
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1.5">Channel Name</label>
                <input 
                  autoFocus
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                  placeholder="e.g. AI Deep Dives"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsCreatingChannel(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-neutral-400"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/80 transition-colors"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. CREATE PROJECT MODAL (Updated) */}
      {isCreatingProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-6 h-6 text-primary" />
              New Video Project
            </h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1.5">Project Name</label>
                <input 
                  autoFocus
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                  placeholder="e.g. Episode 1: Space Tech"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1.5">Assignment Channel</label>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {channels.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveChannel(c)}
                      className={`px-3 py-1.5 rounded-full border transition-all ${activeChannel?.id === c.id ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-neutral-500 hover:border-white/20"}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1.5">Content Type</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setContentMode("YOUTUBE")}
                    className={`flex-1 p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${contentMode === "YOUTUBE" ? "bg-primary/10 border-primary text-primary" : "border-white/10 text-neutral-500"}`}
                  >
                    <Radio className="w-5 h-5" />
                    <span className="text-[10px] font-bold">YOUTUBE</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setContentMode("FILM")}
                    className={`flex-1 p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${contentMode === "FILM" ? "bg-primary/10 border-primary text-primary" : "border-white/10 text-neutral-500"}`}
                  >
                    <Clapperboard className="w-5 h-5" />
                    <span className="text-[10px] font-bold">FILMMAKER</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsCreatingProject(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-neutral-400"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/80 transition-colors"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.4); }
        .pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 0.8; } 100% { opacity: 0.3; } }
      `}</style>
      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl scale-in-center overflow-hidden relative">
            {/* Background accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50" />
            
            <h3 className="text-lg font-semibold text-white mb-2">Delete Screenplay?</h3>
            <p className="text-sm text-neutral-400 mb-6 font-light leading-relaxed">
              Are you sure you want to delete <span className="text-white font-medium italic">"{projectToDelete.name}"</span>? 
              This will permanently remove all script drafts and outlines.
            </p>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={confirmDelete}
                className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors shadow-lg shadow-red-500/10"
              >
                Delete Permanently
              </button>
              <button 
                onClick={() => setProjectToDelete(null)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-sm font-medium transition-colors border border-white/5"
              >
                Keep Project
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function NodeBadge({ active, done, icon, label, badge }: { active: boolean, done?: boolean, icon: React.ReactNode, label: string, badge?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 relative">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-700 ${active ? "bg-primary text-white shadow-[0_0_20px_#3b82f666] scale-110" : done ? "bg-green-600/20 text-green-500 border border-green-500/20" : "bg-neutral-900 text-neutral-600 border border-white/5"}`}>
        {icon}
      </div>
      <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${active ? "text-white" : done ? "text-green-500" : "text-neutral-600"}`}>{label}</span>
      {badge && (
        <span className="absolute -top-2 -right-2 bg-accent text-white text-[8px] font-black px-1.5 py-0.5 rounded-md border border-background shadow-lg">
          {badge}
        </span>
      )}
    </div>
  );
}
