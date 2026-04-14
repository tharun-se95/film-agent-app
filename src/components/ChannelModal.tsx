"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, ArrowRight, ArrowLeft, Search, Sparkles, 
  CheckCircle2, TrendingUp, Zap, MousePointer2 
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";

type OnboardingDNA = {
  niche: string;
  brand_voice: string;
  key_pillars: string[];
  target_audience_summary: string;
};

type Opportunity = {
  name: string;
  vision: string;
  monetization: string;
  landscape: string;
  audience: string;
  competitors: string;
};

const DEFAULT_OPPS: Opportunity[] = [
  {
    name: "AI Automation Hacks",
    vision: "Deep dives into how AI agents and automation tools are transforming modern workflows.",
    monetization: "High CPM ($25+)",
    landscape: "Expanding interest in productivity and AI-driven efficiency.",
    audience: "Tech-savvy professionals and solo-preneurs.",
    competitors: "Matthew Berman, AI Explained"
  },
  {
    name: "Luxury Escapes Guide",
    vision: "Cinematic tours of the world's most exclusive and hidden travel destinations.",
    monetization: "Premium Ad Revenue",
    landscape: "High demand for escapist, high-quality visual content.",
    audience: "High-net-worth travelers and travel enthusiasts.",
    competitors: "The Luxury Travel Expert, Sam Chui"
  },
  {
    name: "The Stoic Mindset",
    vision: "Timeless philosophy applied to modern challenges, focused on clarity and resilience.",
    monetization: "High Retention / Sponsorships",
    landscape: "Growing wellness niche focused on mental strength.",
    audience: "Individuals seeking self-improvement and mental clarity.",
    competitors: "Daily Stoic, Pursuit of Wonder"
  },
  {
    name: "Financial Frontier",
    vision: "Explaining complex market trends and emerging asset classes with radical simplicity.",
    monetization: "Tier 1 Finance CPM",
    landscape: "Ongoing volatility driving demand for clear financial analysis.",
    audience: "Retail investors and financial enthusiasts.",
    competitors: "ColdFusion, Graham Stephan"
  }
];

export default function ChannelModal() {
  const { 
    isCreatingChannel, setIsCreatingChannel, 
    handleCreateChannel, handleUpdateChannel,
    editingChannel, setEditingChannel 
  } = useAppContext();
  
  // Wizard State
  const [step, setStep] = useState(0); // Start at 0 for Opportunity Board
  const [name, setName] = useState("");
  const [vision, setVision] = useState("");
  const [audience, setAudience] = useState("");
  const [competitors, setCompetitors] = useState("");
  
  // Opportunity Board State
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  // Magic Fill State
  const [assistingField, setAssistingField] = useState<string | null>(null);

  // Research State
  const [isResearching, setIsResearching] = useState(false);
  const [researchLabel, setResearchLabel] = useState("Initializing Intelligence Scan...");
  const [dna, setDna] = useState<OnboardingDNA | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingChannel) {
      setName(editingChannel.name);
      setVision(editingChannel.niche); // Using niche as initial vision for edit
      setStep(1);
    } else if (isCreatingChannel) {
      fetchOpportunities();
    } else {
      // Reset wizard on close
      setStep(0);
      setName("");
      setVision("");
      setAudience("");
      setCompetitors("");
      setDna(null);
      setError(null);
      setOpportunities([]);
    }
  }, [isCreatingChannel, editingChannel]);

  const fetchOpportunities = async () => {
    setIsLoadingTrends(true);
    try {
      const res = await fetch("/api/intel/trends", { cache: "no-store" });
      const data = await res.json();
      console.log("LOG: [Wizard] Discovery data received:", data);
      
      if (Array.isArray(data) && data.length > 0) {
        setOpportunities(data);
      } else {
        console.warn("LOG: [Wizard] Invalid trends data, using fallbacks.");
        setOpportunities(DEFAULT_OPPS);
      }
    } catch (e) {
      console.error("LOG: [Wizard] Trends fetch failed:", e);
      setOpportunities(DEFAULT_OPPS);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  const handleSelectOpportunity = (opp: Opportunity) => {
    setName(opp.name);
    setVision(opp.vision);
    setAudience(opp.audience);
    setCompetitors(opp.competitors);
    setStep(1);
  };

  const assistField = async (field: "vision" | "audience" | "competitors") => {
    if (!name) return;
    setAssistingField(field);
    try {
      const res = await fetch("/api/intel/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          field, 
          context: { name, vision, audience } 
        })
      });
      const data = await res.json();
      if (data.suggestion) {
        if (field === "vision") setVision(data.suggestion);
        if (field === "audience") setAudience(data.suggestion);
        if (field === "competitors") setCompetitors(data.suggestion);
      }
    } catch (e) {
      console.error("Assist failed");
    } finally {
      setAssistingField(null);
    }
  };

  const startResearch = async () => {
    setIsResearching(true);
    setError(null);
    setStep(3);

    const labels = [
      "Analyzing Target Demographic...",
      "Scanning Niche Competitive Gaps...",
      "Synthesizing Content Pillars...",
      "Generating Strategic Brand Voice..."
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < labels.length) {
        setResearchLabel(labels[i]);
        i++;
      }
    }, 1500);

    try {
      const res = await fetch("/api/channels/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, vision, audience, competitors })
      });
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        setStep(2);
      } else {
        setDna(data);
        setStep(4);
      }
    } catch (e) {
      setError("Failed to connect to strategic engine.");
      setStep(2);
    } finally {
      clearInterval(interval);
      setIsResearching(false);
    }
  };

  const onFinalize = () => {
    if (editingChannel) {
      handleUpdateChannel(editingChannel.id, name, vision, dna?.brand_voice || editingChannel.brand_voice);
    } else if (dna) {
      handleCreateChannel(name, { niche: dna.niche, brand_voice: dna.brand_voice });
    } else {
      handleCreateChannel(name);
    }
  };

  if (!isCreatingChannel && !editingChannel) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] w-full max-w-2xl p-0 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col min-h-[600px]">
        
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_#3b82f6aa]" />

        {/* Header */}
        <header className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-black/20">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                 <Globe className="w-6 h-6" />
              </div>
              <div>
                 <h2 className="text-xl font-black text-white tracking-tight">Establish Studio</h2>
                 <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                   {step === 0 ? "Discovery Mode" : `Onboarding Step ${step} of 4`}
                 </p>
              </div>
           </div>
           {step < 3 && (
              <button 
                onClick={() => {
                  setIsCreatingChannel(false);
                  setEditingChannel(null);
                }}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
           )}
        </header>

        {/* Content Area */}
        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
          
          {/* STEP 0: OPPORTUNITY BOARD */}
          {step === 0 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
               <div>
                  <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Select an Opportunity</h3>
                  <p className="text-sm text-neutral-400 font-medium leading-relaxed">Our Agent has identified these trending, high-profit niches for your next studio.</p>
               </div>

               {isLoadingTrends ? (
                 <div className="grid grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-40 rounded-[2rem] bg-white/5 border border-white/5 animate-pulse" />
                    ))}
                 </div>
               ) : (
                 <div className="grid grid-cols-2 gap-4">
                    {opportunities.map((opp, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSelectOpportunity(opp)}
                        className="group text-left p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all relative overflow-hidden flex flex-col justify-between h-52"
                      >
                         <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                               <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-black text-green-500 uppercase tracking-widest">
                                 {opp.monetization}
                               </div>
                               <TrendingUp className="w-4 h-4 text-neutral-600 group-hover:text-primary transition-colors" />
                            </div>
                            <h4 className="text-lg font-black text-white leading-tight">{opp.name}</h4>
                            <p className="text-[11px] text-neutral-500 font-medium line-clamp-3 leading-relaxed">{opp.landscape}</p>
                         </div>
                         <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                            <span className="text-[10px] font-black uppercase tracking-widest">Select Niche</span>
                            <MousePointer2 className="w-3 h-3" />
                         </div>
                      </button>
                    ))}
                    
                    {/* CUSTOM OPTION */}
                    <button 
                      onClick={() => setStep(1)}
                      className="group p-6 rounded-[2rem] border-2 border-dashed border-white/5 hover:border-white/10 transition-all flex flex-col items-center justify-center gap-3 h-52 text-neutral-600 hover:text-neutral-400"
                    >
                       <Zap className="w-8 h-8" />
                       <span className="text-xs font-black uppercase tracking-[0.2em]">Manual Entry</span>
                    </button>
                 </div>
               )}
            </div>
          )}

          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
               <div>
                  <h3 className="text-2xl font-black text-white mb-2 tracking-tight">What is the vision?</h3>
                  <p className="text-sm text-neutral-400 font-medium leading-relaxed">Let's define the core identity of your new content studio.</p>
               </div>
               <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-black mb-3 text-center">Channel Name</label>
                    <input 
                      autoFocus
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-primary/50 transition-all text-white font-medium text-center text-xl placeholder:text-neutral-700 font-inter"
                      placeholder="e.g. Cinema Analytics"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                       <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-black">Core Topic / Vision</label>
                       <button 
                         onClick={() => assistField("vision")}
                         disabled={!name || assistingField === "vision"}
                         className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all disabled:opacity-20"
                       >
                          {assistingField === "vision" ? (
                             <div className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                          ) : (
                             <Sparkles className="w-3 h-3" />
                          )}
                          <span className="text-[10px] font-black uppercase tracking-widest">Magic Assist</span>
                       </button>
                    </div>
                    <textarea 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-primary/50 transition-all text-white font-medium h-32 resize-none placeholder:text-neutral-700 placeholder:italic"
                      placeholder="e.g. Deep video essays on the psychology of film direction..."
                      value={vision}
                      onChange={(e) => setVision(e.target.value)}
                    />
                  </div>
               </div>
            </div>
          )}

          {/* STEP 2: LANDSCAPE */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
               <div>
                  <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Targeting & Strategy</h3>
                  <p className="text-sm text-neutral-400 font-medium leading-relaxed">Provide context on the competitive landscape and audience.</p>
               </div>
               <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                       <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-black">Target Audience</label>
                       <button 
                         onClick={() => assistField("audience")}
                         disabled={!name || assistingField === "audience"}
                         className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all disabled:opacity-20"
                       >
                          {assistingField === "audience" ? (
                             <div className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                          ) : (
                             <Sparkles className="w-3 h-3" />
                          )}
                          <span className="text-[10px] font-black uppercase tracking-widest">Magic Assist</span>
                       </button>
                    </div>
                    <input 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-primary/50 transition-all text-white font-medium placeholder:text-neutral-700"
                      placeholder="e.g. Aspiring filmmakers, film students..."
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                       <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-black">Reference Channels</label>
                       <button 
                         onClick={() => assistField("competitors")}
                         disabled={!name || assistingField === "competitors"}
                         className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all disabled:opacity-20"
                       >
                          {assistingField === "competitors" ? (
                             <div className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                          ) : (
                             <Sparkles className="w-3 h-3" />
                          )}
                          <span className="text-[10px] font-black uppercase tracking-widest">Magic Assist</span>
                       </button>
                    </div>
                    <input 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-primary/50 transition-all text-white font-medium placeholder:text-neutral-700"
                      placeholder="e.g. Every Frame a Painting, Nerdwriter1"
                      value={competitors}
                      onChange={(e) => setCompetitors(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-xs font-bold text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error}</p>}
               </div>
            </div>
          )}

          {/* STEP 3 & 4 remain functionally the same as the user was happy with the research step */}
          {/* STEP 3: RESEARCHING */}
          {step === 3 && (
            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in-95">
               <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Search className="w-8 h-8 text-primary animate-pulse" />
                  </div>
               </div>
               <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Engaging Strategic Core</h3>
                  <p className="text-sm text-neutral-500 font-bold uppercase tracking-widest animate-pulse">{researchLabel}</p>
               </div>
            </div>
          )}

          {/* STEP 4: REVEAL */}
          {step === 4 && dna && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
               <div className="flex items-center gap-3 text-green-500">
                  <CheckCircle2 className="w-6 h-6" />
                  <h3 className="text-2xl font-black tracking-tightest">Channel DNA Synthesized</h3>
               </div>
               
               <div className="space-y-6">
                  <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10">
                     <label className="block text-[10px] uppercase tracking-[0.2em] text-primary font-black mb-3">Synthesized Niche Gap</label>
                     <p className="text-sm text-neutral-300 leading-relaxed font-medium italic">"{dna.niche}"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-black mb-2">Brand Voice</label>
                        <p className="text-[11px] text-neutral-400 font-medium">{dna.brand_voice}</p>
                     </div>
                     <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-black mb-2">Core Pillars</label>
                        <ul className="space-y-1">
                           {dna.key_pillars.map((p, i) => (
                             <li key={i} className="text-[11px] text-neutral-400 font-medium flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-primary" /> {p}
                             </li>
                           ))}
                        </ul>
                     </div>
                  </div>
               </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <footer className="px-10 py-8 border-t border-white/5 flex items-center justify-between bg-black/20">
           {step === 0 && <div />}
           {(step === 1 || step === 2) && (
              <button 
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-sm font-bold"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
           )}
           
           {step === 1 && (
              <button 
                onClick={() => setStep(2)}
                disabled={!name || !vision}
                className="ml-auto flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-black font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-20"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
           )}

           {step === 2 && (
              <button 
                onClick={startResearch}
                disabled={!audience || !competitors}
                className="ml-auto flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-20"
              >
                Trigger Strategic Scan <Sparkles className="w-4 h-4" />
              </button>
           )}

           {step === 4 && (
              <button 
                onClick={onFinalize}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-black font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                {editingChannel ? "Update Studio" : "Establish Studio"} <CheckCircle2 className="w-4 h-4" />
              </button>
           )}
        </footer>

      </div>
    </div>
  );
}
