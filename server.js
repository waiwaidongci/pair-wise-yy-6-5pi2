import http from "node:http";
import { loadDb, saveDb, findItem } from "./src/store.js";
import {
  DomainError,
  getFacets,
  findCandidates,
  listBatches,
  getBatch,
  createBatch,
  addSelection,
  removeSelection,
  reviewBatch,
  archiveBatch,
  listReports,
  reportFacets
} from "./src/batchService.js";
import { page } from "./src/page.js";

const port = Number(process.env.PORT || 3037);

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

const statLabels = ["待试磨", "已试磨", "重点观察"];
function computeStats(items) {
  const stats = Object.fromEntries(statLabels.map(label => [label, 0]));
  for (const item of items) {
    if (stats[item.status] !== undefined) stats[item.status] += 1;
  }
  return stats;
}
function summarizeItem(item) {
  const logCount = (item.logs || []).length + (item.tasks || []).reduce((n, t) => n + (t.logs || []).length, 0);
  return { ...item, logCount };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const db = await loadDb();

    // 页面
    if (req.method === "GET" && url.pathname === "/") return html(res, page());

    // 墨锭：建档 / 查询 / 状态 / 备注 / 试磨（原有流程保持不变）
    if (req.method === "GET" && url.pathname === "/api/items") {
      return send(res, 200, db.items.map(summarizeItem));
    }
    if (req.method === "POST" && url.pathname === "/api/items") {
      const input = await body(req);
      const item = { id: newId(), ...input, logs: [{ at: new Date().toISOString(), step: "建档", note: "创建墨锭" }] };
      db.items.unshift(item);
      await saveDb(db);
      return send(res, 201, item);
    }
    const patch = url.pathname.match(/^\/api\/items\/([^/]+)$/);
    if (patch && req.method === "PATCH") {
      const item = findItem(db, patch[1]);
      if (!item) return send(res, 404, { error: "item_not_found" });
      Object.assign(item, await body(req));
      item.logs ||= [];
      item.logs.push({ at: new Date().toISOString(), step: "状态", note: "更新为" + item.status });
      await saveDb(db);
      return send(res, 200, item);
    }
    const log = url.pathname.match(/^\/api\/items\/([^/]+)\/logs$/);
    if (log && req.method === "POST") {
      const item = findItem(db, log[1]);
      if (!item) return send(res, 404, { error: "item_not_found" });
      const input = await body(req);
      item.logs ||= [];
      item.logs.push({ at: new Date().toISOString(), step: input.step || "记录", note: input.note || "" });
      await saveDb(db);
      return send(res, 201, item);
    }
    const action = url.pathname.match(/^\/api\/items\/([^/]+)\/action$/);
    if (action && req.method === "POST") {
      const item = findItem(db, action[1]);
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
    if (req.method === "GET" && url.pathname === "/api/stats") {
      return send(res, 200, computeStats(db.items));
    }

    // 试磨批次
    if (req.method === "GET" && url.pathname === "/api/batches/facets") {
      return send(res, 200, await getFacets());
    }
    if (req.method === "GET" && url.pathname === "/api/batches/candidates") {
      return send(res, 200, await findCandidates({
        smokeSource: url.searchParams.get("smokeSource") || "",
        glueRatio: url.searchParams.get("glueRatio") || "",
        ageYears: url.searchParams.get("ageYears") || ""
      }));
    }
    if (req.method === "GET" && url.pathname === "/api/batches") {
      return send(res, 200, await listBatches());
    }
    if (req.method === "POST" && url.pathname === "/api/batches") {
      return send(res, 201, await createBatch(await body(req)));
    }
    const one = url.pathname.match(/^\/api\/batches\/([^/]+)$/);
    if (one && req.method === "GET") {
      return send(res, 200, await getBatch(one[1]));
    }
    const selections = url.pathname.match(/^\/api\/batches\/([^/]+)\/selections$/);
    if (selections && req.method === "POST") {
      return send(res, 201, await addSelection(selections[1], await body(req)));
    }
    const selOne = url.pathname.match(/^\/api\/batches\/([^/]+)\/selections\/([^/]+)$/);
    if (selOne && req.method === "DELETE") {
      return send(res, 200, await removeSelection(selOne[1], decodeURIComponent(selOne[2])));
    }
    const review = url.pathname.match(/^\/api\/batches\/([^/]+)\/review$/);
    if (review && req.method === "POST") {
      return send(res, 200, await reviewBatch(review[1], await body(req)));
    }
    const archive = url.pathname.match(/^\/api\/batches\/([^/]+)\/archive$/);
    if (archive && req.method === "POST") {
      return send(res, 200, await archiveBatch(archive[1]));
    }

    // 历史报告
    if (req.method === "GET" && url.pathname === "/api/reports/facets") {
      return send(res, 200, await reportFacets());
    }
    if (req.method === "GET" && url.pathname === "/api/reports") {
      return send(res, 200, await listReports({ smokeSource: url.searchParams.get("smokeSource") || "" }));
    }

    send(res, 404, { error: "not_found" });
  } catch (error) {
    if (error instanceof DomainError) return send(res, error.status, { error: error.code, message: error.message });
    send(res, 500, { error: error.message });
  }
});

server.listen(port, () => console.log("墨锭试磨室 listening on http://localhost:" + port));
