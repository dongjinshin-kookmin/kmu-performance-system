import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const DB_PATH = path.join(process.cwd(), "data", "kmu.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  return _db;
}

export function dbExists(): boolean {
  return fs.existsSync(DB_PATH);
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
