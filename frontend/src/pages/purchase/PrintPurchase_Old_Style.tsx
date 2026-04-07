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

// Sample data structure matching your image
// const sampleData = {
//   invoiceNumber: "INV0001",
//   invoiceDate: "Sep 24, 2024",
//   invoiceFor: "Design & development of Website",
  
//   from: {
//     name: "Thomas Lawler",
//     address: "2077 Chicago Avenue Orosi, CA 93647",
//     email: "Tarala2445@example.com",
//     phone: "+1 987 654 3210"
//   },
  
//   to: {
//     name: "Carl Evans",
//     address: "3103 Trainer Avenue Peoria, IL 61602",
//     email: "Sara_inc34@example.com",
//     phone: "+1 987 471 6589"
//   },
  
//   items: [
//     { description: "UX Strategy", qty: 1, cost: 500, discount: 100, total: 500 },
//     { description: "Design System", qty: 1, cost: 5000, discount: 100, total: 5000 },
//     { description: "Brand Guidelines", qty: 1, cost: 5000, discount: 100, total: 5000 },
//     { description: "Social Media Template", qty: 1, cost: 5000, discount: 100, total: 5000 }
//   ],
  
//   totals: {
//     subtotal: 5500,
//     discount: 400,
//     vat: 275,
//     total: 5775
//   },
  
//   notes: "Please quote invoice number when remitting funds.",
//   terms: "Please pay within 15 days from the date of invoice, overdue interest @ 14% will be charged on delayed payments.",
//   paymentMethod: "Payment Made Via bank transfer / Cheque in the name of Thomas Lawler",
//   bankDetails: {
//     bankName: "HDFC Bank",
//     accountNumber: "45366287987",
//     ifsc: "HDFC0018159"
//   }
// };

// Invoice Header Component
// const InvoiceHeader: React.FC<{ data: any }> = ({ data }) => {
//   return (
//     <div className="invoice-header" style={{ marginBottom: '20px' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//         <div>
//           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>Invoice</div>
//           <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
//             Invoice #{data.invoiceNumber} • Created Date: {data.invoiceDate}
//           </div>
//         </div>
//         <div style={{ textAlign: 'right' }}>
//           <img 
//             src="/admin_assets/images/logo.svg" 
//             alt="Logo" 
//             style={{ height: '50px' }}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };
const InvoiceHeader: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="invoice-header" style={{ 
      marginBottom: '30px',
      borderBottom: '2px solid #ffab93',
      paddingBottom: '20px'
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
                height: '40px',
                marginRight: '15px'
              }}
            />
            {/* <div>
              <div style={{ 
                fontSize: '28px',
                fontWeight: '800',
                color: '#1e293b',
                letterSpacing: '-0.5px',
                textTransform: 'uppercase',
                margin: '0 auto'
              }}>
                Invoice
              </div>
            </div> */}
          </div>
          
          <div style={{ 
            fontSize: '14px',
            color: '#64748b',
            lineHeight: '1.5'
          }}>
            <div>#48 Borey Angkor PP, St. Angkor Blvd</div>
            <div>Sangkat Toul Sangke, Khan Russeykeo, Phnom Penh</div>
            <div>Phone: +855 (11) 589 299 / +855 (16) 589 299</div>
            <div>Email: sales@izooms.com.kh</div>
          </div>
        </div>
        
        {/* Right side - Invoice details */}
        <div style={{ 
          textAlign: 'right',
          // backgroundColor: '#f8fafc',
          padding: '20px',
          // borderRadius: '8px',
          minWidth: '100px',
          // border: '1px solid #e2e8f0'
        }}>
          <div style={{ 
            fontSize: '22px',
            fontWeight: '700',
            color: '#ffab93',
            marginBottom: '15px'
          }}>
            PURCHASE
          </div>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '8px 15px',
            fontSize: '14px'
          }}>
            <div style={{ color: '#64748b', fontWeight: '500' }}>Purchase #:</div>
            <div style={{ fontWeight: '600', color: '#1e293b' }}>{data.invoiceNumber}</div>
            
            <div style={{ color: '#64748b', fontWeight: '500' }}>Date:</div>
            <div style={{ fontWeight: '600', color: '#1e293b' }}>{dayjs.tz(data.invoiceDate, "Asia/Phnom_Penh").format("DD / MMM / YYYY")}</div>
            
            <div style={{ color: '#64748b', fontWeight: '500' }}>Due Date:</div>
            <div style={{ fontWeight: '600', color: '#1e293b' }}>
              {dayjs.tz(data.invoiceDate, "Asia/Phnom_Penh").add(7, "day").format("DD / MMM / YYYY")}

            </div>
            
            {/* <div style={{ color: '#64748b', fontWeight: '500' }}>Status:</div>
            <div>
              <span style={{
                backgroundColor: data.status === 'paid' ? '#10b981' : '#f59e0b',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-block'
              }}>
                {data.status === 'paid' ? 'PAID' : 'PENDING'}
              </span>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

// From/To Address Component
const AddressSection: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="address-section" style={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      marginBottom: '15px',
      paddingBottom: '20px',
      borderBottom: '1px solid #e0e6ed'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
          From
        </div>
        <div style={{ fontSize: '14px', color: '#555' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data.from.name}</div>
          <div>{data.from.address}</div>
          <div>{data.from.addressLine2}</div>
          <div>Email: {data.from.email}</div>
          <div>Phone: {data.from.phone}</div>
        </div>
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
          To
        </div>
        <div style={{ fontSize: '14px', color: '#555' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data.to.name}</div>
          <div>{data.to.address}</div>
          <div>Email: {data.to.email}</div>
          <div>Phone: {data.to.phone}</div>
        </div>
      </div>
      
      {/* <div style={{ width: '200px', textAlign: 'right' }}>
        <div style={{ 
          backgroundColor: '#10b981',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          display: 'inline-block',
          fontWeight: 'bold'
        }}>
          <span style={{ marginRight: '5px' }}>●</span> Paid
        </div>
      </div> */}
    </div>
  );
};

// Invoice Items Table Component
const InvoiceItemsTable: React.FC<{ items: any[] }> = ({ items }) => {
  // Helper function to safely format numbers

  const formatCurrency = (value: any) => {
    const num = parseFloat(value) || 0;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="items-section" style={{ marginBottom: '0px' }}>
      <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: '#333' }}>
        Invoice For: <span style={{ fontWeight: 'normal' }}>Purchase Items</span>
      </div>
      
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        border: '1px solid #e0e6ed'
      }}>
        <thead>
          <tr style={{ 
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e0e6ed'
          }}>
            <th style={{ 
              padding: '12px 15px',
              textAlign: 'left',
              fontWeight: 'bold',
              color: '#333',
              borderRight: '1px solid #e0e6ed'
            }}>Item Description</th>
            <th style={{ 
              padding: '12px 15px',
              textAlign: 'right',
              fontWeight: 'bold',
              color: '#333',
              borderRight: '1px solid #e0e6ed'
            }}>Unit Cost</th>
            <th style={{ 
              padding: '12px 15px',
              textAlign: 'right',
              fontWeight: 'bold',
              color: '#333',
              borderRight: '1px solid #e0e6ed'
            }}>Qty</th>
            <th style={{ 
              padding: '12px 15px',
              textAlign: 'right',
              fontWeight: 'bold',
              color: '#333',
              borderRight: '1px solid #e0e6ed'
            }}>Discount</th>
            <th style={{ 
              padding: '12px 15px',
              textAlign: 'right',
              fontWeight: 'bold',
              color: '#333',
              borderRight: '1px solid #e0e6ed'
            }}>Tax</th>
            <th style={{ 
              padding: '12px 15px',
              textAlign: 'right',
              fontWeight: 'bold',
              color: '#333'
            }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const qty = parseFloat(item.qty) || 1;
            const cost = parseFloat(item.cost) || 0;
            const total = parseFloat(item.total) || 0;
            const discount = (cost * qty) - total;
            
            return (
              <tr key={index} style={{
                borderBottom: index < items.length - 1 ? '1px solid #e0e6ed' : 'none'
              }}>
                <td style={{ 
                  padding: '3px 15px',
                  borderRight: '1px solid #e0e6ed'
                }}>
                  <div style={{ fontWeight: 'bold' }}>
                    {item.productvariants?.name || item.description || `Item ${index + 1}`}
                  </div>
                </td>
                <td style={{ 
                  padding: '3px 15px',
                  textAlign: 'right',
                  borderRight: '1px solid #e0e6ed'
                }}>{formatCurrency(cost)}</td>
                <td style={{ 
                  padding: '3px 15px',
                  textAlign: 'right',
                  borderRight: '1px solid #e0e6ed'
                }}>{qty}</td>
                <td style={{ 
                  padding: '3px 15px',
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
                            : Number(item.cost - (item.cost * ((100 - item.discount) / 100)))
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
          {data.lastName} {data.firstName}
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
          invoiceNumber: purchase.ref || "INV0001",
          invoiceDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toLocaleDateString() : "Sep 24, 2024",
          invoiceFor: "Purchase Items",
          lastName: purchase.creator?.lastName || "",
          firstName: purchase.creator?.firstName || "",
          supplierName: purchase.suppliers?.name || "Supplier",
          
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
            total: purchase.grandTotal || 0
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