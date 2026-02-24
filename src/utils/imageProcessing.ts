import { Filter } from 'konva/lib/Node';

// A simple custom filter for "Remove White Background"
// This is a pixel manipulation filter for Konva
export const RemoveWhiteBackground = function (imageData: ImageData) {
  const data = imageData.data;
  const threshold = 240; // Sensitivity for "white"
  const distance = 20; // Fade distance

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Check if pixel is close to white
    if (r > threshold && g > threshold && b > threshold) {
      data[i + 3] = 0; // Set alpha to 0
    }
  }
};

// Auto adjust brightness/contrast
// We can use standard Konva filters for this, but here is a helper to determine values
export const getAutoAdjustValues = () => {
  return {
    brightness: 0.1,
    contrast: 10,
  };
};
