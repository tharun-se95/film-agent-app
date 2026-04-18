"use client";

import React from "react";
import { 
  Plus, Sparkles, TrendingUp, ShieldAlert, Target, 
  ChevronRight, BadgeDollarSign, Activity, Compass,
  ArrowRight
} from "lucide-react";
import { NicheOpportunity, useAppContext } from "@/context/AppContext";

export default function NicheExplorer({ opportunities, onSelect }: { opportunities: NicheOpportunity[], onSelect: (n: NicheOpportunity) => void }) {
  if (!opportunities || opportunities.length === 0) return null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <Compass className="w-3 h-3" />
            Market Discovery Phase
          </div>
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tightest">
          The Opportunity Matrix
        </h2>
        <p className="text-neutral-500 font-medium max-w-2xl mx-auto leading-relaxed">
          The Industrial Niche Architect has identified a rich list of high-value paths. 
          Select a <span className="text-white">Gold Mine</span> or <span className="text-white">Blue Ocean</span> to begin production.
        </p>
      </div>

      {/* Opportunity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {opportunities.map((opp, idx) => (
          <div 
            key={`${opp.niche}-${idx}`}
            onClick={() => onSelect(opp)}
            className="group relative p-8 rounded-[2.5rem] bg-[#0c0c0c] border border-white/5 hover:border-primary/40 transition-all hover:shadow-2xl hover:shadow-primary/5 cursor-pointer overflow-hidden flex flex-col min-h-[360px]"
          >
            {/* Design accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] group-hover:bg-primary/10 transition-colors" />
            <div className={`absolute top-6 right-6 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border ${
              opp.competition === 'LOW' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
              opp.competition === 'MEDIUM' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
              'bg-orange-500/10 text-orange-500 border-orange-500/20'
            }`}>
              {opp.competition} Competition
            </div>

            <div className="flex-1 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                {idx === 0 ? <BadgeDollarSign className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors leading-tight">
                  {opp.name}
                </h3>
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-neutral-600" />
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                    CPM Potential: <span className="text-white">{opp.cpm}</span>
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-[8px] font-black text-primary uppercase tracking-widest">
                  <Target className="w-3 h-3" />
                  The Alpha Angle
                </div>
                <p className="text-[11px] text-neutral-400 font-medium leading-relaxed italic">
                  "{opp.reasoning}"
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Viral Hook Concept</span>
                <span className="text-[10px] font-bold text-neutral-400 truncate max-w-[150px]">{opp.hook}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-lg shadow-primary/20">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}

        {/* Custom Input Card */}
        <div 
          className="group relative p-8 rounded-[2.5rem] bg-transparent border-2 border-dashed border-white/5 hover:border-white/10 transition-all flex flex-col items-center justify-center gap-4 min-h-[360px] text-neutral-600 hover:text-neutral-400 cursor-help"
        >
          <Sparkles className="w-10 h-10 transition-transform group-hover:scale-110" />
          <div className="text-center">
            <span className="text-xs font-black uppercase tracking-widest block mb-1">Combinatorial Loop</span>
            <span className="text-[10px] font-medium leading-relaxed italic block max-w-[180px]">
              The factory is currently evaluating adjacent sectors for deeper gaps.
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
