/**
 * One-time script: insert POS, Cash Session, and Company Settings
 * modules + permissions into an existing database.
 *
 * Run with:
 *   npx ts-node prisma/seed-pos-permissions.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Resync sequences so createMany with auto-increment IDs won't collide
  await prisma.$executeRawUnsafe(
    `SELECT setval('"Module_id_seq"', (SELECT MAX(id) FROM "Module") + 1, false)`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval('"Permission_id_seq"', (SELECT MAX(id) FROM "Permission") + 1, false)`
  );

  const newModules = [
    { name: "POS" },
    { name: "Cash Session" },
    { name: "Company Settings" },
  ];

  for (const mod of newModules) {
    const existing = await prisma.module.findFirst({ where: { name: mod.name } });
    if (!existing) {
      await prisma.module.create({ data: mod });
      console.log(`✅ Module created: ${mod.name}`);
    } else {
      console.log(`⏭️  Module already exists: ${mod.name} (id=${existing.id})`);
    }
  }

  // Fetch IDs after upsert
  const posModule       = await prisma.module.findFirstOrThrow({ where: { name: "POS" } });
  const cashModule      = await prisma.module.findFirstOrThrow({ where: { name: "Cash Session" } });
  const settingsModule  = await prisma.module.findFirstOrThrow({ where: { name: "Company Settings" } });

  const newPermissions = [
    { name: "POS-View",              moduleId: posModule.id },
    { name: "Cash-Session-View",     moduleId: cashModule.id },
    { name: "Cash-Session-Report",   moduleId: cashModule.id },
    { name: "Company-Settings-View", moduleId: settingsModule.id },
    { name: "Company-Settings-Edit", moduleId: settingsModule.id },
  ];

  for (const perm of newPermissions) {
    const existing = await prisma.permission.findFirst({ where: { name: perm.name } });
    if (!existing) {
      await prisma.permission.create({ data: perm });
      console.log(`✅ Permission created: ${perm.name}`);
    } else {
      console.log(`⏭️  Permission already exists: ${perm.name}`);
    }
  }

  console.log("\n✅ Done. Assign these permissions to roles via the Permissions UI.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
