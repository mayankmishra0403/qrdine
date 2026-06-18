import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

function splitSQL(sql) {
  const stmts = [];
  let cur = "";
  let block = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i], n = sql[i + 1] || "";
    if (block) { if (c === "*" && n === "/") { block = false; i++; } continue; }
    if (c === "/" && n === "*") { block = true; i++; continue; }
    if (c === "-" && n === "-") { while (i < sql.length && sql[i] !== "\n") i++; continue; }
    if (c === "\n" || c === "\r") { cur += " "; continue; }
    if (c === ";") { const t = cur.trim(); if (t && !t.startsWith("--")) stmts.push(t); cur = ""; continue; }
    cur += c;
  }
  return stmts;
}

async function main() {
  const dir = "/app/prisma/migrations";

  const dirs = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const d of dirs) {
    const sqlFile = join(dir, d, "migration.sql");
    if (!existsSync(sqlFile)) continue;

    const sql = readFileSync(sqlFile, "utf-8");
    const stmts = splitSQL(sql);
    console.log(`→ ${d} (${stmts.length} stmts)`);

    for (const s of stmts) {
      try { await prisma.$executeRawUnsafe(s + ";"); }
      catch (e) {
        const m = e.message || "";
        if (m.includes("already exists") || m.includes("duplicate") ||
            (e.code === "P2010" && ["42701", "42703", "42710"].includes(e.meta?.code))) {
          console.log(`  ~ ${s.slice(0, 45)}... (skip)`);
          continue;
        }
        throw e;
      }
    }
    console.log(`  ✓ ${d}`);
  }
  console.log("=== DB ready ===");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error("FAIL:", e.message || e); prisma.$disconnect(); process.exit(1); });
