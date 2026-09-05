import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Root commands (npm run prisma:*) run with cwd at the repository root, but
// DATABASE_URL belongs to the API's own environment, not a root .env.
config({ path: "apps/api/.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
