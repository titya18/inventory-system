import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, Scan, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  onDetected: (value: string) => void;
  onClose: () => void;
}

// BarcodeDetector is available in Chrome/Edge 83+ — declare types for TS
declare class BarcodeDetector {
  constructor(options?: { formats?: string[] });
  detect(image: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<Array<{ rawValue: string; format: string }>>;
  static getSupportedFormats(): Promise<string[]>;
}

const SUPPORTED = typeof window !== "undefined" && "BarcodeDetector" in window;

export const BarcodeScanner = ({ onDetected, onClose }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const rafRef = useRef<number>(0);
  const lastValueRef = useRef<string>("");

  const [status, setStatus] = useState<"loading" | "scanning" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    detector
      .detect(video)
      .then((results) => {
        if (results.length > 0) {
          const value = results[0].rawValue;
          // Debounce: only fire if different from last detected value
          if (value && value !== lastValueRef.current) {
            lastValueRef.current = value;
            stopStream();
            onDetected(value);
          }
        }
        rafRef.current = requestAnimationFrame(scanLoop);
      })
      .catch(() => {
        rafRef.current = requestAnimationFrame(scanLoop);
      });
  }, [onDetected, stopStream]);

  useEffect(() => {
    if (!SUPPORTED) {
      setStatus("error");
      setErrorMsg("Barcode scanning is not supported in this browser. Use Chrome or Edge 88+.");
      return;
    }

    detectorRef.current = new BarcodeDetector({
      formats: [
        "qr_code", "ean_13", "ean_8", "code_128",
        "code_39", "code_93", "upc_a", "upc_e",
        "itf", "codabar", "data_matrix", "pdf417",
      ],
    });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setStatus("scanning");
        rafRef.current = requestAnimationFrame(scanLoop);
      })
      .catch((err) => {
        setStatus("error");
        if (err.name === "NotAllowedError") {
          setErrorMsg("Camera permission denied. Allow camera access and try again.");
        } else if (err.name === "NotFoundError") {
          setErrorMsg("No camera found on this device.");
        } else {
          setErrorMsg("Could not access camera: " + err.message);
        }
      });

    return () => stopStream();
  }, [scanLoop, stopStream]);

  const handleClose = () => {
    stopStream();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999, backgroundColor: "rgba(15,23,42,0.85)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full flex flex-col rounded-2xl overflow-hidden"
        style={{ maxWidth: 420, backgroundColor: "#0f172a", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#3b82f6)" }}>
              <Scan className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Barcode Scanner</p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>Point camera at barcode or QR code</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#94a3b8" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.2)"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative" style={{ aspectRatio: "4/3", backgroundColor: "#000" }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
            autoPlay
          />

          {/* Corner aim guides */}
          {status === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative" style={{ width: 220, height: 220 }}>
                {/* Top-left */}
                <div className="absolute top-0 left-0 w-10 h-10" style={{ borderTop: "3px solid #6366f1", borderLeft: "3px solid #6366f1", borderRadius: "6px 0 0 0" }} />
                {/* Top-right */}
                <div className="absolute top-0 right-0 w-10 h-10" style={{ borderTop: "3px solid #6366f1", borderRight: "3px solid #6366f1", borderRadius: "0 6px 0 0" }} />
                {/* Bottom-left */}
                <div className="absolute bottom-0 left-0 w-10 h-10" style={{ borderBottom: "3px solid #6366f1", borderLeft: "3px solid #6366f1", borderRadius: "0 0 0 6px" }} />
                {/* Bottom-right */}
                <div className="absolute bottom-0 right-0 w-10 h-10" style={{ borderBottom: "3px solid #6366f1", borderRight: "3px solid #6366f1", borderRadius: "0 0 6px 0" }} />
                {/* Scanning line */}
                <div
                  className="absolute left-2 right-2"
                  style={{
                    height: 2,
                    background: "linear-gradient(to right, transparent, #6366f1, transparent)",
                    animation: "scanLine 2s ease-in-out infinite",
                    top: "50%",
                  }}
                />
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#6366f1" }} />
              <p className="text-sm" style={{ color: "#94a3b8" }}>Starting camera…</p>
            </div>
          )}

          {/* Error overlay */}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.15)" }}>
                <AlertCircle className="w-6 h-6" style={{ color: "#ef4444" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white mb-1">Cannot Access Camera</p>
                <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{errorMsg}</p>
              </div>
              {!SUPPORTED && (
                <div className="mt-1 px-3 py-2 rounded-xl text-xs text-center" style={{ backgroundColor: "rgba(99,102,241,0.12)", color: "#a5b4fc" }}>
                  Tip: Hardware barcode scanners work automatically — just scan into the search box.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <Camera className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#6366f1" }} />
          <p className="text-xs" style={{ color: "#64748b" }}>
            Supports EAN-13, Code 128, QR Code, UPC, PDF417 and more.
            Hardware scanners work directly in the search box.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0%, 100% { transform: translateY(-80px); opacity: 0.3; }
          50% { transform: translateY(80px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
