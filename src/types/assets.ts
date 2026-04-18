export type AssetSource = 'pexels' | 'pixabay' | 'generative';

export interface NormalizedVideoAsset {
  id: string | number;
  source: AssetSource;
  type: 'video';
  thumbnail: string;
  videoUrl: string;
  originalUrl: string;
  author: string;
  width: number;
  height: number;
  duration?: number;
}

export interface NormalizedImageAsset {
  id: string | number;
  source: AssetSource;
  type: 'image';
  url: string;
  thumbnail: string;
  originalUrl: string;
  author: string;
  width: number;
  height: number;
}

export type AnyAsset = NormalizedVideoAsset | NormalizedImageAsset;

export interface AssetResponse {
  query: string;
  videos?: NormalizedVideoAsset[];
  images?: NormalizedImageAsset[];
  assets?: AnyAsset[];
}
