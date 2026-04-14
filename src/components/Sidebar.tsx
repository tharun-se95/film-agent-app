"use client";

import React, { useState } from "react";
import { 
  Clapperboard, Folder, Plus, Globe, Radio, 
  ChevronRight, ChevronDown, Trash2, Search,
  Settings, User, PanelLeftClose, PanelLeft
} from "lucide-react";
import { useAppContext, Channel, Project } from "@/context/AppContext";

export default function Sidebar() {
  const { 
    channels, projects, activeChannel, setActiveChannel, 
    activeProject, setActiveProject,
    setIsCreatingProject, setIsCreatingChannel,
    sidebarCollapsed, setSidebarCollapsed
  } = useAppContext();

  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set(["General"]));
  const [searchQuery, setSearchQuery] = useState("");

  const toggleChannel = (id: string) => {
    const next = new Set(expandedChannels);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedChannels(next);
  };

  const filteredChannels = channels.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <nav className={`${sidebarCollapsed ? "w-20" : "w-72"} border-r border-white/5 bg-[#0a0a0a] flex flex-col items-stretch overflow-hidden z-50 transition-all duration-300 ease-in-out`}>
      
      {/* Brand Header */}
      <div className={`p-6 flex items-center justify-between shrink-0 mb-2 ${sidebarCollapsed ? "px-4" : ""}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <Clapperboard className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <h1 className="font-black text-sm tracking-tight text-white">GRAVITY</h1>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Studio 1.0</p>
            </div>
          )}
        </div>
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 rounded-lg hover:bg-white/5 text-neutral-500 hover:text-white transition-all"
        >
          {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Search Bar */}
      {!sidebarCollapsed && (
        <div className="px-4 mb-4 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Search factory..."
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Actions */}
        <div className={`flex gap-1.5 px-4 mb-6 ${sidebarCollapsed ? "flex-col" : ""}`}>
          <button 
            onClick={() => setIsCreatingProject(true)}
            className={`group flex items-center justify-center rounded-xl bg-primary text-white hover:scale-[1.05] active:scale-95 transition-all shadow-lg shadow-primary/20 ${sidebarCollapsed ? "w-12 h-12 p-0 mx-auto" : "flex-1 p-3 gap-2.5"}`}
            title="New Project"
          >
            <Plus className="w-4 h-4 shrink-0 transition-transform group-hover:rotate-90" />
            {!sidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-left-2 transition-all">New Project</span>}
          </button>
          <button 
            onClick={() => setIsCreatingChannel(true)}
            className={`flex items-center justify-center rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all ${sidebarCollapsed ? "w-12 h-12 mx-auto" : "px-4"}`}
            title="Establish Channel"
          >
            <Globe className="w-4 h-4 shrink-0" />
          </button>
        </div>

      {/* Channel / Project Tree */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar px-3 space-y-6 ${sidebarCollapsed ? "px-0" : ""}`}>
        
        <div>
          {!sidebarCollapsed && <h3 className="px-3 text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">Your Channels</h3>}
          <div className="space-y-1">
            {filteredChannels.map((channel) => (
              <div key={channel.id} className="space-y-0.5">
                <button
                  onClick={() => {
                    toggleChannel(channel.id);
                    setActiveChannel(channel);
                  }}
                  className={`w-full flex items-center rounded-xl transition-all group/channel
                    ${sidebarCollapsed ? "justify-center p-3 h-12" : "justify-between p-2.5"} 
                    ${activeChannel?.id === channel.id ? "bg-primary/10 text-primary" : "text-neutral-400 hover:bg-white/[0.03] hover:text-neutral-200"}`}
                  title={sidebarCollapsed ? channel.name : ""}
                >
                  <div className={`flex items-center gap-3 overflow-hidden ${sidebarCollapsed ? "justify-center" : ""}`}>
                    <Radio className={`w-4 h-4 shrink-0 ${activeChannel?.id === channel.id ? "text-primary" : "text-neutral-500"}`} />
                    {!sidebarCollapsed && <span className="text-xs font-bold truncate tracking-tight">{channel.name}</span>}
                  </div>
                  {!sidebarCollapsed && (expandedChannels.has(channel.id) ? <ChevronDown className="w-3.5 h-3.5 opacity-50" /> : <ChevronRight className="w-3.5 h-3.5 opacity-30" />)}
                </button>

                {!sidebarCollapsed && expandedChannels.has(channel.id) && (
                  <div className="ml-4 pl-4 border-l border-white/5 space-y-0.5 mt-0.5 animate-in slide-in-from-left-2 duration-200">
                    {projects
                      .filter((p) => p.channel_id === channel.id)
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setActiveProject(p)}
                          className={`w-full text-left p-2 rounded-lg text-[11px] font-medium transition-all
                            ${activeProject?.id === p.id 
                              ? "text-white bg-white/5 shadow-sm" 
                              : "text-neutral-500 hover:text-neutral-300 hover:translate-x-1"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${activeProject?.id === p.id ? "bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-neutral-700"}`} />
                            <span className="truncate">{p.name}</span>
                          </div>
                        </button>
                      ))}
                    {projects.filter(p => p.channel_id === channel.id).length === 0 && (
                      <p className="text-[10px] text-neutral-600 italic py-2 pl-4">No videos yet</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Footer / User */}
      <div className={`p-4 border-t border-white/5 mt-auto ${sidebarCollapsed ? "px-2" : ""}`}>
        <div className={`flex items-center rounded-xl hover:bg-white/5 transition-all group cursor-pointer ${sidebarCollapsed ? "justify-center p-2 h-12" : "justify-between p-2"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-700 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors shrink-0`}>
              <User className="w-4 h-4 text-neutral-400 group-hover:text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden animate-in fade-in slide-in-from-left-2 transition-all">
                <p className="text-xs font-bold text-neutral-200 truncate">Studio Admin</p>
                <p className="text-[10px] text-neutral-500 font-medium tracking-tight">Enterprise Plan</p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && <Settings className="w-4 h-4 text-neutral-600 hover:text-white transition-colors" />}
        </div>
      </div>
    </nav>
  );
}
