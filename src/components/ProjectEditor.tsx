"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Send, PenTool, LayoutDashboard, History, Download, 
  ChevronRight, Bot, Sparkles, Radio, CheckCircle2,
  FileText, Layers, Video, PanelRight, PanelRightClose,
  ArrowLeft, Volume2, Music, AlertCircle, Menu, MoreVertical,
  Play, Loader2, CheckCircle, Clock
} from "lucide-react";
import { useAppContext, DraftCommit } from "@/context/AppContext";
import { NormalizedVideoAsset } from "@/types/assets";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { compileFCPXML } from "@/utils/exportEngine";
import { useRender } from "@/hooks/useRender";
import NicheExplorer from "./NicheExplorer";

const AVAILABLE_VOICES = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", desc: "Warm Storyteller" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", desc: "Clear Educator" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", desc: "Social Creator" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", desc: "Mature & Reassuring" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", desc: "Laid-Back Storyteller" },
];

export default function ProjectEditor({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { 
    projects, activeProject, setActiveProject,
    status, prompt, setPrompt,
    commits, selectedCommit, setSelectedCommit,
    logs, runAgent, fetchDrafts, fetchProjects,
    agentPanelCollapsed, setAgentPanelCollapsed,
    mobileSidebarOpen, setMobileSidebarOpen,
    pexelsAssets, updateDraftBundle
  } = useAppContext();

  const [localViewMode, setLocalViewMode] = useState<"script" | "assets">("script");
  const [assetCycleMap, setAssetCycleMap] = useState<Record<string, number>>({});
  const [isExporting, setIsExporting] = useState(false);
  
  // RENDER ENGINE
  const { renderVideo, isRendering, progress } = useRender();
  
  // VOICE STUDIO STATES
  const [selectedVoiceId, setSelectedVoiceId] = useState(AVAILABLE_VOICES[0].id);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set());

  // CINEMA MODE STATES
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [cinemaSceneIdx, setCinemaSceneIdx] = useState(0);
  const [cinemaClipIdx, setCinemaClipIdx] = useState(0);

  const getAudioDuration = (url: string): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.addEventListener("loadedmetadata", () => {
        resolve(audio.duration);
      });
      setTimeout(() => resolve(0), 5000);
      audio.onerror = () => resolve(0);
    });
  };

  const handleGenerateVoice = async (sceneText: string, sceneIdx: number, currentBundle: any) => {
    if (!selectedCommit?.id) return null;
    setGeneratingScenes(prev => new Set(prev).add(sceneIdx));
    try {
      const res = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sceneText, voiceId: selectedVoiceId })
      });
      const data = await res.json();
      if (data.audioUrl) {
        const duration = await getAudioDuration(data.audioUrl);
        if (currentBundle.scenes) {
          currentBundle.scenes[sceneIdx].audioUrl = data.audioUrl;
          currentBundle.scenes[sceneIdx].duration = duration;
          return currentBundle;
        }
      }
      return null;
    } catch (err) {
      console.error("Audio Gen Failed", err);
      throw err;
    } finally {
      setGeneratingScenes(prev => {
        const next = new Set(prev);
        next.delete(sceneIdx);
        return next;
      });
    }
  };

  const handleGenerateAllAudio = async () => {
    if (!selectedCommit?.production_bundle?.scenes || !selectedCommit.id) return;
    setIsGeneratingAll(true);
    setGenerationProgress(0);
    let runningBundle = JSON.parse(JSON.stringify(selectedCommit.production_bundle));
    const scenes = runningBundle.scenes || [];
    for (let i = 0; i < scenes.length; i++) {
        try {
            const updated = await handleGenerateVoice(scenes[i].narration, i, runningBundle);
            if (updated) {
                runningBundle = updated;
                await updateDraftBundle(selectedCommit.id, runningBundle);
            }
        } catch (e) {
            console.error(`LOG: [Batch] FAILED at scene ${i}`, e);
        }
        setGenerationProgress(((i + 1) / scenes.length) * 100);
    }
    setIsGeneratingAll(false);
  };

  const storyboardAssets = useMemo(() => {
    const mappings: Record<string, any> = {};
    const seenVideoIds = new Set<string | number>();
    if (!selectedCommit?.production_bundle?.scenes) return mappings;
    selectedCommit.production_bundle.scenes.forEach((scene, sIdx) => {
      scene.searchQueries.forEach((query, qIdx) => {
        const results = pexelsAssets[query];
        if (results && results.length > 0) {
          const skipCount = assetCycleMap[query] || 0;
          let uniqueVideo = results.find(v => !seenVideoIds.has(v.id));
          if (!uniqueVideo) {
            const fallbackIdx = (sIdx + qIdx + skipCount) % results.length;
            uniqueVideo = results[fallbackIdx];
          } else if (skipCount > 0) {
            const matches = results.filter(v => !seenVideoIds.has(v.id));
            uniqueVideo = matches[skipCount % matches.length] || uniqueVideo;
          }
          seenVideoIds.add(uniqueVideo.id);
          mappings[`${sIdx}_${qIdx}`] = uniqueVideo;
        }
      });
    });
    return mappings;
  }, [selectedCommit, pexelsAssets, assetCycleMap]);

  const handleCinemaStep = useCallback(() => {
    if (!selectedCommit?.production_bundle?.scenes) return;
    const scenes = selectedCommit.production_bundle.scenes;
    if (cinemaSceneIdx < scenes.length - 1) {
      setCinemaSceneIdx(prev => prev + 1);
      setCinemaClipIdx(0);
    } else {
      setIsCinemaMode(false);
      setCinemaSceneIdx(0);
      setCinemaClipIdx(0);
    }
  }, [cinemaSceneIdx, selectedCommit]);

  // Fires on audio timeupdate — derives which clip should play based on story position
  const handleAudioTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    if (!audio.duration || !selectedCommit?.production_bundle?.scenes) return;
    const scene = selectedCommit.production_bundle.scenes[cinemaSceneIdx];
    if (!scene) return;
    // Count how many clips are loaded for this scene
    const totalClips = scene.searchQueries.reduce((count, _, qIdx) =>
      storyboardAssets[`${cinemaSceneIdx}_${qIdx}`] ? count + 1 : count, 0);
    if (totalClips <= 1) return;
    // Map audio position [0..1] → clip index
    const progress = audio.currentTime / audio.duration;
    const desiredClipIdx = Math.min(Math.floor(progress * totalClips), totalClips - 1);
    // Only update state when clip actually changes (avoid re-render spam)
    setCinemaClipIdx(prev => prev !== desiredClipIdx ? desiredClipIdx : prev);
  }, [cinemaSceneIdx, selectedCommit, storyboardAssets]);

  const currentCinemaScene = selectedCommit?.production_bundle?.scenes?.[cinemaSceneIdx];
  const currentCinemaVideo = currentCinemaScene
    ? (storyboardAssets[`${cinemaSceneIdx}_${cinemaClipIdx}`] || storyboardAssets[`${cinemaSceneIdx}_0`])
    : null;

  // Count total loaded clips for current scene (for HUD display)
  const totalCinemaClipsForScene = currentCinemaScene
    ? currentCinemaScene.searchQueries.reduce((count, _, qIdx) =>
        storyboardAssets[`${cinemaSceneIdx}_${qIdx}`] ? count + 1 : count, 0)
    : 0;

  const exportProject = async () => {
    if (!selectedCommit || !activeProject) return;
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const meta = selectedCommit.yt_metadata;
      let metadataText = "YOUTUBE METADATA\n================\n\n";
      metadataText += `TITLE: ${meta?.title || ''}\n\n`;
      metadataText += `DESCRIPTION:\n${meta?.description || ''}\n\n`;
      metadataText += `TAGS: ${meta?.tags?.join(', ') || ''}\n`;
      zip.file("1_YouTube_Metadata.txt", metadataText);

      const scenes = selectedCommit.production_bundle?.scenes || [];
      let scriptText = `${activeProject.name.toUpperCase()} - FINAL SCRIPT\n===================================\n\n`;
      scenes.forEach((scene, idx) => {
        scriptText += `\n[ SCENE ${idx + 1}: ${scene.title.toUpperCase()} ]\n`;
        scriptText += `VISUAL CUE: ${scene.visualCue}\n`;
        scriptText += `NARRATION:\n${scene.narration}\n`;
        scriptText += `-----------------------------------\n`;
      });
      zip.file("2_Master_Script.txt", scriptText);

      const audioFolder = zip.folder("3_Voiceovers");
      if (audioFolder) {
        await Promise.all(scenes.map(async (scene, idx) => {
          if (scene.audioUrl) {
            try {
              const res = await fetch(scene.audioUrl);
              const blob = await res.blob();
              audioFolder.file(`Scene_${idx + 1}_V1.mp3`, blob);
            } catch (err) { console.error(err); }
          }
        }));
      }

      const videoFolder = zip.folder("4_Broll");
      if (videoFolder) {
        await Promise.all(scenes.map(async (scene, idx) => {
          const uniqueVideo = storyboardAssets[`${idx}_0`];
          if (uniqueVideo?.videoUrl) {
            try {
              const res = await fetch(uniqueVideo.videoUrl);
              const blob = await res.blob();
              videoFolder.file(`Video_${idx + 1}_V1.mp4`, blob);
            } catch (err) { console.error(err); }
          }
        }));
      }

      const xmlOutput = compileFCPXML(activeProject.name, scenes, storyboardAssets);
      zip.file(`${activeProject.name.replace(/\s+/g, '_')}_Timeline.xml`, xmlOutput);

      const content = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 5 } });
      const safeName = activeProject.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeName}_Export.zip`;
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    } catch (e) { console.error("Export Failed", e); alert("Failed to compile ZIP export."); } finally { setIsExporting(false); }
  };

  const reBundleAssets = async () => {
    if (!selectedCommit?.id) return;
    try {
      setPrompt("Re-bundling production assets for better storyboard alignment...");
      runAgent("Re-align the production bundle. Ensure the storyboard scenes strictly map only to narrator words and visuals are diverse.", projectId);
    } catch (err) {
      console.error(err);
    }
  };

  const VideoPreview = ({ video, query, isCompact = false, onCycle }: { video: NormalizedVideoAsset, query: string, isCompact?: boolean, onCycle?: (q: string) => void }) => {
    const [isHovered, setIsHovered] = useState(false);
    if (!video) return null;
    return (
      <div 
        className={`group relative aspect-video rounded-[1.5rem] bg-neutral-900 border border-white/5 overflow-hidden shadow-2xl transition-all hover:scale-[1.02] ${isCompact ? 'w-[180px] shrink-0' : 'w-full'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img src={video.thumbnail} alt={query} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isHovered ? 'opacity-0' : 'opacity-60'}`} />
        {isHovered && video.videoUrl && (
          <video src={video.videoUrl} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-500" />
        )}
        <div className={`absolute inset-x-0 bottom-0 ${isCompact ? 'p-3' : 'p-4'} bg-gradient-to-t from-black/80 to-transparent`}>
           <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5 text-left">Stock Match</p>
           <p className={`text-white truncate text-left font-bold ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>{query}</p>
        </div>
        <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[7px] font-black uppercase tracking-tighter text-white/70`}>
           {video.source}
        </div>
        <div className={`absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
           {isCompact && (
             <button 
               onClick={(e) => { e.stopPropagation(); onCycle?.(query); }}
               className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 hover:bg-primary hover:text-white transition-all shadow-xl"
             >
                <Radio className="w-2.5 h-2.5 animate-pulse" />
             </button>
           )}
           <div className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10">
              <Video className="w-2.5 h-2.5 text-primary" />
           </div>
        </div>
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) runAgent(prompt, projectId);
  };

  const [loadTimeout, setLoadTimeout] = useState(false);
  useEffect(() => {
    setPrompt("");
    setLoadTimeout(false);
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      setActiveProject(proj);
      fetchDrafts(projectId);
    } else {
      const timer = setTimeout(() => { if (!activeProject) setLoadTimeout(true); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [projectId, projects, setActiveProject, fetchDrafts, setPrompt, activeProject]);

  if (loadTimeout && !activeProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#050505] p-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Workspace Stalled</h2>
        <button onClick={() => { setLoadTimeout(false); fetchProjects(); fetchDrafts(projectId); }} className="px-8 py-3 rounded-xl bg-white text-black font-black text-xs hover:scale-105 transition-all">Retry</button>
      </div>
    );
  }

  if (!activeProject) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#050505] p-20 animate-pulse">
       <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
       <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest">Hydrating Studio...</p>
    </div>
  );

  const isProductionReady = selectedCommit?.production_bundle?.scenes?.every(s => s.audioUrl);

  return (
    <div className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
      
      {/* 1. Top Navigation Bar */}
      <header className="h-20 px-4 md:px-8 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0 z-40">
        <div className="flex items-center gap-2 md:gap-6 min-w-0">
          <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} className="lg:hidden p-2 rounded-xl bg-white/5 text-neutral-400 hover:text-white border border-white/5"><Menu className="w-4 h-4" /></button>
          <button onClick={() => router.back()} className="hidden md:flex p-2 rounded-xl bg-white/5 text-neutral-400 hover:text-white border border-white/5 hover:border-white/10"><ArrowLeft className="w-4 h-4" /></button>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] whitespace-nowrap">Project Workspace</span>
              <div className={`w-2 h-2 rounded-full shrink-0 ${status === "IDLE" ? "bg-neutral-600" : "bg-primary animate-pulse"}`} />
            </div>
            <h1 className="text-sm md:text-xl font-black text-white tracking-tight truncate max-w-[120px] md:max-w-[400px] lg:max-w-none">{activeProject.name}</h1>
          </div>
          <div className="hidden sm:block h-8 w-px bg-white/10 mx-2" />
          <div className="flex items-center gap-1 md:gap-2 bg-neutral-900/50 p-1.5 rounded-2xl border border-white/5">
            <button onClick={() => setLocalViewMode("script")} className={`flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-xl text-[10px] md:text-xs font-bold transition-all ${localViewMode === "script" ? "bg-white/10 text-white shadow-lg" : "text-neutral-500 hover:text-white"}`}><FileText className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Script</span></button>
            <button onClick={() => setLocalViewMode("assets")} className={`flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-xl text-[10px] md:text-xs font-bold transition-all ${localViewMode === "assets" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-neutral-500 hover:text-white"}`}><Layers className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Assets</span></button>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0 px-2 lg:px-0">
          <button 
             onClick={reBundleAssets} 
             title="Refine Storyboard Alignment"
             className="hidden lg:flex p-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:text-primary transition-all"
          >
            <Bot className="w-4 h-4" />
          </button>
          <button onClick={() => setAgentPanelCollapsed(!agentPanelCollapsed)} className={`hidden md:flex p-2 rounded-xl transition-all ${agentPanelCollapsed ? "bg-white/10 text-white" : "bg-white/5 text-neutral-400 hover:text-white"}`}>{agentPanelCollapsed ? <PanelRight className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}</button>
          
          <button 
             onClick={() => renderVideo(activeProject.name, selectedCommit?.production_bundle, storyboardAssets)} 
             disabled={isRendering || !isProductionReady} 
             className="hidden lg:flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white transition-all text-[10px] md:text-xs font-bold disabled:opacity-50"
          >
             {isRendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
             Render MP4
          </button>
          
          <button onClick={exportProject} disabled={isExporting || !selectedCommit} className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[10px] md:text-xs font-bold disabled:opacity-50"><Download className={`w-4 h-4 ${isExporting ? 'animate-bounce text-primary' : ''}`} /> <span className="hidden sm:inline">{isExporting ? 'Zipping...' : 'Export ZIP'}</span></button>
          <button 
            disabled={!isProductionReady}
            onClick={() => { setIsCinemaMode(true); setCinemaSceneIdx(0); }} 
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black text-xs transition-all shadow-lg 
              ${isProductionReady 
                ? "bg-primary text-white hover:scale-105 active:scale-95 shadow-primary/20" 
                : "bg-white/5 text-neutral-600 cursor-not-allowed border border-white/5"}`}
          >
            {isProductionReady ? <><Sparkles className="w-4 h-4" /> Cinema Preview</> : <><Clock className="w-4 h-4" /> Produce to Preview</>}
          </button>
        </div>
      </header>

      {/* 2. Main Editing Surface */}
      <div className="flex-1 overflow-hidden flex relative">
        {isCinemaMode && currentCinemaScene && (
          <div className="fixed inset-0 z-[10000] bg-neutral-950 flex flex-col items-center justify-center p-6 md:p-12 animate-in fade-in zoom-in duration-500 overflow-y-auto custom-scrollbar">
            <div className="absolute top-6 md:top-8 right-6 md:right-8 flex gap-4 z-[10001]">
              <button 
                onClick={() => setIsCinemaMode(false)} 
                className="p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-xl border border-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full max-w-5xl aspect-video relative rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.3)] bg-black border border-white/5">
              {currentCinemaVideo ? (
                <video
                  key={`cinema-vid-${cinemaSceneIdx}-${cinemaClipIdx}-${currentCinemaVideo.videoUrl}`}
                  src={currentCinemaVideo.videoUrl}
                  autoPlay
                  loop
                  muted
                  className="w-full h-full object-cover animate-in fade-in duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-neutral-600 bg-neutral-900 animate-pulse">
                  <Video className="w-12 h-12" />
                  <p className="text-xs font-black uppercase tracking-widest">Hydrating Cinema Frame...</p>
                </div>
              )}
              <div className="absolute top-8 left-8 flex items-center gap-3">
                 <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black text-primary uppercase tracking-widest">Scene {cinemaSceneIdx + 1} / {selectedCommit?.production_bundle?.scenes?.length || 0}</div>
                 {totalCinemaClipsForScene > 1 && (
                   <div className="px-3 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black text-white/60 uppercase tracking-widest">Clip {cinemaClipIdx + 1} / {totalCinemaClipsForScene}</div>
                 )}
              </div>
            </div>
            <div className="max-w-3xl mx-auto py-8 lg:py-12 max-h-[30vh] overflow-y-auto custom-scrollbar">
               <p className="font-script text-xl md:text-[32px] leading-relaxed text-white text-center italic animate-in slide-in-from-bottom-4 duration-1000">"{currentCinemaScene.narration}"</p>
               {currentCinemaScene.audioUrl && ( 
                 <audio 
                    autoPlay 
                    key={`cinema-aud-${currentCinemaScene.audioUrl}`} 
                    src={currentCinemaScene.audioUrl} 
                    onEnded={handleCinemaStep}
                    onTimeUpdate={handleAudioTimeUpdate}
                    className="hidden" 
                 /> 
               )}
            </div>
            <div className="mt-8 flex gap-3">
               {selectedCommit?.production_bundle?.scenes?.map((_, i) => ( 
                 <div key={`cinema-dot-${i}`} className={`h-1.5 rounded-full transition-all duration-500 ${i === cinemaSceneIdx ? "w-12 bg-primary" : "w-1.5 bg-white/10"}`} /> 
               ))}
            </div>
          </div>
        )}
        
        {/* Workspace Surface (Studio Dusk) */}
        <div className="flex-1 overflow-y-auto bg-[#080808] custom-scrollbar p-6 md:p-12 lg:p-20 relative">
          <div className="max-w-4xl mx-auto space-y-20">
            {localViewMode === "script" ? (
               /* SCRIPT VIEW */
               <div className="mx-auto max-w-[850px] bg-white shadow-[0_25px_80px_-20px_rgba(0,0,0,0.15)] min-h-[1100px] p-12 md:p-20 relative rounded-sm text-black animate-in fade-in slide-in-from-bottom-4 duration-700 text-left">
                  <div className="absolute top-20 left-0 right-0 flex justify-center opacity-[0.03] select-none pointer-events-none"><span className="text-[120px] font-black tracking-[0.2em] rotate-[-25deg] uppercase italic truncate">Production Draft</span></div>
                  {selectedCommit ? (
                    <div className="relative z-10 space-y-12">
                        <header className="border-b-2 border-black pb-8 space-y-6">
                           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                              <div className="text-left">
                                 <h2 className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-neutral-400 text-left">Production Workspace</h2>
                                 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                    <div className="flex flex-col gap-1.5 text-left">
                                       <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest pl-1">Voice Persona</label>
                                       <select value={selectedVoiceId} onChange={(e) => setSelectedVoiceId(e.target.value)} className="bg-white border-2 border-black rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-all cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none outline-none">
                                          {AVAILABLE_VOICES.map(v => ( <option key={`voice-${v.id}`} value={v.id}>{v.name} - {v.desc}</option> ))}
                                       </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5 pt-4">
                                       <button 
                                          onClick={handleGenerateAllAudio} 
                                          disabled={isGeneratingAll || !selectedCommit} 
                                          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl border-2 border-black font-black text-[10px] uppercase tracking-widest transition-all 
                                            ${isGeneratingAll 
                                              ? 'bg-neutral-100 text-neutral-400 border-neutral-300' 
                                              : 'bg-primary text-white hover:scale-105 active:scale-95 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'}`}
                                       >
                                          {isGeneratingAll ? ( <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Batching {Math.round(generationProgress)}%</> ) : ( <><Volume2 className="w-3.5 h-3.5" /> Batch Produce All</> )}
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           </div>
                           <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm space-y-3 text-left">
                              <div className="flex items-center gap-2 text-blue-900 text-left"><Sparkles className="w-3.5 h-3.5" /><span className="text-[10px] font-black uppercase tracking-widest">Strategic Mission</span></div>
                              <p className="font-script text-[14px] leading-relaxed text-blue-900/80 italic text-left">{activeProject.original_idea}</p>
                           </div>
                        </header>
                        <div className="space-y-20 pb-20">
                           {selectedCommit.production_bundle?.scenes?.map((scene, idx) => (
                              <div key={`scene-${idx}`} className="group relative grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                 {idx !== selectedCommit.production_bundle!.scenes!.length - 1 && ( <div className="absolute left-6 top-16 bottom-[-40px] w-px bg-neutral-100 hidden lg:block" /> )}
                                 <div className="space-y-6 text-left">
                                    <div className="flex items-center justify-between">
                                       <div className="flex items-center gap-4 text-left">
                                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[10px] font-black shadow-lg transition-colors ${scene.audioUrl ? "bg-primary text-white" : "bg-neutral-900 text-white"}`}>SC {idx + 1}</div>
                                          <div className="text-left">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                              {scene.title}
                                              {scene.audioUrl && <CheckCircle className="w-3 h-3 text-green-500" />}
                                            </h3>
                                            <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">NARRATION & FLOW</p>
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-2">
                                          {scene.audioUrl ? ( 
                                            <div className="flex items-center gap-2">
                                              <audio controls src={scene.audioUrl} className="h-8 w-40 opacity-70 hover:opacity-100 transition-opacity invert" />
                                              <button 
                                                disabled={generatingScenes.has(idx)}
                                                onClick={async () => {
                                                  const rb = JSON.parse(JSON.stringify(selectedCommit.production_bundle));
                                                  await handleGenerateVoice(scene.narration, idx, rb);
                                                  await updateDraftBundle(selectedCommit.id!, rb);
                                                }}
                                                className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-all"
                                                title="Regenerate Voice"
                                              >
                                                {generatingScenes.has(idx) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                                              </button>
                                            </div>
                                          ) : (
                                            <button 
                                              disabled={generatingScenes.has(idx)}
                                              onClick={async () => {
                                                const rb = JSON.parse(JSON.stringify(selectedCommit.production_bundle));
                                                await handleGenerateVoice(scene.narration, idx, rb);
                                                await updateDraftBundle(selectedCommit.id!, rb);
                                              }} 
                                              className="px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-2"
                                            >
                                              {generatingScenes.has(idx) ? <><Loader2 className="w-3 h-3 animate-spin" /> Producing</> : <><Volume2 className="w-3 h-3" /> Generate Voice</>}
                                            </button>
                                          )}
                                       </div>
                                    </div>
                                    <div className="p-8 rounded-[2.5rem] bg-white shadow-xl border border-neutral-100 hover:border-primary/20 transition-all duration-500 text-left">
                                       <p className="font-script text-[16px] leading-[2.2] text-neutral-800 text-left whitespace-pre-wrap">"{scene.narration}"</p>
                                    </div>
                                 </div>
                                 <div className="space-y-8 text-left lg:border-l lg:border-neutral-100 lg:pl-12">
                                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500"><Video className="w-4 h-4" /></div><div className="text-left"><h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Visual Direction</h3><p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest text-left">PRODUCTION CUES</p></div></div>
                                    <div className="space-y-4">
                                       <div className="relative p-7 rounded-[2rem] bg-neutral-50 text-neutral-600 text-left border border-neutral-100 shadow-sm overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-orange-400" /><p className="text-[11px] italic font-medium leading-[1.8] text-left">{scene.visualCue}</p></div>
                                       <div>
                                         <div className="flex items-center justify-between mb-2">
                                           <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">B-Roll — {scene.searchQueries.length} clips</span>
                                           <span className="text-[8px] font-black uppercase tracking-widest text-primary">Hover to Play ▶</span>
                                         </div>
                                         <div className="flex gap-2 overflow-x-auto pb-2" style={{scrollbarWidth: "thin", scrollbarColor: "rgba(0,0,0,0.15) transparent"}}>
                                           {scene.searchQueries.map((query, qIdx) => {
                                              const v = storyboardAssets[`${idx}_${qIdx}`];
                                              return (
                                                <div key={`storyboard-${idx}-${qIdx}`} className="shrink-0">
                                                  {v ? (
                                                    <VideoPreview video={v} query={query} isCompact={true} onCycle={(q) => setAssetCycleMap(p => ({ ...p, [q]: (p[q] || 0) + 1 }))} />
                                                  ) : (
                                                    <div className="w-[140px] aspect-video rounded-2xl bg-neutral-100 border border-dashed border-neutral-200 flex flex-col items-center justify-center gap-1.5 animate-pulse shrink-0">
                                                      <Sparkles className="w-3 h-3 text-neutral-300" />
                                                      <p className="text-[7px] font-black text-neutral-400 uppercase tracking-widest text-center px-2 leading-tight">{query.slice(0, 28)}</p>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                           })}
                                         </div>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                    </div>
                   ) : (
                       <div className="h-[600px] flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700 w-full">
                        {activeProject.niche_opportunities && activeProject.niche_opportunities.length > 0 ? (
                          <div className="w-full">
                            <NicheExplorer 
                              opportunities={activeProject.niche_opportunities} 
                              onSelect={(opp) => {
                                setPrompt(opp.niche);
                                runAgent(opp.niche, projectId);
                              }}
                            />
                            <div className="mt-12 flex justify-center">
                              <button 
                                onClick={() => { const idea = activeProject.original_idea || activeProject.name; setPrompt(idea); runAgent(idea, projectId); }} 
                                className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em] hover:text-white transition-colors"
                              >
                                Skip & use original idea
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="relative">
                              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{animationDuration: "2.5s"}} />
                              <div className="relative w-24 h-24 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                                <Sparkles className="w-10 h-10 text-primary" />
                              </div>
                            </div>
                            <div className="text-center space-y-3">
                              <h2 className="text-2xl font-black text-neutral-800 tracking-tight">Studio Ready</h2>
                              <p className="text-neutral-500 text-sm max-w-xs leading-relaxed">
                                {activeProject.original_idea || "Your idea is loaded. Trigger the pipeline to generate your first production draft."}
                              </p>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                              <button onClick={() => { const idea = activeProject.original_idea || activeProject.name; setPrompt(idea); runAgent(idea, projectId); }} disabled={status !== "IDLE" && status !== "DONE"} className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-black text-white font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-50 border-2 border-black">
                                {(status !== "IDLE" && status !== "DONE") ? (<><Loader2 className="w-5 h-5 animate-spin" /> Pipeline Running...</>) : (<><Play className="w-5 h-5" /> Initiate Production Pipeline</>)}
                              </button>
                              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Outliner to Drafter to Critic to Visuals to Bundle</p>
                            </div>
                          </>
                        )}
                      </div>
                   )}
               </div>
            ) : (
               /* ASSETS VIEW */
               <div className="mx-auto max-w-[1000px] space-y-12 animate-in fade-in slide-in-from-right-8 duration-700 pb-24 text-left">
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 text-left"> <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Bot className="w-5 h-5" /></div> <div className="text-left"><h2 className="text-sm font-black uppercase tracking-widest text-white">Compliance & SEO</h2><p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Optimized for Viral Discovery</p></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-4 text-left shadow-2xl transition-all"> <span className="text-[10px] font-black text-primary uppercase tracking-widest">Title Strategy</span> <h3 className="text-xl font-black text-neutral-100 leading-tight">{selectedCommit?.yt_metadata?.title || "Drafting title..."}</h3></div>
                       <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-4 overflow-hidden text-left shadow-2xl transition-all"> <span className="text-[10px] font-black text-primary uppercase tracking-widest">Description</span> <p className="text-xs text-neutral-400 leading-relaxed line-clamp-4 font-medium italic">{selectedCommit?.yt_metadata?.description || "Drafting summary..."}</p></div>
                    </div>
                  </section>
                  <section className="space-y-6">
                    <div className="flex items-center justify-between text-left"> <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500"><Video className="w-5 h-5" /></div><div className="text-left"><h2 className="text-sm font-black uppercase tracking-widest text-white">Visual Assets</h2><p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Pexels Gallery</p></div></div> <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-neutral-400 flex items-center gap-2"><Bot className="w-3 h-3 text-primary" /> HYDRATED BY AI</div></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                       {selectedCommit?.production_bundle?.brollSearchQueries?.map((q, idx) => ( pexelsAssets[q] ? ( <VideoPreview key={`broll-${idx}`} video={pexelsAssets[q][0]} query={q} /> ) : ( <div key={`search-${idx}`} className="aspect-video rounded-3xl bg-white/[0.02] border border-white/5 border-dashed flex flex-col items-center justify-center gap-3 animate-pulse"> <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><Sparkles className="w-4 h-4 text-neutral-600" /></div> <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">Searching...</p></div> ) ))}
                    </div>
                  </section>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
                     <section className="p-10 rounded-[2.5rem] bg-black border border-white/10 shadow-2xl space-y-6 text-left"> 
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center text-neutral-300">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <h2 className="text-sm font-black uppercase tracking-widest text-white">Narration Script</h2>
                            <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Final Teleprompter Feed</p>
                          </div>
                        </div> 
                        <p className="font-script text-[15px] leading-[2.4] text-neutral-300 italic whitespace-pre-wrap text-left">
                          {(selectedCommit?.production_bundle as any)?.cleanNarratorScript || 
                            selectedCommit?.content?.replace(/\[.*?\]/g, '').replace(/\(.*\)/g, '').replace(/SFX:.*?\n/g, '').trim()}
                        </p>
                     </section>
                     <div className="space-y-8 text-left">
                        <section className="p-10 rounded-[2.5rem] bg-neutral-900 border border-white/5 shadow-2xl space-y-6 text-left"> <div className="flex items-center gap-3 text-left"><div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500"><Volume2 className="w-5 h-5" /></div><div className="text-left"><h2 className="text-sm font-black uppercase tracking-widest text-white">Audio & FX</h2><p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest text-left">PRODUCTION SFX</p></div></div> <div className="space-y-6 text-left"> <div><h3 className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Sound Effects</h3><div className="flex flex-wrap gap-2 text-left"> {(selectedCommit?.production_bundle as any)?.sfxChecklist?.map((s: string, i: number) => ( <span key={`sfx-${i}`} className="px-3 py-1.5 rounded-full bg-white/5 text-[10px] font-bold text-neutral-400 border border-white/5">{s}</span> )) || <span className="text-neutral-600 italic">Pending...</span>} </div></div> <div><h3 className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">VFX Cues</h3><div className="space-y-2 text-left"> {(selectedCommit?.production_bundle as any)?.vfxRequirements?.map((v: string, i: number) => ( <div key={`vfx-${i}`} className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /><p className="text-[10px] font-medium text-neutral-400">{v}</p></div> )) || <p className="text-neutral-600 italic">Pending...</p>} </div></div> </div></section>
                        <section className="p-8 rounded-[2rem] bg-primary/10 border border-primary/20 space-y-4 shadow-2xl text-left"> <div className="flex items-center gap-3 text-left"><Music className="w-4 h-4 text-primary" /><h2 className="text-[10px] font-black uppercase tracking-widest text-primary text-left">Music Mood</h2></div><p className="text-[11px] leading-relaxed text-neutral-300 font-medium text-left">{(selectedCommit?.production_bundle as any)?.musicInspiration || "Consulting music supervisor..."}</p></section>
                     </div>
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* 3. Agent Sidebar */}
        {!agentPanelCollapsed && (
          <aside className="w-[400px] border-l border-white/5 flex flex-col bg-neutral-900/20 backdrop-blur-sm shrink-0 animate-in slide-in-from-right-8 duration-300 relative z-10">
            <div className="p-6 border-b border-white/5 bg-black/40 text-left">
               <div className="flex items-center justify-between mb-4 text-left">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 text-left">Viral Potential</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${selectedCommit?.retentionScore && selectedCommit.retentionScore >= 7 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                    {selectedCommit?.retentionScore ? (selectedCommit.retentionScore >= 8 ? 'Viral Alpha' : 'Optimized') : 'Predicting...'}
                  </span>
               </div>
               
               <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                      <span>Retention Score</span>
                      <span>{selectedCommit?.retentionScore || 0}/10</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${selectedCommit?.retentionScore && selectedCommit.retentionScore >= 7 ? 'bg-green-500' : 'bg-primary'}`} 
                        style={{ width: `${(selectedCommit?.retentionScore || 0) * 10}%` }} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <p className="text-[7px] font-black text-neutral-500 uppercase tracking-widest">Hook Strength</p>
                      <p className={`text-xs font-black ${selectedCommit?.retentionScore && selectedCommit.retentionScore >= 6 ? 'text-white' : 'text-neutral-600'}`}>
                        {selectedCommit?.retentionScore ? (selectedCommit.retentionScore >= 8 ? 'ELITE' : 'STRONG') : '...'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <p className="text-[7px] font-black text-neutral-500 uppercase tracking-widest">Conflict Density</p>
                      <p className={`text-xs font-black ${selectedCommit?.retentionScore && selectedCommit.retentionScore >= 7 ? 'text-white' : 'text-neutral-600'}`}>
                        {selectedCommit?.retentionScore ? (selectedCommit.retentionScore >= 7 ? 'HIGH' : 'MEDIUM') : '...'}
                      </p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="p-6 border-b border-white/5 text-left">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4 flex items-center justify-between text-left"> Live Intelligence <span className="flex items-center gap-1.5 text-primary"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /> Live</span> </h3>
              <div className="space-y-3 h-64 overflow-y-auto custom-scrollbar-thin text-xs pr-2 text-left">
                 {logs.length === 0 ? (
                   <div className="p-4 rounded-2xl bg-white/5 border border-dashed border-white/10 text-neutral-500 text-center"> <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Agency Standby</p> <p className="text-[9px] mt-2 italic">Confirm the brief to begin trace.</p> </div>
                 ) : (
                   <div className="space-y-3">
                     {logs.map((log, i) => (
                       <div key={`log-${i}`} className="flex gap-2 group/log animate-in fade-in slide-in-from-left-1 duration-300">
                         <span className="text-primary font-bold shrink-0">â†’</span>
                         <p className="text-neutral-400 leading-relaxed font-mono"> <span className="text-neutral-600">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span> {log.replace('User:', '').replace('System:', '').replace('Strategist:', '').replace('Director:', '').replace('Critic:', '')} </p>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
            </div>

            <div className="p-6 flex-1 overflow-hidden flex flex-col text-left">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4 text-left">Version History</h3>
               <div className="flex-1 overflow-y-auto space-y-2 pr-2 text-left">
                  {commits.map((c, i) => (
                    <button key={c.id || `cmt-${i}`} onClick={() => setSelectedCommit(c)} className={`w-full p-4 rounded-2xl border transition-all text-left group ${selectedCommit?.id === c.id ? "bg-primary/10 border-primary/20 shadow-lg shadow-primary/5" : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"}`}>
                       <div className="flex items-center justify-between mb-2"> <span className="text-[9px] font-black text-primary uppercase tracking-widest">Draft v.{commits.length - i}</span> <CheckCircle2 className={`w-3.5 h-3.5 ${selectedCommit?.id === c.id ? "text-primary" : "text-neutral-800"}`} /> </div>
                       <p className="text-[11px] text-neutral-400 font-medium leading-relaxed line-clamp-2 italic">"{c.content.slice(0, 80)}..."</p>
                    </button>
                  ))}
               </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 border-t border-white/5 bg-black/20 text-left">
              <div className="relative text-left">
                 <textarea placeholder="Refactor script or change visual style..." className="w-full bg-[#0c0c0c] border border-white/5 rounded-2xl px-5 py-4 text-sm outline-none focus:border-primary transition-all resize-none h-24 custom-scrollbar-thin text-white text-left font-medium" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }} />
                 <button type="submit" disabled={status !== "IDLE" && status !== "DONE"} className="absolute bottom-4 right-4 p-2.5 bg-primary rounded-xl hover:scale-105 transition-all shadow-xl shadow-primary/30 disabled:opacity-20 translate-y-0"> <Send className="w-4 h-4 text-white" /> </button>
              </div>
            </form>
          </aside>
        )}

      </div>

      {/* Render Engine HUD Modal */}
      {isRendering && progress && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
           <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[2rem] w-full max-w-md shadow-[0_0_100px_rgba(249,115,22,0.15)] flex flex-col items-center text-center space-y-6">
             <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center relative">
               <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping" />
               <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
             </div>
             <div>
                <h3 className="text-white font-black text-lg">Studio Render Engine</h3>
                <p className="text-neutral-400 text-xs mt-2 italic">FFmpeg.wasm is running locally in your browser.</p>
             </div>
             <div className="w-full space-y-2">
               <div className="flex justify-between text-xs font-black uppercase tracking-widest text-neutral-300">
                  <span>{progress.message}</span>
                  <span className="text-orange-500">{Math.round(progress.percent)}%</span>
               </div>
               <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${progress.percent}%` }} />
               </div>
             </div>
           </div>
         </div>
      )}
    </div>
  );
}

