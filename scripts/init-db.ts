/**
 * 스키마 초기화: 기존 DB 삭제 → 마이그레이션 SQL 실행.
 * 사용: npm run db:init
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "data", "kmu.db");
const MIGRATION = path.join(ROOT, "db", "migrations", "001_init.sql");

function main() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    const f = DB_PATH + suffix;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  const sql = fs.readFileSync(MIGRATION, "utf8");
  db.exec(sql);
  const tables = db
    .prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='table'")
    .get() as { n: number };
  db.close();
  console.log(`[init] 스키마 생성 완료 — 테이블 ${tables.n}개 → ${DB_PATH}`);
}

main();
