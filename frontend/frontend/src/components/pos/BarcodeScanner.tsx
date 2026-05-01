import { useEffect, useRef, useState } from "react";
import { X, Scan, AlertCircle, Loader2, Camera } from "lucide-react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/browser";

interface Props {
  onDetected: (value: string) => void;
  onClose: () => void;
}

export const BarcodeScanner = ({ onDetected, onClose }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const [status, setStatus] = useState<"loading" | "scanning" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const start = async () => {
      try {
        // Get list of video devices; prefer back camera
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const deviceId =
          devices.find((d) => /back|rear|environment/i.test(d.label))?.deviceId ??
          devices[0]?.deviceId ??
          undefined;

        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              const value = result.getText();
              if (value) {
                controls.stop();
                onDetected(value);
              }
            }
            if (err && !(err instanceof NotFoundException)) {
              // NotFoundException fires every frame when no barcode is in view — ignore it
              console.warn("Scanner error:", err);
            }
          }
        );
        controlsRef.current = controls;
        setStatus("scanning");
      } catch (err: any) {
        setStatus("error");
        if (err?.name === "NotAllowedError") {
          setErrorMsg("Camera permission denied. Click the camera icon in your browser address bar and allow access.");
        } else if (err?.name === "NotFoundError") {
          setErrorMsg("No camera found on this device.");
        } else {
          setErrorMsg(err?.message || "Could not start camera.");
        }
      }
    };

    start();

    return () => {
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  const handleClose = () => {
    controlsRef.current?.stop();
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
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#94a3b8" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.2)"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />

          {/* Aim guides — shown only while scanning */}
          {status === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative" style={{ width: 220, height: 220 }}>
                <div className="absolute top-0 left-0 w-10 h-10" style={{ borderTop: "3px solid #6366f1", borderLeft: "3px solid #6366f1", borderRadius: "6px 0 0 0" }} />
                <div className="absolute top-0 right-0 w-10 h-10" style={{ borderTop: "3px solid #6366f1", borderRight: "3px solid #6366f1", borderRadius: "0 6px 0 0" }} />
                <div className="absolute bottom-0 left-0 w-10 h-10" style={{ borderBottom: "3px solid #6366f1", borderLeft: "3px solid #6366f1", borderRadius: "0 0 0 6px" }} />
                <div className="absolute bottom-0 right-0 w-10 h-10" style={{ borderBottom: "3px solid #6366f1", borderRight: "3px solid #6366f1", borderRadius: "0 0 6px 0" }} />
                {/* Animated scan line */}
                <div
                  style={{
                    position: "absolute",
                    left: 8,
                    right: 8,
                    height: 2,
                    background: "linear-gradient(to right, transparent, #6366f1, transparent)",
                    animation: "scanLine 2s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#6366f1" }} />
              <p className="text-sm" style={{ color: "#94a3b8" }}>Starting camera…</p>
            </div>
          )}

          {/* Error overlay */}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6" style={{ backgroundColor: "rgba(0,0,0,0.9)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.15)" }}>
                <AlertCircle className="w-6 h-6" style={{ color: "#ef4444" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white mb-1.5">Cannot Access Camera</p>
                <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{errorMsg}</p>
              </div>
              <div className="mt-1 px-3 py-2.5 rounded-xl text-xs text-center" style={{ backgroundColor: "rgba(99,102,241,0.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)" }}>
                Tip: Hardware barcode scanners work automatically —<br />just scan directly into the search box.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <Camera className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#6366f1" }} />
          <p className="text-xs" style={{ color: "#64748b" }}>
            Supports QR Code, EAN-13, Code 128, UPC, PDF417 and more.
            Hardware scanners work directly in the search box.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 8px; opacity: 0.4; }
          50% { top: calc(100% - 10px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
