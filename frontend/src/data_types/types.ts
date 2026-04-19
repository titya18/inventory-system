export interface RoleType {
    id?: number;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    updatedBy?: string;

    creator?: UserType | null;
    updater?: UserType | null;
    permissions: number[];
};

export interface UserType {
    id?: number;
    branchId: number | null;
    email: string;
    phoneNumber: string;
    password: string;
    show_pass?: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    status: string;
    roleType: string;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    updatedBy?: string;

    creator?: UserType | null;
    updater?: UserType | null;
    branch: { id: number, name: string } | null; // Define branch as an object with a name
    roles: RoleType[]; // Change roles to be an array of RoleType objects
};

export interface BranchType {
    id?: number;
    name: string;
    address: string;
    createdAt?: Date;
    createdBy?: string;
    updatedAt?: Date;
    updatedBy?: string;

    users?: UserType[];
    creator?: UserType | null;
    updater?: UserType | null;
}

export interface CategoryType {
    id?: number;
    code: string;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    
    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
}

export interface BrandType {
    id?: number;
    en_name: string;
    kh_name?: string;
    description: string;
    image: File | string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
};

export interface UnitType {
    id?: number;
    name: string;
    type: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
};

export interface PaymentMethodType {
    id?: number;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
}

export interface SupplierType {
    id?: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
}

export interface UnitData {
    id: number;
    name: string;
};

export type TrackingType = "NONE" | "ASSET_ONLY" | "MAC_ONLY" | "ASSET_AND_MAC";

export type AssetItemStatus =
  | "IN_STOCK"
  | "RESERVED"
  | "SOLD"
  | "RETURNED"
  | "TRANSFERRED"
  | "DAMAGED"
  | "LOST"
  | "REMOVED";

export interface ProductTrackedItemType {
  id?: number;
  branchId: number;
  assetCode?: string | null;
  macAddress?: string | null;
  serialNumber?: string | null;
  status?: AssetItemStatus | null;
  soldOrderItemId?: number | null;
}

export type ProductStock = {
    branchId: number;
    quantity: number;
};

export interface ProductUnitConversionType {
  id?: number;
  fromUnitId: number;
  toUnitId: number;
  multiplier: number;
}

export interface ProductType {
    id?: number;
    categoryId: number;
    brandId: number;
    name: string;
    // image: File | File[] | string | null;
    image: File[] | null;
    note: string;
    isActive: number;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;

    categories: CategoryType;
    category?: CategoryType;
    brand?: BrandType;
    brands: BrandType;
    imagesToDelete?: string[];
    productvariants?: ProductVariantType[];

    // I extent these for merge product variant with product
    productType?: string | 'New';
    unitId?: number | null;
    sku?: string;
    stockAlert?: number | null;
    barcode?: string | null;
    purchasePrice?: number | string;
    purchasePriceUnitId?: number | null;
    retailPrice?: number | string;
    retailPriceUnitId?: number | null; 
    wholeSalePrice?: number | string;
    wholeSalePriceUnitId?: number | null;
    // MULTIPLE attributes (Color + Size + Material ...)
    variantAttributeIds?: number[];
    // MULTIPLE values (Red, Blue, XL, Cotton ...)
    variantValueIds?: number[];

    branchId?: number | null;
    stocks: ProductStock[];

    baseUnitId?: number | null;          // ✅
    unitConversions?: ProductUnitConversionType[]; // ✅

    updateStock?: boolean;

    trackingType?: TrackingType;
    trackedItems?: ProductTrackedItemType[];
}

export interface VarientAttributeType {
    id?: number;
    name: string;
    values: VariantValueType[];
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
}

export interface VariantValueType {
    id?: number;
    value: string;

    variantAttributeId?: number;
}

export interface UnitOptionType {
    id?: number;
    name?: string;
    type?: string;

    unitId?: number;
    unitName?: string;
    operationValue?: number;
    isBaseUnit?: boolean;
    operator?: string;
    suggestedPurchaseCost?: number;
}

export interface ProductVariantType {
    id: number;
    productId: number,
    unitId: number | null,
    productType?: string | 'New';
    sku: string,
    stockAlert?: number | null;
    barcode: string | null;
    name: string;
    purchasePrice: number | string;
    retailPrice?: number | string;
    retailPriceUnitId?: number | null;
    wholeSalePrice?: number | string;
    wholeSalePriceUnitId?: number | null;
    isActive: number;
    image: File | File[] | string | null;
    imagesToDelete: string[];
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;

    units?: UnitData;
    products?: ProductType | null;

    productVariantValues?: ProductVariantValuesType[];

    // MULTIPLE attributes (Color + Size + Material ...)
    variantAttributeIds?: number[];
    // MULTIPLE values (Red, Blue, XL, Cotton ...)
    variantValueIds?: number[];
    // Returned from backend (expand join table)
    variantValues?: VariantValueType[];

    stocks?: StockType | null;
    baseUnitId?: number | null;

    trackingType?: "NONE" | "ASSET_ONLY" | "MAC_ONLY" | "ASSET_AND_MAC" | null;

    // ✅ add these
    baseUnit?: UnitOptionType | null;
    unitOptions?: UnitOptionType[];
};

export interface ProductVariantValuesType {
    id: number;
    productVariantId: number;
    variantValueId: number;

    variantValue?: VariantValueType;
}

export enum MovementType {
    STOCK_IN = "STOCK_IN",
    STOCK_OUT = "STOCK_OUT",
    RETURN = "RETURN",
    ADJUSTMENT = "ADJUSTMENT"
}

export interface StockType {
    id: number;
    productVariantId: number;
    quantity: string; // Decimal
    branchId: number;

    createdAt: Date;
    updatedAt: Date;

    creator?: UserType | null;
    updater?: UserType | null;
};

export interface StockMovement {
    id: number;
    productVariantId: number;
    branchId: number;

    type: MovementType;
    quantity: string; // Decimal
    note?: string | null;

    createdAt: Date;
    creator?: UserType | null;
};

export interface StockSummaryVariant {
    variantId: number;
    sku: string;
    quantity: number;
    branchId: number;
};

export interface StockSummaryItem {
    productId: number;
    productName: string;
    totalQuantity: number;
    variants: StockSummaryVariant[];
};

export interface StockSummaryRow {
    productId?: number;
    productName: string;
    variantName: string;
    productType?: string;
    sku: string;
    barcode: string;
    branchName: string;
    quantity: number;

    stockAlert?: number | null;
    stockStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

    baseUnitId?: number | null;
    unitId?: number | null;
    unitName?: string | null;
    unitType?: string | null;

    createdAt: string;
    updatedAt: string;
    createdBy?: { id: number; name: string } | null;
    updatedBy?: { id: number; name: string } | null;
    attributes: { attributeName: string; value: string }[];

    variantId: number;
    branchId?: number;
}

export interface PurchaseType {
    id?: number;
    branchId: number;
    supplierId: number;
    ref: string;
    purchaseDate?: string | null; // Format: YYYY-MM-DD
    taxRate?: string | null;
    taxNet: number | null;
    discount?: number | null;
    shipping?: string | null;
    grandTotal: number;
    paidAmount: number | null;
    exchangeRate?: number | null;
    status: string;
    note: string;
    delReason: string;
    image: File | File[] | string | null;
    imagesToDelete: string[];
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    receivedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
    receiver?: UserType | null;

    branch: BranchType | null;
    supplier?: SupplierType | null;
    suppliers: SupplierType | null;
    purchaseDetails: PurchaseDetailType[];
}

export interface PurchaseDetailType {
    id: number;
    productId: number;
    productVariantId: number;
    quantity: number;
    cost: number;
    costPerBaseUnit: number;
    taxNet: number;
    taxMethod: string | null;
    discount: number;
    discountMethod: string | null;
    total: number;

    products: ProductType | null;
    productvariants: ProductVariantType | null;
    stocks?: number | null;

    // ✅ Add these for unit conversion
    unitId?: number | null;
    unitQty?: number | string | null;
    baseQty?: number | string | null;

    // ✅ unit label for UI (optional)
    unit?: UnitType | null;
    unitName?: string | null;
    unitOptions?: { id?: number; name?: string }[];
    trackingType?: "NONE" | "ASSET_ONLY" | "MAC_ONLY" | "ASSET_AND_MAC";
    selectedTrackedItems?: ProductTrackedItemType[];
    branchId?: number | null;
}

export interface PaymentType {
    id?: number;
    branchId: number | null;
    purchaseId: number | null;
    paymentDate?: Date;
    paymentMethodId: number | null;
    paidAmount: number | null;
    amount: number | null;
    receive_usd?: number | null;
    receive_khr?: number | null;
    exchangerate?: number | null;
    due_balance?: number | null;
    createdAt: string | null;
    PaymentMethods: { name: string } | null;
    status?: string;
    delReason?: string;
    createdDat?: Date;
    updatedDat?: Date;
    deletedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;

    purchase?: PurchaseType | null;
    branch?: BranchType | null;
    supplier?: SupplierType | null;

    totalPaid?: number | null;
}

export interface InvoicePaymentType {
    branchId: number | null;
    orderId: number | null;
    paymentMethodId: number | null;
    paidAmount: number | null;
    totalPaid: number | null;
    receive_usd?: number | null;
    receive_khr?: number | null;
    exchangerate?: number | null;
    due_balance?: number | null;
    createdAt: string | null;
    paymentMethods: { name: string } | null;
    createdDat?: Date;
    updatedDat?: Date;
    deletedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
}

export interface ServiceType {
    id?: number;
    serviceCode: string;
    name: string;
    description: string;
    price: number;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
    stocks?: number | null;
}

export interface QuotationType {
    id?: number;
    branchId: number;
    customerId: number | null;
    ref: string;
    quotationDate?: string | null; // Format: YYYY-MM-DD
    taxRate?: string | null;
    taxNet: number | null;
    discount?: number | null;
    shipping?: string | null;
    grandTotal: number;
    status: string;
    QuoteSaleType?: string | null;
    note: string | null;
    delReason: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    sentBy?: string | null;
    sentAt?: string | null;
    invoicedAt?: string | null;
    invoicedBy?: string | null;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
    invoicer?: UserType | null;
    sender?: UserType | null;

    branch: BranchType | null;
    customer?: CustomerType | null;
    customers: CustomerType | null;
    quotationDetails: QuotationDetailType[];
}

export interface QuotationDetailType {
    id?: number;
    quotationId?: number;

    productId?: number;
    productVariantId?: number;
    serviceId?: number;

    ItemType: "PRODUCT" | "SERVICE";

    // ✅ keep for old logic, but we will set it = unitQty for PRODUCT
    quantity: number;

    cost: number;
    costPerBaseUnit: number;
    taxNet: number;
    taxMethod: string | null;
    discount: number;
    discountMethod: string | null;
    total: number;

    products?: ProductType | null;
    productvariants?: ProductVariantType | null;
    services?: ServiceType | null;
    stocks?: number | null;

    // ✅ UOM
    unitId?: number | null;
    unitQty?: number | string | null;
    baseQty?: number | string | null;

    // ✅ unit label for UI (optional)
    unitName?: string | null;

    // ✅ UI helper (optional)
    unitOptions?: { id?: number; name?: string }[];

    // ✅ Serial/asset tracking (mirrors Invoice)
    branchId?: number | null;
    trackingType?: string | null;
    serialSelectionMode?: "AUTO" | "MANUAL" | null;
    selectedTrackedItemIds?: number[];
    selectedTrackedItems?: any[];
}

export interface CustomerType {
    id?: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    createdAt?: Date;
    updatedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
}

export type AssignType = "SOLD" | "RENTED" | "INSTALLED";

export interface CustomerEquipmentItemType {
    id?: number;
    customerEquipmentId?: number;
    // tracked item (serial)
    productAssetItemId?: number | null;
    productAssetItem?: {
        id: number;
        serialNumber: string;
        assetCode?: string | null;
        macAddress?: string | null;
        status: string;
        productVariant?: {
            id: number;
            sku: string;
            barcode: string;
            productType?: string;
            products?: { id: number; name: string } | null;
        } | null;
    } | null;
    // non-tracked item (qty only)
    productVariantId?: number | null;
    quantity?: number | null;
    unitId?: number | null;
    unit?: { id: number; name: string } | null;
    productVariant?: {
        id: number;
        sku: string;
        barcode: string;
        productType?: string;
        products?: { id: number; name: string } | null;
    } | null;
}

export interface CustomerEquipmentType {
    id?: number;
    ref?: string;
    customerId: number;
    branchId: number;
    assignType: AssignType;
    assignedAt: string | Date;
    returnedAt?: string | Date | null;
    orderId?: number | null;
    note?: string | null;
    createdAt?: Date;
    updatedAt?: Date;

    customer?: { id: number; name: string; phone?: string; email?: string; address?: string } | null;
    branch?: { id: number; name: string } | null;
    order?: { id: number; ref: string } | null;
    creator?: { id: number; firstName: string; lastName: string } | null;
    updater?: { id: number; firstName: string; lastName: string } | null;
    items?: CustomerEquipmentItemType[];
}

export interface InvoiceType {
    id?: number;
    branchId: number;
    customerId: number;
    ref: string;
    orderDate?: string | null; // Format: YYYY-MM-DD
    taxRate?: string | null;
    taxNet: number | null;
    discount?: number | null;
    shipping?: string | null;
    totalAmount: number;
    exchangeRate?: number | null;
    paidAmount: number | null;
    status: string;
    returnstatus?: number | null;
    OrderSaleType?: string | null;
    note: string;
    delReason: string;
    approvedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;

    approver?: UserType | null;
    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;

    branch: BranchType | null;
    customer?: CustomerType | null;
    customers: CustomerType | null;
    items: InvoiceDetailType[];

    totalProfit?: number | null;
    vat_status?: number | null;
}

export interface InvoiceDetailType {
    id: number;
    orderItemId?: number | null;
    orderId: number;
    productId?: number;
    productVariantId?: number;
    serviceId?: number;
    ItemType: string;
    quantity: number;
    price: number;
    costPerBaseUnit: number;
    taxNet: number;
    taxMethod: string | null;
    discount: number;
    discountMethod: string | null;
    total: number;

    products?: ProductType | null;
    productvariants?: ProductVariantType | null;
    services?: ServiceType | null;
    stocks?: number | null;

    // ✅ UOM
    unitId?: number | null;
    unitQty?: number | string | null;
    baseQty?: number | string | null;

    // ✅ unit label for UI (optional)
    unitName?: string | null;

    // ✅ UI helper (optional)
    unitOptions?: { id?: number; name?: string }[];

    trackingType?: "NONE" | "ASSET_ONLY" | "MAC_ONLY" | "ASSET_AND_MAC";
    serialSelectionMode?: "AUTO" | "MANUAL";
    selectedTrackedItemIds?: number[];
    selectedTrackedItems?: ProductTrackedItemType[];
    branchId?: number | null;
}

export interface StockAdjustmentType {
    id?: number;
    branchId: number;
    ref: string;
    adjustDate?: string | null; // Format: YYYY-MM-DD
    AdjustMentType: string;
    StatusType: string;
    note: string;
    delReason: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    approvedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
    approver?: UserType | null;

    branch: BranchType | null;
    adjustmentDetails: StockAdjustmentDetailType[];

    totalQuantity?: number;
}

export interface StockAdjustmentDetailType {
    id: number;
    productId: number;
    productVariantId: number;
    quantity?: number;

    products: ProductType | null;
    productvariants: ProductVariantType | null;
    stocks?: number | null;

    unitId?: number | null;
    unitQty?: number | string | null;
    baseQty?: number | string | null;
    cost?: number | string | null;
    costPerBaseUnit?: number | string | null;

    trackingType?: "NONE" | "ASSET_ONLY" | "MAC_ONLY" | "ASSET_AND_MAC" | null;
    serialSelectionMode?: "AUTO" | "MANUAL";
    selectedTrackedItemIds?: number[];
    selectedTrackedItems?: ProductTrackedItemType[];
    branchId?: number | null;

    // Tracked item data for stock adjustment serial handling
    adjustmentTrackedMode?: "NEW" | "REACTIVATE";
    newSerials?: Array<{ serialNumber: string; assetCode?: string | null; macAddress?: string | null }>;
    reactivateIds?: number[];
    reactivateItems?: ProductTrackedItemType[];
    selectedToRemoveIds?: number[];
    selectedToRemoveItems?: ProductTrackedItemType[];
    trackedItemData?: {
        type: "NEW" | "REACTIVATE" | "SELECT";
        newSerials?: Array<{ serialNumber: string; assetCode?: string | null; macAddress?: string | null }>;
        reactivateIds?: number[];
        selectedIds?: number[];
    };
}

export interface StockTransferType {
    id?: number;
    branchId: number;
    ref: string;
    fromBranchId: number;
    toBranchId: number;
    transferDate?: string | null; // Format: YYYY-MM-DD
    StatusType: string;
    note: string;
    delReason: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    approvedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
    approver?: UserType | null;

    fromBranch: BranchType | null;
    toBranch: BranchType | null;
    tobranch?: BranchType | null;
    branch: BranchType | null;

    transferDetails: StockTransferDetailType[];

    totalQuantity?: number;
}

export interface StockTransferDetailType {
    id: number;
    productId: number;
    productVariantId: number;
    quantity?: number;

    products: ProductType | null;
    productvariants: ProductVariantType | null;
    stocks?: number | null;

    unitId?: number | null;
    unitQty?: number | string | null;
    baseQty?: number | string | null;

    trackingType?: "NONE" | "ASSET_ONLY" | "MAC_ONLY" | "ASSET_AND_MAC" | null;
    serialSelectionMode?: "AUTO" | "MANUAL";
    selectedTrackedItemIds?: number[];
    selectedTrackedItems?: ProductTrackedItemType[];
    branchId?: number | null;
    trackedPayload?: string | null;
}

export interface StockRequestType {
    id?: number;
    branchId: number;
    ref: string;
    requestBy: number;
    requestDate?: string | null; // Format: YYYY-MM-DD
    StatusType: string;
    note: string;
    delReason: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    approvedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
    approver?: UserType | null;
    requester?: UserType | null;

    branch: BranchType | null;
    requestDetails: StockRequestDetailType[];

    totalQuantity?: number;
}

export interface StockRequestDetailType {
    id: number;
    productId: number;
    productVariantId: number;
    quantity?: number;

    products: ProductType | null;
    productvariants: ProductVariantType | null;
    stocks?: number | null;

    unitId?: number | null;
    unitQty?: number | string | null;
    baseQty?: number | string | null;

    trackingType?: "NONE" | "ASSET_ONLY" | "MAC_ONLY" | "ASSET_AND_MAC" | null;
    serialSelectionMode?: "AUTO" | "MANUAL";
    selectedTrackedItemIds?: number[];
    selectedTrackedItems?: ProductTrackedItemType[];
    branchId?: number | null;
    trackedPayload?: string | null;
}

export interface StockReturnType {
    id?: number;
    branchId: number;
    ref: string;
    returnBy: number;
    returnDate?: string | Date | null;
    StatusType: string;
    note: string;
    delReason: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    approvedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;
    approver?: UserType | null;
    returner?: UserType | null;

    branch: BranchType | null;
    returnDetails: StockReturnDetailType[];

    totalQuantity?: number;
}

export interface StockReturnDetailType {
    id: number;
    productId: number;
    productVariantId: number;

    quantity?: number | string | null;

    products?: ProductType | null;
    productvariants?: ProductVariantType | null;
    stocks?: number | null;

    unitId?: number | null;
    unitQty?: number | string | null;
    baseQty?: number | string | null;

    cost?: number | string | null;
    costPerBaseUnit?: number | string | null;

    trackingType?: "NONE" | "ASSET_ONLY" | "MAC_ONLY" | "ASSET_AND_MAC" | null;
    serialSelectionMode?: "AUTO" | "MANUAL";
    selectedTrackedItemIds?: number[];
    selectedTrackedItems?: ProductTrackedItemType[];
    branchId?: number | null;
    trackedPayload?: string | null;
}

export interface ExpenseType {
    id: number;
    branchId: number;
    ref: string;
    expenseDate?: string | null; // Format: YYYY-MM-DD
    name: string;
    amount: number;
    description: string;
    delReason: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;

    branch?: BranchType | null;
}

export interface IncomeType {
    id: number;
    branchId: number;
    ref: string;
    incomeDate?: string | null; // Format: YYYY-MM-DD
    name: string;
    amount: number;
    description: string;
    delReason: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;

    branch: BranchType | null;
}

export interface OrderOnPaymentType {
    id?: number;
    branchId: number | null;
    orderId: number | null;
    paymentDate?: Date;
    paymentMethodId: number | null;
    totalPaid: number | null;
    receive_usd?: number | null;
    receive_khr?: number | null;
    exchangerate?: number | null;
    createdAt: string | null;
    PaymentMethods: { name: string } | null;
    status?: string;
    delReason: string;
    createdDat?: Date;
    updatedDat?: Date;
    deletedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
    deleter?: UserType | null;  

    order?: InvoiceType | null;
    branch?: BranchType | null;
    customer?: CustomerType | null;
}

export interface PurchaseAuthorizeAmountType {
    id?: number;
    amount: number;
    createdAt?: Date;
    updatedAt?: Date;

    creator?: UserType | null;
    updater?: UserType | null;
}

export interface ExchangeRateType {
    id?: number;
    amount: number;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    updatedBy?: string;

    creator?: UserType | null;
    updater?: UserType | null;
};

export interface SaleReturnType {
    id?: number;
    branchId?: number | null;
    orderId?: number | null;
    customerId?: number | null;
    ref?: string;
    status?: string;
    taxRate?: number;
    taxNet?: number;
    discount?: number;
    shipping?: number;
    totalAmount?: number;
    grandTotal?: number;
    note?: string | null;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: number | null;
    updatedBy?: number | null;
    returnCost?: number;
    grossImpact?: number;

    customer?: {
        id?: number;
        name?: string;
        phone?: string;
        email?: string;
        address?: string;
    } | null;

    branch?: {
        id?: number;
        name?: string;
    } | null;

    creator?: UserType | null;

    updater?: {
        id?: number;
        firstName?: string;
        lastName?: string;
    } | null;

    order?: {
        id?: number;
        ref?: string;
        OrderSaleType?: string;
        status?: string;
        orderDate?: string;
    } | null;
    items?: SaleReturnDetailType[] | null;
}

export interface SaleReturnDetailType {
    id?: number;
    saleReturnId?: number;
    saleItemId: number;

    productId?: number;
    productVariantId?: number;
    serviceId?: number;

    ItemType: string;
    quantity: number;
    price: number;
    taxNet: number;
    taxMethod: string | null;
    discount: number;
    discountMethod: string | null;
    total: number;

    unitId?: number | null;
    unitQty?: number | null;
    baseQty?: number | null;

    products?: ProductType | null;
    productvariants?: ProductVariantType | null;
    services?: ServiceType | null;
}

export interface LowStockRow {
    productId?: number;
    productName: string;
    variantId: number;
    variantName: string;
    productType?: string;
    sku: string;
    barcode: string;

    branchId?: number;
    branchName: string;

    quantity: number;
    stockAlert?: number | null;
    shortageQty: number;
    stockStatus?: "LOW_STOCK" | "OUT_OF_STOCK";

    baseUnitId?: number | null;
    unitId?: number | null;
    unitName?: string | null;
    unitType?: string | null;

    createdAt: string;
    updatedAt: string;

    createdBy?: { id: number; name: string } | null;
    updatedBy?: { id: number; name: string } | null;

    attributes: { attributeName: string; value: string }[];
}

export interface StockMovementRow {
    id: number;
    productId?: number;
    productName: string;
    variantId: number;
    variantName: string;
    sku: string;
    barcode?: string;
    branchId?: number;
    branchName: string;
    movementType: string;
    adjustmentType?: string;
    quantity: number;
    inQty: number;
    outQty: number;
    unitCost?: number | null;
    reference?: string | null;
    createdAt: string;
    createdBy?: {
        id: number;
        name: string;
    } | null;
}

export interface StockValuationRow {
    productId?: number;
    productName: string;
    variantId: number;
    variantName: string;
    sku: string;
    barcode?: string;
    branchId?: number;
    branchName: string;
    quantity: number;
    unitCost: number;
    stockValue: number;
    unitName?: string | null;
    attributes: { attributeName: string; value: string }[];
}

export interface ProfitReportRow {
    orderId: number;
    ref: string;
    orderDate: string;
    customerId?: number | null;
    customerName?: string | null;
    branchId?: number;
    branchName: string;
    totalSales: number;
    totalCogs: number;
    grossProfit: number;
    marginPercent: number;
    createdBy?: {
        id: number;
        name: string;
    } | null;
}

export interface CustomerLiteType {
    id: number;
    name: string;
}
