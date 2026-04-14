"use client";

import React, { useState } from "react";
import { Plus, Radio, Clapperboard } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export default function ProjectModal() {
  const { 
    isCreatingProject, setIsCreatingProject, 
    handleCreateProject, contentMode, setContentMode,
    channels, setActiveChannel, activeChannel
  } = useAppContext();
  
  const [name, setName] = useState("");

  if (!isCreatingProject) return null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      handleCreateProject(name);
      setName("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_#3b82f6aa]" />

        <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-white">
          <Plus className="w-8 h-8 text-primary" />
          New Video Project
        </h2>
        
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-black mb-2">Project Name</label>
            <input 
              autoFocus
              className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 outline-none focus:border-primary/50 transition-all text-white font-medium"
              placeholder="e.g. The AI Singularity"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-black mb-2">Assignment Channel</label>
            <div className="flex flex-wrap gap-2">
              {channels.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveChannel(c)}
                  className={`px-4 py-2 rounded-xl border text-[10px] font-bold transition-all ${activeChannel?.id === c.id ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/5" : "border-white/5 text-neutral-500 hover:border-white/20"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-black mb-2">Content Type</label>
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setContentMode("YOUTUBE")}
                className={`flex-1 p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${contentMode === "YOUTUBE" ? "bg-primary/10 border-primary text-primary" : "border-white/5 text-neutral-500 hover:bg-white/5"}`}
              >
                <Radio className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">YOUTUBE</span>
              </button>
              <button 
                type="button"
                onClick={() => setContentMode("FILM")}
                className={`flex-1 p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${contentMode === "FILM" ? "bg-amber-500/10 border-amber-500 text-amber-500" : "border-white/5 text-neutral-500 hover:bg-white/5"}`}
              >
                <Clapperboard className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">FILMMAKER</span>
              </button>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/5">
            <button 
              type="button"
              onClick={() => setIsCreatingProject(false)}
              className="flex-1 px-6 py-4 rounded-2xl hover:bg-white/5 transition-all text-neutral-500 font-bold text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-4 rounded-2xl bg-primary text-white font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
