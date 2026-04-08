import React from "react";
import { BrowserRouter, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AppContextProvider } from "./contexts/AppContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import PrivateRoute from "./PrivateRoute";
import Layout from "./pages/layouts/Layout";
import SignUp from "./pages/signup/SignUp";
import SignIn from "./pages/signin/SignIn";
import Dashboard from "./pages/dashboard/Dashboard";
import ModulePermission from "./pages/module_permission/ModulePermission";
import Role from "./pages/role/Role";
import AddRole from "./pages/role/AddRole";
import EditRole from "./pages/role/EditRole";
import User from "./pages/user/User";
import UserForm from "./pages/user/UserForm";
import Branch from "./pages/branch/Branch";
import PaymentMethod from "./pages/paymentmethod/PaymentMethod";
import Category from "./pages/category/Category";
import Unit from "./pages/unit/Unit";
import Brand from "./pages/brand/Brand";
import VarientAttribute from "./pages/varient_attribute/VarientAttribute";
import Product from "./pages/product/Product";
import ProductVariant from "./pages/product_variant/ProductVariant";
import Supplier from "./pages/supplier/Supplier";
import Purchase from "./pages/purchase/Purchase";
import PurchaseForm from "./pages/purchase/PurchaseForm";
import PrintPurchase from "./pages/purchase/PrintPurchase";
import Service from "./pages/service/Service";
import Quotation from "./pages/quotation/Quotation";
import QuotationForm from "./pages/quotation/QuotationForm";
import PrintQuotation from "./pages/quotation/PrintQuotation";
import Invoice from "./pages/invoice/Invoice";
import InvoiceForm from "./pages/invoice/InvoiceForm";
import SaleReturnForm from "./pages/invoice/SaleReturnForm";
import SaleReturn from "./pages/invoice/SaleReturn";
import PrintInvoice from "./pages/invoice/PrintInvoice";
import PrintSaleReturn from "./pages/invoice/PrintSaleReturn";
import StockSummary from "./pages/stock/StockSummary";
import LowStockReport from "./pages/stock/LowStockReport";
import StockValuationReport from "./pages/stock/StockValuationReport";
import StockMovementReport from "./pages/stock/StockMovementReport";
import StockAdjustment from "./pages/stockadjustment/StockAdjustment";
import StockAdjustmentForm from "./pages/stockadjustment/StockAdjustmentForm";
import StockTransfer from "./pages/stocktransfer/StockTransfer";
import StockTransferForm from "./pages/stocktransfer/StockTransferForm";
import StockRequest from "./pages/stockrequest/StockRequest";
import StockRequestForm from "./pages/stockrequest/StockRequestForm";
import StockReturn from "./pages/stockreturn/StockReturn";
import StockReturnForm from "./pages/stockreturn/StockReturnForm";
import Expense from "./pages/expense/Expense";
import Income from "./pages/income/Income";
import ReportInvoice from "./pages/report/ReportInvoice";
import ReportSaleReturn from "./pages/report/ReportSaleReturn";
import ReportCancelInvoice from "./pages/report/ReportCancelInvoice";
import ReportPayment from "./pages/report/ReportPayment";
import ReportPaymentPurchase from "./pages/report/ReportPaymentPurchase";
import ReportQuotation from "./pages/report/ReportQuotation";
import ReportPurchase from "./pages/report/ReportPurchase";
import ReportAdjustment from "./pages/report/ReportAdjustment";
import ReportTransfer from "./pages/report/ReportTransfer";
import ReportRequest from "./pages/report/ReportRequest";
import ReportReturn from "./pages/report/ReportReturn";
import ReportExpense from "./pages/report/ReportExpense";
import ReportIncome from "./pages/report/ReportIncome";
import ProfitReport from "./pages/report/ProfitReport";
import PurchaseAuthorizeAmount from "./pages/setting/PurchaseAuthorizeAmount";
import ExchangeRate from "./pages/setting/ExchangeRate";

import Pos from "./pages/pos/Pos";

import { Customer } from "./pages/customer/Customer";
import NotFound from "./pages/notfound/NotFount";

const App: React.FC = () => {
    return (
        // <Router>
        <BrowserRouter basename="/inventory">
            <AppContextProvider>
                <LanguageProvider>
                    <Routes>
                        {/* Sign-In and Sign-Up */}
                        <Route path="/" element={<SignIn />} />
                        <Route path="/asignup" element={<SignUp />} />

                        {/* POS */}
                        <Route path="/pos" element={<PrivateRoute element={<Pos />} />} />

                        {/* Dashboard */}
                        <Route path="/dashboard" element={<PrivateRoute element={<Layout><Dashboard /></Layout>} />} />

                        {/* Role and Permission */}
                        <Route path="/modulepermission" element={<PrivateRoute element={<Layout><ModulePermission /></Layout>} />} />
                        <Route path="/role" element={<PrivateRoute element={<Layout><Role /></Layout>} />} />
                        <Route path="/addrole" element={<PrivateRoute element={<Layout><AddRole /></Layout>} />} />
                        <Route path="/editrole/:id" element={<PrivateRoute element={<Layout><EditRole /></Layout>} />} />

                        {/* User */}
                        <Route path="/user" element={<PrivateRoute element={<Layout><User /></Layout>} />} />
                        <Route path="/adduser" element={<PrivateRoute element={<Layout><UserForm /></Layout>} />} />
                        <Route path="/edituser/:id" element={<PrivateRoute element={<Layout><UserForm /></Layout>} />} />

                        {/* Customer */}
                        <Route path="/customer" element={<PrivateRoute element={<Layout><Customer /></Layout>} />} />

                        {/* Branch */}
                        <Route path="/branches" element={<PrivateRoute element={<Layout><Branch /></Layout>} />} />

                        {/* Payment Method */}
                        <Route path="/paymentmethod" element={<PrivateRoute element={<Layout><PaymentMethod /></Layout>} />} />
                        {/* Category */}
                        <Route path="/categories" element={<PrivateRoute element={<Layout><Category /></Layout>} />} />
                        {/* Unit */}
                        <Route path="/units" element={<PrivateRoute element={<Layout><Unit /></Layout>} />} />
                        {/* Brand */}
                        <Route path="/brands" element={<PrivateRoute element={<Layout><Brand /></Layout>} />} />
                        {/* Varient Attribute */}
                        <Route path="/varientattributes" element={<PrivateRoute element={<Layout><VarientAttribute /></Layout>} />} />
                        {/* Service */}
                        <Route path="/services" element={<PrivateRoute element={<Layout><Service /></Layout>} />} />
                        {/* Product */}
                        <Route path="/products" element={<PrivateRoute element={<Layout><Product /></Layout>} />} />
                        {/* Product Variant */}
                        <Route path="/productvariant/:id" element={<PrivateRoute element={<Layout><ProductVariant /></Layout>} />} />
                        {/* Supplier */}
                        <Route path="/supplier" element={<PrivateRoute element={<Layout><Supplier /></Layout>} />} />
                        {/* Purchase */}
                        <Route path="/purchase" element={<PrivateRoute element={<Layout><Purchase /></Layout>} />} />
                        <Route path="/addpurchase" element={<PrivateRoute element={<Layout><PurchaseForm /></Layout>} />} />
                        <Route path="/editpurchase/:id" element={<PrivateRoute element={<Layout><PurchaseForm /></Layout>} />} />
                        <Route path="/printpurchase/:id" element={<PrivateRoute element={<Layout><PrintPurchase /></Layout>} />} />
                        {/* Quotation */}
                        <Route path="/quotation" element={<PrivateRoute element={<Layout><Quotation /></Layout>} />} />
                        <Route path="/addquotation" element={<PrivateRoute element={<Layout><QuotationForm /></Layout>} />} />
                        <Route path="/editquotation/:id" element={<PrivateRoute element={<Layout><QuotationForm /></Layout>} />} />
                        <Route path="/printquotation/:id" element={<PrivateRoute element={<Layout><PrintQuotation /></Layout>} />} />
                        {/* Sale */}
                        <Route path="/sale" element={<PrivateRoute element={<Layout><Invoice /></Layout>} />} />
                        <Route path="/addsale" element={<PrivateRoute element={<Layout><InvoiceForm /></Layout>} />} />
                        <Route path="/editsale/:id" element={<PrivateRoute element={<Layout><InvoiceForm /></Layout>} />} />
                        <Route path="/printsale/:id" element={<PrivateRoute element={<Layout><PrintInvoice /></Layout>} />} />
                        <Route path="/sale-return/:id" element={<PrivateRoute element={<Layout><SaleReturnForm /></Layout>} />} />
                        <Route path="/returnsells" element={<PrivateRoute element={<Layout><SaleReturn /></Layout>} />} />
                        <Route path="/printsell-return/:id" element={<PrivateRoute element={<Layout><PrintSaleReturn /></Layout>} />} />
                        {/* Stock Summary */}
                        <Route path="/stocksummary" element={<PrivateRoute element={<Layout><StockSummary /></Layout>} />} />
                        <Route path="/low-stock" element={<PrivateRoute element={<Layout><LowStockReport /></Layout>} />} />
                        <Route path="/stock-movements" element={<PrivateRoute element={<Layout><StockMovementReport /></Layout>} />} />
                        <Route path="/stock-valuations" element={<PrivateRoute element={<Layout><StockValuationReport /></Layout>} />} />
                        {/* Stock Adjustment */}
                        <Route path="/adjuststock" element={<PrivateRoute element={<Layout><StockAdjustment /></Layout>} />} />
                        <Route path="/addadjuststock" element={<PrivateRoute element={<Layout><StockAdjustmentForm /></Layout>} />} />
                        <Route path="/editadjuststock/:id" element={<PrivateRoute element={<Layout><StockAdjustmentForm /></Layout>} />} />
                        {/* Stock Transfer */}
                        <Route path="/movestock" element={<PrivateRoute element={<Layout><StockTransfer /></Layout>} />} />
                        <Route path="/addmovestock" element={<PrivateRoute element={<Layout><StockTransferForm /></Layout>} />} />
                        <Route path="/editmovestock/:id" element={<PrivateRoute element={<Layout><StockTransferForm /></Layout>} />} />
                        {/* Stock Request */}
                        <Route path="/stockrequest" element={<PrivateRoute element={<Layout><StockRequest /></Layout>} />} />
                        <Route path="/addrequeststock" element={<PrivateRoute element={<Layout><StockRequestForm /></Layout>} />} />
                        <Route path="/editrequeststock/:id" element={<PrivateRoute element={<Layout><StockRequestForm /></Layout>} />} />
                        {/* Stock Transfer */}
                        <Route path="/stockreturn" element={<PrivateRoute element={<Layout><StockReturn /></Layout>} />} />
                        <Route path="/addreturnstock" element={<PrivateRoute element={<Layout><StockReturnForm /></Layout>} />} />
                        <Route path="/editreturnstock/:id" element={<PrivateRoute element={<Layout><StockReturnForm /></Layout>} />} />
                        {/* Expense */}
                        <Route path="/expense" element={<PrivateRoute element={<Layout><Expense /></Layout>} />} />
                        {/* Income */}
                        <Route path="/income" element={<PrivateRoute element={<Layout><Income /></Layout>} />} />
                        {/* Report */}
                        <Route path="/reportInvoice" element={<PrivateRoute element={<Layout><ReportInvoice /></Layout>} />} />
                        <Route path="/reportSaleReturn" element={<PrivateRoute element={<Layout><ReportSaleReturn /></Layout>} />} />
                        <Route path="/reportCancelInvoice" element={<PrivateRoute element={<Layout><ReportCancelInvoice /></Layout>} />} />
                        <Route path="/reportPayment" element={<PrivateRoute element={<Layout><ReportPayment /></Layout>} />} />
                        <Route path="/reportQuotation" element={<PrivateRoute element={<Layout><ReportQuotation /></Layout>} />} />
                        <Route path="/reportPurchase" element={<PrivateRoute element={<Layout><ReportPurchase /></Layout>} />} />
                        <Route path="/reportPurPayment" element={<PrivateRoute element={<Layout><ReportPaymentPurchase /></Layout>} />} />
                        <Route path="/reportAdjustment" element={<PrivateRoute element={<Layout><ReportAdjustment /></Layout>} />} />
                        <Route path="/reportTransfer" element={<PrivateRoute element={<Layout><ReportTransfer /></Layout>} />} />
                        <Route path="/reportRequest" element={<PrivateRoute element={<Layout><ReportRequest /></Layout>} />} />
                        <Route path="/reportReturn" element={<PrivateRoute element={<Layout><ReportReturn /></Layout>} />} />
                        <Route path="/reportExpense" element={<PrivateRoute element={<Layout><ReportExpense /></Layout>} />} />
                        <Route path="/reportIncome" element={<PrivateRoute element={<Layout><ReportIncome /></Layout>} />} />
                        <Route path="/profitreport" element={<PrivateRoute element={<Layout><ProfitReport /></Layout>} />} />

                        {/* setting */}
                        <Route path="/authorizeamount" element={<PrivateRoute element={<Layout><PurchaseAuthorizeAmount /></Layout>} />} />
                        <Route path="/exchangerate" element={<PrivateRoute element={<Layout><ExchangeRate /></Layout>} />} />

                        {/* Catch-all route for undefined paths */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </LanguageProvider>
            </AppContextProvider>
        </BrowserRouter>
        // </Router>
    );
};

export default App;
