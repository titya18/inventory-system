/**
 * One-time script: add Package-Sales-Report permission (module: Reports).
 * Run: npx ts-node prisma/seed-package-sales-report-permission.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `SELECT setval('"Permission_id_seq"', (SELECT MAX(id) FROM "Permission") + 1, false)`
  );

  const reportsModule = await prisma.module.findFirstOrThrow({ where: { name: "Reports" } });

  const perm = { name: "Package-Sales-Report", moduleId: reportsModule.id };

  const existing = await prisma.permission.findFirst({ where: { name: perm.name } });
  if (!existing) {
    await prisma.permission.create({ data: perm });
    console.log(`✅ Permission created: ${perm.name}`);
  } else {
    console.log(`⏭️  Already exists: ${perm.name}`);
  }
  console.log("\n✅ Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
