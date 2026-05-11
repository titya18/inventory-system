# iZOOM Inventory Management System
## User Manual

**Version:** 1.0  
**Date:** May 2026  
**System:** iZOOM — Multi-Branch Inventory Management  

---

# Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Dashboard](#3-dashboard)
4. [People Management](#4-people-management)
   - 4.1 [Branches](#41-branches)
   - 4.2 [Users](#42-users)
   - 4.3 [Customers](#43-customers)
   - 4.4 [Suppliers](#44-suppliers)
   - 4.5 [Customer Equipment](#45-customer-equipment)
5. [Inventory Management](#5-inventory-management)
   - 5.1 [Categories](#51-categories)
   - 5.2 [Brands](#52-brands)
   - 5.3 [Units of Measure](#53-units-of-measure)
   - 5.4 [Variant Attributes](#54-variant-attributes)
   - 5.5 [Products & Variants](#55-products--variants)
   - 5.6 [Services](#56-services)
6. [Sales](#6-sales)
   - 6.1 [Quotations](#61-quotations)
   - 6.2 [Sales Invoices](#62-sales-invoices)
   - 6.3 [Sale Returns](#63-sale-returns)
   - 6.4 [Point of Sale (POS)](#64-point-of-sale-pos)
7. [Purchases](#7-purchases)
   - 7.1 [Purchase Orders](#71-purchase-orders)
   - 7.2 [Purchase Returns](#72-purchase-returns)
8. [Stock Management](#8-stock-management)
   - 8.1 [Stock Summary](#81-stock-summary)
   - 8.2 [Stock Adjustment](#82-stock-adjustment)
   - 8.3 [Stock Transfer](#83-stock-transfer)
   - 8.4 [Stock Request](#84-stock-request)
9. [Expense & Income](#9-expense--income)
10. [Reports](#10-reports)
11. [Settings & Administration](#11-settings--administration)
12. [Roles & Permissions](#12-roles--permissions)
13. [Stock Alert Notifications](#13-stock-alert-notifications)

---

# 1. Introduction

iZOOM is a full-featured, multi-branch inventory management system designed for businesses operating across multiple locations. It supports:

- **Multi-branch operations** — manage stock, sales, and purchases across all branches from one system
- **Multi-currency** — USD and KHR (Cambodian Riel) with configurable exchange rates
- **Product tracking** — serial numbers, asset codes, MAC addresses for high-value items
- **Real-time alerts** — low stock notifications via live socket connection
- **Role-based access** — granular permissions per user and role
- **Complete audit trail** — every stock movement, sale, purchase, and adjustment is recorded

---

# 2. Getting Started

## 2.1 Logging In

1. Open your browser and navigate to the system URL
2. Enter your **Email** and **Password**
3. Click **Sign In**

> **Note:** Passwords must be at least 6 characters. After 5 failed login attempts, the account is locked for 15 minutes.

## 2.2 Navigation

The sidebar on the left contains all main modules. Sections visible to you depend on your assigned permissions.

| Section | Description |
|---------|-------------|
| **People** | Branches, Users, Customers, Suppliers, Customer Equipment |
| **Inventory** | Categories, Brands, Units, Products, Services |
| **Sale** | Purchases, Quotations, Sales, Return Sales |
| **Stock** | Stock Adjustment, Stock Transfer, Stock Request |
| **Expense / Income** | Expenses, Income entries |
| **Report** | All 19 report types |

## 2.3 Signing Out

Click your profile icon in the top-right corner and select **Sign Out**.

---

# 3. Dashboard

The Dashboard gives an at-a-glance overview of business performance.

## 3.1 Summary Cards (Admin only)

| Card | What it Shows |
|------|--------------|
| **Invoices** | Count of approved + completed invoices |
| **Sales Amount** | Total invoice revenue |
| **Gross Profit** | Revenue minus cost of goods sold |
| **Receivable** | Unpaid invoice amounts |
| **Purchases** | Total purchase cost |
| **Payable** | Unpaid purchase amounts |
| **Quotations** | Total quotation count and value |
| **Sale Returns** | Count and value of customer returns |

## 3.2 Date Filters (Admin only)

Use the **Start Date** and **End Date** pickers at the top to filter all dashboard data by period.

## 3.3 Charts (Admin only)

- **Sales Trend** — daily/weekly/monthly invoice revenue line chart
- **Purchases Overview** — purchase spending over time
- **Business Distribution** — pie chart of Sales, Profit, Purchases, Sale Returns
- **Top Selling Products** — ranked list of best-selling variants by quantity sold

## 3.4 Low Stock Alert Widget

Visible to users with the **Stock-Low-Report** permission. Shows products whose total stock across all branches is at or below the configured threshold. See [Section 13](#13-stock-alert-notifications) for details.

---

# 4. People Management

## 4.1 Branches

Branches represent physical store or warehouse locations.

**To create a branch:**
1. Go to **People → Branches**
2. Click **+ Add New**
3. Enter the branch **Name** and **Address**
4. Click **Save**

> Branches cannot be deleted once stock or transactions are linked to them.

---

## 4.2 Users

Users are staff members who log in to the system.

**To create a user:**
1. Go to **People → Users**
2. Click **+ Add New**
3. Fill in: First Name, Last Name, Email, Phone Number, Password
4. Select **Role Type**:
   - **ADMIN** — full access to all features
   - **USER** — access controlled by assigned roles and permissions
5. For USER type, assign a **Branch** and one or more **Roles**
6. Optionally assign **Direct Permissions** (individual permissions that bypass role requirements)
7. Click **Save**

> An ADMIN bypasses all permission checks and can see all branches and all data.

---

## 4.3 Customers

Customers are individuals or companies that purchase from you.

**To create a customer:**
1. Go to **People → Customers**
2. Click **+ Add New**
3. Enter: Name, Phone, Address (optional)
4. Click **Save**

**Customer Profile:**
Click the eye icon (👁) on any customer row to open their full profile with 3 tabs:
- **Overview** — contact info and summary
- **Purchase History** — all their invoices with drill-down to invoice items
- **Equipment** — equipment assigned to this customer

---

## 4.4 Suppliers

Suppliers are companies or individuals you purchase goods from.

**To create a supplier:**
1. Go to **People → Suppliers**
2. Click **+ Add New**
3. Enter: Name, Phone, Email, Address (optional)
4. Click **Save**

---

## 4.5 Customer Equipment

Track equipment assigned to customers (sold, rented, or installed at a site).

**Assignment types:**
| Type | Meaning | Stock Effect |
|------|---------|-------------|
| **SOLD** | Equipment sold to customer | Decrements stock |
| **RENTED** | Equipment loaned to customer | Decrements stock |
| **INSTALLED** | Equipment installed at customer site | Decrements stock |

> If you link an existing **Sales Invoice** to the equipment record, stock is NOT decremented again (the invoice already handled it).

**To create a customer equipment record:**
1. Go to **People → Customer Equipment → + Add New**
2. Select **Branch**, **Customer**, **Assign Type**, **Assigned Date**
3. Optionally link an existing **Sales Invoice** or **Stock Request**
4. Add product lines:
   - **Tracked products** (serial numbers): tick serials from the panel
   - **Non-tracked products**: enter quantity and unit
5. Click **Save**

**To mark equipment as returned:**
- Click the return icon (↩) on the list page
- Enter the return date and an optional note
- Click **Confirm**

> Returned records cannot be deleted — they are permanent history. Only delete records created by mistake.

**Serial History:**
Click the clock icon (🕐) next to any serial number to view its full assignment history across all customers.

---

# 5. Inventory Management

## 5.1 Categories

Product categories for organising your inventory.

1. Go to **Inventory → Categories → + Add New**
2. Enter **Name** and **Code**
3. Click **Save**

---

## 5.2 Brands

Product brands or manufacturers.

1. Go to **Inventory → Brands → + Add New**
2. Enter the brand name
3. Click **Save**

---

## 5.3 Units of Measure

Units define how products are measured and sold (e.g. pcs, kg, box, roll).

**Unit Types:** WEIGHT, LENGTH, QUANTITY, COLOR, SIZE, VOLUME, AREA, CAPACITY

**Unit Conversions:**
You can define conversion ratios between units for the same product type. For example:
- 1 box = 10 pcs → if the product's base unit is **pcs**, purchasing 5 boxes records 50 pcs in stock

**To add a unit:**
1. Go to **Inventory → Units → + Add New**
2. Enter **Name** and select **Type**
3. Click **Save**

---

## 5.4 Variant Attributes

Variant attributes define characteristics of product variants (e.g. Color, Size).

1. Go to **Inventory → Variant Attributes → + Add New**
2. Enter the **Attribute Name** (e.g. "Color")
3. Add one or more **Values** (e.g. "Red", "Blue", "Black")
4. Click **Save**

---

## 5.5 Products & Variants

Products are the master items you sell. Each product can have one or more **variants** (SKUs).

### Product Types
- **New** — new condition items
- **SecondHand** — used or refurbished items

A product can have both a New and a SecondHand variant. When a New item is returned by a customer and converted, the system automatically creates a SecondHand variant.

### Creating a Product

1. Go to **Inventory → Products → + Add New**
2. Fill in:
   - **Category** (required)
   - **Brand** (optional)
   - **Product Name**
   - **Image** (optional)
   - **Note** (optional)
3. Under the **Variant** tab, fill in:
   - **SKU** — unique identifier per product type
   - **Barcode** — unique per product type
   - **Product Type** — New or SecondHand
   - **Retail Price** and **Wholesale Price**
   - **Purchase Price**
   - **Base Unit** — all stock stored in this unit
   - **Stock Alert** — quantity threshold for low stock notification
   - **Tracking Type**:
     - **NONE** — no individual item tracking
     - **ASSET_ONLY** — tracked by asset code
     - **MAC_ONLY** — tracked by MAC address
     - **ASSET_AND_MAC** — tracked by both
4. Click **Save**

### Serial / Asset Tracking

For high-value items (laptops, routers, CCTV cameras), enable tracking to record individual serial numbers:
- Each unit purchased gets a unique `ProductAssetItem` record
- Status lifecycle: `IN_STOCK → SOLD/RESERVED/TRANSFERRED → IN_STOCK` (on return)
- Possible statuses: IN_STOCK, RESERVED, SOLD, RETURNED, TRANSFERRED, DAMAGED, LOST, REMOVED

---

## 5.6 Services

Non-inventory items that can be added to quotations and invoices (e.g. installation fee, delivery charge).

1. Go to **Inventory → Services → + Add New**
2. Enter **Service Code**, **Name**, and **Price**
3. Click **Save**

---

# 6. Sales

## 6.1 Quotations

A quotation is a price offer sent to a customer before confirming a sale.

**Quotation Statuses:**
```
PENDING → SENT → INVOICED
                → CANCELLED
```

### Creating a Quotation

1. Go to **Sale → Quotations → + Add New**
2. Select **Branch**, **Customer** (optional), **Sale Type** (Retail/Wholesale), **Date**
3. Add product lines:
   - Search by name, SKU, or barcode
   - Enter quantity
   - Price auto-fills based on sale type; you can override
   - For tracked products: select serials (Manual or Auto mode)
4. Add service lines (optional)
5. Set status to **PENDING** or **SENT**
6. Click **Save**

### Converting a Quotation to Invoice

1. Open the quotation
2. Click **Convert to Invoice**
3. The system creates a new invoice in PENDING status
4. Proceed to approve the invoice (see Section 6.2)

> Quotations with status INVOICED or CANCELLED cannot be edited or deleted.

---

## 6.2 Sales Invoices

Invoices record confirmed sales to customers.

**Invoice Statuses:**
```
PENDING → APPROVED → COMPLETED
```

### Creating an Invoice

1. Go to **Sale → Sales → + Add New**
2. Select **Branch**, **Customer** (optional — walk-in sales allowed), **Order Date**, **Sale Type**
3. Add product and/or service lines
4. For tracked products: choose **Auto Assign** (system picks serials) or **Manual** (you select serials)
5. Save as **PENDING** to review later, or proceed to approve

### Approving an Invoice

Approval triggers:
- Stock validation (checks sufficient quantity)
- Serial number validation (serials must be IN_STOCK at the branch)
- FIFO cost calculation (COGS recorded per line item)
- Stock quantities decremented
- Serial statuses updated to SOLD

1. Open the invoice
2. Change status to **APPROVED**
3. Click **Save**

### Recording Payment

After approval, record payment:
1. Click **Add Payment**
2. Select **Payment Method**
3. Enter amount in **USD** and/or **KHR**
4. Enter **Exchange Rate** (KHR per USD)
5. Click **Save**

Multiple payments can be recorded (partial payments supported).

### Sale Types

| Type | Price Used |
|------|-----------|
| **Retail** | `retailPrice` on each variant |
| **Wholesale** | `wholeSalePrice` on each variant |

### Tax & Discount

- **Per-item**: set tax type (Include/Exclude) and percentage; discount as fixed amount or percentage
- **Order-level**: overall discount applied to the invoice total

---

## 6.3 Sale Returns

When a customer returns goods.

1. Go to **Sale → Return Sales → + Add New**
2. Search and select the original **Invoice**
3. The invoice items load automatically
4. For each item to return:
   - Adjust the **return quantity** using the +/- stepper
   - For tracked products: click **Select Serial** to pick which serials are returned
   - For New products: check **Return as SecondHand** if the returned item will be sold as used
5. Click **Save**

**Stock effect:**
- Returned stock is added back (FIFO layer created)
- Serial status reverts to IN_STOCK
- If "Return as SecondHand" is checked: stock added to the SecondHand variant (auto-created if it doesn't exist)

---

## 6.4 Point of Sale (POS)

The POS interface is designed for fast cashier operation at `/pos`.

### Opening a Cash Session

Before making sales, open a cash session:
1. Click **Open Cash Drawer**
2. Select **Shift** (Morning / Afternoon / Night / Custom)
3. Enter opening cash in USD and KHR
4. Click **Open**

### Making a Sale

1. **Search** for products by name or barcode (top search bar)
2. **Scan** barcodes with a hardware scanner or click the 📷 icon for camera scan
3. Click a product card to add it to the cart; use **+/-** to adjust quantity
4. Select **Sale Type**: Retail (indigo) or Wholesale (amber)
5. Add a **Customer** (optional) using the customer search
6. Click **Pay** to open the payment screen
7. Enter amount received, select payment method, confirm

### Per-Item Configuration

Click the gear icon (⚙) on a product card or the pencil (✏) in the cart to set:
- **Unit** (if product has unit conversions)
- **Quantity**
- **Tax**: Include or Exclude, with percentage
- **Discount**: Fixed amount or percentage

### Customer Display

Click the monitor icon (🖥) in the header to open a customer-facing screen in a new window. It shows cart items and totals in real time, and displays a "Thank You" screen after payment.

### Held Orders

Click **Hold** to park a current order and start a new one. Click **Held Orders** to resume a parked order.

### Closing a Cash Session

1. Click **Close Cash Drawer**
2. Review the cash session summary (opening balance, sales by payment method)
3. Enter **Actual Cash Counted**
4. Add a closing note (optional)
5. Click **Close Session**

---

# 7. Purchases

## 7.1 Purchase Orders

Purchase Orders (POs) record goods bought from suppliers.

**Purchase Statuses:**
```
PENDING → REQUESTED → APPROVED → RECEIVED → COMPLETED
                                           → CANCELLED
```

### Creating a Purchase Order

1. Go to **Sale → Purchases → + Add New**
2. Select **Supplier**, **Branch**, **Purchase Date**
3. Add product lines: search product, select unit, enter quantity and unit cost
4. Set the status:
   - **PENDING** — draft, not yet submitted
   - **REQUESTED** — submitted for approval (required if total exceeds your authorize limit)
   - **APPROVED** — admin has approved (admin only)
   - **RECEIVED** — goods received; stock is added
5. Click **Save**

### Purchase Authorize Amount Rules

| User Type | Total ≤ Limit | Total > Limit |
|-----------|--------------|---------------|
| Admin | Any status | Any status |
| Regular User | Any status | Only PENDING or REQUESTED |

Once an admin approves an over-limit PO, the regular user can then change it to RECEIVED to record receipt of goods.

### Receiving Stock

When status is set to **RECEIVED**:
- A stock movement is created for each line item
- Stock quantities are increased at the selected branch
- For tracked products: you must provide serial numbers / asset codes per unit
- FIFO layers are created with the purchase cost

### Recording Payments to Suppliers

1. Open the purchase order
2. Click **Add Payment**
3. Select payment method and enter amounts
4. Click **Save**

---

## 7.2 Purchase Returns

Return goods to a supplier (e.g. damaged or wrong items received).

**Reference format:** `PRE-XXXXX` (globally unique)

### Creating a Purchase Return

1. Go to **Stock → Purchase Return → + Add New** (or from the sidebar)
2. Select **Branch**
3. Search and select the **Purchase Order** (must be RECEIVED or COMPLETED status)
4. Supplier auto-fills from the PO
5. Items load automatically; remove any items you do NOT want to return
6. Adjust return quantities (already-returned quantities are pre-subtracted)
7. For tracked products: select serials to return (**Manual only** — no auto-assign for returns)
8. Click **Save**

**Stock effect:** Stock is decremented (removed) for returned items.

---

# 8. Stock Management

## 8.1 Stock Summary

View current stock levels for all products across all branches.

1. Go to **Report → Stock Summary Report**
2. Use filters: **Branch**, **Status** (In Stock / Low Stock / Out of Stock), **Search**
3. Click the barcode icon (📊) on any product to view all serial numbers / asset items for that variant

---

## 8.2 Stock Adjustment

Manually correct stock quantities (e.g. after a physical count).

**Adjustment Types:**
- **POSITIVE** — add stock (e.g. found extra units)
- **NEGATIVE** — remove stock (e.g. damaged, lost, or counted short)

### Creating an Adjustment

1. Go to **Stock → Stock Adjustment → + Add New**
2. Select **Branch** and **Adjustment Date**
3. Add product lines:
   - Search product
   - Select **POSITIVE** or **NEGATIVE**
   - Enter quantity
   - For **NEGATIVE** lines, select a **Reason**:
     - **REMOVED** — written off / disposed
     - **DAMAGED** — physically damaged
     - **LOST** — lost or missing
   - For tracked products: select serials
4. Click **Save**

**FIFO effect:**
- POSITIVE: creates a new FIFO layer (cost = 0 unless specified)
- NEGATIVE: consumes existing FIFO batches in order (oldest first)

---

## 8.3 Stock Transfer

Transfer stock between branches.

1. Go to **Stock → Stock Transfer → + Add New**
2. Select **Source Branch** (from) and **Destination Branch** (to)
3. Add product lines: search product, enter quantity
4. For tracked products: select which serial numbers to transfer
5. Click **Save** → status becomes PENDING
6. Approve to execute the transfer

**Stock effect:**
- Source branch: stock decremented (OUT movement)
- Destination branch: stock incremented (IN movement)
- Same FIFO cost basis carried from source to destination
- Serial status: changes to TRANSFERRED; branch updated to destination

---

## 8.4 Stock Request

Request stock from another branch (pull-based transfer).

1. Go to **Stock → Stock Request → + Add New**
2. Select the **Requesting Branch** and the **Source Branch**
3. Add product lines with quantities
4. For tracked products: select serials from the source branch
5. Optionally link an existing **Sales Invoice** (if this request fulfils a sale)
6. Click **Save**

---

# 9. Expense & Income

## 9.1 Expenses

Record operational costs not related to purchasing inventory.

1. Go to **Expense / Income → Expenses → + Add New**
2. Enter: **Date**, **Amount**, **Description**, **Branch**
3. Click **Save**

## 9.2 Income

Record other income not from sales invoices (e.g. service fees, commissions).

1. Go to **Expense / Income → Income → + Add New**
2. Enter: **Date**, **Amount**, **Description**, **Branch**
3. Click **Save**

---

# 10. Reports

## 10.1 Financial Reports

| Report | Location | Description |
|--------|----------|-------------|
| **Invoice Report** | Report → Invoice Report | All sales invoices with profit per invoice |
| **Purchase Report** | Report → Purchase Report | All purchase orders with payment status |
| **Profit Report** | Report → Profit Report | Gross profit, COGS, returns deducted, net profit |
| **Payment Report** | Report → Payment Report | Payments received on sales by method and date |
| **Payment Purchase Report** | Report → Payment Purchase Report | Payments made to suppliers |
| **Expense Report** | Report → Expense Report | Operational expenses by branch and date |
| **Income Report** | Report → Income Report | Other income by branch and date |
| **Cancel Invoice Report** | Report → Cancel Invoice Report | All cancelled invoices |
| **Quotation Report** | Report → Quotation Report | All quotations with status pipeline |

## 10.2 Stock Reports

| Report | Location | Description |
|--------|----------|-------------|
| **Stock Summary Report** | Report → Stock Summary Report | Current stock levels with low/out-of-stock indicators |
| **Stock Low Report** | Report → Stock Low Report | Only products at or below their stock alert threshold |
| **Stock Movement Report** | Report → Stock Movement Report | Complete history of all stock in/out movements |
| **Stock Valuation Report** | Report → Stock Valuation Report | Current stock value using FIFO cost |
| **Adjustment Report** | Report → Adjustment Report | All manual adjustments; filter by Reason (Removed/Damaged/Lost) |
| **Transfer Report** | Report → Transfer Report | Inter-branch transfer history with serial numbers |
| **Request Report** | Report → Request Report | Stock request history with serial numbers |
| **Serial / Asset Report** | Report → Serial / Asset Report | All tracked items; filter by status, tracking type, branch |
| **Purchase Return Report** | Report → Purchase Return Report | Returns to suppliers with serial numbers |
| **Sale Return Report** | Report → Sale Return Report | Customer returns with prorated COGS |

## 10.3 People Reports

| Report | Location | Description |
|--------|----------|-------------|
| **Top Selling Products** | Report → Top Selling Products | Products ranked by qty sold, revenue, profit |
| **Top Sales Person** | Report → Top Sales Person | Staff ranked by total sales value |
| **Customer Purchase Report** | Report → Customer Purchase Report | Customers ranked by purchase history; drill-down to invoices |
| **Equipment Report** | Report → Equipment Report | All customer equipment assignments |
| **Cash Sessions** | Report → Cash Sessions | POS cash session history |

## 10.4 Using Reports

**Common filters available on most reports:**
- **Date Range** — start and end date
- **Branch** — filter by specific branch (all branches shown by default)
- **Status** — filter by document status
- **Search** — search by product name, SKU, reference number, etc.

**Exporting:** Most reports have an **Export** button to download data.

**Detail modals:** Click the eye icon (👁) or any row to open a detail modal showing line items, serial numbers, and payment details.

---

# 11. Settings & Administration

## 11.1 Payment Methods

Define accepted payment methods (Cash, Bank Transfer, ABA, etc.).

1. Go to **Inventory → Payment Method → + Add New**
2. Enter the method name
3. Click **Save**

## 11.2 Exchange Rate

Set the current USD/KHR exchange rate used across the system.

1. Go to **Settings → Exchange Rate** (or from the dashboard)
2. Enter the current rate (KHR per 1 USD)
3. Click **Save**

## 11.3 Company Settings

Configure company name, logo, and other system-wide settings.  
Requires the **Company-Settings-Edit** permission.

---

# 12. Roles & Permissions

## 12.1 Overview

The permission system has three layers:

1. **Modules** — logical groups (Stock, Purchase, Sale, Report, etc.)
2. **Permissions** — specific actions (e.g. `Stock-View`, `Purchase-Approve`)
3. **Roles** — named collections of permissions assigned to users

**Admin bypass:** Users with `roleType = ADMIN` skip all permission checks and have full access.

## 12.2 Creating a Role

1. Go to **Settings (or People) → Roles → + Add New**
2. Enter the **Role Name**
3. Check the permissions this role should have
4. Click **Save**

## 12.3 Assigning Roles to Users

1. Go to **People → Users → Edit** (select user)
2. In the **Roles** section, select one or more roles
3. Click **Save**

Real-time update: the user's permissions update immediately via socket — no logout required.

## 12.4 Direct User Permissions

Individual permissions can be granted directly to a user without going through a role:

1. Go to **People → Users → Edit** (select user)
2. Scroll to the **Direct Permissions** section (amber/yellow panel)
3. Check any additional permissions
4. Click **Save**

> Direct permissions supplement role permissions. A user has access if the permission appears in **any role** or in their **direct permissions**.

## 12.5 Key Permissions Reference

| Permission | What It Controls |
|-----------|-----------------|
| `Invoice-View` | View sales invoices |
| `Invoice-Create` | Create new invoices |
| `Invoice-Approve` | Approve invoices (cuts stock) |
| `Purchase-View` | View purchase orders |
| `Purchase-Approve` | Approve purchase orders |
| `Purchase-Receive` | Mark POs as received (adds stock) |
| `Stock-View` | View stock summary |
| `Stock-Low-Report` | View low stock report + dashboard widget |
| `Stock-Adjustment-Create` | Create stock adjustments |
| `Stock-Transfer-Create` | Create stock transfers |
| `POS-View` | Access the POS interface |
| `Cash-Session-View` | View cash session history |
| `Customer-Equipment-View` | View customer equipment |
| `Customer-Equipment-Create` | Create equipment assignments |
| `Customer-Purchase-Report` | View customer purchase report |

---

# 13. Stock Alert Notifications

## 13.1 How It Works

The bell icon (🔔) in the top-right header shows real-time low stock alerts.

- **Red badge** shows the count of products currently below their stock alert threshold
- Alerts update automatically via live connection (Socket.IO)
- The system also checks every 5 minutes for any missed updates

## 13.2 What Triggers an Alert

A product appears in the alert when **all** of the following are true:
- The product variant has a **Stock Alert** threshold set (greater than 0)
- Current stock quantity is **at or below** that threshold
- The product is **active** (not deactivated)
- The product and variant have **not been deleted**

## 13.3 Setting a Stock Alert Threshold

1. Go to **Inventory → Products**
2. Edit the product
3. In the variant section, set **Stock Alert** (e.g. `10` means alert when stock drops to 10 or below)
4. Click **Save**

## 13.4 Using the Alert Bell

1. Click the bell icon 🔔 to open the alert dropdown
2. Each alert shows: **Product Name**, **Branch**, **Current Qty / Threshold**
3. Click **×** to dismiss an alert from your view (it returns on next refresh if stock is still low)
4. Click **View All** or **Go to Stock Summary** to open the full **Stock Low Report**

## 13.5 Stock Low Report

The Stock Low Report (`Report → Stock Low Report`) shows all products at or below their alert threshold, filterable by:
- **Branch**
- **Status**: Low Stock (qty > 0 but ≤ threshold) or Out of Stock (qty = 0)
- **Search**: product name, SKU, barcode

Each row shows: Product, Branch, Current Qty, Alert Qty, Shortage Qty, Status badge.

---

*End of User Manual*

---

**iZOOM Inventory Management System**  
*For technical support, contact your system administrator.*
