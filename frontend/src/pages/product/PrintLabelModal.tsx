import React, { useRef, useState } from "react";
import Barcode from "react-barcode";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ProductType } from "@/data_types/types";

interface LabelItem {
  productName: string;
  productType: string;
  sku: string;
  barcode: string;
  retailPrice: number | string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: ProductType[];
}

const PrintLabelModal: React.FC<Props> = ({ isOpen, onClose, products }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const labels: LabelItem[] = products.flatMap((p) => {
    const variants = (p as any).productvariants ?? [];
    return variants.map((v: any) => ({
      productName: p.name,
      productType: v.productType ?? "New",
      sku: v.sku ?? "",
      barcode: v.barcode || v.sku || "",
      retailPrice: v.retailPrice ?? 0,
    }));
  });

  const [copies, setCopies] = useState<Record<number, number>>(
    Object.fromEntries(labels.map((_, i) => [i, 1]))
  );

  // Display options
  const [showBarcode, setShowBarcode] = useState(true);
  const [showQR, setShowQR] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!isOpen) return null;

  const handleCopies = (idx: number, val: number) => {
    setCopies((prev) => ({ ...prev, [idx]: Math.max(1, val) }));
  };

  // --- Print via new window (reliable SVG rendering + copies) ---
  const handlePrint = () => {
    if (!printRef.current) return;

    const cards = printRef.current.querySelectorAll<HTMLElement>(".label-card");
    let bodyHTML = "";
    cards.forEach((card, idx) => {
      const n = copies[idx] ?? 1;
      for (let i = 0; i < n; i++) {
        bodyHTML += `<div class="card">${card.innerHTML}</div>`;
      }
    });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 16px; }
  .grid { display: flex; flex-wrap: wrap; gap: 12px; }
  .card { border: 1px dashed #999; border-radius: 8px; padding: 12px; width: 220px; break-inside: avoid; page-break-inside: avoid; display: inline-block; vertical-align: top; }
  svg { display: block; max-width: 100%; height: auto; }
  .flex { display: flex; }
  .justify-center { justify-content: center; }
  .overflow-hidden { overflow: visible !important; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .flex-col { flex-direction: column; }
  .gap-2 { gap: 8px; }
  .font-bold { font-weight: 700; }
  .text-sm { font-size: 13px; }
  .text-xs { font-size: 11px; }
  .text-gray-500 { color: #6b7280; }
  .leading-tight { line-height: 1.25; }
  .mt-1 { margin-top: 4px; }
  .mt-0\\.5 { margin-top: 2px; }
  .border-t { border-top: 1px solid #e5e7eb; }
  .pt-2 { padding-top: 8px; }
  .px-1\\.5 { padding: 2px 6px; }
  .rounded { border-radius: 4px; }
  .font-medium { font-weight: 500; }
  .bg-amber-100 { background-color: #fef3c7; }
  .text-amber-700 { color: #b45309; }
  .bg-blue-100 { background-color: #dbeafe; }
  .text-blue-700 { color: #1d4ed8; }
  .text-red-400 { color: #f87171; }
  .text-center { text-align: center; }
  .ml-auto { margin-left: auto; }
  /* Hide copies stepper from print */
  .no-print { display: none !important; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<div class="grid">${bodyHTML}</div>
<script>window.onload = function(){ window.print(); window.close(); }</script>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "width=900,height=700");
    if (!win) { alert("Please allow popups to print labels."); return; }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  // --- Export PDF — per-card capture to avoid QR clipping + proper page breaks ---
  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setPdfLoading(true);
    // Yield to the browser so the "Generating..." button renders before heavy work starts
    await new Promise((r) => setTimeout(r, 50));

    const cards = printRef.current.querySelectorAll<HTMLElement>(".label-card");

    // PDF layout constants (mm)
    const margin = 10;
    const gap = 4;
    const cardWmm = 62;  // each card width in mm
    const pageW = 210;
    const pageH = 297;
    const cols = Math.floor((pageW - margin * 2 + gap) / (cardWmm + gap)); // 3 columns

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    let col = 0;
    let rowY = margin; // current Y position for this row
    let rowH = 0;      // tallest card in current row
    let firstPage = true;

    // Hidden staging area — positioned above viewport to avoid scroll issues
    const stage = document.createElement("div");
    stage.style.cssText = "position:fixed;top:-9999px;left:0;width:220px;background:white;";
    document.body.appendChild(stage);

    try {
      for (let idx = 0; idx < cards.length; idx++) {
        const n = copies[idx] ?? 1;

        // Prepare clone for capture
        const clone = cards[idx].cloneNode(true) as HTMLElement;
        clone.querySelectorAll<HTMLElement>(".no-print").forEach((el) => (el.style.display = "none"));
        clone.querySelectorAll<HTMLElement>(".overflow-hidden").forEach((el) => (el.style.overflow = "visible"));
        // Reset any computed margin-left on SVGs (QR code ml-auto issue)
        clone.querySelectorAll<SVGElement>("svg").forEach((svg) => { svg.style.marginLeft = "0"; });
        clone.style.cssText =
          "width:220px;padding:12px;background:white;display:flex;flex-direction:column;gap:8px;box-sizing:border-box;";

        stage.innerHTML = "";
        stage.appendChild(clone);

        // Capture once, reuse N times
        const canvas = await html2canvas(stage, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        const cardHmm = (canvas.height / canvas.width) * cardWmm;

        for (let i = 0; i < n; i++) {
          // New page needed?
          if (col === 0 && !firstPage && rowY + cardHmm > pageH - margin) {
            pdf.addPage();
            rowY = margin;
            rowH = 0;
          }
          firstPage = false;

          const x = margin + col * (cardWmm + gap);
          pdf.addImage(imgData, "PNG", x, rowY, cardWmm, cardHmm);

          rowH = Math.max(rowH, cardHmm);
          col++;
          if (col >= cols) {
            col = 0;
            rowY += rowH + gap;
            rowH = 0;
          }
        }
      }

      pdf.save("product-labels.pdf");
    } finally {
      document.body.removeChild(stage);
      setPdfLoading(false);
    }
  };

  const totalLabels = Object.values(copies).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/50 overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold">Print Product Labels</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Display options toolbar */}
        <div className="flex items-center gap-6 px-6 py-3 bg-gray-50 border-b flex-shrink-0">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Show:</span>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBarcode}
              onChange={(e) => setShowBarcode(e.target.checked)}
              className="accent-indigo-600"
            />
            <span className="text-sm">&nbsp; Barcode</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showQR}
              onChange={(e) => setShowQR(e.target.checked)}
              className="accent-indigo-600"
            />
            <span className="text-sm">&nbsp; QR Code</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(e) => setShowPrice(e.target.checked)}
              className="accent-indigo-600"
            />
            <span className="text-sm">&nbsp; Price</span>
          </label>
        </div>

        {/* Label grid */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: "65vh" }}>
          {labels.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No products selected.</p>
          ) : (
            <div ref={printRef} className="flex flex-wrap gap-4">
              {labels.map((label, idx) => (
                <div key={idx} className="label-card border border-dashed border-gray-300 rounded-lg p-3 w-[220px] flex flex-col gap-2 bg-white">
                  {/* Product info */}
                  <div>
                    <p className="font-bold text-sm leading-tight">{label.productName}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${label.productType === "SecondHand" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                      {label.productType}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">SKU: {label.sku}</p>
                  </div>

                  {/* Barcode */}
                  {showBarcode && (
                    label.barcode ? (
                      <div className="flex justify-center overflow-hidden">
                        <Barcode value={label.barcode} width={1.2} height={40} fontSize={10} margin={0} />
                      </div>
                    ) : (
                      <p className="text-xs text-red-400 text-center">No barcode</p>
                    )
                  )}

                  {/* Price + QR */}
                  {(showPrice || showQR) && (
                    <div className="flex items-center justify-between mt-1">
                      {showPrice && (
                        <div>
                          <p className="text-xs text-gray-500">Retail Price</p>
                          <p className="font-bold text-sm">${Number(label.retailPrice).toFixed(2)}</p>
                        </div>
                      )}
                      {showQR && label.barcode && (
                        <QRCode
                          value={label.barcode}
                          size={48}
                          style={{ height: 48, width: 48, marginLeft: "auto" }}
                        />
                      )}
                    </div>
                  )}

                  {/* Copies */}
                  <div className="no-print flex items-center gap-2 mt-1 border-t pt-2">
                    <label className="text-xs text-gray-500 whitespace-nowrap">Copies:</label>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopies(idx, (copies[idx] ?? 1) - 1)}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold"
                      >−</button>
                      <input
                        type="number"
                        min={1}
                        value={copies[idx] ?? 1}
                        onChange={(e) => handleCopies(idx, parseInt(e.target.value) || 1)}
                        className="w-10 text-center border rounded text-xs py-0.5"
                      />
                      <button
                        onClick={() => handleCopies(idx, (copies[idx] ?? 1) + 1)}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold"
                      >+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-xl flex-shrink-0">
          <p className="text-sm text-gray-500">
            {labels.length} variant{labels.length !== 1 ? "s" : ""} · {totalLabels} total label{totalLabels !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-outline-secondary btn-sm">Cancel</button>
            <button onClick={handleExportPDF} disabled={pdfLoading} className="btn btn-outline-primary btn-sm">
              {pdfLoading ? "Generating..." : "📄 Export PDF"}
            </button>
            <button onClick={handlePrint} className="btn btn-primary btn-sm">🖨 Print</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintLabelModal;
