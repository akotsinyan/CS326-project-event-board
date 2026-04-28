import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDbPath(url: string): string {
  const filePath = url.replace(/^file:/, "");
  if (path.isAbsolute(filePath)) return filePath;
  // Resolve relative to project root (two levels up from src/lib)
  return path.resolve(__dirname, "../../", filePath);
}

let _client: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (!_client) {
    const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
    const dbPath = resolveDbPath(dbUrl);
    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _client = new PrismaClient({ adapter } as any);
  }
  return _client;
}
