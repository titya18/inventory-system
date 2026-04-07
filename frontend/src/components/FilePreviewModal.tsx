import React, { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Trash2, ZoomIn, ZoomOut, RefreshCw, FileText } from "lucide-react";
import { useSwipeable } from "react-swipeable";
import { Document, Page, pdfjs } from "react-pdf";

// --- PDF worker (add at top-level once in your app) ---
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export type PreviewItem = {
  url: string;
  type: "image" | "pdf";
};

type Props = {
  isOpen: boolean;
  items: PreviewItem[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onClose: () => void;
  onDelete?: (index: number) => void;
};

export const FilePreviewModal: React.FC<Props> = ({
  isOpen,
  items,
  activeIndex,
  setActiveIndex,
  onClose,
  onDelete,
}) => {
   const [zoom, setZoom] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 }); // position
    const [dragging, setDragging] = useState(false);
    const [start, setStart] = useState({ x: 0, y: 0 });
    const imgRef = useRef<HTMLImageElement>(null);

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => { if (activeIndex < items.length - 1) setActiveIndex(activeIndex + 1); },
    onSwipedRight: () => { if (activeIndex > 0) setActiveIndex(activeIndex - 1); },
    trackMouse: true,
  });

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && activeIndex > 0) setActiveIndex(activeIndex - 1);
      if (e.key === "ArrowRight" && activeIndex < items.length - 1) setActiveIndex(activeIndex + 1);
      if (e.key === "Escape") onClose();
      if (e.key === "+") setZoom((z) => Math.min(z + 0.2, 3));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.2, 1));
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, items.length, isOpen, onClose]);

  // Early return after hooks
  if (!isOpen || items.length === 0) return null;

  const current = items[activeIndex];
  const resetZoom = () => {
    setZoom(1);
    setPos({ x: 0, y: 0 });
  };

  const handlePrev = () => { setActiveIndex(activeIndex - 1); resetZoom(); };
  const handleNext = () => { setActiveIndex(activeIndex + 1); resetZoom(); };

  // --- Drag handlers ---
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    setStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPos({ x: e.clientX - start.x, y: e.clientY - start.y });
  };

  const onMouseUp = () => setDragging(false);
  const onMouseLeave = () => setDragging(false);

  return (
    <div
        className={`fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto`}
    >
        <div
            className="flex items-center justify-center min-h-screen px-4"
        >
            <div className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg my-8">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="font-semibold text-lg">
                        Preview {activeIndex + 1} / {items.length}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* {onDelete && (
                            <button
                                onClick={() => onDelete(activeIndex)}
                                className="text-red-500 hover:text-red-600 transition"
                                title="Delete"
                            >
                                <Trash2 size={20} />
                            </button>
                        )} */}
                        <button
                            onClick={onClose}
                            className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition"
                            title="Close"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Main preview */}
                <div {...swipeHandlers} className="flex-1 flex justify-center items-center bg-gray-50 dark:bg-gray-800 relative overflow-hidden p-4">
                    {current.type === "image" ? (
                        <img
                            ref={imgRef}
                            src={current.url}
                            className="rounded-md cursor-grab select-none transition-transform duration-300"
                            style={{
                            transform: `scale(${zoom}) translate(${pos.x / zoom}px, ${pos.y / zoom}px)`,
                            cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default",
                            }}
                            onMouseDown={onMouseDown}
                            onMouseMove={onMouseMove}
                            onMouseUp={onMouseUp}
                            onMouseLeave={onMouseLeave}
                            draggable={false}
                        />
                    ) : (
                        <Document file={current.url} loading="Loading PDF..." className="w-full h-full">
                            <Page pageNumber={1} width={Math.min(window.innerWidth * 0.7, 800)} />
                        </Document>
                    )}

                    {/* Zoom controls */}
                    {current.type === "image" && (
                        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 flex flex-col gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                            {[
                            { onClick: () => setZoom((z) => Math.min(z + 0.2, 3)), icon: <ZoomIn size={20} />, label: "+" },
                            { onClick: () => setZoom((z) => Math.max(z - 0.2, 1)), icon: <ZoomOut size={20} />, label: "-" },
                            { onClick: resetZoom, icon: <RefreshCw size={20} />, label: "R" },
                            ].map((btn, i) => (
                            <button key={i} onClick={btn.onClick} className="flex items-center justify-center w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full transition shadow-lg" title={btn.label}>
                                {btn.icon}
                            </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        disabled={activeIndex === 0}
                        onClick={handlePrev}
                        className="btn btn-outline-primary"
                    >
                        <ChevronLeft /> Prev
                    </button>
                        <span className="text-gray-700 dark:text-gray-300">
                            {activeIndex + 1} / {items.length}
                        </span>
                    <button
                        disabled={activeIndex === items.length - 1}
                        onClick={handleNext}
                        className="btn btn-outline-primary"
                    >
                        Next <ChevronRight />
                    </button>
                </div>

                {/* Thumbnails */}
                <div className="flex gap-2 overflow-x-auto p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                    {items.map((item, idx) => (
                        <div
                            key={idx}
                            className={`border-2 rounded-md cursor-pointer shrink-0 transition-transform hover:scale-105 ${
                                idx === activeIndex
                                ? "border-blue-500 shadow-lg"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                            onClick={() => { setActiveIndex(idx); resetZoom(); }}
                        >
                            {item.type === "image" ? (
                                <img src={item.url} className="w-20 h-20 object-cover" />
                            ) : (
                                <div className="w-20 h-20 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-xs font-semibold">
                                <FileText size={16} /> PDF
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>

  );
};
