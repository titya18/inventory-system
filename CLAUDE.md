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

#### Negative Adjustment Reason (per detail line)
Every NEGATIVE adjustment line has a `reason` field stored in `AdjustmentDetails.reason` (DB migration `20260420022409_add_reason_to_adjustment_details`):
- `REMOVED` (default) — stock written off
- `DAMAGED` — stock physically damaged
- `LOST` — stock lost/missing

**Tracked products**: the chosen reason becomes the `ProductAssetItem.status` for each selected serial — making DAMAGED and LOST statuses actually reachable. Previously only REMOVED was ever set (hardcoded).
**Non-tracked products**: `reason` is stored on `AdjustmentDetails` only (no per-item record exists); visible in the Adjustment Report.

Frontend: `StockAdjustmentForm.tsx` shows a **Reason** dropdown per row whenever `AdjustMentType === "NEGATIVE"`.
Backend: `stockAdjustmentController.ts` builds a `reasonMap` keyed by `productVariantId`; applies the reason as `status` on `productAssetItem.updateMany()` for tracked items.

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
- **"Return as SecondHand" checkbox**: shown per product line when `productType === "New"` and `currentReturn > 0`; controlled via `secondHandLines` state (Record<detailId, boolean>); sends `convertToSecondHand` flag in submit payload
- **Serial selection flow**: `clickData` passed as `{ ...detail, orderItemId: detail.id, quantity: currentReturn, selectedTrackedItemIds: currentLine?.selectedTrackedItemIds }` — ensures modal fetches correct serials, enforces return qty (not invoice qty), and restores previous selection on re-open

#### New → SecondHand Conversion on Sale Return (Backend)
- Triggered when `convertToSecondHand: true` on a return item
- Backend resolves `targetVariantId`: looks for existing SecondHand variant (`productType: "SecondHand"`) for same `productId`
- If **not found**: auto-creates SecondHand variant inheriting SKU, barcode, name, pricing, units, trackingType from the New variant; admin can edit price afterward
- Returned stock (FIFO movement + Stocks upsert) and serial `productVariantId` all point to `targetVariantId`
- File: `backend/src/controllers/saleReturnController.ts`

---

## Customer Equipment

Tracks which equipment/products are assigned to customers — sold, rented, or installed at a site. Separate from the invoice/sale system but can be linked to an existing invoice.

### Models
- **`CustomerEquipment`** — header record: `ref` (CEQ-00001), `customerId`, `branchId`, `assignType` (SOLD | RENTED | INSTALLED), `assignedAt`, `returnedAt`, `orderId` (optional link to `Order`), `note`, audit fields
- **`CustomerEquipmentItem`** — line items: one row per serial (tracked) or one row per product+qty (non-tracked): `customerEquipmentId`, `productAssetItemId` (nullable), `productVariantId` (nullable), `quantity` (nullable), `unitId` (nullable)

### Assignment Types
| Type | Serial Status Set | Stock Effect |
|---|---|---|
| `SOLD` | `SOLD` | Decrements stock (if no invoice linked) |
| `RENTED` | `RESERVED` | Decrements stock (if no invoice linked) |
| `INSTALLED` | `RESERVED` | Decrements stock (if no invoice linked) |

### Stock Logic Rule — Critical
The `orderId` field on `CustomerEquipment` determines whether stock is affected:

| `orderId` present | Effect |
|---|---|
| **Empty (no invoice)** | Stock IS affected — serial status changed + Stocks table decremented |
| **Filled (invoice linked)** | Stock NOT affected — invoice already handled stock; only serial status tracking |

**Reason**: If a sale invoice already exists, stock was already cut at invoice approval. Linking the invoice prevents a double stock cut. If no invoice exists (free rental, installation, gift), stock must be cut here.

### Item Types
- **TRACKED** — `productAssetItemId` is set; serial/asset item status changes; quantity/unitId are null
- **NON_TRACKED** — `productVariantId` + `quantity` + `unitId` are set; stock decremented in **base units** via `computeBaseQty()`

### Unit Conversion for Non-Tracked Items
All stock effects use `computeBaseQty()` from `utils/uom.ts`:
- Product with conversion (e.g. 1 box = 10 pcs, base = pcs): assign 2 boxes → stock decremented by 20 pcs
- Product with single unit: quantity used as-is
- On return/edit/delete: same `computeBaseQty()` applied in reverse using stored `unitId` from DB

### Serial Status Lifecycle in Customer Equipment
```
IN_STOCK → SOLD/RESERVED (on assign without invoice)
SOLD/RESERVED → IN_STOCK (on return or delete of active record)
```
Serials sold via an invoice show as SOLD but disabled in the serial panel with message: `"Sold via ZM2026-00001 (Customer) — link the Order above"`

### Available Serial Panel (Create/Edit Form)
| Status | Selectable | Label shown |
|---|---|---|
| `IN_STOCK` | ✓ Yes | `[IN_STOCK]` |
| `SOLD` | ✗ No | `Sold via {ref} ({customer}) — link the Order above` (red) |
| `RESERVED` | ✗ No | `Already assigned to another customer` (orange) |
| Other | ✗ No | `[{status}]` |

Each serial row has a **🕐 history icon** — clicking it opens a modal showing all past assignments for that serial (customer name, phone, branch, dates, invoice ref, status). Works even when serial is back to `IN_STOCK`.

### Controller Functions (`customerEquipmentController.ts`)
- **`getAllCustomerEquipments`** — paginated list with search (customer name, phone, serial, product name, ref), filters (status, assignType, branchId)
- **`getCustomerEquipmentById`** — full record with items + product details
- **`getSerialHistory`** — all CEQ records for a given `productAssetItemId`, ordered by `assignedAt DESC`
- **`getAvailableAssetItems`** — all serials for variant+branch (ALL statuses returned; frontend filters selectability)
- **`getVariantUnits`** — base unit + all conversion units for a variant (used to populate unit dropdown)
- **`searchOrders`** — search invoices by ref within a branch (for linking orders)
- **`createCustomerEquipment`** — creates header + items in `$transaction`; applies stock effects if no `orderId`
- **`returnCustomerEquipment`** — marks returned; reverses stock effects if no `orderId`
- **`updateCustomerEquipment`** — fetches old items first; reverses old effects **only when `items` are being replaced** (guard: `!oldOrderId && Array.isArray(items)`); replaces items via nested Prisma write; applies new effects in `$transaction`
- **`deleteCustomerEquipment`** — reverses stock effects if record was active (not returned) and had no `orderId`; then deletes

### Stock Helper Functions (internal, not exported)
```typescript
serialStatusForAssign(assignType)          // "SOLD" → "SOLD", else "RESERVED"
applyDbItemEffects(tx, dbItems, ...)       // Reverse/apply effects for items fetched from DB (includes unitId)
applyPayloadEffects(tx, reqItems, ...)     // Reverse/apply effects for items from request body
```
Both helpers call `computeBaseQty()` for NON_TRACKED items to ensure stock changes are in base units.

### Frontend Routes
- `/customerequipment` — list page with search, status filter, assignType filter
- `/customerequipment/create` — create form
- `/customerequipment/:id` — view (read-only)
- `/customerequipment/:id/edit` — edit form (branch is read-only; cannot edit returned records)

### Form Mode Detection
`isEdit = location.pathname.endsWith("/edit")`, `isView = !!id && !isEdit`

Edit mode pre-populates lines: tracked items grouped by variant (multiple serials per line), non-tracked items with unit fetched. Pre-selected serials that are now RESERVED/SOLD are merged into the available list (frontend merge at `fetchRecord`).

### Return Flow (from List Page)
Click ↩ icon → modal asks for return date + optional note → `PUT /api/customerequipment/:id/return` → stock reversed if no orderId.

### Delete Behaviour
- **Returned record**: **blocked entirely** — frontend hides delete button; backend returns 400 error. Returned records are permanent audit history and must never be deleted.
- **Active record, no invoice**: shows warning dialog explaining history loss; restores stock (serials → IN_STOCK, qty restored in base units) then deletes
- **Active record, with invoice**: shows warning dialog; deletes record only (stock was invoice's responsibility)
- Recommendation: only delete records created by mistake (wrong customer, wrong product). Always prefer "Mark as Returned" to preserve history.

### Known Limitation
If a CEQ is edited to **add** an invoice (`orderId`) that was previously absent, REVERSE correctly stops future stock cuts but cannot retroactively fix serial status already set by the invoice approval. This is an extremely rare edge case and is by design.

### API Endpoints (`/api/customerequipment`)
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all (paginated) |
| POST | `/` | Create |
| GET | `/:id` | Get by ID |
| PUT | `/:id` | Update |
| DELETE | `/:id` | Delete |
| PUT | `/:id/return` | Mark as returned |
| GET | `/serial-history/:assetItemId` | Assignment history for a serial |
| GET | `/asset-items` | Available serials for variant+branch |
| GET | `/variant-units/:variantId` | Units for a variant |
| GET | `/search-orders` | Search invoices by ref+branch |

### Usage Guide by Product Type

**Tracked serial products** (Router, Laptop, CCTV):
1. Search product → serial panel appears
2. Tick serials to assign (IN_STOCK only; SOLD/RESERVED shown but disabled with explanation)
3. Click 🕐 on any serial to view full assignment history
4. If serial shows "Sold via ZM2026-XXXXX" → search that ref in the Order field and link it

**Products with unit conversion** (Cable: 1 roll = 50 m, base = m):
1. Search product → shows Qty input + unit dropdown
2. Enter quantity (e.g. 2) + select unit (e.g. roll)
3. System deducts 2 × 50 = 100 m from stock in base units

**Products with single unit** (WiFi Adapter — pcs only):
1. Search product → shows Qty input (no dropdown or just one unit shown)
2. Enter quantity → stock decremented by that exact amount

---

## Reports System (17 Report Types)

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
| **Serial / Asset Report** | All `ProductAssetItem` records — filterable by branch, status (IN_STOCK/SOLD/DAMAGED/LOST/REMOVED/etc.), tracking type; searchable by product/serial/asset/MAC; summary cards; export. Route `/asset-report`, gated on `Stock-Summary-Report` permission. Also accessible as a per-variant modal (ScanBarcode button) in Stock Summary. |
| **Adjustment Report** | All manual adjustments (POSITIVE/NEGATIVE); filter by Reason (REMOVED/DAMAGED/LOST); Reason shown as badge per adjustment row and per detail line in the detail modal |
| **Transfer Report** | Inter-branch transfer history |
| **Request Report** | Stock request history |
| **Sale Return Report** | Customer returns |
| **Return Report** | Returns to supplier |
| **Quotation Report** | Quotation pipeline (PENDING/SENT/INVOICED/CANCELLED) |
| **Customer Equipment Report** | Equipment assigned to customers — summary cards (Total/Active/Returned/Sold/Rented/Installed), filters (date range, status, assignType, branch, search), serial + non-tracked item display, export; requires `Customer-Equipment-Report` permission |

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
| customerEquipmentController | `/api/customerequipment` | Assign/return/edit equipment; serial history; unit-aware stock effects |
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
| stockController | `/api/stock` | Stock summary, low stock, valuation, `/serials` (per-variant serial lookup), `/asset-report` (paginated asset item report) |
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
| `customerequipment/` | Equipment assignment — list, create, view, edit; serial history modal |
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
- **`UserPermission`**: Direct user ↔ permission assignment (bypasses role chain); `@@id([userId, permissionId])`
- **Permission resolution**: `authorize()` unions role permissions + direct user permissions — a user has a permission if it appears in **any role** OR in their **direct permissions**
- **Admin bypass**: `roleType === "ADMIN"` skips all `authorize()` checks
- Real-time updates via Socket.IO when roles/permissions change

### Direct User Permissions (UserPermission)
- `UserPermission` table: `userId`, `permissionId`, `createdAt`, `createdBy`
- Backend endpoints: `GET /api/user/:id/permissions`, `PUT /api/user/:id/permissions`
- `verifyToken` fetches `directPermissions` alongside roles; both available on `req.user`
- `validateToken` response includes `directPermissions: string[]` — consumed by `AppContext`
- Frontend: `hasPermission()` checks role permissions first, then `user.directPermissions`
- UI: User edit form has a **Direct Permissions** panel (same card grid as RoleForm, amber/warning colour theme) — only shown for `roleType === "USER"`

---

## Database — 40+ Models

**Core entities**: User, Role, Module, Permission, RoleOnUser, PermissionOnRole, **UserPermission**, Branch, Categories, Brands, Units, ProductUnitConversion, VariantAttribute, VariantValue, Products, ProductVariants, ProductVariantValues, ProductAssetItem, Stocks, PaymentMethods, Suppliers, Purchases, PurchaseDetails, PurchaseOnPayments, PurchaseAmountAuthorize, Customer, Quotations, QuotationDetails, Order, OrderItem, OrderItemAssetItem, OrderOnPayments, Services, StockMovements, StockAdjustments, AdjustmentDetails, StockTransfers, TransferDetails, StockRequests, RequestDetails, StockReturns, ReturnDetails, SaleReturns, SaleReturnItems, Expenses, Incomes, ExchangeRates, VatSyncLog, **CustomerEquipment**, **CustomerEquipmentItem**

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
| 16 | `let variantId: number` inside `$transaction` callback shadowed outer `variantId` from `req.body` — TypeScript compiled outer to `variantId2`, accessed before inner `let` initialized → TDZ crash (500 on PUT /api/product/:id) | `productController.ts` — renamed inner variable to `savedVariantId` throughout the transaction block |
| 17 | `validateRoleandPermissionRequest` checked `body("module")` but frontend sends `name` and controller reads `name` — every POST/PUT to `/api/module_permission` returned 400 | `middlewares/validation.ts` — changed `body("module")` → `body("name")` |
| 18 | PostgreSQL sequences for `Module` and `Permission` tables out of sync after seed inserts with explicit IDs — `prisma.module.create()` always threw P2002 unique constraint on `id` | `module_permissionController.ts` — resync both sequences via `setval('"Module_id_seq"', MAX(id)+1, false)` and `setval('"Permission_id_seq"', MAX(id)+1, false)` before every create |

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
| 21 | CustomerEquipment items not updating on edit — nested Prisma include after separate `deleteMany`+`createMany` in `$transaction` didn't see new rows | `customerEquipmentController.ts` — replaced with Prisma nested write `items: { deleteMany: {}, create: [...] }` inside single `update()` |
| 22 | Duplicate serial possible — user could select same serial on two different equipment lines | `CustomerEquipmentForm.tsx` — added `isSerialUsedElsewhere()` check; checkboxes disabled with `[used on line above]` label; `buildPayload()` dedup guard with `Set<number>` |
| 23 | CustomerEquipment had no stock effects — serial status never changed, Stocks table never updated | `customerEquipmentController.ts` — added `applyPayloadEffects` + `applyDbItemEffects` helpers wired into create/return/update/delete; rule: stock affected only when `orderId` is null |
| 24 | Non-tracked stock delta used raw `quantity` without unit conversion — assigning 2 boxes deducted 2 instead of 20 pcs | `customerEquipmentController.ts` — all stock helpers now call `computeBaseQty()` from `utils/uom.ts`; `unitId` added to all `findMany` selects for existing items |
| 25 | `getAvailableAssetItems` returned only IN_STOCK serials — SOLD serials were invisible, user couldn't see which invoice to link | `customerEquipmentController.ts` — now returns all statuses; frontend controls selectability; SOLD rows show `"Sold via {ref} ({customer}) — link the Order above"` in red |
| 26 | `updateCustomerEquipment` ran REVERSE even when `items` not in request body — header-only API calls would reset all serial statuses to IN_STOCK without re-applying them | `customerEquipmentController.ts` — REVERSE now gated on `!oldOrderId && Array.isArray(items)` |
| 27 | Duplicate `type CEQItemPayload` declaration caused TS2300 compile error | `api/customerEquipment.ts` — removed second duplicate declaration |
| 28 | Returned CustomerEquipment records could be deleted — permanently erasing assignment history with no warning | `CustomerEquipment.tsx` + `customerEquipmentController.ts` — returned records: delete button hidden in UI, backend returns 400; active records: replaced `ShowDeleteConfirmation` with `window.confirm` warning explaining history loss and suggesting "Mark as Returned" instead |
| 29 | CustomerEquipment TRACKED serial assignment did not decrement `Stocks` quantity — only serial status changed (RESERVED/SOLD), so Stock On Hand was visually unaffected | `customerEquipmentController.ts` — extracted shared `adjustStocks()` helper; both `applyPayloadEffects` and `applyDbItemEffects` now look up `productVariantId` from the asset item and call `adjustStocks()` (−1 per serial on APPLY, +1 on REVERSE) for TRACKED items |
| 30 | CEQ routes had no `authorize()` middleware — any authenticated user could create, edit, delete, or return equipment regardless of role | `customerEquipmentRoute.ts` — added `authorize(["Customer-Equipment-*"])` per route; added "Customer Equipment" module + 5 permissions to `seed.ts` and `seed-ceq-permissions.ts` (one-time insert script for existing DBs) |
| 31 | Return modal had no note field — `returnCustomerEquipment` API accepted a `note` param but UI never sent it | `CustomerEquipment.tsx` — added `returnNote` state + textarea to return modal; passed to `returnCustomerEquipment()` on confirm |
| 32 | Sidebar Customer Equipment list link gated with `Customer-View` permission instead of `Customer-Equipment-View` — users with only CEQ permissions could not see the menu item; section header also missing `Customer-Equipment-View` in its visibility condition | `Sidebar.tsx` — changed `hasPermission('Customer-View')` → `hasPermission('Customer-Equipment-View')` on the link; added `hasPermission('Customer-Equipment-View')` to the section header `OR` condition |
| 33 | `<select>` elements in `CustomerEquipmentForm.tsx` used `form-input` class instead of `form-select` — dropdowns rendered with wrong styling (text input appearance, no caret) | `CustomerEquipmentForm.tsx` — all `<select className="form-input">` changed to `form-select`; unit dropdown wrapped in constraining `div` to prevent full-width expansion |
| 34 | `ReturnTrackedModal` showed "No serials found" — `setClickData(detail)` passed `detail.id` but modal guard checked `clickData.orderItemId` (undefined), so fetch was skipped entirely | `SaleReturnForm.tsx` — changed to `setClickData({ ...detail, orderItemId: detail.id })` |
| 35 | `ReturnTrackedModal` required selecting ALL invoice qty serials even when user only wanted to return 1 — modal used `clickData.quantity` from invoice detail (e.g. 2) instead of current return qty | `SaleReturnForm.tsx` — added `quantity: currentReturn` to clickData spread |
| 36 | `ReturnTrackedModal` forgot previously saved serial selection on re-open — `clickData` was rebuilt from `detail` with no `selectedTrackedItemIds`, so modal always started empty | `SaleReturnForm.tsx` — added `selectedTrackedItemIds: currentLine?.selectedTrackedItemIds \|\| []` to clickData spread |
| 37 | Product edit modal: `let variantId` inside `$transaction` caused TDZ crash; SecondHand tab showed "Product type is required" because hidden `<input type="hidden" {...register("productType")} />` was inside `!secondHandFullData` block and not rendered when tabs are shown | `productController.ts` (renamed to `savedVariantId`); `pages/product/Modal.tsx` (moved hidden input outside the condition so it always renders in edit mode) |
| 38 | Product list didn't show Type, SKU, or Barcode — `getAllProducts` raw SQL didn't join `ProductVariants` | `productController.ts` — added correlated subquery `(SELECT json_agg(...) FROM ProductVariants WHERE productId = p.id)` as `productvariants`; `pages/product/Product.tsx` — added "Type", "SKU", "Barcode" columns with badge styling |
| 39 | `DAMAGED` and `LOST` statuses on `ProductAssetItem` were never reachable — negative stock adjustment hardcoded `status: "REMOVED"` regardless of intent | `AdjustmentDetails` model: added `reason String?` (migration `20260420022409`); `stockAdjustmentController.ts`: builds `reasonMap`, applies chosen reason as asset item status; `StockAdjustmentForm.tsx`: added Reason dropdown per NEGATIVE line |
| 40 | Adjustment Report had no per-line reason visibility — `AdjustmentDetails.reason` was stored in DB but never surfaced in the report | `reportController.ts`: added `reason` filter (EXISTS subquery) + `array_agg(DISTINCT ad."reason")` as `reasons`; `ReportAdjustment.tsx`: added Reason filter dropdown, Reason column with badges, Reason column in detail modal |
| 41 | CEQ "Sold via" label showed wrong invoice ref after re-sale — `getAvailableAssetItems` used `orderItemLinks { take: 1 }` with no ordering, returning the oldest `OrderItemAssetItem` record (original sale) instead of the current one; serials sold → CEQ-returned → re-sold always displayed the first invoice ref | `customerEquipmentController.ts` — added `orderBy: { id: "desc" }` to `orderItemLinks` query so the most recent sale link is used for display |
| 42 | CEQ create/update allowed non-tracked qty exceeding what's actually available — validation compared CEQ qty only against original invoice qty, ignoring quantities already returned via Sale Return | `customerEquipmentController.ts` — both create and update validation blocks now query `SaleReturnItems` (where `saleItemId = orderItem.id` and `saleReturn.status = APPROVED`) and subtract the sum from `invoiceBaseQty` before comparing; error message shows invoice qty, returned qty, and available qty when a Sale Return has already reduced availability |
| 43 | Edit Product modal always opened on the "New" tab — for SecondHand-only products (no New variant), `handleEditClick` set both `selectProduct` and `secondHandVariant` to the same SH variant, causing the tab switcher to appear with "New" active | `pages/product/Product.tsx` — `handleEditClick` now uses `newVariant` + `shVariant` separately; `setSecondHandVariant` only populated when BOTH variants exist (`newVariant && shVariant`); SH-only products edit directly with no tab (radio shows SecondHand readonly, backend `findFirst` locates the SH variant) |
| 44 | Sale Return Report showed wrong Return Cost and Gross Impact for partial returns — `returnCost` used full `oi."cogs"` (entire OrderItem COGS) instead of prorating by returned quantity; e.g. returning 1 of 3 units showed COGS for all 3 | `reportController.ts` — both summary and per-row `item_summary` subqueries now use the same prorated formula as Invoice Report: `(oi.cogs / NULLIF(oi.baseQty,0)) * sri.baseQty` with fallback to `quantity`; Gross Impact is correctly `totalAmount - proratedReturnCost` |
| 45 | Profit Report had two bugs: (1) Summary cards (Total Sales/COGS/Profit/Avg Margin) were computed from `data.reduce()` on the current page only — with 22+ records across pages, the totals were wrong as soon as user paged; (2) Sale Returns were never deducted — `totalSales = o.totalAmount` and `totalCogs = SUM(oi.cogs)` ignored approved returns, so fully-returned invoices showed $-180 profit instead of $0 | `reportController.ts` `profitReport` — added `return_summary` CTE (prorated COGS, same formula as Sale Return/Invoice Reports) joined into both the per-row query and a new dedicated summary SQL query; summary now runs over ALL matching records (no LIMIT), not just current page; `data.reduce()` replaced with SQL aggregate result |
| 46 | Profit Report showed negative Sales (e.g. $-270) and wrong 100% Margin for fully-returned invoices — `netSales = totalAmount - returnedAmount` went below zero when returns exceeded invoice total; margin CASE only guarded `= 0` so (-270/-270)*100 = 100% | `reportController.ts` `profitReport` — wrapped both `netSales` and `netCogs` with `GREATEST(0, ...)` in per-row query and summary `order_agg` CTE; margin guard changed from `<= 0` to prevent 100% on negative-sales rows |
| 47 | CEQ Return double-counted stock when invoice-linked CEQ items had already been partially/fully returned via Sale Return — `returnCustomerEquipment` had comment `// Always restore stock on return — even when invoice is linked` and ignored Sale Return history entirely | `customerEquipmentController.ts` `returnCustomerEquipment` — TRACKED: fetch serial `status`; if `orderId` set and status already `IN_STOCK` (restored by Sale Return), skip and `continue`. NON-TRACKED: query `SaleReturnItems` for same `orderId + productVariantId` with `status=APPROVED`; `netRestoreQty = max(0, ceqBaseQty − alreadyReturnedBaseQty)`; skip if `netRestoreQty <= 0` |

---

## CI/CD Notes

### GitHub Actions Deployment Workflows
- **Files**: `frontend/.github/workflows/pos_react_frontend.yml`, `backend/.github/workflows/pos_note_backend.yml`
- **Fixed**: Removed `--no-cache` from `docker compose build` — was rebuilding all layers (including `npm install`) on every deploy, causing 10+ minute builds that hit CI timeout
- **Fixed**: Added SSH keepalive (`-o ServerAliveInterval=30 -o ServerAliveCountMax=20`) to prevent SSH session drop during long builds
- **Fixed**: Added `timeout-minutes: 20` to deploy steps (default was too short)
- **Pattern**: SSH into VPS → git pull → `docker compose build {service}` → `docker compose up -d --no-deps {service}`
- **Sequences note**: If a new database is seeded with explicit IDs, PostgreSQL sequences for tables like `Module` and `Permission` may be out of sync. Run: `SELECT setval('"Module_id_seq"', (SELECT MAX(id) FROM "Module") + 1, false);` and same for Permission.

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
