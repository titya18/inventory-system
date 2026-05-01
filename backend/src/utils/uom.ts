// src/utils/uom.ts
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export async function computeBaseQty(
  tx: Prisma.TransactionClient,
  detail: any
): Promise<{ unitId: number; unitQty: Decimal; baseQty: Decimal; baseUnitId: number; productId: number }> {
  const variantId = Number(detail.productVariantId);

  const variant = await tx.productVariants.findUnique({
    where: { id: variantId },
    select: { productId: true, baseUnitId: true },
  });

  if (!variant?.baseUnitId) {
    throw new Error(`Variant ${variantId} has no baseUnitId`);
  }

  const baseUnitId = variant.baseUnitId;

  const unitId = detail.unitId ? Number(detail.unitId) : baseUnitId;
  const unitQty = new Decimal(detail.unitQty ?? detail.quantity ?? 0);

  let baseQty = unitQty;

  if (unitId !== baseUnitId) {
    // If the caller already computed baseQty (e.g. POS frontend), use it directly
    if (detail.baseQty !== undefined && detail.baseQty !== null) {
      baseQty = new Decimal(detail.baseQty);
    } else {
      // Try direct: fromUnit → base
      const conv = await tx.productUnitConversion.findUnique({
        where: {
          productId_fromUnitId_toUnitId: {
            productId: variant.productId,
            fromUnitId: unitId,
            toUnitId: baseUnitId,
          },
        },
        select: { multiplier: true },
      });

      if (conv) {
        baseQty = unitQty.mul(conv.multiplier);
      } else {
        // Try reverse: some setups store base → fromUnit direction
        const reverseConv = await tx.productUnitConversion.findUnique({
          where: {
            productId_fromUnitId_toUnitId: {
              productId: variant.productId,
              fromUnitId: baseUnitId,
              toUnitId: unitId,
            },
          },
          select: { multiplier: true },
        });

        if (!reverseConv) {
          throw new Error(
            `Missing conversion: productId=${variant.productId}, fromUnit=${unitId}, toBaseUnit=${baseUnitId}`
          );
        }

        const reverseMul = new Decimal(reverseConv.multiplier);
        baseQty = reverseMul.isZero() ? unitQty : unitQty.div(reverseMul);
      }
    }
  }

  return { unitId, unitQty, baseQty, baseUnitId, productId: variant.productId };
}