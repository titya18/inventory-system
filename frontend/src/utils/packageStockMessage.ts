import { PackageShortage } from "@/data_types/types";

// Builds a human-readable "which item is short" message from the
// /package/:id/explode endpoint's `shortages` list, for use whenever
// maxSellable is below the requested quantity.
export const formatPackageShortageMessage = (packageName: string, shortages: PackageShortage[]): string => {
    if (!shortages.length) {
        return `Not enough stock to sell "${packageName}" at this branch`;
    }

    const details = shortages
        .map((s) => `${s.name}${s.sku ? ` (${s.sku})` : ""} — need ${s.requiredBaseQty}, have ${s.availableBaseQty}${s.baseUnitName ? ` ${s.baseUnitName}` : ""}`)
        .join("; ");

    return `Not enough stock to sell "${packageName}" — short on: ${details}`;
};
