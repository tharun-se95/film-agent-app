import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface RenderProgress {
  message: string;
  percent: number;
}

export function useRender() {
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // Use Web Audio API to read duration from the raw array buffer, completely bypassing
  // the browser's <audio> tag Which frequently fails with CORS or Range Request errors on blobs.
  const getAudioDurationFromArrayBuffer = async (buffer: any): Promise<number> => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(buffer.slice(0)); // clone buffer for decoding
      return audioBuffer.duration;
    } catch (e) {
      console.error("[FFMPEG] Web Audio API decode error:", e);
      return 0;
    }
  };

  const renderVideo = useCallback(async (
    projectTitle: string,
    bundle: any,
    storyboardAssets: Record<string, any>
  ) => {
    const scenes = bundle?.scenes || [];
    const numScenes = scenes.length;
    const sceneBlobs: { name: string, blob: Blob }[] = [];

    const initFFmpeg = async () => {
        const ff = new FFmpeg();
        ff.on('log', ({ message }) => console.log('[FFMPEG]', message));
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ff.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        // Pre-load font for subtitles
        const fontURL = 'https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-Bold.ttf';
        const fontData = await fetchFile(fontURL);
        await ff.writeFile('font.ttf', fontData);
        return ff;
    };

    const safeFetchFile = async (url: string, description: string) => {
        try {
            console.log(`[FFMPEG] Fetching ${description}:`, url);
            return await fetchFile(url);
        } catch (err: any) {
            console.error(`[FFMPEG] Failed to fetch ${description}. URL: ${url}`, err);
            throw new Error(`Failed to fetch ${description}. Check CORS or network tab. URL: ${url}`);
        }
    };

    try {
      setIsRendering(true);
      
      // PHASE 1: Render individual scenes one by one, rebooting engine each time
      for (let sIdx = 0; sIdx < numScenes; sIdx++) {
        const scene = scenes[sIdx];
        setProgress({ 
            message: `Rendering Scene ${sIdx + 1} of ${numScenes} (Industrial Mode)...`, 
            percent: (sIdx / (numScenes + 1)) * 100 
        });

        if (!scene.audioUrl) continue;

        // Boot fresh engine for this scene
        const ffmpeg = await initFFmpeg();

        // 1. Fetch Audio
        let audData = await safeFetchFile(scene.audioUrl, `Scene ${sIdx + 1} Audio`);
        const audDuration = await getAudioDurationFromArrayBuffer(audData.buffer || new Uint8Array(audData as any).buffer);
        await ffmpeg.writeFile(`aud_${sIdx}.mp3`, audData);
        (audData as any) = null; // GC hint

        if (audDuration <= 0) {
            await ffmpeg.terminate();
            continue;
        }

        // 2. Process Clips
        const availableClips: any[] = [];
        scene.searchQueries.forEach((q: string, qIdx: number) => {
            const v = storyboardAssets[`${sIdx}_${qIdx}`];
            if (v) availableClips.push({ query: q, video: v });
        });

        if (availableClips.length === 0) {
            await ffmpeg.terminate();
            continue;
        }

        const clipDuration = audDuration / availableClips.length;
        const clipOutputFiles: string[] = [];
        const J_CUT_OFFSET = 0.3; // 300ms visual lead-in

        for (let i = 0; i < availableClips.length; i++) {
            const clip = availableClips[i];
            let vidData = await safeFetchFile(clip.video.videoUrl, `Scene ${sIdx + 1} Clip ${i + 1}`);
            const inName = `in_${i}.mp4`;
            const outName = `norm_${i}.mp4`;
            await ffmpeg.writeFile(inName, vidData);
            (vidData as any) = null; // GC hint

            const isOverlay = clip.query.toLowerCase().includes('subscribe') || clip.query.toLowerCase().includes('overlay');
            
            // Industrial Filter Chain: 
            // 1. Scale/Crop to 720p 
            // 2. Chroma Key if it's an overlay
            // 3. Draw Captions (Bouncy Yellow style)
            // 4. Force 30fps
            const filters = [
                'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=30',
            ];

            if (isOverlay) {
                filters.push(`colorkey=0x00ff00:0.1:0.1`); // strip green background
            }

            // Add Subtitles (Sentence level for this clip)
            const cleanText = scene.narration.replace(/'/g, "\\'").replace(/:/g, "\\:").substring(0, 80);
            filters.push(`drawtext=text='${cleanText}':fontfile='/font.ttf':fontsize=42:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)-80:enable='between(t,0,${clipDuration})'`);

            await ffmpeg.exec([
                '-threads', '1', 
                '-i', inName,
                '-t', (clipDuration + (i === 0 ? J_CUT_OFFSET : 0)).toString(), // J-Cut lead-in for first clip
                '-vf', filters.join(','),
                '-c:v', 'libx264',
                '-profile:v', 'baseline',
                '-level', '3.0',
                '-pix_fmt', 'yuv420p',
                '-b:v', '2M', 
                '-preset', 'ultrafast', 
                '-crf', '28',
                '-an',
                '-y',
                outName
            ]);
            await ffmpeg.deleteFile(inName);
            clipOutputFiles.push(`file '${outName}'`);
        }

        // 3. Concat and Mux Scene
        const sceneTxt = `list.txt`;
        await ffmpeg.writeFile(sceneTxt, clipOutputFiles.join('\n'));
        const rawVid = `raw.mp4`;
        await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', sceneTxt, '-c', 'copy', '-y', rawVid]);
        
        const sceneOut = `scene_${sIdx}.mp4`;
        await ffmpeg.exec(['-i', rawVid, '-i', `aud_${sIdx}.mp3`, '-c:v', 'copy', '-c:a', 'aac', '-shortest', '-y', sceneOut]);

        // 4. Extract result to Blob and KILL engine
        const data = (await ffmpeg.readFile(sceneOut)) as Uint8Array;
        sceneBlobs.push({ 
            name: `scene_${sIdx}.mp4`, 
            blob: new Blob([data as any], { type: 'video/mp4' }) 
        });
        
        await ffmpeg.terminate();
        console.log(`[FFMPEG] Scene ${sIdx + 1} finalized (Subtitles & Chroma Key applied).`);
      }

      // PHASE 2: Final stitching pass
      if (sceneBlobs.length > 0) {
        setProgress({ message: 'Final Stitching (System Purge)...', percent: 95 });
        const ffmpeg = await initFFmpeg();
        const finalConcatList = 'final.txt';
        const fileLines: string[] = [];

        for (const sb of sceneBlobs) {
            await ffmpeg.writeFile(sb.name, await fetchFile(sb.blob));
            fileLines.push(`file '${sb.name}'`);
        }

        await ffmpeg.writeFile(finalConcatList, fileLines.join('\n'));
        const finalOutput = 'render_final.mp4';
        
        await ffmpeg.exec([
            '-f', 'concat', 
            '-safe', '0', 
            '-i', finalConcatList, 
            '-c', 'copy', 
            '-y', 
            finalOutput
        ]);

        const data = (await ffmpeg.readFile(finalOutput)) as Uint8Array;
        const blob = new Blob([data as any], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Final.mp4`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        await ffmpeg.terminate();
        setProgress({ message: 'Render Complete!', percent: 100 });
      }

    } catch (e) {
      console.error("FFmpeg Segmented Render Error:", e);
      setProgress({ message: 'Error rendering video.', percent: 0 });
      alert("Render failed. Using Segmented Strategy failed. Check console.");
    } finally {
      setIsRendering(false);
      setTimeout(() => setProgress(null), 3000);
    }
  }, []);

  return { renderVideo, isRendering, progress };
}
