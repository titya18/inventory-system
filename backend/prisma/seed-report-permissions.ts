/**
 * One-time script: add Top Selling Products and Top Sales Person report permissions.
 * Run: npx ts-node prisma/seed-report-permissions.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `SELECT setval('"Permission_id_seq"', (SELECT MAX(id) FROM "Permission") + 1, false)`
  );

  // Both belong to module 25 (Reports)
  const reportsModule = await prisma.module.findFirstOrThrow({ where: { name: "Reports" } });

  const perms = [
    { name: "Top-Selling-Products-Report", moduleId: reportsModule.id },
    { name: "Top-Sales-Person-Report",     moduleId: reportsModule.id },
  ];

  for (const p of perms) {
    const existing = await prisma.permission.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.permission.create({ data: p });
      console.log(`✅ Permission created: ${p.name}`);
    } else {
      console.log(`⏭️  Already exists: ${p.name}`);
    }
  }
  console.log("\n✅ Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
