import React, { useRef, useEffect } from 'react';
import { Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { CatalogImage } from '../types';
import { RemoveWhiteBackground } from '../utils/imageProcessing';

interface URLImageProps {
  image: CatalogImage;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newAttrs: Partial<CatalogImage>) => void;
}

export const URLImage: React.FC<URLImageProps> = ({ image, isSelected, onSelect, onChange }) => {
  const [img] = useImage(image.src);
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Apply filters
  useEffect(() => {
    if (shapeRef.current) {
      shapeRef.current.cache();
      
      const filters = [];
      if (image.brightness || image.contrast) {
        filters.push(Konva.Filters.Brighten);
        filters.push(Konva.Filters.Contrast);
        shapeRef.current.brightness(image.brightness || 0);
        shapeRef.current.contrast(image.contrast || 0);
      }
      
      if (image.removeBg) {
        // We need to cast the function to any because Konva types might be strict about Filter type
        filters.push(RemoveWhiteBackground as any);
      }
      
      shapeRef.current.filters(filters);
      shapeRef.current.getLayer()?.batchDraw();
    }
  }, [image.brightness, image.contrast, image.removeBg, img]);


  return (
    <React.Fragment>
      <KonvaImage
        image={img}
        x={image.x}
        y={image.y}
        width={image.width}
        height={image.height}
        rotation={image.rotation}
        scaleX={image.scaleX}
        scaleY={image.scaleY}
        draggable
        ref={shapeRef}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          if (!node) return;
          
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale to 1 and adjust width/height to avoid scaling artifacts if we were to save strict dimensions
          // But for Konva, keeping scale is often easier. 
          // However, to keep our data clean:
          onChange({
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            scaleX: scaleX,
            scaleY: scaleY,
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            // limit resize
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};
