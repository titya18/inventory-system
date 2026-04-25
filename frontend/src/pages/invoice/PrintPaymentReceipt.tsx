import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPaymentReceipt } from "../../api/invoice";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { getLogoUrl } from "@/api/settings";
import { Print } from "@mui/icons-material";
import { ArrowLeft } from "lucide-react";
import "@/assets/print_css/Print.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const InfoRow: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
    <tr>
        <td style={{ padding: '3px 0', color: '#555', width: '48%', fontSize: '12px' }}>{label}</td>
        <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: bold ? 'bold' : 'normal', fontSize: '12px' }}>: {value}</td>
    </tr>
);

const fmt = (n: any, decimals = 2) =>
    Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const PrintPaymentReceipt: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [payment, setPayment] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { settings } = useCompanySettings();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getPaymentReceipt(Number(id));
                setPayment(data);
            } catch (error) {
                console.error("Error fetching payment receipt:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (isLoading) return <div className="p-10 text-center text-gray-500">Loading...</div>;
    if (!payment) return <div className="p-10 text-center text-danger">Receipt not found.</div>;

    const receiptNumber = `RCP-${String(payment.id).padStart(5, '0')}`;
    const paymentDate = dayjs.tz(payment.paymentDate, "Asia/Phnom_Penh").format("DD/MM/YYYY HH:mm");
    const invoiceTotal = Number(payment.orders?.totalAmount ?? 0);
    const paidAmount = Number(payment.orders?.paidAmount ?? 0);
    const remaining = Math.max(0, invoiceTotal - paidAmount);
    const items: any[] = payment.orders?.items ?? [];

    return (
        <div>
            {/* Controls — hidden when printing */}
            <div className="no-print flex gap-3 p-4">
                <button onClick={() => window.history.back()} className="btn btn-outline-warning btn-sm">
                    <ArrowLeft size={16} className="mr-1" /> Go Back
                </button>
                <button onClick={() => window.print()} className="btn btn-primary btn-sm">
                    <Print fontSize="small" className="mr-1" /> Print
                </button>
            </div>

            {/* Receipt body */}
            <div style={{
                maxWidth: '560px',
                margin: '0 auto',
                padding: '24px 20px',
                fontFamily: '"Times New Roman", Times, serif',
                color: '#000',
                background: '#fff',
            }}>
                {/* Company header */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid #ffab93', paddingBottom: '12px', marginBottom: '14px' }}>
                    <img src={getLogoUrl(settings.logoUrl)} alt="Logo" style={{ height: '64px', marginBottom: '6px' }} />
                    {settings.companyNameKh && (
                        <div className="khmer-muol" style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '2px' }}>
                            {settings.companyNameKh}
                        </div>
                    )}
                    {settings.companyNameEn && (
                        <div style={{ fontWeight: 900, fontSize: '13px' }}>{settings.companyNameEn}</div>
                    )}
                    {settings.vatNumber && (
                        <div style={{ fontSize: '11px', color: '#444' }}>
                            លេខអត្តសញ្ញាណកម្ម អតប (VATTIN) {settings.vatNumber}
                        </div>
                    )}
                    {settings.phone && (
                        <div style={{ fontSize: '11px', color: '#444' }}>ទូរស័ព្ទ / Tel: {settings.phone}</div>
                    )}
                </div>

                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '17px', fontWeight: 'bold', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                        Payment Receipt
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>វិក្កយបត្រទូទាត់</div>
                </div>

                {/* Receipt info */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                    <tbody>
                        <InfoRow label="Receipt No" value={receiptNumber} bold />
                        <InfoRow label="Date / កាលបរិច្ឆេទ" value={paymentDate} />
                        <InfoRow label="Invoice Ref" value={payment.orders?.ref ?? '—'} />
                        <InfoRow label="Customer / អតិថិជន" value={payment.orders?.customer?.name ?? 'Walk-in'} />
                        {payment.orders?.customer?.phone && (
                            <InfoRow label="Phone / ទូរស័ព្ទ" value={payment.orders.customer.phone} />
                        )}
                        <InfoRow label="Branch / សាខា" value={payment.orders?.branch?.name ?? '—'} />
                    </tbody>
                </table>

                <hr style={{ borderTop: '1px dashed #bbb', margin: '10px 0' }} />

                {/* Items table */}
                {items.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #333' }}>
                                    <th style={{ textAlign: 'left', padding: '4px 2px', fontWeight: 'bold' }}>#</th>
                                    <th style={{ textAlign: 'left', padding: '4px 2px', fontWeight: 'bold' }}>Item</th>
                                    <th style={{ textAlign: 'right', padding: '4px 2px', fontWeight: 'bold' }}>Qty</th>
                                    <th style={{ textAlign: 'right', padding: '4px 2px', fontWeight: 'bold' }}>Price</th>
                                    <th style={{ textAlign: 'right', padding: '4px 2px', fontWeight: 'bold' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item: any, idx: number) => {
                                    const name = item.products?.name ?? item.services?.name ?? '—';
                                    const trackingType = item.productvariants?.trackingType;
                                    const isTracked = trackingType && trackingType !== 'NONE';
                                    const serials: any[] = isTracked
                                        ? (item.selectedAssetItems ?? []).map((link: any) => link.productAssetItem).filter(Boolean)
                                        : [];
                                    return (
                                        <tr key={item.id} style={{ borderBottom: '1px dashed #eee' }}>
                                            <td style={{ padding: '4px 2px', verticalAlign: 'top' }}>{idx + 1}</td>
                                            <td style={{ padding: '4px 2px', verticalAlign: 'top' }}>
                                                <div>
                                                {name}
                                                {serials.length > 0 && (
                                                    <span style={{ fontSize: '10px', color: '#444', marginLeft: '4px' }}>
                                                        ({serials.map((s: any) => s.serialNumber).join(', ')})
                                                    </span>
                                                )}
                                            </div>
                                            </td>
                                            <td style={{ padding: '4px 2px', textAlign: 'right', verticalAlign: 'top' }}>
                                                {fmt(item.quantity, 0)}
                                            </td>
                                            <td style={{ padding: '4px 2px', textAlign: 'right', verticalAlign: 'top' }}>
                                                $ {fmt(item.price)}
                                            </td>
                                            <td style={{ padding: '4px 2px', textAlign: 'right', verticalAlign: 'top' }}>
                                                $ {fmt(item.total)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '1px solid #333' }}>
                                    <td colSpan={4} style={{ padding: '4px 2px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>
                                        Invoice Total
                                    </td>
                                    <td style={{ padding: '4px 2px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>
                                        $ {fmt(invoiceTotal)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                <hr style={{ borderTop: '1px dashed #bbb', margin: '10px 0' }} />

                {/* Payment details */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                    <tbody>
                        <InfoRow label="Payment Method" value={payment.paymentMethods?.name ?? '—'} />
                        {payment.receive_usd != null && Number(payment.receive_usd) > 0 && (
                            <InfoRow label="Received (USD)" value={`$ ${fmt(payment.receive_usd)}`} />
                        )}
                        {payment.receive_khr != null && Number(payment.receive_khr) > 0 && (
                            <InfoRow label="Received (KHR)" value={`${Number(payment.receive_khr).toLocaleString()} ៛`} />
                        )}
                        {payment.exchangerate != null && (
                            <InfoRow label="Exchange Rate" value={`$1 = ${Number(payment.exchangerate).toLocaleString()} ៛`} />
                        )}
                    </tbody>
                </table>

                <hr style={{ borderTop: '2px solid #000', margin: '10px 0' }} />

                {/* Summary totals */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                    <tbody>
                        <InfoRow label="Amount Applied" value={`$ ${fmt(payment.totalPaid)}`} bold />
                        <InfoRow label="Remaining Balance" value={`$ ${fmt(remaining)}`} />
                    </tbody>
                </table>

                {/* Footer */}
                <div style={{ textAlign: 'center', borderTop: '1px solid #ddd', paddingTop: '10px', fontSize: '11px', color: '#777' }}>
                    <div>Thank you for your payment!</div>
                    <div>អរគុណចំពោះការទូទាត់របស់លោកអ្នក!</div>
                </div>
            </div>
        </div>
    );
};

export default PrintPaymentReceipt;
