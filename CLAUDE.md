# Citylink Inventory System — Project Guide

## Project Overview

Full-stack, multi-branch inventory management system built with:
- **Backend**: Node.js + Express + TypeScript + Prisma ORM → PostgreSQL
- **Frontend**: React 19 + TypeScript + Vite 6
- **Real-time**: Socket.IO for live role/permission updates
- **Auth**: JWT in httpOnly cookies + RBAC (Role-Based Access Control)

**Cambodia-specific**: Multi-currency (USD/KHR), VAT declaration sync, timezone Asia/Phnom_Penh

---

## Directory Structure

```
Citylink-Inventory-claude/
├── backend/
│   ├── src/
│   │   ├── controllers/     # 31 route handlers (CRUD + business logic)
│   │   ├── routes/          # 31 Express route files
│   │   ├── middlewares/     # auth.ts (JWT + RBAC), validation.ts
│   │   ├── services/        # VAT sync integration (6 files)
│   │   ├── utils/           # FIFO stock logic, logger, branch filter, UOM conversion
│   │   ├── jobs/            # vatSyncRetry.job.ts (node-cron)
│   │   ├── lib/             # prisma.ts — singleton PrismaClient
│   │   ├── app.ts           # Express setup
│   │   └── server.ts        # HTTP server + Socket.IO entry point
│   ├── prisma/
│   │   ├── schema.prisma    # All DB models (40+ models)
│   │   └── seed.ts
│   └── .env                 # APP_PORT, DATABASE_URL, JWT_SECRET_KEY, FRONTEND_URL
├── frontend/
│   ├── src/
│   │   ├── api/             # 32 API client modules (one per resource)
│   │   ├── pages/           # 33 page directories (~108 page components)
│   │   ├── components/      # ui/ (Shadcn/Radix), pos/ (POS system)
│   │   ├── contexts/        # AppContext.tsx (auth+permissions), LanguageContext.tsx
│   │   ├── hooks/           # useAppContext, useCart (Zustand), useClock, useSupplier
│   │   ├── data_types/      # types.ts — all shared TypeScript interfaces
│   │   ├── i18n/            # i18next multi-language support
│   │   ├── App.tsx          # React Router v6 — all routes
│   │   └── PrivateRoute.tsx # Route protection wrapper
│   └── .env                 # VITE_API_URL=http://localhost:4000
```

---

## Development Commands

### Backend
```bash
cd backend
npm run dev        # Start with nodemon (port 4000)
npm run build      # Compile TypeScript → dist/
npm start          # Run compiled version
npm test           # Run Jest tests
npx prisma migrate deploy  # Apply DB migrations
npm run seed       # Seed database
```

### Frontend
```bash
cd frontend
npm run dev        # Vite dev server (port 3000)
npm run build      # Production build → build/
npm run preview    # Preview production build
```

---

## Architecture Patterns

### Backend
- **Singleton Prisma**: All controllers import `{ prisma }` from `../lib/prisma` — never `new PrismaClient()`
- **RBAC middleware chain**: `verifyToken` → `authorize([permissions])` → route handler
- **Admin bypass**: Users with `roleType === "ADMIN"` skip all permission checks
- **FIFO stock**: `utils/consumeFifoForSale.ts`, `consumeFifoForTransfer.ts`, `consumeFifoForAdjustment.ts`
- **Soft deletes**: All major models have `deletedAt`, `deletedBy` fields — never hard delete
- **Audit trail**: `createdBy`, `updatedBy`, `deletedBy` on all entities
- **Logging**: Winston logger (`utils/logger.ts`) — use `logger.error/info/warn`, never `console.log` in production
- **Timezone**: Asia/Phnom_Penh — all date calculations use dayjs with timezone plugin

### Frontend
- **Auth state**: `AppContext.tsx` — `isLoggedIn`, `user`, `hasPermission()`
- **Cart state**: Zustand store in `hooks/useCart.ts`
- **Server state**: React Query (`@tanstack/react-query`) for all API data
- **API calls**: All fetch calls use `credentials: "include"` for cookie auth
- **Path alias**: `@/` maps to `src/` (configured in tsconfig.json + vite.config.ts)

---

## Key Configuration

### Backend `.env`
```
APP_PORT=4000
JWT_SECRET_KEY=<secret>
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:<pass>@localhost:5432/node_react_pos?schema=public
DATABASE_URL_SECONDARY=<optional, for VAT sync>
VAT_SYNC_SOURCE_SYSTEM=inventory
VAT_SYNC_TARGET_SYSTEM=inventories
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:4000
```

### Frontend `tsconfig.json` (important settings for Vite 6 + TS 5)
```json
{
  "target": "ES2020",
  "module": "ESNext",
  "moduleResolution": "bundler",
  "paths": { "@/*": ["./src/*"] }
}
```
> Do NOT use `"moduleResolution": "node"` (deprecated in TS5) or `"target": "es5"` (incompatible with React 19/Vite 6). Do NOT add `"baseUrl"` — not needed with `bundler` resolution in TS5.

---

## Unit of Measure (UOM) & Unit Conversion

All stock quantities are stored internally in a **base unit** per product variant.

### Key Models
- **`Units`** table: `id`, `name` (e.g. "kg", "pcs", "box"), `type` enum: `WEIGHT | LENGTH | QUANTITY | COLOR | SIZE | VOLUME | AREA | CAPACITY`
- **`ProductUnitConversion`** table: `productId`, `fromUnitId`, `toUnitId`, `multiplier` (Decimal 10,4) — unique per `[productId, fromUnitId, toUnitId]`
- **`ProductVariants`** fields:
  - `baseUnitId` — all stock calculations use this unit
  - `purchasePriceUnitId` — unit for purchase cost
  - `retailPriceUnitId` — unit for retail price
  - `wholeSalePriceUnitId` — unit for wholesale price

### Conversion Workflow (`utils/uom.ts` → `computeBaseQty()`)
1. Retrieve variant's `baseUnitId`
2. Look up `ProductUnitConversion` matching `[productId, fromUnitId, toUnitId]`
3. Multiply `unitQty × multiplier` → `baseQty`
4. All stock movements and FIFO layers are stored in base units

**Example**: Purchase 100 boxes (1 box = 10 pcs, base = pcs)
- Stored as 1000 pcs; cost stored per box unit; FIFO consumes in pcs

---

## Serial Number / Asset Tracking

Products with physical tracking (laptops, phones, equipment) use the `ProductAssetItem` model.

### Tracking Types (on `ProductVariants.trackingType`)
- `NONE` — no individual item tracking
- `ASSET_ONLY` — track by asset code
- `MAC_ONLY` — track by MAC address
- `ASSET_AND_MAC` — track both

### `ProductAssetItem` Model Fields
- `serialNumber` (unique per productVariantId), `assetCode`, `macAddress`
- `status`: `IN_STOCK | RESERVED | SOLD | RETURNED | TRANSFERRED | DAMAGED | LOST | REMOVED`
- `sourceType`, `sourceId` — origin tracking (e.g. `"PURCHASE"` + purchaseDetailId)
- `soldOrderItemId` — links to the sale order item when SOLD
- DB unique constraints: `[productVariantId, serialNumber]`, `[productVariantId, assetCode]`, `[productVariantId, macAddress]`

### Serial Number Lifecycle
1. **Create** — On purchase receipt: one `ProductAssetItem` per serial, status = `IN_STOCK`
2. **List available** — `getAvailableTrackedItems()` returns only `IN_STOCK` items for variant+branch
3. **Select for sale** — User picks serials manually (`serialSelectionMode = "MANUAL"`) or auto-assigned (`"AUTO"`)
4. **Approve invoice** — Validates serials are `IN_STOCK` in correct branch; updates status to `SOLD`; creates `OrderItemAssetItem` link
5. **Sale return** — Status reverts to `IN_STOCK`; `soldOrderItemId` cleared
6. **Transfer** — Status becomes `TRANSFERRED`; `branchId` updated

---

## Stock System & FIFO Cost Accounting

### `StockMovements` Model — Complete Audit Trail
Every inventory change creates an immutable `StockMovements` record:
- `productVariantId`, `branchId`
- `type`: `PURCHASE | ORDER | ADJUSTMENT | TRANSFER | REQUEST | RETURN | SALE_RETURN | QUOATETOINV`
- `AdjustMentType`: `POSITIVE | NEGATIVE` (adjustments only)
- `status`: `PENDING | APPROVED | CANCELLED`
- `quantity` (negative = outflow), `unitCost` (cost basis per base unit)
- Document refs (one used per row): `orderItemId`, `purchaseDetailId`, `adjustmentDetailId`, `transferDetailId`, `requestDetailId`, `returnDetailId`, `saleReturnItemId`
- FIFO fields: `sourceMovementId` (links to source batch), `remainingQty` (available qty in that batch)

### Movement Types Summary

| Type | Direction | Controller | Trigger |
|------|-----------|-----------|---------|
| `PURCHASE` | +Stock | purchaseController | Purchase order received |
| `ORDER` | -Stock | invoiceController | Invoice approved |
| `ADJUSTMENT (POSITIVE)` | +Stock | stockAdjustmentController | Manual count add |
| `ADJUSTMENT (NEGATIVE)` | -Stock | stockAdjustmentController | Manual count reduction |
| `TRANSFER` (out+in pair) | ±Stock | stockTransferController | Inter-branch transfer |
| `REQUEST` | ±Stock | stockRequestController | Inter-branch stock request |
| `RETURN` | -Stock | stockReturnController | Return goods to supplier |
| `SALE_RETURN` | +Stock | saleReturnController | Customer returns goods |

### FIFO Utilities (`backend/src/utils/`)
- **`consumeFifoForSale.ts`** — Invoice approval: consumes oldest cost batches first, calculates COGS, stores in `OrderItem.cogs`
- **`consumeFifoForTransfer.ts`** — Transfer approval: creates OUT (source) + IN (destination) pair; destination gets same cost basis; both linked via `sourceMovementId`
- **`consumeFifoForAdjustment.ts`** / **`consumeFifoForNegativeAdjustment.ts`** — Negative adjustments consume via FIFO; positive adjustments create new layers
- FIFO sources consumed in order: `PURCHASE`, `SALE_RETURN`, `ADJUSTMENT (POSITIVE)`, `TRANSFER` (inbound), sorted by `createdAt ASC, id ASC`

### `Stocks` Table
Stores running totals: `quantity` per `productVariantId + branchId`. Updated on every movement approval/cancellation.

---

## Product Structure

### `Products` Model
`id`, `categoryId` (FK → Categories), `brandId` (FK → Brands, optional), `name` (NOT unique — same name allowed for different `productType`), `image[]`, `note`, `isActive`, audit fields

> **Important**: `Products.name` had `@unique` removed (migration `20260403064752_remove_product_name_unique`). Uniqueness is now enforced at the application layer: a name+productType combination must be unique across `ProductVariants`. Check via `productVariants.findFirst({ where: { productType, products: { name } } })` — not `products.findFirst({ where: { name } })`.

### `ProductVariants` Model (SKU level)
- `sku` (unique per `productType`), `barcode` (unique per `productType`)
- `productType`: `"New"` or `"SecondHand"`
- Pricing: `purchasePrice`, `retailPrice`, `wholeSalePrice` (Decimal 18,4) with separate unit IDs
- `baseUnitId` — all stock in this unit
- `trackingType` — serial/asset tracking mode (see above)
- `stockAlert` — low stock threshold quantity

### Variant Attributes (Color, Size, etc.)
- `VariantAttribute`: `id`, `name` (e.g. "Color")
- `VariantValue`: `id`, `variantAttributeId`, `value` (e.g. "Red")
- `ProductVariantValues`: many-to-many join between variant and values

### Reference Number Formats
- Purchase: `PUR{YEAR}-{SEQUENCE}`
- Invoice/Order: `ZM{YEAR}-{SEQUENCE}` (prefix varies by branch)
- Quotation: `QT{YEAR}-{SEQUENCE}`
- Expense: `EXP-{SEQUENCE}`
- Income: `INC-{SEQUENCE}`

---

## Purchase Workflow

```
PENDING → REQUESTED → APPROVED → RECEIVED → COMPLETED
```

1. **Create PO** — `supplierId`, `branchId`, `purchaseDate`, line items with variant/unit/qty/cost. If total > `PurchaseAmountAuthorize` limit → status must go to REQUESTED first.
2. **Request Approval** — Status: PENDING → REQUESTED (for high-value POs)
3. **Approve** — Admin confirms; status: REQUESTED → APPROVED
4. **Receive Stock** — Status: APPROVED → RECEIVED:
   - Each line: `computeBaseQty()` normalizes to base unit
   - Creates APPROVED `StockMovements` (type: PURCHASE) with unit cost
   - If `trackingType ≠ NONE`: creates `ProductAssetItem` per serial (status = IN_STOCK)
   - Updates `Stocks` table
5. **Complete** — Status: RECEIVED → COMPLETED (payment finalized)
6. **Record Payments** — `PurchaseOnPayments`: `paymentMethodId`, `amount`, multi-currency (`receive_usd`, `receive_khr`, `exchangerate`)

### PO Authorize Amount Rules (`PurchaseAmountAuthorize` table)

| User Role | grandTotal ≤ Authorize Amount | grandTotal > Authorize Amount |
|-----------|------------------------------|-------------------------------|
| ADMIN | Can use any status | Can use any status |
| USER (simple) | Can use any status | Only PENDING or REQUESTED allowed |

**Simple user over-limit flow**:
- Status dropdown: APPROVED disabled; RECEIVED disabled (until admin approves)
- If user had APPROVED/RECEIVED selected and total goes over limit → auto-resets to REQUESTED
- Form submit guard also enforces this (throws error client-side; backend double-checks)

**Admin Approve → Simple User Receive**:
- Once admin sets status to APPROVED, the simple user **can** then change to RECEIVED (receive the goods)
- Tracked via `initialDbStatusRef` (React ref set on form load): when `initialDbStatusRef.current === "APPROVED"`, the RECEIVED restriction is lifted for simple users
- COMPLETED and CANCELLED remain disabled for simple users on over-limit POs even after receiving
- Error message ("over PO Authorize Amount") hidden once admin has approved
- Backend enforces: checks current DB status before rejecting; allows RECEIVED if `currentStatus === "APPROVED"` regardless of grandTotal
- Files: `backend/src/controllers/purchaseController.ts`, `frontend/src/pages/purchase/PurchaseForm.tsx`

---

## Quotation → Invoice (Sales) Workflow

```
Quotation: PENDING → SENT → INVOICED / CANCELLED
Invoice:   PENDING → APPROVED → COMPLETED
```

1. **Create Quotation** — Optional `customerId`, `QuoteSaleType` (RETAIL/WHOLESALE), line items with product/service/qty/price
2. **Send Quotation** — Status: PENDING → SENT
3. **Convert to Invoice** — Creates `Order` record; status: PENDING
4. **Approve Invoice** — Key step:
   - Validates stock availability
   - If tracked: validates selected serials are IN_STOCK in branch, updates to SOLD, creates `OrderItemAssetItem` links
   - Runs `consumeFifoForSale()` — creates APPROVED ORDER movements, records `cogs` on each `OrderItem`
   - Status: PENDING → APPROVED
5. **Record Sale Payment** — `OrderOnPayments`: `paymentMethodId`, `totalPaid`, multi-currency
6. **VAT Declaration** — `vat_status`: 0 (not declared) → 1 (declared); syncs to external VAT system

### Sale Types
- `RETAIL` — uses `retailPrice`
- `WHOLESALE` — uses `wholeSalePrice`

### QuotationForm — Serial/Asset Tracking (Frontend-State Only)
`QuotationForm` mirrors `InvoiceForm` for serial tracking UX, but with a key difference: **no `QuotationDetailAssetItem` DB table exists** — serial selections are kept in frontend state only and not persisted to the DB. Serial assignment is finalized at invoice approval time after convert-to-invoice.

- `effectiveBranchId` = `user?.roleType === "USER" ? user.branchId : watch("branchId")`
- `QuotationDetailType` includes tracking fields: `branchId`, `trackingType`, `serialSelectionMode`, `selectedTrackedItemIds`, `selectedTrackedItems`
- Quotation Modal has AUTO/MANUAL serial selection UI identical to Invoice Modal
- `isUserEditedPriceRef` protection in Quotation Modal: won't auto-overwrite price if user manually edited it (quotation-specific behavior)

---

## Stock Operations

### Stock Adjustment
- Create adjustment with POSITIVE or NEGATIVE details
- POSITIVE: adds new FIFO layer (`remainingQty = qty`)
- NEGATIVE: consumes existing FIFO layers; validates sufficient stock

### Stock Transfer (Inter-branch)
- Source branch: OUT movement (negative qty) consuming FIFO batches
- Destination branch: IN movement (positive qty) with same cost basis
- Both movements linked via `sourceMovementId`
- If tracked items: serial status → `TRANSFERRED`, `branchId` updated

### Stock Request (Inter-branch)
- Request branch requests stock from another branch
- Approval creates transfer movements

### Stock Return (Return to Supplier)
- Outbound movement from branch (negative)
- Consumes FIFO batches; reduces stock and clears cost layers

### Sale Return (Customer Returns)
- Customer returns goods → inbound movement (positive)
- Creates new FIFO layer with pro-rated cost
- If tracked: serial status reverts to IN_STOCK

#### SaleReturnForm UI (redesigned)
- `isTracked` check: `detail.ItemType === "PRODUCT" && productvariants?.trackingType != null && trackingType !== "NONE"` — "Select Serial" button only shown for tracked products
- Qty Return cell: compact inline stepper `[-] qty/max [+]`
- `ReturnTrackedModal`: fixed overlay (`position: fixed, inset: 0, zIndex: 1000`), two-panel layout, progress bar, numbered selected items, hover-to-remove buttons

---

## Reports System (15 Report Types)

### Financial Reports
| Report | Description | Key Calculation |
|--------|-------------|-----------------|
| **Profit Report** | Sales profit/loss with COGS | `SUM(OrderItem.total - OrderItem.cogs)` minus returns |
| **Invoice Report** | Sales by invoice with profit | Per-invoice breakdown with payment status |
| **Purchase Report** | PO summary | Total cost, paid, outstanding |
| **Payment Report** | Payments received on sales | By payment method, date |
| **Payment Purchase Report** | Payments made to suppliers | By payment method, date |
| **Expense Report** | Operational expenses | By branch, date range |
| **Income Report** | Other income items | By branch, date range |
| **Cancel Invoice Report** | Cancelled invoice tracking | — |

### Stock Reports
| Report | Description |
|--------|-------------|
| **Stock Report** | Current stock levels, low stock alerts (`qty ≤ stockAlert`) |
| **Adjustment Report** | All manual adjustments (POSITIVE/NEGATIVE) |
| **Transfer Report** | Inter-branch transfer history |
| **Request Report** | Stock request history |
| **Sale Return Report** | Customer returns |
| **Return Report** | Returns to supplier |
| **Quotation Report** | Quotation pipeline (PENDING/SENT/INVOICED/CANCELLED) |

### Profit Report Logic
- **Gross Profit**: `SUM(OrderItem.total - OrderItem.cogs)` — all approved invoices
- **Return Deduction**: If baseQty exists: `(oi.cogs / oi.baseQty) × sri.baseQty`; else `(oi.cogs / oi.quantity) × sri.quantity`
- **Net Profit**: Gross Profit − Return Deductions
- Supports filters: date range, sale type (RETAIL/WHOLESALE), status, branch

---

## Backend Controllers & Routes (31)

| Controller | Route Path | Key Operations |
|------------|-----------|----------------|
| authController | `/api/auth` | Login, Register, Logout (rate-limited) |
| branchController | `/api/branch` | CRUD, branch-scoped filter |
| brandController | `/api/brand` | CRUD with soft delete |
| categoryController | `/api/category` | CRUD with soft delete |
| customerController | `/api/customer` | CRUD, pagination, search |
| exchangeRateController | `/api/exchangerate` | Get/update USD-KHR rate |
| expenseController | `/api/expense` | CRUD expenses (branch-scoped) |
| incomeController | `/api/income` | CRUD income (branch-scoped) |
| invoiceController | `/api/invoice` | Create, approve, payment, serial selection |
| module_permissionController | `/api/module_permission` | Module-permission mapping |
| paymentMethodController | `/api/paymentmethod` | CRUD payment methods |
| permissionController | `/api/permission` | List permissions |
| productController | `/api/product` `/api/productvariant` | CRUD products+variants, serial import |
| purchaseController | `/api/purchase` | Full PO workflow + payments |
| quotationController | `/api/quotation` | Quote management, convert to invoice |
| reportController | `/api/report` | All 15 report endpoints |
| roleController | `/api/role` | CRUD roles + permission assignment |
| saleReturnController | `/api/salereturn` | Customer returns, COGS reversal |
| searchProductController | `/api/searchProductRoute` | Search by name/barcode/SKU |
| searchServiceController | `/api/searchServiceRoute` | Search services |
| serviceController | `/api/service` | CRUD non-inventory services |
| stockController | `/api/stock` | Stock summary, low stock, valuation |
| stockAdjustmentController | `/api/stockadjustment` | Create/approve adjustments, FIFO |
| stockRequestController | `/api/stockrequest` | Inter-branch requests |
| stockReturnController | `/api/stockreturn` | Return to supplier |
| stockTransferController | `/api/stocktransfer` | Inter-branch transfers, FIFO cost |
| supplierController | `/api/supplier` | CRUD suppliers |
| unitController | `/api/unit` | CRUD units, manage conversions |
| userController | `/api/user` | CRUD users, role/branch assignment |
| variantAttributeController | `/api/variant_attribute` | CRUD variant attributes (Color, Size) |

---

## Frontend Pages (33 directories)

| Directory | Purpose |
|-----------|---------|
| `branch/` | Branch management |
| `brand/` | Brand CRUD |
| `category/` | Product category management |
| `customer/` | Customer list and details |
| `dashboard/` | Overview metrics + summary cards |
| `expense/` | Expense entry and list |
| `income/` | Income entry and list |
| `invoice/` | Sales order/invoice creation + approval |
| `module_permission/` | Module-permission assignment UI |
| `paymentmethod/` | Payment method setup |
| `pos/` | Point-of-sale interface (Zustand cart) |
| `product/` | Product master data |
| `product_variant/` | Variant creation (SKU, barcode, pricing, units) |
| `purchase/` | Purchase order workflow |
| `quotation/` | Quotation management |
| `report/` | 15 report pages |
| `role/` | Role + permission management |
| `service/` | Non-inventory service items |
| `setting/` | System settings |
| `signin/` | Login |
| `signup/` | User registration |
| `stock/` | Stock summary + low stock alerts |
| `stockadjustment/` | Manual inventory adjustment |
| `stockrequest/` | Inter-branch requests |
| `stockreturn/` | Return to supplier |
| `stocktransfer/` | Inter-branch transfers |
| `supplier/` | Supplier master data |
| `unit/` | Unit of measure management |
| `user/` | User CRUD + role assignment |
| `varient_attribute/` | Variant attribute (Color, Size) setup |

---

## Roles & Permissions System

- **Modules**: Logical groupings (Stock, Purchase, Sale, Expense, Report, etc.)
- **Permissions**: Specific actions per module (e.g. Stock-View, Purchase-Approve)
- **Roles**: Named collections of permissions
- **`RoleOnUser`**: Many-to-many — user ↔ roles
- **`PermissionOnRole`**: Many-to-many — role ↔ permissions
- **Admin bypass**: `roleType === "ADMIN"` skips all `authorize()` checks
- Real-time updates via Socket.IO when roles/permissions change

---

## Database — 40+ Models

**Core entities**: User, Role, Module, Permission, RoleOnUser, PermissionOnRole, Branch, Categories, Brands, Units, ProductUnitConversion, VariantAttribute, VariantValue, Products, ProductVariants, ProductVariantValues, ProductAssetItem, Stocks, PaymentMethods, Suppliers, Purchases, PurchaseDetails, PurchaseOnPayments, PurchaseAmountAuthorize, Customer, Quotations, QuotationDetails, Order, OrderItem, OrderItemAssetItem, OrderOnPayments, Services, StockMovements, StockAdjustments, AdjustmentDetails, StockTransfers, TransferDetails, StockRequests, RequestDetails, StockReturns, ReturnDetails, SaleReturns, SaleReturnItems, Expenses, Incomes, ExchangeRates, VatSyncLog

**Key indexes**: `StockMovements[productVariantId, branchId, createdAt]`, `StockMovements[sourceMovementId]`, `ProductAssetItem[productVariantId, branchId, status]`

---

## Security Rules (Enforced)

1. **sortField SQL injection** — All controllers that use `ORDER BY "${sortField}"` must validate:
   ```typescript
   const rawSortField = getQueryString(req.query.sortField, "name")!;
   const sortField = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rawSortField) ? rawSortField : "name";
   ```
2. **JWT cookie** — Always `secure: process.env.NODE_ENV === "production"`, never hardcode `secure: false`
3. **Socket.IO events** — Always validate shape of incoming data before emitting
4. **CORS** — Locked to `process.env.FRONTEND_URL` only
5. **Rate limiting** — Login endpoint: 5 attempts per 15 minutes

---

## Bugs Fixed (Full Log)

### Backend
| # | Issue | File |
|---|---|---|
| 1 | `errors.isEmpty` → `errors.isEmpty()` (was never checking errors) | `middlewares/validation.ts` |
| 2 | `req.user.id` → `req.user.branchId` in getAllExpenses/getAllIncomes | `expenseController.ts`, `incomeController.ts` |
| 3 | SQL injection via unsanitized `sortField` in ORDER BY | All 25 controllers with raw SQL |
| 4 | `res. status` typo (space in method call) | `supplierController.ts` |
| 5 | Cookie `secure: false` hardcoded → `process.env.NODE_ENV === "production"` | `authController.ts` |
| 6 | `console.log("get token", token)` leaked JWT to logs | `authController.ts` |
| 7 | Socket.IO `upsertRole` had no shape validation — any client could emit | `server.ts` |
| 8 | Missing `return` after 404 response inside `$transaction` block | `branchController.ts` |
| 9 | `new PrismaClient()` in every file → connection pool exhaustion | All 31 controllers + 2 middlewares |
| 10 | `console.log` in production code → replaced with `logger` | server.ts, auth.ts, 5 controllers |
| 11 | Hardcoded Socket.IO IP `http://202.93.8.4` | `AppContext.tsx` |
| 12 | Multer `uploadImage` placed after `express-validator` in routes — multipart body never parsed | Product, Category, Brand route files |
| 13 | `Products.name @unique` constraint prevented same product name with different `productType` | `prisma/schema.prisma` (migration `20260403064752_remove_product_name_unique`) |
| 14 | Product uniqueness check used `products.findFirst({ where: { name } })` — missed productType scope | `productController.ts` — now uses `productVariants.findFirst({ where: { productType, products: { name } } })` |
| 15 | Simple user could bypass PO Authorize Amount by submitting APPROVED/RECEIVED status — no backend guard existed | `purchaseController.ts` — added pre-transaction check; allows RECEIVED only if current DB status is APPROVED |

### Frontend
| # | Issue | File |
|---|---|---|
| 1 | `signUp()` had no return statement — callers got `undefined` | `api/auth.ts` |
| 2 | `Promise<PermissionData>` → `Promise<PermissionData[]>` wrong return type | `api/permission.ts` |
| 3 | Type annotation mismatch after permission.ts fix | `contexts/AppContext.tsx` |
| 4 | `searchTerm` not URL-encoded in searchService | `api/searchService.ts` |
| 5 | Typo "Moudle" → "Module" in error message | `api/module_permission.ts` |
| 6 | `retailPrice`/`purchasePrice`/`wholeSalePrice` prop type didn't accept `undefined` | `pages/product_variant/Modal.tsx` |
| 7 | `console.log` in 8 files (Modal components, AppContext, ProductVariant, expense API) | Various |
| 8 | Comment `// ✅ Add this line` inside JSON broke tsconfig parsing | `tsconfig.json` |
| 9 | `"target": "es5"` incompatible with React 19 + Vite 6 | `tsconfig.json` |
| 10 | `"moduleResolution": "node"` deprecated in TypeScript 5 | `tsconfig.json` |
| 11 | `"baseUrl": "."` conflicts with `moduleResolution: "bundler"` | `tsconfig.json` |
| 12 | `ExchangeRate` display used `rate?.rate` without null check — crashed when no rate row existed | `pages/setting/` exchange rate component |
| 13 | SaleReturnForm `isTracked` didn't check `trackingType !== "NONE"` — showed serial button for all products | `pages/invoice/SaleReturnForm.tsx` |
| 14 | Product modal `useMemo` for variant options used object reference as dependency — caused infinite re-render loop | `pages/product/Modal.tsx` — fixed with `JSON.stringify(variants)` as dependency |
| 15 | QuotationForm missing `branchId` and serial tracking fields — modal couldn't look up available serials | `pages/quotation/QuotationForm.tsx`, `pages/quotation/Modal.tsx`, `data_types/types.ts` |
| 16 | `trackingType` missing from `ProductVariantType` interface — TS errors in PurchaseForm | `data_types/types.ts` — added `trackingType?: "NONE" \| "ASSET_ONLY" \| "MAC_ONLY" \| "ASSET_AND_MAC" \| null` |
| 17 | PurchaseForm submit button disappeared when simple user changed status to RECEIVED on an admin-approved PO | `pages/purchase/PurchaseForm.tsx` — added `initialDbStatusRef`; RECEIVED included in submit button condition when initialDbStatus is APPROVED |
| 18 | PurchaseForm auto-reset effect incorrectly reset status to REQUESTED when loading an admin-approved PO (over limit) | `pages/purchase/PurchaseForm.tsx` — effect skips reset when `initialDbStatusRef.current === "APPROVED"` |
| 19 | PurchaseForm COMPLETED and CANCELLED options were enabled after simple user selected RECEIVED on over-limit PO | `pages/purchase/PurchaseForm.tsx` — both disabled when `isOverPurchaseAuthorizeAmount && initialDbStatusRef.current === "APPROVED"` |
| 20 | PurchaseForm showed "over PO Authorize Amount" error after admin already approved the PO | `pages/purchase/PurchaseForm.tsx` — error message hidden when `initialDbStatusRef.current !== "APPROVED"` |

---

## Pre-existing Issues (Not Fixed — By Design)

### Frontend `components/ui/`
Several Shadcn UI scaffold files reference packages that are not installed:
- `@radix-ui/react-checkbox`, `@radix-ui/react-select`, `@radix-ui/react-separator`, etc.
- `cmdk`, `vaul`, `sonner`, `next-themes`
- `chart.tsx` — Recharts type mismatch with installed version
- `calendar.tsx` — Radix UI version mismatch

Not actively used by the application. TypeScript errors suppressed via `"skipLibCheck": true`.

### Backend
- `show_pass` field stores plaintext password copy — kept intentionally per user request
- Race condition in reference number generation (EXP-, INC-, INV- prefixes) — no DB-level lock
- No global rate limiting (only login endpoint is rate-limited)

---

## Docker

```bash
# Build and run everything
docker-compose -f docker-compose_if_use_docker_pls_use_this_file.yml up --build

# Backend runs on port 4000, Frontend (nginx) on port 3000
```
