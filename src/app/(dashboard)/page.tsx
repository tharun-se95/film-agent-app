"use client";

import React from "react";
import { Plus, Globe, MoreVertical, ChevronRight, Radio, AlertTriangle } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";

export default function DashboardHome() {
  const router = useRouter();
  const { 
    channels, setIsCreatingChannel, projects,
    handleDeleteChannel, setEditingChannel 
  } = useAppContext();

  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  return (
    <div className="p-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-white">Your Studio</h1>
          <p className="text-neutral-500 font-medium text-lg">Manage your content channels and agentic strategies with precision.</p>
        </div>
        <button 
          onClick={() => setIsCreatingChannel(true)}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] hover:brightness-110 active:scale-95 transition-all shadow-2xl shadow-primary/20 shrink-0"
        >
          <Plus className="w-5 h-5" />
          Establish Channel
        </button>
      </header>

      {/* Channel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map((channel) => {
          const projectCount = projects.filter(p => p.channel_id === channel.id).length;
          const isDeleting = confirmDeleteId === channel.id;
          
          return (
            <div 
              key={channel.id} 
              onClick={() => {
                if (!openDropdown) router.push(`/channels/${channel.id}`);
              }}
              className="group relative p-8 rounded-[2.5rem] bg-[#0c0c0c] border border-white/[0.03] hover:border-primary/40 transition-all hover:shadow-[0_0_50px_rgba(59,130,246,0.1)] overflow-hidden flex flex-col min-h-[340px] cursor-pointer"
            >
              {/* Design Accents */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[80px] group-hover:bg-primary/10 transition-colors" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                  <Radio className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 relative">
                   <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                     {projectCount} Projects
                   </div>
                   <button 
                     onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(openDropdown === channel.id ? null : channel.id);
                        setConfirmDeleteId(null);
                     }}
                     className="text-neutral-500 hover:text-white transition-colors p-1"
                   >
                     <MoreVertical className="w-5 h-5" />
                   </button>

                   {/* Dropdown Menu */}
                   {openDropdown === channel.id && (
                     <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95">
                        {!isDeleting ? (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingChannel(channel);
                                setOpenDropdown(null);
                              }}
                              className="w-full text-left px-4 py-3 text-[10px] font-bold text-neutral-400 hover:bg-white/5 hover:text-white transition-all uppercase tracking-widest flex items-center justify-between"
                            >
                              Edit Studio
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(channel.id);
                              }}
                              className="w-full text-left px-4 py-3 text-[10px] font-bold text-red-500/60 hover:bg-red-500/10 hover:text-red-500 transition-all uppercase tracking-widest flex items-center justify-between"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <div className="px-4 py-3 space-y-3">
                             <div className="flex items-center gap-2 text-red-500">
                                <AlertTriangle className="w-3 h-3" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Are you sure?</span>
                             </div>
                             <div className="flex gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteChannel(channel.id);
                                    setOpenDropdown(null);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors"
                                >
                                  Yes
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteId(null);
                                  }}
                                  className="flex-1 py-2 rounded-lg bg-white/5 text-neutral-400 text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors"
                                >
                                  No
                                </button>
                             </div>
                          </div>
                        )}
                     </div>
                   )}
                </div>
              </div>
  
              <div className="flex-1">
                <h3 className="text-xl font-black mb-2 group-hover:text-primary transition-colors tracking-tight">{channel.name}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2 italic mb-6">
                  "{channel.niche || "Strategic niche not yet established."}"
                </p>
                
                <div className="flex flex-wrap gap-2">
                   {channel.brand_voice && (
                     <span className="px-2 py-1 rounded-lg bg-primary/5 border border-primary/10 text-[9px] font-bold text-primary/80 uppercase tracking-wider">
                       {channel.brand_voice.split(' ')[0]} Voice
                     </span>
                   )}
                   <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                     Strategic Core
                   </span>
                </div>
              </div>
  
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                  SYSTEM READY
                </span>
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 group-hover:text-white transition-colors">
                  Open Control <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}

        {/* Create Card */}
        <button 
          onClick={() => setIsCreatingChannel(true)}
          className="group relative p-8 rounded-[2.5rem] bg-transparent border-2 border-dashed border-white/5 hover:border-white/10 transition-all flex flex-col items-center justify-center gap-4 min-h-[250px] text-neutral-600 hover:text-neutral-400"
        >
          <Globe className="w-10 h-10 transition-transform group-hover:scale-110" />
          <span className="text-sm font-bold tracking-tight">Expand Portfolio</span>
        </button>
      </div>

    </div>
  );
}
