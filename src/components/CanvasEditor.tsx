import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { v4 as uuidv4 } from 'uuid';
import { jsPDF } from 'jspdf';
import { 
  Upload, 
  LayoutTemplate, 
  Crop, 
  Wand2, 
  Eraser, 
  Undo2, 
  Redo2, 
  Download, 
  ZoomIn, 
  ZoomOut,
  Trash2,
  MousePointer2,
  Image as ImageIcon,
  Settings2,
  ChevronRight
} from 'lucide-react';
import { URLImage } from './URLImage';
import { CropModal } from './CropModal';
import { arrangeImagesSmartly } from '../utils/collage';
import { CatalogImage, A4_WIDTH, A4_HEIGHT, AppState } from '../types';

const STORAGE_KEY = 'a4-catalog-maker-state';

export default function CanvasEditor() {
  // --- State ---
  const [images, setImages] = useState<CatalogImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.8); // Start with a view that fits most screens
  const [history, setHistory] = useState<CatalogImage[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  
  const stageRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Auto-Load ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setImages(parsed);
          // Initialize history with loaded state
          setHistory([parsed]);
          setHistoryStep(0);
        }
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  // --- Auto-Save ---
  useEffect(() => {
    if (images.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
    }
  }, [images]);

  // --- History Management ---
  const pushHistory = (newImages: CatalogImage[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newImages);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    setImages(newImages);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setHistoryStep(prevStep);
      setImages(history[prevStep]);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      setImages(history[nextStep]);
    }
  };

  // --- Actions ---
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages: CatalogImage[] = [];

      let processedCount = 0;
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.src = reader.result as string;
          img.onload = () => {
            newImages.push({
              id: uuidv4(),
              src: reader.result as string,
              x: Math.random() * (A4_WIDTH - 200),
              y: Math.random() * (A4_HEIGHT - 200),
              width: 200, // Default width
              height: 200 * (img.height / img.width),
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            });
            processedCount++;
            if (processedCount === files.length) {
              pushHistory([...images, ...newImages]);
            }
          };
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSmartCollage = () => {
    const arranged = arrangeImagesSmartly(images);
    pushHistory(arranged);
  };

  const handleCropStart = () => {
    if (selectedId) {
      setIsCropModalOpen(true);
    }
  };

  const handleCropComplete = (croppedSrc: string) => {
    const updated = images.map(img => 
      img.id === selectedId ? { ...img, src: croppedSrc, width: img.width, height: img.height } : img // Keep dimensions or reset? Usually reset aspect ratio but keep width
    );
    // We might want to adjust dimensions based on new crop aspect ratio
    // But for simplicity, let's just update the source and let the user resize if needed, 
    // or we could recalculate height based on width.
    const selectedImg = updated.find(img => img.id === selectedId);
    if (selectedImg) {
       const i = new Image();
       i.onload = () => {
          const ratio = i.height / i.width;
          selectedImg.height = selectedImg.width * ratio;
          pushHistory(updated);
       };
       i.src = croppedSrc;
    } else {
        pushHistory(updated);
    }
    
    setIsCropModalOpen(false);
  };

  const handleAutoColor = () => {
    if (!selectedId) return;
    const updated = images.map(img => 
      img.id === selectedId ? { ...img, brightness: 0.1, contrast: 20 } : img
    );
    pushHistory(updated);
  };

  const handleRemoveBg = () => {
    if (!selectedId) return;
    
    // Toggle removeBg flag
    const updated = images.map(img => 
      img.id === selectedId ? { ...img, removeBg: !img.removeBg } : img
    );
    pushHistory(updated);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const updated = images.filter(img => img.id !== selectedId);
    pushHistory(updated);
    setSelectedId(null);
  };

  const handleDownload = async () => {
    // Deselect everything first to remove transformer handles
    setSelectedId(null);
    
    // Wait for render
    setTimeout(() => {
      if (stageRef.current) {
        const uri = stageRef.current.toDataURL({ pixelRatio: 2 }); // High quality
        
        // Generate PDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [A4_WIDTH, A4_HEIGHT]
        });
        
        pdf.addImage(uri, 'JPEG', 0, 0, A4_WIDTH, A4_HEIGHT);
        pdf.save('catalog.pdf');
        
        // Also download JPG
        const link = document.createElement('a');
        link.download = 'catalog.jpg';
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }, 100);
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 2));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.5));

  const selectedImage = images.find(i => i.id === selectedId);

  return (
    <div className="flex h-screen w-full bg-zinc-50 overflow-hidden font-sans text-zinc-900">
      {/* Sidebar - Professional Dark Theme */}
      <div className="w-20 lg:w-72 bg-zinc-900 text-zinc-300 flex flex-col border-r border-zinc-800 shadow-2xl z-20">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-800 bg-zinc-950">
          <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20">
            <LayoutTemplate size={18} className="text-white" />
          </div>
          <h1 className="hidden lg:block font-bold text-lg text-white tracking-tight">Catalog<span className="text-zinc-500 font-light">Pro</span></h1>
        </div>
        
        {/* Tools */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8 custom-scrollbar">
          
          {/* Main Actions */}
          <div className="space-y-1">
            <p className="px-3 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Assets</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-100 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-md hover:shadow-indigo-500/25 group"
            >
              <Upload size={18} />
              <span className="hidden lg:inline font-medium">Upload Images</span>
            </button>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleUpload}
            />
            
            <button 
              onClick={handleSmartCollage}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <LayoutTemplate size={18} />
              <span className="hidden lg:inline font-medium">Smart Collage</span>
            </button>
          </div>

          {/* Contextual Tools */}
          <div className="space-y-1">
            <p className="px-3 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
              {selectedId ? 'Edit Selected' : 'Selection'}
            </p>
            
            {!selectedId && (
              <div className="px-3 py-4 text-sm text-zinc-600 italic text-center border border-dashed border-zinc-800 rounded-lg">
                Select an image to edit
              </div>
            )}

            <button 
              onClick={handleCropStart} 
              disabled={!selectedId}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                selectedId 
                  ? 'text-zinc-300 hover:text-white hover:bg-zinc-800' 
                  : 'text-zinc-700 cursor-not-allowed'
              }`}
            >
              <Crop size={18} />
              <span className="hidden lg:inline font-medium">Crop Image</span>
            </button>
            
            <button 
              onClick={handleAutoColor} 
              disabled={!selectedId}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                selectedId 
                  ? 'text-zinc-300 hover:text-white hover:bg-zinc-800' 
                  : 'text-zinc-700 cursor-not-allowed'
              }`}
            >
              <Wand2 size={18} />
              <span className="hidden lg:inline font-medium">Auto Enhance</span>
            </button>
            
            <button 
              onClick={handleRemoveBg} 
              disabled={!selectedId}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                selectedId 
                  ? 'text-zinc-300 hover:text-white hover:bg-zinc-800' 
                  : 'text-zinc-700 cursor-not-allowed'
              }`}
            >
              <Eraser size={18} />
              <span className="hidden lg:inline font-medium">Remove Background</span>
            </button>

            <div className="pt-2 mt-2 border-t border-zinc-800">
              <button 
                onClick={handleDelete} 
                disabled={!selectedId}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  selectedId 
                    ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                    : 'text-zinc-700 cursor-not-allowed'
                }`}
              >
                <Trash2 size={18} />
                <span className="hidden lg:inline font-medium">Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950">
           <button 
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 p-3 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-white transition-all shadow-lg font-semibold"
            >
              <Download size={18} />
              <span className="hidden lg:inline">Export PDF</span>
            </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative bg-zinc-100">
        
        {/* Top Bar - Floating Style */}
        <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-start pointer-events-none">
          {/* Left: History Controls */}
          <div className="bg-white/90 backdrop-blur-md border border-zinc-200/50 p-1.5 rounded-xl shadow-sm flex gap-1 pointer-events-auto">
             <button 
               onClick={handleUndo} 
               disabled={historyStep <= 0} 
               className="p-2 hover:bg-zinc-100 text-zinc-700 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors" 
               title="Undo (Ctrl+Z)"
             >
               <Undo2 size={18} />
             </button>
             <button 
               onClick={handleRedo} 
               disabled={historyStep >= history.length - 1} 
               className="p-2 hover:bg-zinc-100 text-zinc-700 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors" 
               title="Redo (Ctrl+Y)"
             >
               <Redo2 size={18} />
             </button>
          </div>

          {/* Right: Zoom Controls */}
          <div className="bg-white/90 backdrop-blur-md border border-zinc-200/50 p-1.5 rounded-xl shadow-sm flex items-center gap-2 pointer-events-auto">
            <button onClick={handleZoomOut} className="p-2 hover:bg-zinc-100 text-zinc-700 rounded-lg transition-colors">
              <ZoomOut size={18} />
            </button>
            <span className="text-xs font-mono w-12 text-center font-medium text-zinc-600">{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} className="p-2 hover:bg-zinc-100 text-zinc-700 rounded-lg transition-colors">
              <ZoomIn size={18} />
            </button>
          </div>
        </div>

        {/* Canvas Scroll Area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-12 custom-scrollbar bg-dots">
          <div 
            className="bg-white shadow-2xl transition-transform duration-200 ease-out origin-center ring-1 ring-zinc-900/5"
            style={{ 
              width: A4_WIDTH, 
              height: A4_HEIGHT,
              transform: `scale(${scale})`,
              minWidth: A4_WIDTH,
              minHeight: A4_HEIGHT
            }}
          >
            <Stage 
              width={A4_WIDTH} 
              height={A4_HEIGHT} 
              ref={stageRef}
              onMouseDown={(e) => {
                const clickedOnEmpty = e.target === e.target.getStage();
                if (clickedOnEmpty) {
                  setSelectedId(null);
                }
              }}
            >
              <Layer>
                <Rect width={A4_WIDTH} height={A4_HEIGHT} fill="white" />
                {images.map((img, i) => (
                  <URLImage
                    key={img.id}
                    image={img}
                    isSelected={img.id === selectedId}
                    onSelect={() => setSelectedId(img.id)}
                    onChange={(newAttrs) => {
                      const updated = images.slice();
                      updated[i] = { ...updated[i], ...newAttrs };
                      pushHistory(updated);
                    }}
                  />
                ))}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isCropModalOpen && selectedImage && (
        <CropModal
          imageSrc={selectedImage.src}
          onCancel={() => setIsCropModalOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}
      
      {/* Keyboard Shortcuts */}
      <KeyboardHandler 
        onUndo={handleUndo} 
        onRedo={handleRedo} 
        onDelete={handleDelete} 
      />
    </div>
  );
}

// Helper for keyboard shortcuts
const KeyboardHandler = ({ onUndo, onRedo, onDelete }: { onUndo: () => void, onRedo: () => void, onDelete: () => void }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        onUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        onRedo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          onDelete();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, onDelete]);
  return null;
};
