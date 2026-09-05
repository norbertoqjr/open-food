import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { DEMO_USER_ID, SUPPORTED_LOCALES } from "@open-food/shared";
import { PrismaClient } from "../apps/api/src/generated/prisma/client.js";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// Terms that actually return results from Open Food Facts, so clicking one
// on a freshly seeded database demonstrates the flow rather than showing an
// empty result set. Locales vary to exercise the per-search locale column.
const SEED_SEARCHES = [
  { query: "nutella", locale: "en" },
  { query: "chocolate", locale: "en" },
  { query: "hagelslag", locale: "nl" },
  { query: "haferflocken", locale: "de" },
  { query: "yaourt", locale: "fr" },
  { query: "olive oil", locale: "en" },
] satisfies { query: string; locale: string }[];

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID },
  });

  console.log(`Demo user ready: ${demoUser.id}`);

  const unsupported = SEED_SEARCHES.filter(
    (search) => !(SUPPORTED_LOCALES as readonly string[]).includes(search.locale),
  );
  if (unsupported.length > 0) {
    throw new Error(
      `Seed searches use unsupported locales: ${unsupported.map((s) => s.locale).join(", ")}`,
    );
  }

  // Re-running the seed must not pile up duplicates, and RecentSearch has no
  // natural unique key to upsert on, so seeded rows are replaced wholesale.
  const { count: removed } = await prisma.recentSearch.deleteMany({
    where: { userId: demoUser.id, query: { in: SEED_SEARCHES.map((s) => s.query) } },
  });

  // Distinct, increasing timestamps: the list is ordered by createdAt, and
  // rows written in one batch would otherwise share a timestamp and surface
  // in an arbitrary order.
  const now = Date.now();
  await prisma.recentSearch.createMany({
    data: SEED_SEARCHES.map((search, index) => ({
      userId: demoUser.id,
      query: search.query,
      locale: search.locale,
      createdAt: new Date(now - (SEED_SEARCHES.length - index) * 60_000),
    })),
  });

  console.log(
    `Recent searches seeded: ${SEED_SEARCHES.length} (replaced ${removed} existing)`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
