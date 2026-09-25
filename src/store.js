import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "..", "data", "ink-stick-testing.json");

const seed = {
  "items": [
    {
      "code": "IS-001",
      "smokeSource": "黄山松烟",
      "glueRatio": "7.5%",
      "ageYears": 8,
      "storage": "恒湿柜B",
      "status": "已试磨",
      "logs": [
        {
          "at": "2026-06-11",
          "step": "试磨",
          "note": "宣纸20滴水，出墨快，评分86",
          "score": 86
        }
      ]
    },
    {
      "code": "IS-002",
      "smokeSource": "桐油烟",
      "glueRatio": "8%",
      "ageYears": 3,
      "storage": "试样盒C",
      "status": "待试磨",
      "logs": []
    }
  ],
  "batches": []
};

async function loadDb() {
  if (!existsSync(dbPath)) {
    await mkdir(dirname(dbPath), { recursive: true });
    await writeFile(dbPath, JSON.stringify(seed, null, 2));
  }
  const db = JSON.parse(await readFile(dbPath, "utf8"));
  db.items ||= [];
  db.batches ||= [];
  return db;
}

async function saveDb(db) {
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

function findItem(db, ref) {
  return db.items.find(x => x.id === ref || x.code === ref) || null;
}

export { dbPath, seed, loadDb, saveDb, findItem };
