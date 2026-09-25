import http from "node:http";
import { loadDb, saveDb } from "./lib/store.js";
import {
  filterItems,
  itemKey,
  openBatchOf,
  createBatch,
  addSelections,
  removeSelection,
  buildReport,
  archiveBatch,
  reportsBySmokeSource,
  batchView
} from "./lib/batchRules.js";
import { page } from "./lib/page.js";

const port = Number(process.env.PORT || 3037);
const statLabels = ["待试磨","已试磨","重点观察"];

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}
function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data, null, 2));
}
function html(res, text) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(text);
}
function newId() { return "IS-" + Date.now(); }
function computeStats(items) {
  const stats = Object.fromEntries(statLabels.map(label => [label, 0]));
  for (const item of items) {
    if (stats[item.status] !== undefined) stats[item.status] += 1;
  }
  return stats;
}
function summarize(item) {
  const logCount = (item.logs || []).length + (item.tasks || []).reduce((n, t) => n + (t.logs || []).length, 0);
  return { ...item, logCount };
}
function findBatch(db, id) {
  const batch = db.batches.find(b => b.id === id);
  if (!batch) {
    const error = new Error("batch_not_found");
    error.status = 404;
    throw error;
  }
  return batch;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const db = await loadDb();
    if (req.method === "GET" && url.pathname === "/") return html(res, page());
    if (req.method === "GET" && url.pathname === "/api/items") return send(res, 200, db.items.map(summarize));
    if (req.method === "POST" && url.pathname === "/api/items") {
      const input = await body(req);
      const item = { id: newId(), ...input, logs: [{ at: new Date().toISOString(), step: "建档", note: "创建墨锭" }] };

      db.items.unshift(item);
      await saveDb(db);
      return send(res, 201, item);
    }
    const patch = url.pathname.match(/^\/api\/items\/([^/]+)$/);
    if (patch && req.method === "PATCH") {
      const item = db.items.find(x => x.id === patch[1] || x.code === patch[1]);
      if (!item) return send(res, 404, { error: "item_not_found" });
      Object.assign(item, await body(req));
      item.logs ||= [];
      item.logs.push({ at: new Date().toISOString(), step: "状态", note: "更新为" + item.status });
      await saveDb(db);
      return send(res, 200, item);
    }
    const log = url.pathname.match(/^\/api\/items\/([^/]+)\/logs$/);
    if (log && req.method === "POST") {
      const item = db.items.find(x => x.id === log[1] || x.code === log[1]);
      if (!item) return send(res, 404, { error: "item_not_found" });
      const input = await body(req);
      item.logs ||= [];
      item.logs.push({ at: new Date().toISOString(), step: input.step || "记录", note: input.note || "" });
      await saveDb(db);
      return send(res, 201, item);
    }
    const action = url.pathname.match(/^\/api\/items\/([^/]+)\/action$/);
    if (action && req.method === "POST") {
      const item = db.items.find(x => x.id === action[1] || x.code === action[1]);
      if (!item) return send(res, 404, { error: "item_not_found" });
      const input = await body(req);
      item.logs ||= [];
      const score = Number(input.score || 0);
      item.tests ||= [];
      item.tests.push({ at: new Date().toISOString(), ...input, score });
      item.status = score >= 85 ? "已试磨" : "重点观察";
      item.logs.push({ at: new Date().toISOString(), step: "试磨", note: (input.paper || "试纸") + "，评分" + score, score });
      await saveDb(db);
      return send(res, 201, item);
    }
    if (req.method === "GET" && url.pathname === "/api/stats") return send(res, 200, computeStats(db.items));

    // ===== 试磨批次 =====
    // 按烟料、胶比和年限筛选候选墨锭，并标出是否已占用
    if (req.method === "GET" && url.pathname === "/api/batch-candidates") {
      const query = Object.fromEntries(url.searchParams.entries());
      const filtered = filterItems(db.items, query);
      return send(res, 200, filtered.map(item => {
        const key = itemKey(item);
        const holder = openBatchOf(db, key, null);
        return { ...summarize(item), key, busyBatch: holder ? holder.name : null };
      }));
    }
    if (req.method === "GET" && url.pathname === "/api/batches") {
      return send(res, 200, db.batches.map(batch => batchView(db, batch)));
    }
    if (req.method === "POST" && url.pathname === "/api/batches") {
      const batch = createBatch(db, await body(req));
      await saveDb(db);
      return send(res, 201, batchView(db, batch));
    }
    const batchOne = url.pathname.match(/^\/api\/batches\/([^/]+)$/);
    if (batchOne && req.method === "GET") {
      return send(res, 200, batchView(db, findBatch(db, batchOne[1])));
    }
    const batchSel = url.pathname.match(/^\/api\/batches\/([^/]+)\/selections(?:\/([^/]+))?$/);
    if (batchSel && req.method === "POST" && !batchSel[2]) {
      const batch = findBatch(db, batchSel[1]);
      const input = await body(req);
      addSelections(db, batch, input.selections || [input]);
      await saveDb(db);
      return send(res, 200, batchView(db, batch));
    }
    if (batchSel && req.method === "DELETE" && batchSel[2]) {
      const batch = findBatch(db, batchSel[1]);
      removeSelection(db, batch, decodeURIComponent(batchSel[2]));
      await saveDb(db);
      return send(res, 200, batchView(db, batch));
    }
    const batchReport = url.pathname.match(/^\/api\/batches\/([^/]+)\/report$/);
    if (batchReport && req.method === "POST") {
      const batch = findBatch(db, batchReport[1]);
      const input = await body(req);
      buildReport(db, batch, input.entries);
      await saveDb(db);
      return send(res, 200, batchView(db, batch));
    }
    const batchArchive = url.pathname.match(/^\/api\/batches\/([^/]+)\/archive$/);
    if (batchArchive && req.method === "POST") {
      const batch = findBatch(db, batchArchive[1]);
      archiveBatch(db, batch);
      await saveDb(db);
      return send(res, 200, batchView(db, batch));
    }
    // 历史报告：只看已归档批次，可按烟料来源过滤
    if (req.method === "GET" && url.pathname === "/api/reports") {
      return send(res, 200, reportsBySmokeSource(db, url.searchParams.get("smokeSource") || ""));
    }
    send(res, 404, { error: "not_found" });
  } catch (error) {
    send(res, error.status || 500, { error: error.message });
  }
});
server.listen(port, () => console.log("墨锭试磨室 listening on http://localhost:" + port));
