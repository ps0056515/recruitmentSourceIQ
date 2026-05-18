import { PrismaClient } from "@prisma/client";

const url = process.argv[2] ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Usage: tsx scripts/test-db-connect.ts <DATABASE_URL>");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  const info = await prisma.$queryRaw<
    Array<{ ok: number; db: string; usr: string }>
  >`SELECT 1::int AS ok, current_database()::text AS db, current_user::text AS usr`;
  console.log("Connection OK:", info[0]);

  const tables = await prisma.$queryRaw<Array<{ n: number }>>`
    SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'
  `;
  console.log("Public tables:", tables[0]?.n ?? 0);

  const hasUser = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'User'
    ) AS exists
  `;
  console.log("Prisma User table present:", hasUser[0]?.exists ?? false);
} catch (e) {
  console.error("Connection FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
