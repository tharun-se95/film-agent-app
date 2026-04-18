"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { 
  Send, PenTool, LayoutDashboard, History, Download, 
  ChevronRight, Bot, Sparkles, Radio, CheckCircle2,
  FileText, Layers, Video, PanelRight, PanelRightClose,
  ArrowLeft, Volume2, Music, AlertCircle, Menu, MoreVertical,
  Play, Pause, SkipBack, Loader2, CheckCircle, Clock, Zap, Search, Target, Shield, Package, Globe
} from "lucide-react";

const PIPELINE_NODES = [
  { id: "NICHE_ARCHITECT", label: "Strategy", icon: Target },
  { id: "INTEL", label: "Intel", icon: Search },
  { id: "HOOKS", label: "Hooks", icon: Zap },
  { id: "RETENTION", label: "Reviews", icon: Shield },
  { id: "VISUALS", label: "Visuals", icon: Video },
  { id: "PRODUCTION", label: "Bundle", icon: Package },
  { id: "SEO", label: "SEO", icon: Globe }
];

function MasterTimeline({ 
  scenes, 
  storyboardAssets, 
  zoomLevel, 
  selectedIndex, 
  currentTime,
  isPlaying,
  onSelect,
  onSeek,
  setZoomLevel
}: { 
  scenes: any[], 
  storyboardAssets: any, 
  zoomLevel: number, 
  selectedIndex: number,
  currentTime: number,
  isPlaying: boolean,
  onSelect: (idx: number, startTime: number) => void,
  onSeek: (time: number) => void,
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>
}) {
  const pixelsPerSecond = zoomLevel;
  
  const sceneStarts = useMemo(() => {
    let current = 0;
    return scenes.map(s => {
      const start = current;
      const duration = s.duration || Math.max(3, s.narration.split(' ').length / 2.5);
      current += duration;
      return { start, duration };
    });
  }, [scenes]);

  const totalDuration = sceneStarts.length > 0
    ? sceneStarts[sceneStarts.length - 1].start + sceneStarts[sceneStarts.length - 1].duration
    : 0;

  // BUG FIX 1: Use imperative addEventListener with passive:false so Ctrl+Scroll zoom works
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -10 : 10;
        setZoomLevel(prev => Math.max(10, Math.min(200, prev + delta)));
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [setZoomLevel]);

  const LANE_W = 56; // px width of the fixed lane label column
  const handleInnerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const scrollLeft = scrollContainerRef.current?.scrollLeft || 0;
    const rect = scrollContainerRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) + scrollLeft;
    const newTime = x / pixelsPerSecond;
    if (newTime < 0) return;
    onSeek(Math.max(0, Math.min(newTime, totalDuration)));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050505] border-t border-white/5 overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Sidebar: Lane Labels */}
        <div 
          className="flex-none flex flex-col border-r border-white/10 bg-[#080808] z-40"
          style={{ width: LANE_W }}
        >
          {/* TC Header */}
          <div className="h-8 border-b border-white/5 flex items-center justify-center bg-black/40">
            <span className="text-[6px] font-black text-neutral-500 tracking-tighter">TIME</span>
          </div>
          {/* Visual Track Label */}
          <div className="h-24 border-b border-white/5 flex items-center justify-center bg-[#0a0a0a]">
            <span className="text-[7px] font-black text-neutral-600 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>VISUAL</span>
          </div>
          {/* Audio Track Label */}
          <div className="h-16 flex items-center justify-center bg-[#0a0a0a]">
            <span className="text-[7px] font-black text-neutral-600 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>AUDIO</span>
          </div>
        </div>

        {/* Scrollable Timeline Area */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar-thin relative bg-black/20"
        >
          <div 
            className="relative h-full cursor-crosshair"
            style={{ width: Math.max(totalDuration * pixelsPerSecond, 400) }}
            onClick={handleInnerClick}
          >
            {/* Time Ruler */}
            <div className="h-8 border-b border-white/5 flex bg-black/60 relative">
              {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
                <div 
                  key={`time-${i}`} 
                  className="shrink-0 border-l border-white/10 flex flex-col justify-end pb-1 pl-1"
                  style={{ width: pixelsPerSecond }}
                >
                  {(pixelsPerSecond >= 20 || i % 5 === 0) && (
                    <span className="text-[7px] font-black text-neutral-500">{i}s</span>
                  )}
                </div>
              ))}
            </div>

            {/* VISUAL TRACK */}
            <div className="absolute top-8 left-0 right-0 h-24">
              {scenes.map((scene, sceneIdx) => {
                const { start, duration } = sceneStarts[sceneIdx];
                const isSelected = selectedIndex === sceneIdx;
                const clipCount = scene.searchQueries.length;
                const clipDuration = duration / Math.max(1, clipCount);
                return (
                  <div 
                    key={`track-scene-${sceneIdx}`}
                    onClick={(e) => { e.stopPropagation(); onSelect(sceneIdx, start); }}
                    className={`absolute top-0 h-full cursor-pointer transition-all ${isSelected ? 'z-10' : ''}`}
                    style={{ 
                      left: start * pixelsPerSecond,
                      width: duration * pixelsPerSecond 
                    }}
                  >
                    {/* Scene separator line */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[2px] z-10 ${isSelected ? 'bg-primary' : 'bg-white/15'}`} />
                    {/* Scene number badge */}
                    <div className={`absolute top-1 left-2 z-20 px-1 py-0.5 rounded text-[6px] font-black leading-none pointer-events-none select-none ${
                      isSelected ? 'bg-primary text-white shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-black/70 text-neutral-500'
                    }`}>
                      S{sceneIdx + 1}
                    </div>
                    <div className="flex h-full w-full">
                      {scene.searchQueries.map((query: string, clipIdx: number) => {
                        const asset = storyboardAssets[`${sceneIdx}_${clipIdx}`];
                        return (
                          <div 
                            key={`clip-${sceneIdx}-${clipIdx}`}
                            className={`relative flex-1 h-full border border-white/5 overflow-hidden transition-all group/clip ${
                              isSelected ? 'bg-primary/10 border-primary/20' : 'bg-neutral-900/40 hover:bg-neutral-800/60'
                            }`}
                          >
                            {asset ? (
                              <>
                                <img src={asset.thumbnail} className="w-full h-full object-cover opacity-60 group-hover/clip:opacity-90 transition-opacity" alt="" />
                                {asset.type === 'video' && (
                                  <div className="absolute top-1 right-1 px-1 rounded bg-black/70 text-[5px] font-black text-blue-400">MOV</div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-black/40">
                                <Sparkles className="w-3 h-3 text-neutral-800 animate-pulse" />
                              </div>
                            )}
                            <div className="absolute bottom-0.5 left-1 right-1 flex justify-end items-end">
                              <span className="text-[5px] font-black text-primary/50">{clipDuration.toFixed(1)}s</span>
                            </div>
                            {isSelected && clipIdx === 0 && <div className="absolute inset-x-0 top-0 h-[2px] bg-primary" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AUDIO TRACK */}
            <div className="absolute top-32 left-0 right-0 h-16">
              {scenes.map((scene, idx) => {
                const { start, duration } = sceneStarts[idx];
                const isSelected = selectedIndex === idx;
                return (
                  <div 
                    key={`track-aud-${idx}`}
                    onClick={(e) => { e.stopPropagation(); onSelect(idx, start); }}
                    className={`absolute top-0 flex flex-col justify-center px-2 cursor-pointer transition-all ${
                      isSelected ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-neutral-950/60 border border-white/5 hover:bg-neutral-900/40'
                    }`}
                    style={{ 
                      left: start * pixelsPerSecond,
                      width: duration * pixelsPerSecond 
                    }}
                  >
                    <div className="h-6 w-full bg-emerald-500/5 rounded-sm relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center gap-[1px] px-1">
                        {Array.from({ length: Math.max(1, Math.floor((duration * pixelsPerSecond) / 3)) }).map((_, i) => {
                          const val = Math.sin(i * 0.5) * Math.cos(idx * 2) * Math.sin(i * 0.2);
                          const h = 20 + Math.abs(val) * 70;
                          return (
                            <div 
                              key={i}
                              className={`w-[2px] rounded-full ${isSelected ? 'bg-emerald-500/60' : 'bg-neutral-700'}`}
                              style={{ height: `${h}%` }}
                            />
                          );
                        })}
                      </div>
                      {/* BUG FIX 3: VU meter via inline style, not CSS class which JIT may miss */}
                      {isSelected && isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center gap-[2px]">
                          {[0.3, 0.6, 1, 0.8, 0.5, 0.9, 0.4].map((amp, i) => (
                            <div
                              key={i}
                              className="w-[2px] bg-emerald-400 rounded-full"
                              style={{
                                animation: `vu-meter ${0.4 + amp * 0.4}s ease-in-out ${i * 0.07}s infinite alternate`,
                                height: `${30 + amp * 60}%`
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                    </div>
                    {pixelsPerSecond >= 15 && (
                      <div className="mt-1 flex items-center justify-between">
                        <p className={`text-[6px] font-black uppercase tracking-widest ${isSelected ? 'text-emerald-400' : 'text-neutral-600'}`}>
                          {scene.audioUrl ? '▶ VOICE' : 'SILENT'}
                        </p>
                        <p className="text-[5px] font-bold text-neutral-700">{duration.toFixed(1)}s</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* PLAYHEAD — triangle head */}
            <div 
              className="absolute top-0 bottom-0 w-[2px] bg-primary z-50 pointer-events-none"
              style={{ 
                left: currentTime * pixelsPerSecond,
                boxShadow: '0 0 10px rgba(59,130,246,0.8), 0 0 3px rgba(255,255,255,0.3)'
              }} 
            >
              {/* Triangle head */}
              <div
                className="absolute -left-[7px] top-0"
                style={{
                  width: 0, height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '10px solid #3b82f6',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineScene({ 
  scene, 
  idx, 
  storyboardAssets, 
  generatingScenes, 
  onGenerateVoice, 
  onCycleAsset, 
  isSelected,
  onClick
}: { 
  scene: any, 
  idx: number, 
  storyboardAssets: any, 
  generatingScenes: Set<number>, 
  onGenerateVoice: (idx: number) => void,
  onCycleAsset: (query: string) => void,
  isSelected: boolean,
  onClick: () => void
}) {
  const isGenerating = generatingScenes.has(idx);
  
  return (
    <div 
      onClick={onClick}
      className={`relative shrink-0 w-[400px] h-full flex flex-col transition-all duration-500 cursor-pointer group/scene
        ${isSelected ? 'bg-white/5 border-white/20' : 'bg-transparent border-transparent hover:bg-white/[0.02]'}`}
    >
      {/* Visual Header */}
      <div className="relative aspect-video w-full overflow-hidden bg-neutral-900 border-b border-white/5 group-hover/scene:border-primary/30 transition-colors">
        <div className="flex gap-1 overflow-x-auto p-1 h-full scrollbar-none">
          {scene.searchQueries.map((query: string, qIdx: number) => {
            const asset = storyboardAssets[`${idx}_${qIdx}`];
            return (
              <div key={`${idx}-${qIdx}`} className="relative h-full aspect-video shrink-0 overflow-hidden rounded-lg border border-white/5 shadow-2xl">
                {asset ? (
                  <>
                    <img src={asset.thumbnail} className="w-full h-full object-cover opacity-60" alt="" />
                    {asset.type === 'video' && (
                      <div className="absolute top-1 right-1 p-1 rounded-md bg-black/60 backdrop-blur-md">
                        <Video size={10} className="text-primary" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-neutral-900 animate-pulse">
                    <Sparkles size={14} className="text-neutral-700" />
                    <span className="text-[7px] font-black uppercase tracking-tighter text-neutral-600">Scouting...</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
           <div className={`flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-black shadow-lg transition-all duration-500
             ${scene.audioUrl ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-white border border-white/10'}`}>
             {idx + 1}
           </div>
           {scene.title && (
             <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black text-white/90 uppercase tracking-widest truncate max-w-[150px]">
               {scene.title}
             </div>
           )}
        </div>

        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover/scene:opacity-100 transition-opacity z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onGenerateVoice(idx); }}
            disabled={isGenerating}
            className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:bg-primary hover:text-white transition-all shadow-xl"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* Narrative & Cues Track */}
      <div className="flex-1 p-5 space-y-4 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar-thin">
          <p className="font-script text-[14px] leading-[1.8] text-neutral-300 group-hover/scene:text-white transition-colors">
            "{scene.narration}"
          </p>
        </div>

        <div className="pt-4 border-t border-white/5 space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={12} className="text-primary/60" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">Director Note</span>
          </div>
          <p className="text-[11px] italic font-medium text-neutral-400 line-clamp-2 leading-relaxed">
            {scene.visualCue}
          </p>
        </div>
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
      )}
    </div>
  );
}

function PipelineProgress({ currentStatus, logs }: { currentStatus: string, logs: string[] }) {
  const getProgressForNode = (nodeId: string) => {
    const statusIdx = ["IDLE", ...PIPELINE_NODES.map(n => n.id), "DONE"].indexOf(currentStatus);
    const nodeIdx = PIPELINE_NODES.findIndex(n => n.id === nodeId) + 1;

    if (statusIdx > nodeIdx) return 100;
    if (statusIdx < nodeIdx) return 0;

    // Estimate based on logs for active node
    const lastLog = [...logs].reverse().find(l => l.includes("[Progress:"));
    if (lastLog) {
      const match = lastLog.match(/\[Progress: (\d+)\/(\d+)\]/);
      if (match) {
        const p = (parseInt(match[1]) / parseInt(match[2])) * 100;
        return p;
      }
    }
    return 30; // Default active state
  };

  return (
    <div className="flex items-center justify-between w-full gap-4 px-6 py-4 mb-6 overflow-x-auto rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
      {PIPELINE_NODES.map((node, i) => {
        const progress = getProgressForNode(node.id);
        const isActive = currentStatus === node.id;
        const isCompleted = progress === 100;
        const Icon = node.icon;

        return (
          <div key={node.id} className="flex flex-col items-center flex-1 min-w-[80px] group relative">
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-500 mb-2
              ${isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                isActive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] animate-pulse' : 
                'bg-white/5 text-white/30 border border-white/10'}`}
            >
              <Icon size={18} />
              {isCompleted && (
                <div className="absolute -top-1 -right-1 bg-emerald-500 text-black rounded-full p-0.5">
                  <CheckCircle2 size={10} />
                </div>
              )}
            </div>
            
            <span className={`text-[10px] font-medium tracking-wider uppercase transition-colors duration-300
              ${isActive ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-white/30'}`}>
              {node.label}
            </span>

            <div className="w-full h-1 mt-2 overflow-hidden rounded-full bg-white/5">
              <div 
                className={`h-full transition-all duration-1000 ease-out
                  ${isCompleted ? 'bg-emerald-500' : isActive ? 'bg-blue-500' : 'bg-transparent'}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {i < PIPELINE_NODES.length - 1 && (
               <div className="absolute top-5 -right-2 w-4 h-[1px] bg-white/10 hidden lg:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}

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
    pexelsAssets, updateDraftBundle, fetchPexelsAssets
  } = useAppContext();

  const [localViewMode, setLocalViewMode] = useState<"script" | "assets">("script");
  const [assetCycleMap, setAssetCycleMap] = useState<Record<string, number>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [cinemaProgress, setCinemaProgress] = useState(0);
  
  // RENDER ENGINE
  const { renderVideo, isRendering, progress } = useRender();
  
  // VOICE STUDIO STATES
  const [selectedVoiceId, setSelectedVoiceId] = useState(AVAILABLE_VOICES[0].id);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set());

  // TIMELINE STUDIO STATES
  const [zoomLevel, setZoomLevel] = useState(60); // px per second
  const [currentTime, setCurrentTime] = useState(0);
  const [timelineScroll, setTimelineScroll] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Calculate scene start times for global sync
  const sceneStarts = useMemo(() => {
    if (!selectedCommit?.production_bundle?.scenes) return [];
    let current = 0;
    return selectedCommit.production_bundle.scenes.map(s => {
      const start = current;
      const duration = s.duration || estimateDuration(s.narration);
      current += duration;
      return { start, duration };
    });
  }, [selectedCommit]);

  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [cinemaSceneIdx, setCinemaSceneIdx] = useState(0);
  const [cinemaClipIdx, setCinemaClipIdx] = useState(0);

  // BUG FIX: Reset playhead to 0 when first entering script/timeline view
  const didEnterTimeline = useRef(false);
  useEffect(() => {
    if (localViewMode === 'script' && !didEnterTimeline.current) {
      didEnterTimeline.current = true;
      setCurrentTime(0);
      setCinemaSceneIdx(0);
      setIsPlaying(false);
    }
    if (localViewMode !== 'script') {
      didEnterTimeline.current = false;
      setIsPlaying(false); // Stop audio when leaving timeline view
    }
  }, [localViewMode]);

  // ESTIMATION HELPERS
  const estimateDuration = (text: string) => Math.max(2, text.split(' ').length / 2.5); // ~150 wpm

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

  const handleHydrateAllAssets = async () => {
    if (!selectedCommit?.production_bundle?.scenes) return;
    setIsHydrating(true);
    const allQueries: { query: string, type: 'video' | 'image' | 'ai_gen' }[] = [];
    selectedCommit.production_bundle.scenes.forEach(s => {
      s.searchQueries.forEach(q => {
        allQueries.push({ query: q, type: (s as any).assetType || 'video' });
      });
    });
    if (allQueries.length > 0) {
      await fetchPexelsAssets(allQueries);
    }
    setIsHydrating(false);
  };

  const storyboardAssets = useMemo(() => {
    const mappings: Record<string, any> = {};
    const seenAssetIds = new Set<string | number>();
    if (!selectedCommit?.production_bundle?.scenes) return mappings;

    selectedCommit.production_bundle.scenes.forEach((scene, sIdx) => {
      scene.searchQueries.forEach((query, qIdx) => {
        const type = (scene as any).assetType || 'video';
        const results = pexelsAssets[query];

        if (results && results.length > 0) {
          const skipCount = assetCycleMap[query] || 0;
          
          // Find a unique asset if possible
          let selected = results.find(v => !seenAssetIds.has(v.id));
          
          if (!selected) {
            const fallbackIdx = (sIdx + qIdx + skipCount) % results.length;
            selected = results[fallbackIdx];
          } else if (skipCount > 0) {
            const matches = results.filter(v => !seenAssetIds.has(v.id));
            selected = matches[skipCount % matches.length] || selected;
          }

          if (selected) {
            seenAssetIds.add(selected.id);
            mappings[`${sIdx}_${qIdx}`] = selected;
          }
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

  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (status === "DONE" && prevStatusRef.current !== "DONE" && localViewMode !== "assets") {
      setLocalViewMode("assets");
    }
    prevStatusRef.current = status;
  }, [status, localViewMode]);

  useEffect(() => {
    if (localViewMode === 'script' && selectedCommit?.production_bundle?.scenes) {
      const scene = selectedCommit.production_bundle.scenes[cinemaSceneIdx];
      if (scene?.audioUrl && isPlaying) {
        if (audioRef.current) {
          const isNewSrc = audioRef.current.src !== scene.audioUrl;
          if (isNewSrc) {
            audioRef.current.src = scene.audioUrl;
            audioRef.current.currentTime = (audioRef.current as any).pendingSeek || 0;
            (audioRef.current as any).pendingSeek = 0;
          }
          audioRef.current.playbackRate = playbackRate;
          audioRef.current.play().catch(e => console.log("Audio play blocked", e));
        }
      } else {
        audioRef.current?.pause();
      }
    } else {
      audioRef.current?.pause();
    }
  }, [cinemaSceneIdx, localViewMode, selectedCommit, isPlaying, playbackRate]);

  // Sync playbackRate changes to audio element even while playing
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // VIRTUAL CLOCK: Drive playback when audio is missing or empty
  useEffect(() => {
    if (!isPlaying || !selectedCommit?.production_bundle?.scenes) return;
    const scene = selectedCommit.production_bundle.scenes[cinemaSceneIdx];
    
    // Check if audio is actually ready and playing
    const hasAudio = !!scene?.audioUrl && audioRef.current && audioRef.current.src !== "";
    if (hasAudio) return; 

    const sceneDuration = scene?.duration || estimateDuration(scene?.narration || "");
    const interval = 100; // 10fps logic for stability
    
    const timer = setInterval(() => {
      setCurrentTime(prevTime => {
        const localStart = sceneStarts[cinemaSceneIdx]?.start || 0;
        const localTime = prevTime - localStart;
        const newLocalTime = localTime + (interval / 1000) * playbackRate;
        
        // Calculate and update clip index using functional update to avoid dependency loop
        const totalClips = scene.searchQueries.length;
        const progress = newLocalTime / sceneDuration;
        const desiredClipIdx = Math.min(Math.floor(progress * totalClips), totalClips - 1);
        
        setCinemaClipIdx(prevIdx => prevIdx !== desiredClipIdx ? desiredClipIdx : prevIdx);

        if (newLocalTime >= sceneDuration) {
          if (cinemaSceneIdx < selectedCommit.production_bundle!.scenes!.length - 1) {
            setCinemaSceneIdx(idx => idx + 1);
            setCinemaClipIdx(0);
            return localStart + sceneDuration;
          } else {
            setIsPlaying(false);
            return prevTime;
          }
        }
        return localStart + newLocalTime;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, cinemaSceneIdx, selectedCommit, playbackRate, sceneStarts]);

  // Keyboard Orchestration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (localViewMode !== 'script') return;
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
      if (e.code === 'KeyL') {
        if (selectedCommit?.production_bundle?.scenes && cinemaSceneIdx < selectedCommit.production_bundle.scenes.length - 1) {
          setCinemaSceneIdx(prev => prev + 1);
        }
      }
      if (e.code === 'KeyJ') {
        if (cinemaSceneIdx > 0) {
          setCinemaSceneIdx(prev => prev - 1);
        }
      }
      if (e.code === 'KeyZ') {
        setZoomLevel(prev => Math.min(prev + 10, 200));
      }
      if (e.code === 'KeyX') {
        setZoomLevel(prev => Math.max(prev - 10, 30));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localViewMode]);
  const handleAudioTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    if (!audio.duration || !selectedCommit?.production_bundle?.scenes) return;
    const scene = selectedCommit.production_bundle.scenes[cinemaSceneIdx];
    if (!scene) return;
    // Count how many clips are loaded for this scene
    const totalClips = scene.searchQueries.length;
    const progress = audio.currentTime / audio.duration;
    setCinemaProgress(progress);

    if (totalClips > 1) {
      const desiredClipIdx = Math.min(Math.floor(progress * totalClips), totalClips - 1);
      setCinemaClipIdx(prev => prev !== desiredClipIdx ? desiredClipIdx : prev);
    }
  }, [cinemaSceneIdx, selectedCommit, storyboardAssets]);

  const currentCinemaScene = selectedCommit?.production_bundle?.scenes?.[cinemaSceneIdx];
  const currentCinemaAsset = currentCinemaScene
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
          const uniqueAsset = storyboardAssets[`${idx}_0`];
          const url = uniqueAsset?.type === 'video' ? uniqueAsset.videoUrl : (uniqueAsset?.url || uniqueAsset?.thumbnail);
          
          if (url) {
            try {
              const res = await fetch(url);
              const blob = await res.blob();
              const ext = uniqueAsset.type === 'image' ? 'jpg' : 'mp4';
              videoFolder.file(`Asset_${idx + 1}_V1.${ext}`, blob);
            } catch (err) { console.error(`Failed to export asset ${idx}:`, err); }
          }
        }));
      }

      const xmlOutput = compileFCPXML(activeProject.name, scenes, storyboardAssets);
      zip.file(`${activeProject.name}_Sequence.fcpxml`, xmlOutput);

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${activeProject.name}_Studio_Bundle.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setLogs(prev => [...prev, "System: Studio Bundle exported successfully."]);
    } catch (e) {
      console.error("Export error:", e);
      setLogs(prev => [...prev, "System Error: Export failed."]);
    } finally {
      setIsExporting(false);
    }
  };

  const reBundleAssets = async () => {
    if (!selectedCommit?.id) return;
    try {
      setPrompt("Re-bundling production assets for better storyboard alignment...");
      runAgent("VISUALS: Re-align the production bundle. Ensure the storyboard scenes strictly map only to narrator words and visuals are diverse.", projectId);
    } catch (err) {
      console.error(err);
    }
  };

  const AssetPreview = ({ asset, query, isCompact = false, onCycle }: { asset: any, query: string, isCompact?: boolean, onCycle?: (q: string) => void }) => {
    const [isHovered, setIsHovered] = useState(false);
    if (!asset) return null;
    const isVideo = asset.type === 'video';

    return (
      <div 
        className={`group relative aspect-video rounded-[1.5rem] bg-neutral-900 border border-white/5 overflow-hidden shadow-2xl transition-all hover:scale-[1.02] ${isCompact ? 'w-[180px] shrink-0' : 'w-full'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img src={asset.thumbnail} alt={query} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isHovered && isVideo ? 'opacity-0' : 'opacity-60'}`} />
        {isHovered && isVideo && asset.videoUrl && (
          <video src={asset.videoUrl} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-500" />
        )}
        <div className={`absolute inset-x-0 bottom-0 ${isCompact ? 'p-3' : 'p-4'} bg-gradient-to-t from-black/80 to-transparent`}>
           <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5 text-left">
             {asset.type === 'ai_gen' ? 'AI Generated' : asset.type === 'image' ? 'Stock Photo' : 'Stock Video'}
           </p>
           <p className={`text-white truncate text-left font-bold ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>{query}</p>
        </div>
        <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[7px] font-black uppercase tracking-tighter text-white/70`}>
           {asset.source}
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
        <div className="flex items-center gap-3 md:gap-5 min-w-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (activeProject?.channel_id) {
                  router.push(`/channels/${activeProject.channel_id}`);
                } else {
                  router.push('/');
                }
              }}
              className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all group"
              title="Back to Channel"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 md:hidden" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="w-5 h-5 text-neutral-400" />
            </div>
            <h1 className="text-sm md:text-lg font-black text-white tracking-tight truncate max-w-[150px] md:max-w-[400px]">{activeProject.name}</h1>
          </div>
          <div className="hidden sm:block h-6 w-px bg-white/10" />
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.03] backdrop-blur-sm">
            <button 
              onClick={() => setLocalViewMode("script")} 
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${localViewMode === "script" ? "bg-white/10 text-white shadow-lg" : "text-neutral-500 hover:text-white"}`}
            >
              <FileText className="w-3.5 h-3.5" /> 
              <span className="hidden xs:inline">Script</span>
            </button>
            <button 
              onClick={() => setLocalViewMode("assets")} 
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${localViewMode === "assets" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-neutral-500 hover:text-white"}`}
            >
              <Layers className="w-3.5 h-3.5" /> 
              <span className="hidden xs:inline">Assets</span>
            </button>
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
              {currentCinemaAsset ? (
                currentCinemaAsset.type === 'video' ? (
                  <video
                    key={`cinema-vid-${cinemaSceneIdx}-${cinemaClipIdx}-${currentCinemaAsset.videoUrl}`}
                    src={currentCinemaAsset.videoUrl}
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-cover animate-in fade-in duration-500"
                  />
                ) : (
                  <div className="w-full h-full relative overflow-hidden">
                    <img
                      key={`cinema-img-${cinemaSceneIdx}-${cinemaClipIdx}-${currentCinemaAsset.url || currentCinemaAsset.thumbnail}`}
                      src={currentCinemaAsset.url || currentCinemaAsset.thumbnail}
                      alt="Cinema Frame"
                      className={`w-full h-full object-cover animate-in fade-in duration-700 ${cinemaClipIdx % 2 === 0 ? 'animate-ken-burns' : 'animate-pan'}`}
                    />
                    <div className="absolute inset-0 asset-overlay" />
                  </div>
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-neutral-600 bg-neutral-900 animate-pulse">
                  <Video className="w-12 h-12" />
                  <p className="text-xs font-black uppercase tracking-widest">Hydrating Cinema Frame...</p>
                </div>
              )}

              {/* VIRAL CAPTION OVERLAY */}
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-12">
                {currentCinemaScene?.captions?.map((cap: any, idx: number) => {
                  const isActive = cinemaProgress >= cap.startTime && cinemaProgress <= (cap.startTime + (cap.duration || 0.3));
                  if (!isActive) return null;
                  
                  const colorClass = 
                    cap.color === 'YELLOW' ? 'text-yellow-400' :
                    cap.color === 'CYAN' ? 'text-cyan-400' :
                    cap.color === 'RED' ? 'text-red-500' : 'text-white';
                    
                  const animClass = 
                    cap.emphasis === 'SHAKE' ? 'animate-text-shake' :
                    cap.emphasis === 'GLOW' ? 'animate-text-glow' : 'animate-text-pop';

                  return (
                    <div 
                      key={`viral-cap-${idx}`}
                      className={`viral-caption text-4xl md:text-7xl font-black text-center drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] ${colorClass} ${animClass}`}
                    >
                      {cap.text}
                    </div>
                  );
                })}
              </div>
              <div className="absolute top-8 left-8 flex items-center gap-3">
                 <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black text-primary uppercase tracking-widest">Scene {cinemaSceneIdx + 1} / {selectedCommit?.production_bundle?.scenes?.length || 0}</div>
                 {totalCinemaClipsForScene > 1 && (
                   <div className="px-3 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black text-white/60 uppercase tracking-widest">Clip {cinemaClipIdx + 1} / {totalCinemaClipsForScene}</div>
                 )}
                 {currentCinemaAsset && (
                   <div className="px-3 py-2 rounded-full bg-primary/20 backdrop-blur-md border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest">
                     {currentCinemaAsset.type.replace('_', ' ')}
                   </div>
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
        <div className={`flex-1 overflow-y-auto bg-[#080808] custom-scrollbar relative transition-all duration-500 ${localViewMode === 'script' ? 'p-0' : 'p-6 md:p-8 lg:p-10'}`}>
          {status !== "IDLE" && status !== "DONE" && (
            <div className={`max-w-4xl mx-auto mb-10 ${localViewMode === 'script' ? 'mt-10 px-6' : ''}`}>
              <PipelineProgress currentStatus={status} logs={logs} />
            </div>
          )}
          
          {localViewMode === "script" ? (
               /* STUDIO MASTER TIMELINE - Dual Pane */
               <div className="w-full h-full min-h-[calc(100vh-120px)] flex flex-col bg-[#050505] border-b border-white/5 animate-in fade-in duration-700">
                  
                  {/* TOP PANE: STUDIO PREVIEW */}
                  <div className="flex-1 min-h-0 flex overflow-hidden">
                    {/* Preview Display */}
                    <div className="flex-[1.5] bg-black flex flex-col items-center justify-center p-8 border-r border-white/5 relative group/preview">
                      {selectedCommit?.production_bundle?.scenes && selectedCommit.production_bundle.scenes[cinemaSceneIdx] ? (
                        <div className="w-full h-full max-w-4xl aspect-video relative rounded-2xl overflow-hidden bg-neutral-900 shadow-2xl border border-white/10">
                          {/* Render the current scene asset */}
                          {(() => {
                             const scene = selectedCommit.production_bundle.scenes[cinemaSceneIdx];
                             const asset = storyboardAssets[`${cinemaSceneIdx}_${cinemaClipIdx}`] || storyboardAssets[`${cinemaSceneIdx}_0`];
                             if (asset) {
                               return asset.type === 'video' ? (
                                 <video key={asset.id || asset.videoUrl} src={asset.videoUrl} autoPlay muted loop className="w-full h-full object-cover" />
                               ) : (
                                 <img key={asset.id || asset.url} src={asset.url} className="w-full h-full object-cover" alt="" />
                               );
                             }
                             return (
                               <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                                 <Sparkles className="w-12 h-12 text-neutral-800 animate-pulse" />
                                 <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.4em]">Rendering Visuals...</p>
                               </div>
                             );
                          })()}
                          
                           {/* Playback Controls Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity z-20">
                            <button 
                              onClick={() => setIsPlaying(!isPlaying)}
                              className="w-20 h-20 rounded-full bg-primary/20 backdrop-blur-xl border border-primary/40 flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-all shadow-[0_0_40px_rgba(59,130,246,0.3)]"
                            >
                              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" fill="currentColor" />}
                            </button>
                          </div>

                          <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl flex items-center gap-2 z-20">
                             <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-primary animate-pulse' : 'bg-neutral-600'}`} />
                             <span className="text-[9px] font-black text-white uppercase tracking-widest">
                               {selectedCommit.production_bundle.scenes[cinemaSceneIdx].audioUrl ? (isPlaying ? 'Playing' : 'Audio Ready') : 'Silent Track'}
                             </span>
                             {isPlaying && (
                               <div className="flex gap-0.5 h-3 items-end ml-1">
                                 {[0.4, 0.8, 1.0, 0.6].map((amp, i) => (
                                   <div 
                                     key={i}
                                     className="w-0.5 bg-primary rounded-full"
                                     style={{
                                       animation: `vu-meter ${0.3 + amp * 0.4}s ease-in-out ${i * 0.08}s infinite alternate`,
                                       height: `${30 + amp * 70}%`
                                     }}
                                   />
                                 ))}
                               </div>
                             )}
                          </div>

                          <div className="absolute bottom-6 left-6 right-6 p-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl animate-in slide-in-from-bottom-4 z-20">
                            <p className="font-script text-[18px] leading-relaxed text-white italic">"{selectedCommit.production_bundle.scenes[cinemaSceneIdx].narration}"</p>
                          </div>

                          {/* Hidden Audio Element */}
                          <audio 
                            ref={audioRef} 
                            onTimeUpdate={(e) => {
                              const sceneStart = sceneStarts[cinemaSceneIdx]?.start || 0;
                              setCurrentTime(sceneStart + e.currentTarget.currentTime);
                              handleAudioTimeUpdate(e);
                            }}
                            onEnded={() => {
                              if (cinemaSceneIdx < (selectedCommit.production_bundle?.scenes?.length || 0) - 1) {
                                setCinemaSceneIdx(prev => prev + 1);
                              } else {
                                setIsPlaying(false);
                              }
                            }} 
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-6">
                           <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                              <Play className="w-8 h-8 text-neutral-600" />
                           </div>
                           <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em]">No Sequence Loaded</p>
                        </div>
                      )}
                    </div>

                    {/* Script & Notes Pane */}
                    <div className="flex-1 bg-black/40 backdrop-blur-md p-10 overflow-y-auto custom-scrollbar-thin text-left border-l border-white/5">
                      {selectedCommit?.production_bundle?.scenes && selectedCommit.production_bundle.scenes[cinemaSceneIdx] ? (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Scene {cinemaSceneIdx + 1} Metadata</h3>
                              <button 
                                onClick={async () => {
                                  const rb = JSON.parse(JSON.stringify(selectedCommit.production_bundle));
                                  await handleGenerateVoice(selectedCommit.production_bundle!.scenes![cinemaSceneIdx].narration, cinemaSceneIdx, rb);
                                  await updateDraftBundle(selectedCommit.id!, rb);
                                }}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-primary transition-all"
                              >
                                {generatingScenes.has(cinemaSceneIdx) ? <Loader2 size={12} className="animate-spin" /> : "Regenerate Voice"}
                              </button>
                            </div>
                            <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5">
                               <p className="text-sm font-medium leading-relaxed text-neutral-300">
                                 {selectedCommit.production_bundle.scenes[cinemaSceneIdx].visualCue}
                               </p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">B-Roll Assets</span>
                            <div className="grid grid-cols-2 gap-4">
                               {selectedCommit.production_bundle.scenes[cinemaSceneIdx].searchQueries.map((q: string, qIdx: number) => {
                                  const asset = storyboardAssets[`${cinemaSceneIdx}_${qIdx}`];
                                  return (
                                    <div key={qIdx} className="aspect-video rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden relative group/asset">
                                       {asset ? (
                                         <AssetPreview asset={asset} query={q} onCycle={() => cycleAsset(q, 1)} />
                                       ) : (
                                         <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                           <Loader2 size={14} className="text-neutral-800 animate-spin" />
                                           <span className="text-[7px] font-black text-neutral-700 uppercase">Searching...</span>
                                         </div>
                                       )}
                                    </div>
                                  );
                               })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-12">
                           <Bot size={40} className="text-neutral-800" />
                           <h3 className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">Select a scene in the timeline to view details</h3>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline Toolbar */}
                  <div className="px-6 py-2 bg-black/80 border-y border-white/5 flex items-center gap-4">
                    {/* Return to Start */}
                    <button 
                      onClick={() => { setCurrentTime(0); setCinemaSceneIdx(0); setIsPlaying(false); if (audioRef.current) { audioRef.current.currentTime = 0; } }}
                      className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-neutral-500 hover:text-white transition-all"
                      title="Return to start"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    {/* Play / Pause */}
                    <button 
                      onClick={() => setIsPlaying(p => !p)}
                      className={`p-1.5 rounded-md transition-all ${
                        isPlaying ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'
                      }`}
                      title="Play / Pause (Space)"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" fill="currentColor" />}
                    </button>
                    {/* Timecode */}
                    <div className="font-mono text-[11px] text-white/60 tabular-nums min-w-[90px]">
                      {(() => { const m = Math.floor(currentTime/60).toString().padStart(2,'0'); const s = Math.floor(currentTime%60).toString().padStart(2,'0'); const f = Math.floor((currentTime%1)*10); return `${m}:${s}.${f}`; })()}
                      <span className="text-neutral-700 mx-1">/</span>
                      {(() => { const tot = selectedCommit?.production_bundle?.scenes?.reduce((a:number,s:any) => a+(s.duration||estimateDuration(s.narration)),0)||0; const m = Math.floor(tot/60).toString().padStart(2,'0'); const s = Math.floor(tot%60).toString().padStart(2,'0'); return `${m}:${s}`; })()}
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    {/* Zoom */}
                    <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Zoom</span>
                    <input 
                      type="range" min="10" max="200" step="5" 
                      value={zoomLevel} 
                      onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                      className="w-28 accent-primary"
                    />
                    <span className="text-[9px] font-mono text-neutral-600">{zoomLevel}px/s</span>
                    <div className="h-4 w-px bg-white/10" />
                    {/* Playback Speed */}
                    <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Speed</span>
                    {[0.5, 1, 1.5, 2].map(rate => (
                      <button
                        key={rate}
                        onClick={() => setPlaybackRate(rate)}
                        className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${
                          playbackRate === rate
                            ? 'bg-primary text-white'
                            : 'bg-white/5 text-neutral-500 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                    <div className="ml-auto flex items-center gap-3">
                      <button 
                        onClick={handleHydrateAllAssets}
                        disabled={isHydrating}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${
                          isHydrating 
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                            : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {isHydrating ? <Loader2 size={10} className="animate-spin" /> : <Layers size={10} />}
                        {isHydrating ? "Syncing..." : "Sync Visuals"}
                      </button>

                      <button 
                        onClick={handleGenerateAllAudio}
                        disabled={isGeneratingAll}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${
                          isGeneratingAll 
                            ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' 
                            : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {isGeneratingAll ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
                        {isGeneratingAll ? `${Math.round(generationProgress)}%` : "Sync Audio"}
                      </button>

                      <div className="w-px h-4 bg-white/10 mx-1" />
                      <span className="text-[9px] font-black text-neutral-600 uppercase">Scene {cinemaSceneIdx + 1}/{selectedCommit?.production_bundle?.scenes?.length||0}</span>
                      <button onClick={() => setIsCinemaMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all">
                        <Play size={9} fill="currentColor" /> Full Preview
                      </button>
                    </div>
                  </div>

                  {/* BOTTOM PANE: MASTER TIMELINE CANVAS */}
                  <div className="h-[320px] shrink-0 flex flex-col">
                    <MasterTimeline 
                      scenes={selectedCommit?.production_bundle?.scenes || []}
                      storyboardAssets={storyboardAssets}
                      zoomLevel={zoomLevel}
                      selectedIndex={cinemaSceneIdx}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      onSelect={(idx, startTime) => {
                        setCinemaSceneIdx(idx);
                        // Reset clip index to 0 when selecting a new scene from the start
                        setCinemaClipIdx(0);
                        if (audioRef.current) {
                          audioRef.current.currentTime = 0; // Each scene has its own audio file
                          setCurrentTime(startTime);
                          setIsPlaying(true);
                        }
                      }}
                      onSeek={(time) => {
                        // Find which scene this global 'time' belongs to
                        if (!selectedCommit?.production_bundle?.scenes) return;
                        
                        let accumulated = 0;
                        let targetSceneIdx = 0;
                        let localTime = 0;
                        let sceneDuration = 0;
                        
                        for (let i = 0; i < selectedCommit.production_bundle.scenes.length; i++) {
                          const s = selectedCommit.production_bundle.scenes[i];
                          const d = s.duration || estimateDuration(s.narration);
                          if (time >= accumulated && time <= accumulated + d) {
                            targetSceneIdx = i;
                            localTime = time - accumulated;
                            sceneDuration = d;
                            break;
                          }
                          accumulated += d;
                        }

                        // Calculate which clip within the scene we should be at
                        const scene = selectedCommit.production_bundle.scenes[targetSceneIdx];
                        if (scene) {
                          const totalClips = scene.searchQueries.length;
                          const progress = localTime / sceneDuration;
                          const desiredClipIdx = Math.min(Math.floor(progress * totalClips), totalClips - 1);
                          setCinemaClipIdx(desiredClipIdx);
                        }

                        setCinemaSceneIdx(targetSceneIdx);
                        setCurrentTime(time);
                        setIsPlaying(true);
                        
                        // We must wait for the audio source to change if it's a different scene
                        // The useEffect handles the source change, so we just need to ensure 
                        // the localTime is applied once ready.
                        // For immediate feedback, we can try to set it if src is already correct.
                        if (audioRef.current) {
                           const targetSrc = selectedCommit.production_bundle.scenes[targetSceneIdx].audioUrl;
                           if (audioRef.current.src === targetSrc) {
                             audioRef.current.currentTime = localTime;
                           } else {
                             // The useEffect will pick this up and we'll lose the localTime offset
                             // unless we store it.
                             (audioRef.current as any).pendingSeek = localTime;
                           }
                        }
                      }}
                      setZoomLevel={setZoomLevel}
                    />
                  </div>
               </div>
            ) : (
               /* ASSETS VIEW - Centered */
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
                       {selectedCommit?.production_bundle?.brollSearchQueries?.map((q, idx) => ( pexelsAssets[q] ? ( <AssetPreview key={`broll-${idx}`} asset={pexelsAssets[q][0]} query={q} /> ) : ( <div key={`search-${idx}`} className="aspect-video rounded-3xl bg-white/[0.02] border border-white/5 border-dashed flex flex-col items-center justify-center gap-3 animate-pulse"> <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><Sparkles className="w-4 h-4 text-neutral-600" /></div> <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">Searching...</p></div> ) ))}
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

