import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { DEMO_USER_ID } from "@open-food/shared";
import { PrismaClient } from "../apps/api/src/generated/prisma/client.js";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID },
  });

  console.log(`Demo user ready: ${demoUser.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
