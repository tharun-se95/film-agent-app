"use client";

import React, { useState, useEffect } from "react";
import { 
  Send, PenTool, LayoutDashboard, History, Download, 
  ChevronRight, Bot, Sparkles, Radio, CheckCircle2,
  FileText, Layers, Video, PanelRight, PanelRightClose,
  ArrowLeft, Volume2, Music
} from "lucide-react";
import { useAppContext, DraftCommit } from "@/context/AppContext";
import { useRouter } from "next/navigation";

export default function ProjectEditor({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { 
    projects, activeProject, setActiveProject,
    status, prompt, setPrompt,
    commits, selectedCommit, setSelectedCommit,
    logs, runAgent, fetchDrafts,
    agentPanelCollapsed, setAgentPanelCollapsed
  } = useAppContext();

  const [localViewMode, setLocalViewMode] = useState<"script" | "assets">("script");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      runAgent(prompt, projectId);
    }
  };

  useEffect(() => {
    // 1. ISOLATION: On mount or ID change, clear previous project's session data
    console.log("LOG: [Editor] Project Change Detected. Sanitizing workspace...");
    setPrompt("");
    
    // 2. Fetch project metadata
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      setActiveProject(proj);
      // 3. Clear logs and status to prevent leakage
      // We don't have direct access to setLogs/setStatus here easily if they aren't exposed,
      // but fetchDrafts will overwrite 'commits'.
      fetchDrafts(projectId).then(() => {
        console.log("LOG: [Editor] Workspace hydrated for:", proj.name);
      });
    }
  }, [projectId, projects, setActiveProject, fetchDrafts, setPrompt]);

  if (!activeProject) return <div className="p-12 text-neutral-500">Loading project...</div>;

  return (
    <div className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
      
      {/* 1. Top Navigation Bar (Contextual) */}
      <header className="h-20 px-8 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => {
              if (activeProject?.channel_id) {
                router.push(`/channels/${activeProject.channel_id}`);
              } else {
                router.back();
              }
            }}
            className="p-2 rounded-xl bg-white/5 text-neutral-400 hover:text-white transition-all border border-white/5 hover:border-white/10"
            title="Back to Studio"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Project Workspace</span>
              <div className={`w-2 h-2 rounded-full ${status === "IDLE" ? "bg-neutral-600" : "bg-primary animate-pulse"}`} />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">{activeProject.name}</h1>
          </div>
          
          <div className="h-8 w-px bg-white/10 mx-2" />
          
          <div className="flex items-center gap-2 bg-neutral-900/50 p-1.5 rounded-2xl border border-white/5">
            <button 
              onClick={() => setLocalViewMode("script")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${localViewMode === "script" ? "bg-white/10 text-white shadow-lg" : "text-neutral-500 hover:text-white"}`}
            >
              <FileText className="w-3.5 h-3.5" /> Script
            </button>
            <button 
              onClick={() => setLocalViewMode("assets")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${localViewMode === "assets" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-neutral-500 hover:text-white"}`}
            >
              <Layers className="w-3.5 h-3.5" /> Assets
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setAgentPanelCollapsed(!agentPanelCollapsed)}
            className={`p-2 rounded-xl transition-all ${agentPanelCollapsed ? "bg-white/10 text-white" : "bg-white/5 text-neutral-400 hover:text-white"}`}
          >
            {agentPanelCollapsed ? <PanelRight className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-white font-black text-xs hover:scale-105 active:scale-95 transition-all">
            Finalize Video
          </button>
        </div>
      </header>

      {/* 2. Main Editing Surface */}
      <div className="flex-1 overflow-hidden flex">
        
        {/* Left: Preview/Editor (White Surface) */}
        <div className="flex-1 overflow-y-auto bg-[#fafaf8] custom-scrollbar p-12 lg:p-20">
            {localViewMode === "script" ? (
               <div className="mx-auto max-w-[850px] bg-white shadow-[0_25px_80px_-20px_rgba(0,0,0,0.15)] min-h-[1100px] p-20 relative rounded-sm text-black animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {/* Draft Watermark */}
                  <div className="absolute top-20 left-0 right-0 flex justify-center opacity-[0.03] select-none pointer-events-none">
                    <span className="text-[120px] font-black tracking-[0.2em] rotate-[-25deg] uppercase italic truncate">Production Draft</span>
                  </div>

                  {selectedCommit ? (
                    <div className="relative z-10 space-y-12">
                        <header className="border-b-2 border-black pb-8">
                           <h2 className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-neutral-400">Production Workspace</h2>
                           <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm space-y-3">
                              <div className="flex items-center gap-2 text-blue-900">
                                 <Sparkles className="w-3.5 h-3.5" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Strategic Mission</span>
                              </div>
                              <p className="font-script text-[14px] leading-relaxed text-blue-900/80 italic">
                                 {activeProject.original_idea}
                              </p>
                           </div>
                        </header>
                       <p className="font-script text-[15px] leading-[2.4] whitespace-pre-wrap text-[#1a1a1a]">
                          {selectedCommit.content}
                       </p>
                    </div>
                  ) : status !== "IDLE" && status !== "DONE" ? (
                    <div className="h-[600px] flex flex-col items-center justify-center space-y-8 animate-pulse text-primary">
                        <div className="relative">
                           <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                           <Bot className="w-16 h-16 relative z-10 animate-bounce" />
                        </div>
                        <div className="text-center space-y-2">
                           <h3 className="text-sm font-black uppercase tracking-[0.3em]">Agents Deploying</h3>
                           <p className="font-script text-xl italic text-neutral-500">The factory is spinning up based on your brief...</p>
                        </div>
                    </div>
                  ) : (
                    <div className="h-[600px] flex flex-col items-center justify-center space-y-10">
                       <div className="w-24 h-24 rounded-[2rem] bg-neutral-100 flex items-center justify-center text-neutral-300 transform -rotate-6">
                          <Video className="w-10 h-10" />
                       </div>
                       <div className="text-center max-w-sm space-y-4">
                          <p className="font-script text-2xl font-bold italic tracking-tighter text-neutral-400">
                             The film factory is currently powered down.
                          </p>
                          <p className="text-xs font-medium text-neutral-400 leading-relaxed uppercase tracking-widest opacity-60">
                             Ready to deploy based on your strategic brief.
                          </p>
                       </div>
                       <button 
                         onClick={() => runAgent(activeProject.original_idea, projectId)}
                         className="group flex items-center gap-4 px-10 py-5 rounded-[2rem] bg-black text-white hover:bg-neutral-800 transition-all hover:scale-105 active:scale-95 shadow-2xl"
                       >
                          <Bot className="w-5 h-5 text-primary group-hover:animate-bounce" />
                          <span className="font-black uppercase tracking-widest text-xs">Launch Agency Flow</span>
                       </button>
                    </div>
                  )}
               </div>
            ) : (
               /* ASSETS VIEW */
               <div className="mx-auto max-w-[1000px] space-y-12 animate-in fade-in slide-in-from-right-8 duration-700 pb-24">
                  
                  {/* Metadata & SEO Section */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Bot className="w-5 h-5" />
                       </div>
                       <div>
                          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-800">Compliance & SEO</h2>
                          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Optimized for Viral Discovery</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="p-8 rounded-[2rem] bg-white shadow-xl border border-neutral-100 space-y-4">
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Title Strategy</span>
                          <h3 className="text-xl font-black text-neutral-900 leading-tight">
                             {selectedCommit?.yt_metadata?.title || "Drafting high-CTR title..."}
                          </h3>
                       </div>
                       <div className="p-8 rounded-[2rem] bg-white shadow-xl border border-neutral-100 space-y-4 overflow-hidden">
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Video Description</span>
                          <p className="text-xs text-neutral-600 leading-relaxed line-clamp-4 font-medium italic">
                             {selectedCommit?.yt_metadata?.description || "Analyzing script for SEO description..."}
                          </p>
                       </div>
                    </div>
                  </section>

                  {/* Thumbnail Concepts */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                          <Sparkles className="w-5 h-5" />
                       </div>
                       <div>
                          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-800">Thumbnail Concepts</h2>
                          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Pattern Interrupt Designs</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {selectedCommit?.production_bundle?.thumbnailConcepts?.map((concept, idx) => (
                          <div key={idx} className="group relative aspect-video rounded-3xl bg-neutral-200 overflow-hidden shadow-lg hover:scale-105 transition-all cursor-pointer">
                             {/* Placeholder for Generated Image */}
                             <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-black flex items-center justify-center p-8 text-center">
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-relaxed">
                                   {concept.title}
                                </p>
                             </div>
                             <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                                <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Concept #{idx + 1}</span>
                             </div>
                          </div>
                       )) || (
                          <div className="col-span-3 p-12 rounded-[3rem] border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-400 space-y-4">
                             <Layers className="w-10 h-10 opacity-20" />
                             <p className="text-[10px] font-black uppercase tracking-widest">Waiting for Production Node...</p>
                          </div>
                       )}
                    </div>
                  </section>

                  {/* Production Assets Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* B-Roll Checklist */}
                     <section className="p-10 rounded-[2.5rem] bg-neutral-900 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between">
                           <div className="space-y-1">
                              <h2 className="text-lg font-black text-white">Visual Cues & B-Roll</h2>
                              <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-[0.2em]">Shot list for Editors</p>
                           </div>
                           <CheckCircle2 className="w-6 h-6 text-primary" />
                        </div>
                        
                        <div className="space-y-2">
                           {selectedCommit?.production_bundle?.brollChecklist?.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                                 <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center text-[9px] font-black text-primary">
                                    {idx + 1}
                                 </div>
                                 <p className="text-[10px] text-neutral-300 font-medium group-hover:text-white transition-colors">{item}</p>
                              </div>
                           )) || (
                              <p className="text-[10px] text-neutral-600 italic">No visual cues mapped yet.</p>
                           )}
                        </div>
                     </section>

                     {/* Audio & Effects */}
                     <div className="space-y-8">
                        {/* SFX & VFX */}
                        <section className="p-10 rounded-[2.5rem] bg-white border border-neutral-100 shadow-xl space-y-6">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
                                 <Volume2 className="w-5 h-5" />
                              </div>
                              <div>
                                 <h2 className="text-sm font-black uppercase tracking-widest text-neutral-800">Audio & FX</h2>
                                 <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">SFX & Motion Graphics</p>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <div className="space-y-2">
                                 <h3 className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Sound Effects</h3>
                                 <div className="flex flex-wrap gap-2">
                                    {(selectedCommit?.production_bundle as any)?.sfxChecklist?.map((sfx: string, idx: number) => (
                                       <span key={idx} className="px-3 py-1.5 rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-600 border border-neutral-200">
                                          {sfx}
                                       </span>
                                    )) || <span className="text-[9px] text-neutral-400 italic">Pending...</span>}
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <h3 className="text-[9px] font-black uppercase tracking-widest text-neutral-400">VFX / Graphics</h3>
                                 <div className="space-y-2">
                                    {(selectedCommit?.production_bundle as any)?.vfxRequirements?.map((vfx: string, idx: number) => (
                                       <div key={idx} className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                          <p className="text-[10px] font-medium text-neutral-600">{vfx}</p>
                                       </div>
                                    )) || <p className="text-[9px] text-neutral-400 italic">Pending...</p>}
                                 </div>
                              </div>
                           </div>
                        </section>

                        {/* Music Mood */}
                        <section className="p-8 rounded-[2rem] bg-primary/10 border border-primary/20 space-y-4">
                           <div className="flex items-center gap-3">
                              <Music className="w-4 h-4 text-primary" />
                              <h2 className="text-[10px] font-black uppercase tracking-widest text-primary">Music Inspiration</h2>
                           </div>
                           <p className="text-[11px] leading-relaxed text-neutral-700 font-medium">
                              {(selectedCommit?.production_bundle as any)?.musicInspiration || "Consulting the music supervisor..."}
                           </p>
                        </section>
                     </div>
                  </div>

               </div>
            )}
        </div>

        {/* Right: Agent Control Sidebar */}
        {!agentPanelCollapsed && (
          <aside className="w-[400px] border-l border-white/5 flex flex-col bg-neutral-900/20 backdrop-blur-sm shrink-0 animate-in slide-in-from-right-8 duration-300">
           
           {/* Agent Status & Logs */}
           <div className="p-6 border-b border-white/5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4 flex items-center justify-between">
                Live Intelligence
                <span className="flex items-center gap-1.5 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /> Live
                </span>
              </h3>
              <div className="space-y-3 h-64 overflow-y-auto custom-scrollbar-thin text-xs pr-2">
                 {logs.length === 0 ? (
                   <div className="p-4 rounded-2xl bg-white/5 border border-dashed border-white/10 text-neutral-500 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Agency Standby</p>
                      <p className="text-[9px] mt-2 italic">Confirm the brief to begin trace.</p>
                   </div>
                 ) : (
                   logs.map((log, i) => (
                     <div key={i} className={`p-3 rounded-2xl border transition-all animate-in fade-in slide-in-from-bottom-1
                       ${log.startsWith('User:') ? 'bg-white/5 border-white/10 text-neutral-400 ml-4' : 'bg-primary/5 border-primary/10 text-primary mr-4'}`}>
                        <div className="flex items-center gap-2 mb-1 opacity-40">
                           <span className="text-[8px] font-black uppercase tracking-widest">
                              {log.startsWith('User:') ? 'Command' : 'Agent Response'}
                           </span>
                        </div>
                        <p className="text-[10px] leading-relaxed font-medium">
                           {log.replace('User:', '').replace('System:', '').replace('Strategist:', '')}
                        </p>
                     </div>
                   ))
                 )}
              </div>
           </div>

           {/* Version Management */}
           <div className="p-6 flex-1 overflow-hidden flex flex-col">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Version History</h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                 {commits.map((c, i) => (
                    <button 
                      key={i}
                      onClick={() => setSelectedCommit(c)}
                      className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all
                        ${selectedCommit?.iteration === c.iteration ? "bg-white/5 border-white/20" : "bg-transparent border-transparent hover:bg-white/5"}`}
                    >
                       <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${selectedCommit?.iteration === c.iteration ? "bg-primary text-white" : "bg-white/5 text-neutral-600"}`}>
                             <History className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                             <p className="text-xs font-bold text-white">Draft #{c.iteration}</p>
                             <p className="text-[10px] text-neutral-500 font-medium">Auto-saved</p>
                          </div>
                       </div>
                       {c.critic_score && (
                          <span className="text-[10px] font-black text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                             {c.critic_score}/10
                          </span>
                       )}
                    </button>
                 ))}
              </div>
           </div>

           {/* Prompt Interaction */}
           <form onSubmit={handleSubmit} className="p-6 border-t border-white/5 bg-black/40">
              <div className="relative">
                 <textarea 
                    placeholder="Refactor the script or add a visual style..."
                    className="w-full bg-[#0c0c0c] border border-white/5 rounded-2xl px-5 py-4 text-sm outline-none focus:border-primary transition-all resize-none h-32 custom-scrollbar-thin placeholder:italic placeholder:text-neutral-700 font-medium"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e as any);
                      }
                    }}
                 />
                 <button 
                  type="submit"
                  disabled={status !== "IDLE" && status !== "DONE"}
                  className="absolute bottom-4 right-4 p-2.5 bg-primary rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 disabled:opacity-20 translate-y-0"
                 >
                    <Send className="w-4 h-4 text-white" />
                 </button>
              </div>
           </form>
        </aside>
        )}

      </div>
    </div>
  );
}
