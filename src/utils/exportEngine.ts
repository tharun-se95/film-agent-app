import JSZip from "jszip";
import { saveAs } from "file-saver"; // We removed this earlier but let's just stick to native download without this.

export const compileFCPXML = (projectTitle: string, scenes: any[], videoMap: Record<string, any>) => {
  // Generates a simple Final Cut Pro XML standard V4, recognized by Premiere and Resolve.
  const fps = 30;
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="main-sequence">
    <name>${projectTitle} - AI Assembly</name>
    <duration>3000</duration>
    <rate>
      <timebase>${fps}</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <width>1920</width>
            <height>1080</height>
          </samplecharacteristics>
        </format>
        <track>`;
        
  // We pseudo-estimate timing. Audio length = approx 1 sec per 15 characters.
  // In a true perfect XML we'd decode the audio buffer to get exact ms, 
  // but Premiere auto-re-links and snaps if timecode is loose.
    currentTime = 0;
    scenes.forEach((scene, idx) => {
    // 1. Use actual duration if stored, fallback to estimation
    const durationSeconds = scene.duration || Math.max(3, (scene.narration || '').length / 18);
    const durationFrames = Math.floor(durationSeconds * fps);

    // Get mapped asset
    const assetData = videoMap[`${idx}_0`]; 
    const isImage = assetData?.type === 'image';
    const extension = isImage ? 'jpg' : 'mp4';
    const assetFilename = assetData ? `Asset_${idx + 1}_V1.${extension}` : '';

    if (assetFilename) {
      xml += `
          <clipitem id="clip-v-${idx}">
            <name>${assetFilename}</name>
            <file id="file-v-${idx}">
              <name>${assetFilename}</name>
              <pathurl>./4_Broll/${assetFilename}</pathurl>
              <rate><timebase>${fps}</timebase></rate>
              <duration>${isImage ? 3600 : durationFrames}</duration>
              <media>
                <video><duration>${isImage ? 3600 : durationFrames}</duration></video>
              </media>
            </file>
            <start>${currentTime}</start>
            <end>${currentTime + durationFrames}</end>
          </clipitem>`;
    }
    
    currentTime += durationFrames;
  });

  xml += `
        </track>
      </video>
      <audio>
        <track>`;
        
  currentTime = 0;
  scenes.forEach((scene, idx) => {
    const durationSeconds = scene.duration || Math.max(3, (scene.narration || '').length / 18);
    const durationFrames = Math.floor(durationSeconds * fps);
    
    if (scene.audioUrl) {
      xml += `
          <clipitem id="clip-a-${idx}">
            <name>Scene_${idx + 1}_V1.mp3</name>
            <file id="file-a-${idx}">
              <name>Scene_${idx + 1}_V1.mp3</name>
              <pathurl>./3_Voiceovers/Scene_${idx + 1}_V1.mp3</pathurl>
              <duration>${durationFrames}</duration>
              <media>
                <audio><duration>${durationFrames}</duration></audio>
              </media>
            </file>
            <start>${currentTime}</start>
            <end>${currentTime + durationFrames}</end>
          </clipitem>`;
    }
    currentTime += durationFrames;
  });

  xml += `
        </track>
      </audio>
    </media>
  </sequence>
</xmeml>`;

  return xml;
};
