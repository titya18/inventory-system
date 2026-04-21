/**
 * One-time script: resync FIFO layers with Stocks table.
 *
 * Problem: CEQ adjustStocks() only updated Stocks table, never StockMovements FIFO layers.
 * This left Stocks.quantity > sum(StockMovements.remainingQty) for affected variants.
 * Invoice approval then fails with "Not enough FIFO stock. Missing X".
 *
 * Fix: for every variant+branch where Stocks > FIFO available, insert a corrective
 * ADJUSTMENT POSITIVE StockMovements record to cover the gap.
 *
 * Run: npx ts-node prisma/resync-fifo.ts
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
    console.log("=== FIFO resync started ===\n");

    // All variant+branch combos that have stock
    const stockRows = await prisma.stocks.findMany({
        where: { quantity: { gt: 0 } },
        select: { productVariantId: true, branchId: true, quantity: true },
    });

    console.log(`Checking ${stockRows.length} variant+branch combinations...\n`);

    let fixedCount = 0;

    for (const row of stockRows) {
        const { productVariantId, branchId } = row;
        const stockQty = new Decimal(row.quantity);

        // Sum of all FIFO-eligible remaining qty for this variant+branch
        const fifoAgg = await prisma.stockMovements.aggregate({
            where: {
                productVariantId,
                branchId,
                status:      "APPROVED",
                remainingQty: { gt: 0 },
                OR: [
                    { type: "PURCHASE" },
                    { type: "SALE_RETURN" },
                    { type: "ADJUSTMENT", AdjustMentType: "POSITIVE" },
                    { type: "TRANSFER",   quantity: { gt: 0 } },
                ],
            },
            _sum: { remainingQty: true },
        });

        const fifoQty = new Decimal(fifoAgg._sum.remainingQty ?? 0);
        const gap = stockQty.minus(fifoQty);

        if (gap.lte(0)) continue; // in sync — skip

        console.log(
            `  variant=${productVariantId} branch=${branchId} | ` +
            `Stocks=${stockQty.toFixed(4)} | FIFO=${fifoQty.toFixed(4)} | gap=${gap.toFixed(4)}`
        );

        // Use the most recent positive movement's unit cost as the cost basis
        const lastLayer = await prisma.stockMovements.findFirst({
            where: {
                productVariantId,
                branchId,
                status:   "APPROVED",
                quantity: { gt: 0 },
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select:  { unitCost: true },
        });
        const unitCost = lastLayer?.unitCost ?? new Decimal(0);

        await prisma.stockMovements.create({
            data: {
                productVariantId,
                branchId,
                type:           "ADJUSTMENT",
                AdjustMentType: "POSITIVE",
                status:         "APPROVED",
                quantity:       gap,
                unitCost,
                remainingQty:   gap,
                note:           "FIFO resync — corrective layer from CEQ stock drift",
                createdAt:      new Date(),
                createdBy:      1,
                updatedAt:      new Date(),
                updatedBy:      1,
            },
        });

        console.log(`  ✓ Created corrective FIFO layer: +${gap.toFixed(4)} units (unitCost=${unitCost})\n`);
        fixedCount++;
    }

    if (fixedCount === 0) {
        console.log("All variants are already in sync. Nothing to fix.\n");
    } else {
        console.log(`=== Done. Fixed ${fixedCount} variant+branch combination(s). ===`);
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
