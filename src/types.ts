import { v4 as uuidv4 } from 'uuid';

export interface CatalogImage {
  id: string;
  src: string; // The original source URL (base64 or blob)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  isDragging?: boolean;
  filters?: string[]; // 'brighten', 'remove-bg'
  brightness?: number;
  contrast?: number;
  removeBg?: boolean;
}

export interface AppState {
  images: CatalogImage[];
  selectedId: string | null;
  scale: number; // Zoom level
  history: CatalogImage[][];
  historyStep: number;
}

export const A4_WIDTH = 595; // 72 DPI (standard web/screen approximation for editing)
export const A4_HEIGHT = 842;
// We can scale this up for high-quality export
export const EXPORT_SCALE = 2; 
