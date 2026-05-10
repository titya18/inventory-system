/**
 * One-time script: add Customer Purchase Report permission.
 * Run: npx ts-node prisma/seed-customer-report-permission.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `SELECT setval('"Permission_id_seq"', (SELECT MAX(id) FROM "Permission") + 1, false)`
  );

  const reportsModule = await prisma.module.findFirstOrThrow({ where: { name: "Reports" } });

  const permName = "Customer-Purchase-Report";
  const existing = await prisma.permission.findFirst({ where: { name: permName } });
  if (!existing) {
    await prisma.permission.create({ data: { name: permName, moduleId: reportsModule.id } });
    console.log(`✅ Permission created: ${permName}`);
  } else {
    console.log(`⏭️  Already exists: ${permName}`);
  }
  console.log("\n✅ Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
