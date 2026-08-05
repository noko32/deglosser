import dotenv from "dotenv";
import path from "path";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
