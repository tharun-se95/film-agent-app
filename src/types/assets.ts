export interface NormalizedVideoAsset {
  id: string | number;
  source: 'pexels' | 'pixabay';
  thumbnail: string;
  videoUrl: string;
  originalUrl: string;
  author: string;
  width: number;
  height: number;
  duration?: number;
}

export interface AssetResponse {
  query: string;
  videos: NormalizedVideoAsset[];
}
