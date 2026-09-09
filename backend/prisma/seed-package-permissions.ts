/**
 * One-time script: insert the Package module + its permissions into an
 * existing database.
 *
 * Run with:
 *   npx ts-node prisma/seed-package-permissions.ts
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

  const newModules = [{ name: "Package" }];

  for (const mod of newModules) {
    const existing = await prisma.module.findFirst({ where: { name: mod.name } });
    if (!existing) {
      await prisma.module.create({ data: mod });
      console.log(`✅ Module created: ${mod.name}`);
    } else {
      console.log(`⏭️  Module already exists: ${mod.name} (id=${existing.id})`);
    }
  }

  const packageModule = await prisma.module.findFirstOrThrow({ where: { name: "Package" } });

  const newPermissions = [
    { name: "Package-View", moduleId: packageModule.id },
    { name: "Package-Create", moduleId: packageModule.id },
    { name: "Package-Edit", moduleId: packageModule.id },
    { name: "Package-Delete", moduleId: packageModule.id },
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
