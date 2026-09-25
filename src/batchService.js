import { loadDb, saveDb, findItem } from "./store.js";

export const PASS_SCORE = 80;

export class DomainError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

function newBatchId() {
  return "B-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function activeBatches(db) {
  return db.batches.filter(b => b.status !== "已归档");
}

// 同一块墨锭不能同时留在两个未归档批次
function activeBatchOf(db, code, exceptBatchId) {
  return activeBatches(db).find(
    b => b.id !== exceptBatchId && b.selections.some(s => s.code === code)
  ) || null;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(v => v !== undefined && v !== null && v !== ""))].sort();
}

export async function getFacets() {
  const db = await loadDb();
  return {
    smokeSources: uniqueSorted(db.items.map(i => i.smokeSource)),
    glueRatios: uniqueSorted(db.items.map(i => i.glueRatio)),
    ageYears: uniqueSorted(db.items.map(i => i.ageYears)).map(Number)
  };
}

function parseAge(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new DomainError(400, "invalid_age", "年限需为数字");
  return n;
}

// 按烟料、胶比和年限筛墨锭；已在其他未归档批次中的墨锭锁定不可选
export async function findCandidates(query = {}) {
  const db = await loadDb();
  const age = parseAge(query.ageYears);
  const items = db.items.filter(item => {
    if (query.smokeSource && item.smokeSource !== query.smokeSource) return false;
    if (query.glueRatio && item.glueRatio !== query.glueRatio) return false;
    if (age !== null && Number(item.ageYears) !== age) return false;
    return true;
  });
  return items.map(item => {
    const holder = activeBatchOf(db, item.code);
    return {
      code: item.code,
      smokeSource: item.smokeSource,
      glueRatio: item.glueRatio,
      ageYears: item.ageYears,
      storage: item.storage,
      status: item.status,
      locked: Boolean(holder),
      lockedBy: holder ? { id: holder.id, name: holder.name } : null
    };
  });
}

export async function listBatches() {
  const db = await loadDb();
  const rank = { "待评审": 0, "评审中": 1, "已归档": 2 };
  return db.batches
    .map(b => summarize(b))
    .sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || b.createdAt.localeCompare(a.createdAt));
}

function summarize(batch) {
  const report = batch.report;
  return {
    id: batch.id,
    code: batch.code,
    name: batch.name,
    smokeSource: batch.smokeSource,
    glueRatio: batch.glueRatio,
    ageYears: batch.ageYears,
    status: batch.status,
    createdAt: batch.createdAt,
    archivedAt: batch.archivedAt,
    selectionCount: batch.selections.length,
    passedCount: report ? report.passCount : null,
    rejectedCount: report ? report.rejectCount : null
  };
}

export async function getBatch(id) {
  const db = await loadDb();
  const batch = db.batches.find(b => b.id === id || b.code === id);
  if (!batch) throw new DomainError(404, "batch_not_found", "批次不存在");
  return batch;
}

export async function createBatch(input = {}) {
  const name = String(input.name || "").trim();
  if (!name) throw new DomainError(400, "name_required", "批次名称必填");
  const db = await loadDb();
  const batch = {
    id: newBatchId(),
    code: input.code ? String(input.code).trim() : null,
    name,
    smokeSource: input.smokeSource || "",
    glueRatio: input.glueRatio || "",
    ageYears: input.ageYears === "" || input.ageYears === undefined ? null : Number(input.ageYears),
    status: "待评审",
    createdAt: new Date().toISOString(),
    archivedAt: null,
    selections: [],
    report: null
  };
  if (batch.code && db.batches.some(b => b.code === batch.code)) {
    throw new DomainError(409, "batch_code_duplicated", "批次编号已存在");
  }
  db.batches.push(batch);
  await saveDb(db);
  return batch;
}

function writableBatch(db, id) {
  const batch = db.batches.find(b => b.id === id);
  if (!batch) throw new DomainError(404, "batch_not_found", "批次不存在");
  if (batch.status === "已归档") throw new DomainError(409, "batch_archived", "批次已归档，内容不可改动");
  return batch;
}

// 选入墨锭，安排计划日期和责任人
export async function addSelection(batchId, input = {}) {
  const plannedDate = String(input.plannedDate || "").trim();
  const owner = String(input.owner || "").trim();
  if (!plannedDate) throw new DomainError(400, "planned_date_required", "请安排计划日期");
  if (!owner) throw new DomainError(400, "owner_required", "请填写责任人");
  const db = await loadDb();
  const batch = writableBatch(db, batchId);
  const item = findItem(db, input.code);
  if (!item) throw new DomainError(404, "item_not_found", "墨锭不存在");
  if (batch.selections.some(s => s.code === item.code)) {
    throw new DomainError(409, "already_in_batch", "该墨锭已在本批次中");
  }
  const holder = activeBatchOf(db, item.code, batch.id);
  if (holder) throw new DomainError(409, "item_locked", `墨锭已在未归档批次「${holder.name}」中`);
  batch.selections.push({
    code: item.code,
    plannedDate,
    owner,
    addedAt: new Date().toISOString()
  });
  await saveDb(db);
  return batch;
}

export async function removeSelection(batchId, code) {
  const db = await loadDb();
  const batch = writableBatch(db, batchId);
  const before = batch.selections.length;
  batch.selections = batch.selections.filter(s => s.code !== code);
  if (batch.selections.length === before) throw new DomainError(404, "selection_not_found", "该墨锭不在本批次中");
  await saveDb(db);
  return batch;
}

// 汇总一块墨锭的所有试磨结果（结构化 tests + 评分试磨日志）
function testResultsOf(item) {
  const results = [];
  for (const t of item.tests || []) {
    results.push({
      at: t.at || null,
      paper: t.paper || "",
      detail: [t.water, t.speed, t.colorLayer, t.sediment].filter(Boolean).join("，"),
      note: t.note || "",
      score: Number(t.score)
    });
  }
  for (const l of item.logs || []) {
    if (l.step === "试磨" && typeof l.score === "number") {
      results.push({ at: l.at || null, paper: "", detail: "", note: l.note || "", score: l.score });
    }
  }
  return results;
}

function snapshot(item, selection) {
  return {
    code: item.code,
    smokeSource: item.smokeSource || "",
    glueRatio: item.glueRatio || "",
    ageYears: item.ageYears,
    storage: item.storage || "",
    plannedDate: selection.plannedDate,
    owner: selection.owner
  };
}

// 评审：从每块试磨里挑合格结果组成报告；缺记录或评分低于80写清原因
export async function reviewBatch(batchId, input = {}) {
  const db = await loadDb();
  const batch = writableBatch(db, batchId);
  if (batch.selections.length === 0) throw new DomainError(400, "empty_batch", "批次尚未选入任何墨锭");
  const reviewer = String(input.reviewer || "").trim();

  const entries = batch.selections.map(selection => {
    const item = findItem(db, selection.code);
    const entry = { ...snapshot(item || { code: selection.code }, selection) };
    if (!item) {
      entry.qualified = false;
      entry.result = null;
      entry.reason = "墨锭档案不存在，缺少试磨记录";
      return entry;
    }
    const best = testResultsOf(item)
      .filter(r => Number.isFinite(r.score))
      .sort((a, b) => b.score - a.score || String(b.at || "").localeCompare(String(a.at || "")))[0];
    if (!best) {
      entry.qualified = false;
      entry.result = null;
      entry.reason = "缺少试磨记录";
    } else if (best.score < PASS_SCORE) {
      entry.qualified = false;
      entry.result = best;
      entry.reason = `评分低于${PASS_SCORE}分（最高${best.score}分）`;
    } else {
      entry.qualified = true;
      entry.result = best;
      entry.reason = "";
    }
    return entry;
  });

  const passCount = entries.filter(e => e.qualified).length;
  batch.report = {
    reviewedAt: new Date().toISOString(),
    reviewer,
    entries,
    passCount,
    rejectCount: entries.length - passCount
  };
  batch.status = "评审中";
  await saveDb(db);
  return batch;
}

// 归档后内容不再改动
export async function archiveBatch(batchId) {
  const db = await loadDb();
  const batch = writableBatch(db, batchId);
  if (!batch.report) {
    throw new DomainError(409, "report_missing", "请先完成评审报告再归档");
  }
  batch.status = "已归档";
  batch.archivedAt = new Date().toISOString();
  await saveDb(db);
  return batch;
}

// 历史报告可按烟料来源查看
export async function listReports(query = {}) {
  const db = await loadDb();
  const reports = db.batches
    .filter(b => b.status === "已归档" && b.report)
    .filter(b => !query.smokeSource || b.smokeSource === query.smokeSource)
    .map(b => ({
      batchId: b.id,
      name: b.name,
      smokeSource: b.smokeSource,
      glueRatio: b.glueRatio,
      ageYears: b.ageYears,
      archivedAt: b.archivedAt,
      reviewedAt: b.report.reviewedAt,
      reviewer: b.report.reviewer,
      passCount: b.report.passCount,
      rejectCount: b.report.rejectCount,
      entries: b.report.entries
    }))
    .sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
  return reports;
}

export async function reportFacets() {
  const db = await loadDb();
  return { smokeSources: uniqueSorted(db.batches.filter(b => b.status === "已归档").map(b => b.smokeSource)) };
}
