import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStockRequestById } from "@/api/stockRequest";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { getLogoUrl } from "@/api/settings";
import "@/assets/print_css/Print.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { ArrowLeft, Printer } from "lucide-react";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Phnom_Penh";

const formatDate = (d?: string | Date | null) =>
    d ? dayjs(d).tz(TZ).format("DD-MMM-YYYY") : "—";

const statusColor: Record<string, string> = {
    PENDING:  "#f59e0b",
    APPROVED: "#10b981",
    CANCELLED: "#ef4444",
};

const PrintStockRequest: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { settings } = useCompanySettings();
    const printRef = useRef<HTMLDivElement>(null);

    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        setIsLoading(true);
        getStockRequestById(Number(id))
            .then(setData)
            .catch(() => setError("Failed to load stock request"))
            .finally(() => setIsLoading(false));
    }, [id]);

    const handlePrint = () => window.print();

    if (isLoading) return <div className="p-8 text-center">Loading…</div>;
    if (error || !data) return <div className="p-8 text-center text-red-500">{error || "Not found"}</div>;

    const items: any[] = data.requestDetails ?? [];

    return (
        <div>
            {/* ── toolbar (hidden on print) ── */}
            <div className="no-print flex items-center gap-3 px-6 py-4 border-b bg-white">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="btn btn-outline-secondary flex items-center gap-1"
                >
                    <ArrowLeft size={16} /> Go Back
                </button>
                <button
                    type="button"
                    onClick={handlePrint}
                    className="btn btn-primary flex items-center gap-1"
                >
                    <Printer size={16} /> Print
                </button>
            </div>

            {/* ── printable area ── */}
            <div ref={printRef} className="invoice-container" style={{ maxWidth: 900, margin: "0 auto", padding: "20px 30px", background: "#fff" }}>

                {/* Header */}
                <div className="invoice-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #6366f1", paddingBottom: 12, marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {settings.logoUrl && (
                            <img src={getLogoUrl(settings.logoUrl)} alt="Logo" style={{ height: 72 }} />
                        )}
                        <div>
                            {settings.companyNameKh && (
                                <div className="khmer-muol" style={{ fontSize: 15, marginBottom: 4 }}>{settings.companyNameKh}</div>
                            )}
                            {settings.companyNameEn && (
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{settings.companyNameEn}</div>
                            )}
                            {settings.addressEn && (
                                <div style={{ fontSize: 12, color: "#555" }}>{settings.addressEn}</div>
                            )}
                            {settings.phone && (
                                <div style={{ fontSize: 12, color: "#555" }}>Tel: {settings.phone}</div>
                            )}
                        </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#6366f1", letterSpacing: 1, marginBottom: 6 }}>
                            STOCK REQUEST
                        </div>
                        <table style={{ fontSize: 12, marginLeft: "auto", borderCollapse: "collapse" }}>
                            <tbody>
                                <tr>
                                    <td style={{ paddingRight: 8, color: "#888" }}>Ref No.</td>
                                    <td><strong>{data.ref}</strong></td>
                                </tr>
                                <tr>
                                    <td style={{ paddingRight: 8, color: "#888" }}>Date</td>
                                    <td>{formatDate(data.requestDate)}</td>
                                </tr>
                                <tr>
                                    <td style={{ paddingRight: 8, color: "#888" }}>Status</td>
                                    <td>
                                        <span style={{
                                            background: statusColor[data.StatusType] ?? "#6366f1",
                                            color: "#fff",
                                            borderRadius: 4,
                                            padding: "1px 8px",
                                            fontSize: 11,
                                            fontWeight: 700,
                                        }}>
                                            {data.StatusType}
                                        </span>
                                    </td>
                                </tr>
                                {data.approvedAt && (
                                    <tr>
                                        <td style={{ paddingRight: 8, color: "#888" }}>Approved</td>
                                        <td>{formatDate(data.approvedAt)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* From / To info */}
                <div style={{ display: "flex", gap: 24, marginBottom: 16, fontSize: 13 }}>
                    <div style={{ flex: 1, background: "#f8f8ff", border: "1px solid #e0e0ff", borderRadius: 6, padding: "10px 14px" }}>
                        <div style={{ fontWeight: 700, marginBottom: 4, color: "#6366f1" }}>Request Branch</div>
                        <div>{data.branch?.name ?? "—"}</div>
                    </div>
                    <div style={{ flex: 1, background: "#f8f8ff", border: "1px solid #e0e0ff", borderRadius: 6, padding: "10px 14px" }}>
                        <div style={{ fontWeight: 700, marginBottom: 4, color: "#6366f1" }}>Requested By</div>
                        <div>{data.requester ? `${data.requester.firstName} ${data.requester.lastName}`.trim() : "—"}</div>
                    </div>
                    {data.order && (
                        <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "10px 14px" }}>
                            <div style={{ fontWeight: 700, marginBottom: 4, color: "#10b981" }}>Linked Invoice</div>
                            <div style={{ fontFamily: "monospace", fontWeight: 700 }}>{data.order.ref}</div>
                            <div style={{ fontSize: 11, color: "#888" }}>Stock not re-cut on approval</div>
                        </div>
                    )}
                </div>

                {/* Items table */}
                <div className="items-section" style={{ marginBottom: 20 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "#6366f1", color: "#fff" }}>
                                <th style={{ padding: "7px 10px", textAlign: "left", width: 36 }}>#</th>
                                <th style={{ padding: "7px 10px", textAlign: "left" }}>Product</th>
                                <th style={{ padding: "7px 10px", textAlign: "left" }}>Barcode</th>
                                <th style={{ padding: "7px 10px", textAlign: "center" }}>Unit</th>
                                <th style={{ padding: "7px 10px", textAlign: "right" }}>Qty</th>
                                <th style={{ padding: "7px 10px", textAlign: "right" }}>Base Qty</th>
                                <th style={{ padding: "7px 10px", textAlign: "left" }}>Serials</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: "16px 10px", textAlign: "center", color: "#aaa" }}>No items</td>
                                </tr>
                            ) : items.map((item: any, i: number) => {
                                const unitName = item.productvariants?.baseUnit?.name
                                    ?? item.productvariants?.units?.name
                                    ?? "pcs";
                                // Try to find unit name from conversions
                                const selectedUnit = item.productvariants?.productUnitConversions?.find(
                                    (c: any) => c.fromUnitId === item.unitId || c.toUnitId === item.unitId
                                );
                                const displayUnitName = selectedUnit?.fromUnit?.name ?? selectedUnit?.toUnit?.name ?? unitName;

                                const serials: string[] = item.selectedTrackedItems?.map((s: any) => s.serialNumber).filter(Boolean) ?? [];

                                return (
                                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9f9ff", borderBottom: "1px solid #e8e8f0" }}>
                                        <td style={{ padding: "7px 10px", color: "#888" }}>{i + 1}</td>
                                        <td style={{ padding: "7px 10px" }}>
                                            <div style={{ fontWeight: 600 }}>{item.products?.name}</div>
                                            <div style={{ fontSize: 11, color: "#888" }}>{item.productvariants?.productType}</div>
                                        </td>
                                        <td style={{ padding: "7px 10px", fontFamily: "monospace", fontSize: 11, color: "#555" }}>
                                            {item.productvariants?.barcode ?? "—"}
                                        </td>
                                        <td style={{ padding: "7px 10px", textAlign: "center" }}>{displayUnitName}</td>
                                        <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 600 }}>
                                            {Number(item.unitQty ?? item.quantity ?? 0)}
                                        </td>
                                        <td style={{ padding: "7px 10px", textAlign: "right" }}>
                                            {Number(item.baseQty ?? item.quantity ?? 0)}
                                        </td>
                                        <td style={{ padding: "7px 10px" }}>
                                            {serials.length > 0 ? (
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                                    {serials.map((sn) => (
                                                        <span key={sn} style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 4, padding: "1px 6px", fontSize: 11, fontFamily: "monospace" }}>
                                                            {sn}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ color: "#bbb", fontSize: 11 }}>—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Note */}
                {data.note && (
                    <div style={{ marginBottom: 20, fontSize: 13 }}>
                        <span style={{ fontWeight: 700, color: "#555" }}>Note: </span>
                        <span style={{ color: "#333" }}>{data.note}</span>
                    </div>
                )}

                {/* Signatures */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, fontSize: 13 }}>
                    {["Requested By", "Approved By", "Received By"].map((label) => (
                        <div key={label} style={{ textAlign: "center", width: "28%" }}>
                            <div style={{ borderTop: "1px solid #999", paddingTop: 6, marginTop: 36, color: "#555" }}>{label}</div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{ marginTop: 24, borderTop: "1px solid #e0e0e0", paddingTop: 8, fontSize: 11, color: "#aaa", textAlign: "center" }}>
                    Printed on {dayjs().tz(TZ).format("DD-MMM-YYYY HH:mm")}
                    {settings.companyNameEn && ` · ${settings.companyNameEn}`}
                </div>
            </div>
        </div>
    );
};

export default PrintStockRequest;
