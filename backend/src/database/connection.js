import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { config } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "../../", config.databaseFile);
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for performance and data integrity
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

export default db;
