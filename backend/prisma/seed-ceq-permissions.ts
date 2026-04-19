/**
 * One-time script: inserts the "Customer Equipment" module and its permissions
 * into an existing database without re-running the full seed.
 *
 * Run once with:
 *   npx ts-node prisma/seed-ceq-permissions.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    // Insert module (skip if already exists)
    const existing = await prisma.module.findFirst({ where: { name: "Customer Equipment" } });
    let moduleId: number;

    if (existing) {
        console.log(`Module "Customer Equipment" already exists (id=${existing.id}), skipping create.`);
        moduleId = existing.id;
    } else {
        const mod = await prisma.module.create({ data: { name: "Customer Equipment" } });
        moduleId = mod.id;
        console.log(`Created module "Customer Equipment" (id=${moduleId})`);
    }

    // Insert permissions (skip duplicates)
    const permissionNames = [
        "Customer-Equipment-View",
        "Customer-Equipment-Create",
        "Customer-Equipment-Edit",
        "Customer-Equipment-Delete",
        "Customer-Equipment-Return",
        "Customer-Equipment-Report",
    ];

    for (const name of permissionNames) {
        const perm = await prisma.permission.findFirst({ where: { name } });
        if (perm) {
            console.log(`Permission "${name}" already exists, skipping.`);
        } else {
            await prisma.permission.create({ data: { name, moduleId } });
            console.log(`Created permission "${name}"`);
        }
    }

    console.log("Done.");
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
