import React, { useRef, useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as apiClient from "../../api/saleReturn";
import "./dateStyle.css";
import "@/assets/print_css/Print.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Print } from "@mui/icons-material";
import { ArrowLeft } from "lucide-react";
import { fi } from "date-fns/locale";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { getLogoUrl } from "@/api/settings";

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const InvoiceHeader: React.FC<{ data: any; settings: any }> = ({ settings }) => {
  return (
    <div className="invoice-header" style={{ marginBottom: '20px', borderBottom: '2px solid #ffab93', paddingBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <img src={getLogoUrl(settings.logoUrl)} alt="Logo" style={{ height: '80px', marginRight: '15px' }} />
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '10px 20px 20px 20px', minWidth: '100px' }}>
          {settings.companyNameKh && (
            <div className="khmer-muol" style={{ fontSize: '16px', color: '#000000', marginBottom: '10px' }}>
              {settings.companyNameKh}
            </div>
          )}
          <div style={{ fontSize: '14px' }}>
            {settings.companyNameEn && (
              <div style={{ color: '#000000', fontWeight: 900, fontSize: '14px', fontFamily: '"Times New Roman", Times, serif', marginBottom: '5px' }}>
                {settings.companyNameEn}
              </div>
            )}
            {settings.vatNumber && (
              <div style={{ color: '#000000', fontSize: '13px', fontFamily: '"Times New Roman", Times, serif' }}>
                លេខអត្តសញ្ញាណកម្ម អតប <b>(VATTIN) {settings.vatNumber}</b>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ fontSize: '13px', color: '#555', marginTop: '5px', lineHeight: '1.5' }}>
        {settings.addressKh && <div>{settings.addressKh}</div>}
        {settings.addressEn && <div>Address N<sup>o</sup> {settings.addressEn}</div>}
        {settings.phone    && <div>ទូរស័ព្ទលេខ/Telephone : {settings.phone}</div>}
      </div>
    </div>
  );
};

// From/To Address Component
const AddressSection: React.FC<{ data: any }> = ({ data }) => {
  return (
    <>
      <div 
        className="khmer-muol"
        style={{
          fontSize: '16px',
          color: '#000000',
          marginBottom: '0px',
          textAlign: 'center',
        }}
      >
        វិក្កយបត្រ
      </div>
      <div 
        className="khmer-muol"
        style={{
          fontSize: '16px',
          color: '#000000',
          marginBottom: '10px',
          textAlign: 'center',
          fontWeight: 'bold',
        }}
      >
        INVOICE
      </div>

      <div
        style={{
          // backgroundColor: "#f1f1f1",
          padding: "5px 0px 0px 0px",
          marginBottom: "5px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "14px",
        }}
      >
        {/* LEFT */}
        <div style={{ width: "60%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "200px 10px 1fr",
              marginBottom: "10px",
              fontWeight: "bold",
            }}
          >
            <div>អតិថិជន/Customer</div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "200px 10px 1fr",
              marginBottom: "5px",
              fontSize: "12px",
            }}
          >
            <div>ឈ្មោះក្រុមហ៊ុន ឬអតិថិជន <br/>Company Name or Customer</div>
            <div 
              style={{
                paddingTop: "10px"
              }}
            >:</div>
            <div 
              style={{
                paddingTop: "10px"
              }}
            >
              {data.to.name}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "200px 10px 1fr",
              marginBottom: "5px",
              fontSize: "12px",
            }}
          >
            <div>អាសយដ្ឋាន/Address</div>
            <div>:</div>
            <div>{data.to.address}</div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "200px 10px 1fr",
              marginBottom: "5px",
              fontSize: "12px",
            }}
          >
            <div>ទូរស័ព្ទលេខ/Telephone N°</div>
            <div>:</div>
            <div>{data.to.phone}</div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ width: "35%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 10px 1fr",
              marginBottom: "10px",
              fontWeight: "bold",
            }}
          >
            <div>លេខវិក្កយបត្រ ៖</div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "110px 10px 1fr",
              marginBottom: "5px",
              fontSize: "12px",
            }}
          >
            <div>Invoice N<sup>o</sup></div>
            <div>:</div>
            <div>{data.invoiceNumber}</div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "110px 10px 1fr",
              marginBottom: "5px",
              fontSize: "12px",
            }}
          >
            <div>កាលបរិច្ឆេទ/Date</div>
            <div>:</div>
            <div>{data.invoiceDate}</div>
          </div>
        </div>
      </div>
    </>
  );
};

// Invoice Items Table Component
const InvoiceItemsTable: React.FC<{ items: any[] }> = ({ items }) => {
  // Helper function to safely format numbers

const formatCurrency = (value: any) => {
  const num = parseFloat(value) || 0;
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
};

  return (
    <div className="items-section" style={{ marginBottom: '0px' }}>
      {/* <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: '#333' }}>
        Invoice For: <span style={{ fontWeight: 'normal' }}>Invoice Items</span>
      </div> */}
      
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        border: '1px solid #e0e6ed',
        fontSize: '14px'
      }}>
        <thead>
          <tr>
            <th style={{
              background: "#f5cfc5",
              padding: "12px 15px",
              textAlign: "left",
              fontWeight: "bold",
              color: "#333",
              borderRight: "1px solid #e0e6ed",
              textAlignLast: "center"
            }}>បរិយាយមុខទំនិញ <br/> Item Description</th>
            <th style={{
              background: "#f5cfc5",
              padding: "12px 15px",
              textAlign: "left",
              fontWeight: "bold",
              color: "#333",
              borderRight: "1px solid #e0e6ed",
              textAlignLast: "center"
            }}>ថ្លៃឯកតា <br/> Unit Cost</th>
            <th style={{
              background: "#f5cfc5",
              padding: "12px 15px",
              textAlign: "left",
              fontWeight: "bold",
              color: "#333",
              borderRight: "1px solid #e0e6ed",
              textAlignLast: "center"
            }}>បរិមាណ <br/> Qty</th>
            <th style={{
              background: "#f5cfc5",
              padding: "12px 15px",
              textAlign: "left",
              fontWeight: "bold",
              color: "#333",
              borderRight: "1px solid #e0e6ed",
              textAlignLast: "center"
            }}>បញ្ចុះតម្លៃ <br/> Discount</th>
            <th style={{
              background: "#f5cfc5",
              padding: "12px 15px",
              textAlign: "left",
              fontWeight: "bold",
              color: "#333",
              borderRight: "1px solid #e0e6ed",
              textAlignLast: "center"
            }}>អាករ <br/> Tax</th>
            <th style={{
              background: "#f5cfc5",
              padding: "12px 15px",
              textAlign: "left",
              fontWeight: "bold",
              color: "#333",
              borderRight: "1px solid #e0e6ed",
              textAlignLast: "center"
            }}>តម្លៃ <br/> Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const qty = parseFloat(item.qty) || 1;
            const price = parseFloat(item.price) || 0;
            const total = parseFloat(item.total) || 0;
            const discount = (price * qty) - total;

            const formatQty = (qty: number, unit?: string) => {
              const cleanQty = Number(qty).toFixed(2).replace(/\.00$/, "");
              const cleanUnit = unit?.replace("_", " "); // box_length → box length
              return unit ? `${cleanQty} ${cleanUnit}` : cleanQty;
            };
            
            return (
              <tr key={index} style={{
                borderBottom: index < items.length - 1 ? '1px solid #e0e6ed' : 'none'
              }}>
                <td style={{ 
                  padding: '0px 15px',
                  borderRight: '1px solid #e0e6ed'
                }}>
                  <div style={{ fontWeight: 'bold' }}>
                    {item.productvariants?.name || item.description || `Item ${index + 1}`}
                  </div>
                </td>
                <td style={{ 
                  padding: '0px 15px',
                  textAlign: 'right',
                  borderRight: '1px solid #e0e6ed'
                }}>{formatCurrency(price)}</td>
                <td style={{ 
                  padding: '0px 15px',
                  textAlign: 'right',
                  borderRight: '1px solid #e0e6ed'
                }}>
                  {formatQty(qty, item.unitName)}
                </td>
                <td style={{ 
                  padding: '0px 15px',
                  textAlign: 'right',
                  borderRight: '1px solid #e0e6ed'
                }}>
                  {
                    item.discountMethod === "Fixed" ? "$" : "%"
                  }
                  {
                    item.discount <= 0 
                        ? 0
                        : item.discountMethod === "Fixed" 
                            ? Number(item.discount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                            : Number(item.price - (item.price * ((100 - item.discount) / 100))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  }
                </td>
                <td style={{ 
                  padding: '3px 15px',
                  textAlign: 'right',
                  borderRight: '1px solid #e0e6ed'
                }}>
                  { 
                      item.discountMethod === "Fixed" 
                      ? Number(item.qty * ((item.price - item.discount) * (item.taxNet / 100))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      : Number(item.qty * ((item.price * ((100 - item.discount) / 100)) * (item.taxNet / 100))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  }
                  <br/>
                  <span style={{fontSize: '12px'}}>({item.taxMethod})</span>
                </td>
                <td style={{ 
                  padding: '3px 15px',
                  textAlign: 'right',
                  fontWeight: 'bold'
                }}>{formatCurrency(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Totals Component - Also fix the same issue here
const TotalsSection: React.FC<{ totals: any }> = ({ totals }) => {
  // Helper to safely convert to number
  const safeNumber = (value: any) => parseFloat(value) || 0;
  
  const subtotal = safeNumber(totals.subtotal || 0);
  const orderTax = safeNumber(totals.orderTax || 0);
  const discount = safeNumber(totals.discount || 0);
  const shipping = safeNumber(totals.shipping || 0);
  const total = safeNumber(totals.total);

  return (
    <div className="totals-section" style={{ marginBottom: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '300px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: '1px solid #e0e6ed'
          }}>
            <span>Sub Total</span>
            <span style={{ fontWeight: 'bold' }}>${subtotal.toFixed(2)}</span>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: '1px solid #e0e6ed'
          }}>
            <span>Order Tax</span>
            <span style={{ fontWeight: 'bold' }}>{orderTax}%</span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: '1px solid #e0e6ed'
          }}>
            <span>Discount</span>
            <span style={{ fontWeight: 'bold' }}>${discount.toFixed(2)}</span>
          </div>
          
          {/* <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: '1px solid #e0e6ed'
          }}>
            <span>Shipping</span>
            <span style={{ fontWeight: 'bold' }}>${shipping.toFixed(2)}</span>
          </div> */}
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '15px 0'
          }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Total Amount</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Terms and Notes Component
const TermsNotesSection: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div
      className="terms-notes-section"
      style={{
        display: "flex",
        gap: "40px",
        marginBottom: "30px",
        paddingBottom: "30px",
        pageBreakInside: "avoid",
      }}
    >
      {/* ----------- TERMS & CONDITIONS ----------- */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: "50px" }}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              marginBottom: "10px",
              color: "#333",
            }}
          >
            Terms and Conditions
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#555",
              lineHeight: "1.5",
            }}
          >
            {data.terms}
          </div>
        </div>
      </div>

      {/* ----------- CUSTOMER SIGNATURE ----------- */}
      <div style={{ width: "200px", textAlign: "center" }}>
        <div style={{ marginBottom: "50px" }}>
          Customer Signature
        </div>
        <div
          style={{
            fontSize: "14px",
            fontWeight: "bold",
            marginBottom: "5px",
          }}
        >
          {data.customerName}
        </div>
      </div>

      {/* ----------- CREATOR / STAFF SIGNATURE ----------- */}
      <div style={{ width: "200px", textAlign: "right" }}>
        <div style={{ marginBottom: "50px" }}>
          Authorized By
        </div>
        <div
          style={{
            fontSize: "14px",
            fontWeight: "bold",
            marginBottom: "5px",
          }}
        >
          {data.roleType === "ADMIN" ? '' : `${data.lastName} ${data.firstName}`}
        </div>
      </div>
    </div>

    // <div className="terms-notes-section" style={{ 
    //   display: 'flex',
    //   marginBottom: '30px',
    //   paddingBottom: '30px',
    //   // borderBottom: '1px solid #e0e6ed'
    // }}>
    //   <div style={{ flex: 1 }}>
    //     <div style={{ marginBottom: '20px' }}>
    //       <div style={{ 
    //         fontSize: '16px',
    //         fontWeight: 'bold',
    //         marginBottom: '10px',
    //         color: '#333'
    //       }}>
    //         Terms and Conditions
    //       </div>
    //       <div style={{ 
    //         fontSize: '14px',
    //         color: '#555',
    //         lineHeight: '1.5'
    //       }}>
    //         {data.terms}
    //       </div>
    //     </div>
        
    //     <div>
    //       <div style={{ 
    //         fontSize: '16px',
    //         fontWeight: 'bold',
    //         marginBottom: '10px',
    //         color: '#333'
    //       }}>
    //         Notes
    //       </div>
    //       <div style={{ 
    //         fontSize: '14px',
    //         color: '#555',
    //         lineHeight: '1.5'
    //       }}>
    //         {data.notes}
    //       </div>
    //     </div>
    //   </div>
      
    //   <div style={{ width: '200px', textAlign: 'right' }}>
    //     <div style={{ marginBottom: '10px' }}>
    //       <img 
    //         src="/react/template/assets/sign-DBs_Kojb.svg" 
    //         alt="Signature" 
    //         style={{ height: '50px' }}
    //       />
    //     </div>
    //     <div style={{ 
    //       fontSize: '14px',
    //       fontWeight: 'bold',
    //       marginBottom: '5px'
    //     }}>
    //       {/* Ted M. Davis */}
    //     </div>
    //     <div style={{ 
    //       fontSize: '12px',
    //       color: '#666'
    //     }}>
    //       {data.lastName} {data.firstName}
    //     </div>
    //   </div>
    // </div>
  );
};

// Footer Component
const InvoiceFooter: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="invoice-footer" style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '20px' }}>
        <img 
          src={getLogoUrl(null)}
          alt="Logo"
          style={{ height: '40px', marginBottom: '10px' }}
        />
      </div>
      
      <div style={{ 
        fontSize: '14px',
        color: '#555',
        marginBottom: '15px'
      }}>
        {data.paymentMethod}
      </div>
      
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#666',
        gap: '20px'
      }}>
        <div>
          Bank Name: <span style={{ fontWeight: 'bold' }}>{data.bankDetails.bankName}</span>
        </div>
        <div>
          Account Number: <span style={{ fontWeight: 'bold' }}>{data.bankDetails.accountNumber}</span>
        </div>
        <div>
          {/* IFSC: <span style={{ fontWeight: 'bold' }}>{data.bankDetails.ifsc}</span> */}
        </div>
      </div>
    </div>
  );
};

// Main PrintPurchase Component
const PrintInvoice: React.FC = () => {
  const printRef = useRef<HTMLDivElement>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useCompanySettings();
  
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };
  
  useEffect(() => {
    const fetchInvoice = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dataReturn = await apiClient.getSaleReturnByReturnId(Number(id));

        const sumtotal = dataReturn.items?.reduce(
          (sum: number, item: any) => sum + parseFloat(item.total ?? 0),
          0
        ) || 0;


        // Transform API data to match our structure
        const transformedData = {
          invoiceNumber: dataReturn.ref || "SR-00001",
          invoiceDate: dataReturn.createdAt
            ? (() => {
                const d = new Date(dataReturn.createdAt);
                const day = String(d.getDate()).padStart(2, "0");
                const month = d.toLocaleString("en-US", { month: "short" });
                const year = d.getFullYear();
                return `${day}-${month}-${year}`;
              })()
            : "06-Dec-2026",
          invoiceFor: "Invoice Items",
          orderSaleType: dataReturn.order?.OrderSaleType,
          lastName: dataReturn.creator?.lastName || "",
          firstName: dataReturn.creator?.firstName || "",
          customerName: dataReturn.customer?.name || "Customer",
          roleType: dataReturn.creator?.roleType || "",
          
          from: {
            name: "IZOOM",
            address: "#48 Borey Angkor PP, St. Angkor Blvd",
            addressLine2: "Sangkat Toul Sangke, Khan Russeykeo, Phnom Penh",
            email: "sales@izooms.com.kh",
            phone: "+855 (11) 589 299 / +855 (16) 589 299"
          },
          
          to: {
            name: dataReturn.customer?.name || "Customer",
            address: dataReturn.customer?.address || "Customer Address",
            email: dataReturn.customer?.email || "customer@email.com",
            phone: dataReturn.customer?.phone || "+1 987 654 3210"
          },
          
          items: dataReturn.items?.map((item: any, index: number) => ({
            description:
              item.ItemType === "PRODUCT"
                ? item.productvariants?.productType === "New"
                  ? item.products?.name
                  // : `${item.products?.name} (${item.productvariants?.productType})`
                  : `${item.products?.name}`
                : item.services?.name || `Item ${index + 1}`,

            qty:
              item.ItemType === "PRODUCT"
                ? (item.unitQty ?? item.quantity ?? 1)
                : (item.quantity ?? 1),

            unitId: item.unitId ?? null,
            unitName:
              item.ItemType === "PRODUCT"
                ? (item.unit?.name || item.unitName || "")
                : "",

            itemType: item.ItemType,
            taxNet: item.taxNet,
            taxMethod: item.taxMethod,
            discountMethod: item.discountMethod,
            price: item.price || 0,
            discount: item.discount || 0,
            total: item.total || 0,
          })) || [],
          
          totals: {
            subtotal: sumtotal,
            orderTax: dataReturn.taxRate || 0,
            discount: dataReturn.discount || 0,
            shipping: dataReturn.shipping || 0,
            total: dataReturn.totalAmount || 0
          },
          
          notes: "Please quote invoice number when remitting funds.",
          terms: settings.invoiceTerms || "Please pay within 7 days from the date of invoice, overdue interest @ 10% will be charged on delayed payments.",
          paymentMethod: "Payment Made Via bank transfer / Cheque",
          bankDetails: {
            bankName: "Lorn Titya",
            accountNumber: "000 310 252",
            // ifsc: "XXXXXXXXX"
          }
        };

        setInvoiceData(transformedData);
      } catch (err: any) {
        setError(err.message || "Error fetching invoice");
        toast.error(err.message || "Error fetching invoice", {
          position: "top-right",
          autoClose: 4000,
        });
        // Fallback to sample data
        // setQuotationData(sampleData);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchInvoice();
    } else {
      // For testing without API call
      // setPurchaseData(sampleData);
      setIsLoading(false);
    }
  }, [id]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!invoiceData) {
    return <div>No invoice data found.</div>;
  }

  return (
    <>
      <div 
        className="no-print" 
        style={{ 
          marginBottom: '20px', 
          textAlign: 'left', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '10px' // space between buttons
        }}
      >
        <button
          type="button"
          className="btn btn-warning"
          onClick={() => navigate(-1)} // go back in history
          style={{
            padding: '10px 20px',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '5px' // space between icon and text
          }}
        >
          <ArrowLeft /> Go Back
        </button>

        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handlePrint}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <Print /> Print Invoice
        </button>
      </div>

      <div
        ref={printRef}
        className="invoice-container"
        style={{
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}
      >
        <InvoiceHeader data={invoiceData} settings={settings} />
        <AddressSection data={invoiceData} />
        <InvoiceItemsTable items={invoiceData.items} />
        <TotalsSection totals={invoiceData.totals} />
        <TermsNotesSection data={{ ...invoiceData, terms: settings.invoiceTerms || invoiceData?.terms }} />
        {/* <InvoiceFooter data={invoiceData} /> */}
      </div>
    </>
  );
};

export default PrintInvoice;