import React, { useRef, useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as apiClient from "../../api/purchase";
import "@/assets/print_css/Print.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { add } from "date-fns";
import { Print } from "@mui/icons-material";
import { ArrowLeft } from "lucide-react";

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const InvoiceHeader: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="invoice-header" style={{ 
      marginBottom: '20px',
      borderBottom: '2px solid #ffab93',
      paddingBottom: '10px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        {/* Left side - Company info */}
        <div>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <img 
              src={`${import.meta.env.BASE_URL}admin_assets/images/izoom-logo.png`} 
              alt="Logo" 
              style={{ 
                height: '80px',
                marginRight: '15px'
              }}
            />
          </div>
        </div>
        
        {/* Right side - Invoice details */}
        <div
          style={{
            textAlign: 'center',
            padding: '10px 20px 20px 20px',
            minWidth: '100px',
          }}
        >
          <div
            className="khmer-muol"
            style={{
              fontSize: '16px',
              color: '#000000',
              marginBottom: '10px',
            }}
          >
            ក្រុមហ៊ុន អាយហ៊្សូម សឹលូសិន ឯ.ក
          </div>

          <div
            style={{
              fontSize: '14px',
            }}
          >
            <div
              style={{
                color: '#000000',
                fontWeight: 900,
                fontSize: '14px',
                fontFamily: '"Times New Roman", Times, serif',
                marginBottom: '5px',
              }}
            >
              iZOOM SOLUTIONS CO., LTD
            </div>

            <div
              style={{
                color: '#000000',
                fontSize: '13px',
                fontFamily: '"Times New Roman", Times, serif',
              }}
            >
              លេខអត្តសញ្ញាណកម្ម អតប <b>(VATTIN) K008-902305248</b>
            </div>
          </div>
        </div>

      </div>
      <div style={{ 
        fontSize: '13px',
        color: '#555',
        marginTop: '5px',
        lineHeight: '1.5'
      }}>
        <div>អាសយដ្ឋាន៖ ផ្ទះ#៤៨ ផ្លូវបុរីអង្គរ (បុរីអង្គរភ្នំពេញ) ភូមិបឹងរាំង សង្កាត់ទួលសង្កែទី២ ខណ្ឌឬស្សីកែវ រាជធានីភ្នំពេញ</div>
        <div>Address N<sup>o</sup> #48, St. Borey Angkor (Borey Angkor Phnom Penh) Sangkat Tuol Sangke 2, Khan Russeykeo, Phnom Penh</div>
        <div>ទូរស័ព្ទលេខ/Telephone : +855 16 589 299</div>
        {/* <div>Email: sales@izooms.com.kh</div> */}
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
        បញ្ចាទិញ
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
        PURCHASE ORDER
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
            <div>អ្នកផ្គត់ផ្គង់/Supplier</div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "200px 10px 1fr",
              marginBottom: "5px",
              fontSize: "12px",
            }}
          >
            <div>ឈ្មោះក្រុមហ៊ុន ឬអ្នកផ្គត់ផ្គង់ <br/>Company Name or Supplier</div>
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
            <div>លេខបញ្ចាទិញ ៖</div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "110px 10px 1fr",
              marginBottom: "5px",
              fontSize: "12px",
            }}
          >
            <div>Purchase N<sup>o</sup></div>
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
            const cost = parseFloat(item.cost) || 0;
            const total = parseFloat(item.total) || 0;
            const discount = (cost * qty) - total;

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
                }}>{formatCurrency(cost)}</td>
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
                            : Number(item.cost - (item.cost * ((100 - item.discount) / 100))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  }
                </td>
                <td style={{ 
                  padding: '3px 15px',
                  textAlign: 'right',
                  borderRight: '1px solid #e0e6ed'
                }}>
                  { 
                      item.discountMethod === "Fixed" 
                      ? Number(item.qty * ((item.cost - item.discount) * (item.taxNet / 100))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      : Number(item.qty * ((item.cost * ((100 - item.discount) / 100)) * (item.taxNet / 100))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
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
  const exChangeRate = safeNumber(totals.exChangeRate);

  return (
    <div className="totals-section" style={{ marginBottom: "30px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "340px", fontSize: "14px" }}>
          {/* Subtotal */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 0",
              borderBottom: "1px solid #dcdcdc",
            }}
          >
            <span>សរុប/Sub Total</span>
            <span style={{ fontWeight: 600 }}>
              ${subtotal.toFixed(2)}
            </span>
          </div>

          {/* Tax */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 0",
              borderBottom: "1px solid #dcdcdc",
            }}
          >
            <span>អាករលើតម្លែបន្ថែម/Order Tax</span>
            <span style={{ fontWeight: 600 }}>{orderTax}%</span>
          </div>

          {/* Discount */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 0",
              // borderBottom: "1px solid #dcdcdc",
            }}
          >
            <span>បញ្ចុះតម្លៃ/Discount</span>
            <span style={{ fontWeight: 600 }}>
              ${discount.toFixed(2)}
            </span>
          </div>

          {/* Total USD */}
          {/* <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "15px 0",
              fontSize: "18px",
              fontWeight: "bold",
            }}
          >
            <span>Total (VAT Include)</span>
            <span>${total.toFixed(2)}</span>
          </div> */}
        </div>
      </div>

      {/* ========================= */}
      {/* Exchange Rate Section */}
      {/* ========================= */}

      <div
        style={{
          marginTop: "0px",
          backgroundColor: "#f1f1f1",
          borderTop: "2px solid #000",
          borderBottom: "2px solid #000",
          padding: "8px 15px",
          fontSize: "14px",
        }}
      >
        {/* Row 1 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "5px",
          }}
        >
          <div>
            សរុប (បញ្ចូលអាករ) / Total (VAT Include)
          </div>
          <div style={{ fontWeight: 600 }}>
            ${total.toFixed(2)}
          </div>
        </div>

        {/* Row 2 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            Note: Exchange Rate 1USD ={" "}
            <strong>{exChangeRate} KHR</strong>
          </div>
          <div style={{ fontWeight: 600 }}>
            សរុប / Total (KHR) &nbsp;
            KHR {(total * exChangeRate).toLocaleString()}
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
            {
              data.notes ? "Notes" : ""
            }
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#555",
              lineHeight: "1.5",
            }}
          >
            {data.notes}
          </div>
        </div>
      </div>

      {/* ----------- CUSTOMER SIGNATURE ----------- */}
      <div style={{ width: "200px", textAlign: "center" }}>
        <div style={{ marginBottom: "50px" }}>
          Supplier Signature
        </div>
        <div
          style={{
            fontSize: "14px",
            fontWeight: "bold",
            marginBottom: "5px",
          }}
        >
          {data.supplierName}
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
  );
};

// Footer Component
const InvoiceFooter: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="invoice-footer" style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '20px' }}>
        <img 
          src={`${import.meta.env.BASE_URL}admin_assets/images/izoom-logo.png`} 
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
const PrintPurchase: React.FC = () => {
  const printRef = useRef<HTMLDivElement>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [purchaseData, setPurchaseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const fetchPurchase = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const purchase = await apiClient.getPurchaseByid(Number(id));

        const sumtotal = purchase.purchaseDetails?.reduce(
          (sum: number, item: any) => sum + parseFloat(item.total ?? 0),
          0
        ) || 0;


        // Transform API data to match our structure
        const transformedData = {
          invoiceNumber: purchase.ref || "PO-00001",
          invoiceDate: purchase.purchaseDate
            ? (() => {
                const d = new Date(purchase.purchaseDate);
                const day = String(d.getDate()).padStart(2, "0");
                const month = d.toLocaleString("en-US", { month: "short" });
                const year = d.getFullYear();
                return `${day}-${month}-${year}`;
              })()
            : "06-Dec-2026",
          invoiceFor: "Purchase Items",
          lastName: purchase.creator?.lastName || "",
          firstName: purchase.creator?.firstName || "",
          supplierName: purchase.suppliers?.name || "Supplier",
          roleType: purchase.creator?.roleType || "",
          
          from: {
            name: "IZOOM",
            address: "#48 Borey Angkor PP, St. Angkor Blvd",
            addressLine2: "Sangkat Toul Sangke, Khan Russeykeo, Phnom Penh",
            email: "sales@izooms.com.kh",
            phone: "+855 (12) 699 975 / +855 (16) 589 299"
          },
          
          to: {
            name: purchase.suppliers?.name || "Supplier",
            address: purchase.suppliers?.address || "Supplier Address",
            email: purchase.suppliers?.email || "supplier@email.com",
            phone: purchase.suppliers?.phone || "+1 987 654 3210"
          },
          
          items: purchase.purchaseDetails?.map((item: any, index: number) => ({
            description: item.productvariants?.productType === "New" ? item.products.name : item.products.name + " (" + item.productvariants?.productType + ")" || `Item ${index + 1}` ,
            qty: item.quantity,
            unitId: item.unitId ?? null,
            // unitName:
            //   item.ItemType === "PRODUCT"
            //     ? (item.unit?.name || item.unitName || "")
            //     : "",
            unitName: item.unit?.name,
            taxNet: item.taxNet,
            taxMethod: item.taxMethod,
            discountMethod: item.discountMethod,
            cost: item.cost || 0,
            discount: item.discount || 0,
            total: item.total || 0
          })) || [],
          
          totals: {
            subtotal: sumtotal,
            orderTax: purchase.taxRate || 0,
            discount: purchase.discount || 0,
            shipping: purchase.shipping || 0,
            total: purchase.grandTotal || 0,
            exChangeRate: purchase.exchangeRate || 4026
          },
          
          notes: purchase.note || "",
          terms: "Please pay within 15 days from the date of invoice, overdue interest @ 14% will be charged on delayed payments.",
          paymentMethod: "Payment Made Via bank transfer / Cheque",
          bankDetails: {
            bankName: "Lorn Titya",
            accountNumber: "000 310 252",
            // ifsc: "XXXXXXXXX"
          }
        };

        setPurchaseData(transformedData);
      } catch (err: any) {
        setError(err.message || "Error fetching purchase");
        toast.error(err.message || "Error fetching purchase", {
          position: "top-right",
          autoClose: 2000,
        });
        // Fallback to sample data
        // setPurchaseData(sampleData);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchPurchase();
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

  if (!purchaseData) {
    return <div>No purchase data found.</div>;
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
          <Print /> Print Purchase
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
        <InvoiceHeader data={purchaseData} />
        <AddressSection data={purchaseData} />
        <InvoiceItemsTable items={purchaseData.items} />
        <TotalsSection totals={purchaseData.totals} />
        <TermsNotesSection data={purchaseData} />
        {/* <InvoiceFooter data={purchaseData} /> */}
      </div>
    </>
  );
};

export default PrintPurchase;