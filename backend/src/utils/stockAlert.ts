import { getIO } from "../lib/socket";

export async function checkAndEmitStockAlert(
  prismaOrTx: any,
  variantId: number,
  branchId: number
): Promise<void> {
  try {
    const stock = await prismaOrTx.stocks.findUnique({
      where: { productVariantId_branchId: { productVariantId: variantId, branchId } },
      select: { quantity: true },
    });
    const variant = await prismaOrTx.productVariants.findUnique({
      where: { id: variantId, deletedAt: null },
      select: {
        stockAlert: true,
        productType: true,
        products: { select: { name: true, isActive: true, deletedAt: true } },
      },
    });
    if (!stock || !variant || variant.stockAlert == null) return;
    // Skip inactive or deleted products
    if (!variant.products?.isActive || variant.products?.deletedAt != null) return;
    const currentQty = Number(stock.quantity ?? 0);
    const threshold = Number(variant.stockAlert ?? 0);
    if (threshold <= 0 || currentQty > threshold) return;

    const io = getIO();
    if (!io) return;
    io.emit("stock:low-alert", {
      variantId,
      branchId,
      productName: variant.products?.name ?? `Variant #${variantId}`,
      productType: variant.productType,
      currentQty,
      threshold,
      timestamp: new Date().toISOString(),
    });
  } catch {
  }
}
