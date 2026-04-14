"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Bot, Clock, ChevronRight, Play, LayoutDashboard, 
  Settings, Radio, Plus, Sparkles, ArrowLeft, Trash2
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import Link from "next/link";

export default function ChannelPage() {
  const router = useRouter();
  const { id } = useParams();
  const { 
    channels, projects, suggestions, 
    fetchStrategy, isFetchingStrategy, setSuggestions,
    fetchSuggestions, deleteSuggestion, handleCreateProject
  } = useAppContext();

  const [commissioningId, setCommissioningId] = React.useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchSuggestions(id as string);
    }
  }, [id, fetchSuggestions]);

  useEffect(() => {
    // Only auto-fetch if we tried to fetch suggestions and still have none
    if (id && suggestions.length === 0 && !isFetchingStrategy) {
      // fetchStrategy(id as string); // Optional: disabled auto-fetch to give user control, or keep it
    }
  }, [id, suggestions.length, isFetchingStrategy]);
  
  const channel = channels.find(c => c.id === id);
  const channelProjects = projects.filter(p => p.channel_id === id);

  if (!channel) return <div className="p-12 text-neutral-500">Channel not found.</div>;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {/* Back Button & Breadcrumb */}
      <div className="px-12 pt-8">
         <Link 
           href="/"
           className="group flex items-center gap-2 text-neutral-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
         >
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 group-hover:border-primary/40 group-hover:text-primary transition-all">
               <ArrowLeft className="w-3 h-3" />
            </div>
            Back to Studio
         </Link>
      </div>

      {/* Hero Header */}
      <section className="relative px-12 py-16 bg-gradient-to-b from-primary/10 to-transparent border-b border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5">
           <Radio className="w-64 h-64 text-primary" />
        </div>
        
        <div className="max-w-6xl mx-auto relative items-center flex justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/30">
                ACTIVE CHANNEL
              </span>
              <span className="text-neutral-500 text-xs font-medium">Established {new Date(channel.created_at).toLocaleDateString()}</span>
            </div>
            <h1 className="text-5xl font-black tracking-tightest text-white mb-4">{channel.name}</h1>
            <p className="text-lg text-neutral-400 max-w-2xl leading-relaxed italic">
              "{channel.niche || "Strategic niche pending mission debrief."}"
            </p>
          </div>
          <button className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-black hover:scale-105 active:scale-95 transition-all shadow-2xl">
            <Plus className="w-5 h-5" />
            New Project
          </button>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-12 py-12 grid grid-cols-1 xl:grid-cols-3 gap-12">
        
        {/* Main Content: Projects List */}
        <div className="xl:col-span-2 space-y-8">
           <header className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                <LayoutDashboard className="w-5 h-5 text-neutral-500" />
                Production Queue
              </h2>
           </header>

           <div className="space-y-4">
              {channelProjects.map((p) => (
                <Link 
                  key={p.id} 
                  href={`/projects/${p.id}`}
                  className="group flex items-center justify-between p-6 rounded-3xl bg-neutral-900/40 border border-white/5 hover:border-white/10 transition-all hover:bg-neutral-900/60"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-neutral-500 group-hover:text-primary transition-colors border border-white/5">
                      <Play className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <h3 className="font-black text-white group-hover:text-primary transition-colors">{p.name}</h3>
                      <p className="text-xs text-neutral-500 font-medium">Last processed {new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
              {channelProjects.length === 0 && (
                <div className="p-12 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-neutral-600">
                   <Clock className="w-8 h-8" />
                   <p className="text-sm font-bold uppercase tracking-widest text-center italic">Factory Floor is empty.<br/>Commission a strategic concept below.</p>
                </div>
              )}
           </div>
        </div>

        {/* Sidebar: Strategic Intel */}
        <div className="space-y-8">
           <header>
              <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                <Bot className="w-6 h-6 text-primary" />
                Strategic Intel
              </h2>
           </header>

           <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/10 space-y-6">
              <div className="flex items-center gap-3 text-primary">
                 <Sparkles className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Agent Insight</span>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed italic">
                 The current algorithm favors <strong>High Conflict</strong> hooks in the {channel.name} niche. 
                 Consider initiating a project focused on industry tension.
              </p>
              
              <div className="space-y-4">
                {isFetchingStrategy ? (
                  // Loading Skeletons
                  [1, 2].map((i) => (
                    <div key={i} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3 animate-pulse">
                       <div className="h-3 w-3/4 bg-white/10 rounded" />
                       <div className="h-2 w-1/2 bg-primary/10 rounded" />
                    </div>
                  ))
                ) : (
                  suggestions.map((s, i) => (
                    <div key={i} className="group/card relative p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 hover:border-primary/20 transition-all">
                       <button 
                         onClick={() => s.id && deleteSuggestion(s.id)}
                         className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover/card:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                       >
                          <Trash2 className="w-3 h-3" />
                       </button>
                       <p className="text-xs font-bold text-white pr-6">{s.title}</p>
                       <button 
                         disabled={commissioningId === (s.id || i.toString())}
                         onClick={async () => {
                           const targetId = s.id || i.toString();
                           setCommissioningId(targetId);
                           const initialIdea = `STRATEGIC CONCEPT COMMISSIONED:
---
TITLE: ${s.title}
REASONING: ${s.reasoning}
HOOK: ${s.hook}
---
Please begin production based on this strategic alignment.`;
                           
                           const project = await handleCreateProject(s.title, "YOUTUBE", initialIdea, id as string);
                           if (project?.id) {
                             router.push(`/projects/${project.id}`);
                           }
                           setCommissioningId(null);
                         }}
                         className="text-[10px] font-black uppercase text-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                          {commissioningId === (s.id || i.toString()) ? "Commissioning..." : "Commission Concept"}
                       </button>
                    </div>
                  ))
                )}
                {!isFetchingStrategy && suggestions.length === 0 && (
                   <div className="p-4 rounded-xl bg-white/5 border border-dashed border-white/10 text-center">
                      <p className="text-[10px] font-medium text-neutral-500 italic">No concepts generated.</p>
                   </div>
                )}
              </div>

              <button 
                onClick={() => fetchStrategy(id as string)}
                disabled={isFetchingStrategy}
                className="w-full py-3 rounded-xl bg-primary text-white font-black text-xs hover:bg-primary/80 transition-all shadow-lg shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isFetchingStrategy && <Sparkles className="w-4 h-4 animate-spin" />}
                {isFetchingStrategy ? "Strategizing..." : "Refresh Strategy"}
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}
