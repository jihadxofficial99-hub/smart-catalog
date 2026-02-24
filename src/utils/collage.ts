import { CatalogImage, A4_WIDTH, A4_HEIGHT } from '../types';

export const arrangeImagesSmartly = (images: CatalogImage[]): CatalogImage[] => {
  if (images.length === 0) return [];

  const count = images.length;
  const padding = 20;
  const availableWidth = A4_WIDTH - padding * 2;
  const availableHeight = A4_HEIGHT - padding * 2;

  let cols = 1;
  let rows = 1;

  // Simple grid logic based on count
  if (count === 1) { cols = 1; rows = 1; }
  else if (count === 2) { cols = 1; rows = 2; } // 2 stacked
  else if (count <= 4) { cols = 2; rows = 2; }
  else if (count <= 6) { cols = 2; rows = 3; }
  else if (count <= 9) { cols = 3; rows = 3; }
  else if (count <= 12) { cols = 3; rows = 4; }
  else if (count <= 16) { cols = 4; rows = 4; }
  else { cols = 4; rows = 5; } // Max 20ish

  const cellWidth = (availableWidth - (cols - 1) * padding) / cols;
  const cellHeight = (availableHeight - (rows - 1) * padding) / rows;

  return images.map((img, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    // Calculate aspect ratio fit
    // We don't know the actual image aspect ratio here easily without loading it, 
    // but we can assume the current width/height in the object are somewhat representative 
    // or just fit it into the cell.
    // For a "Smart Collage", we usually want to fit the image within the cell while maintaining aspect ratio.
    
    // Since we might not have original aspect ratio stored, we'll just fit to cell for now
    // or keep current aspect ratio and scale to fit.
    const aspectRatio = img.width / img.height;
    
    let newWidth = cellWidth;
    let newHeight = cellWidth / aspectRatio;

    if (newHeight > cellHeight) {
      newHeight = cellHeight;
      newWidth = cellHeight * aspectRatio;
    }

    return {
      ...img,
      x: padding + col * (cellWidth + padding) + (cellWidth - newWidth) / 2,
      y: padding + row * (cellHeight + padding) + (cellHeight - newHeight) / 2,
      width: newWidth,
      height: newHeight,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    };
  });
};
