// 试磨批次的领域规则：筛选、选样、评审报告、归档。
// 本模块只做纯数据判断，不碰文件和网络。

export const PASS_SCORE = 80; // 报告合格线：评分低于 80 需写清原因
export const BATCH_OPEN = "进行中";
export const BATCH_ARCHIVED = "已归档";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

export function findItem(db, ref) {
  return db.items.find(x => x.id === ref || x.code === ref);
}

export function itemKey(item) {
  return item.id || item.code;
}

// 一块墨锭的全部试磨结果：优先取 tests，否则取带评分的历史日志
export function testResultsOf(item) {
  if (Array.isArray(item.tests) && item.tests.length) return item.tests;
  return (item.logs || []).filter(log => typeof log.score === "number");
}

// 按烟料来源（包含匹配）、胶料比例（精确匹配）和年限范围筛选墨锭
export function filterItems(items, { smokeSource, glueRatio, minAge, maxAge } = {}) {
  return items.filter(item => {
    if (smokeSource && !(item.smokeSource || "").includes(smokeSource)) return false;
    if (glueRatio && (item.glueRatio || "") !== glueRatio) return false;
    const age = Number(item.ageYears);
    if (minAge !== undefined && minAge !== "" && !(age >= Number(minAge))) return false;
    if (maxAge !== undefined && maxAge !== "" && !(age <= Number(maxAge))) return false;
    return true;
  });
}

// 某块墨锭当前所在的未归档批次（同一块不能留在两个未归档批次）
export function openBatchOf(db, ref, excludeBatchId) {
  return db.batches.find(batch =>
    batch.id !== excludeBatchId &&
    batch.status !== BATCH_ARCHIVED &&
    batch.selections.some(sel => sel.itemId === ref)
  );
}

export function assertOpen(batch) {
  if (batch.status === BATCH_ARCHIVED) fail("批次已归档，内容不能再改动", 409);
}

function normalizeSelections(db, selections, excludeBatchId) {
  if (!Array.isArray(selections) || !selections.length) fail("批次至少要选入一块墨锭");
  const seen = new Set();
  return selections.map(sel => {
    const ref = sel.itemId || sel.code;
    const item = findItem(db, ref);
    if (!item) fail("墨锭不存在：" + ref, 404);
    const key = itemKey(item);
    if (seen.has(key)) fail("批次内重复选入：" + item.code);
    seen.add(key);
    const holder = openBatchOf(db, key, excludeBatchId);
    if (holder) fail(`墨锭 ${item.code} 已在未归档批次「${holder.name}」中`);
    if (!sel.planDate) fail(`墨锭 ${item.code} 缺少计划日期`);
    if (!sel.owner || !String(sel.owner).trim()) fail(`墨锭 ${item.code} 缺少责任人`);
    return {
      itemId: key,
      code: item.code,
      smokeSource: item.smokeSource || "",
      planDate: String(sel.planDate),
      owner: String(sel.owner).trim()
    };
  });
}

export function createBatch(db, { name, selections } = {}) {
  if (!name || !String(name).trim()) fail("批次名称不能为空");
  const batch = {
    id: "PB-" + Date.now(),
    name: String(name).trim(),
    status: BATCH_OPEN,
    createdAt: new Date().toISOString(),
    selections: normalizeSelections(db, selections, null),
    report: null,
    archivedAt: null
  };
  db.batches.unshift(batch);
  return batch;
}

export function addSelections(db, batch, selections) {
  assertOpen(batch);
  batch.selections.push(...normalizeSelections(db, selections, batch.id));
  batch.report = null; // 选样变化后需重新评审
  return batch;
}

export function removeSelection(db, batch, itemRef) {
  assertOpen(batch);
  const before = batch.selections.length;
  batch.selections = batch.selections.filter(sel => sel.itemId !== itemRef && sel.code !== itemRef);
  if (batch.selections.length === before) fail("该批次中没有这块墨锭", 404);
  batch.report = null; // 选样变化后需重新评审
  return batch;
}

// 评审：每块墨锭挑一条合格结果；缺记录或评分低于 80 必须写清原因
export function buildReport(db, batch, entries) {
  assertOpen(batch);
  if (!batch.selections.length) fail("批次还没有选入墨锭");
  if (!Array.isArray(entries)) fail("报告条目格式不正确");
  const byItem = new Map();
  for (const entry of entries || []) {
    if (byItem.has(entry.itemId)) fail("报告条目重复：" + entry.itemId);
    byItem.set(entry.itemId, entry);
  }
  const reportEntries = batch.selections.map(sel => {
    const entry = byItem.get(sel.itemId);
    if (!entry) fail(`墨锭 ${sel.code} 缺少评审条目`);
    const item = findItem(db, sel.itemId);
    const results = item ? testResultsOf(item) : [];
    const reason = String(entry.reason || "").trim();
    const hasPick = entry.testIndex !== null && entry.testIndex !== undefined && entry.testIndex !== "";
    if (!hasPick) {
      if (!reason) fail(`墨锭 ${sel.code} 未选合格结果，需写清原因`);
      return { itemId: sel.itemId, code: sel.code, smokeSource: sel.smokeSource, testIndex: null, score: null, paper: "", at: null, reason };
    }
    const index = Number(entry.testIndex);
    const picked = results[index];
    if (!picked) fail(`墨锭 ${sel.code} 选择的试磨结果不存在`);
    const score = Number(picked.score) || 0;
    if (score < PASS_SCORE && !reason) fail(`墨锭 ${sel.code} 评分 ${score} 低于 ${PASS_SCORE}，需写清原因`);
    return { itemId: sel.itemId, code: sel.code, smokeSource: sel.smokeSource, testIndex: index, score, paper: picked.paper || "", at: picked.at || null, reason };
  });
  batch.report = { entries: reportEntries, builtAt: new Date().toISOString() };
  return batch.report;
}

export function archiveBatch(db, batch) {
  assertOpen(batch);
  if (!batch.report) fail("请先完成评审报告再归档");
  batch.status = BATCH_ARCHIVED;
  batch.archivedAt = new Date().toISOString();
  return batch;
}

// 历史报告：只看已归档批次，可按烟料来源过滤条目
export function reportsBySmokeSource(db, smokeSource) {
  const archived = db.batches.filter(batch => batch.status === BATCH_ARCHIVED && batch.report);
  if (!smokeSource) return archived;
  return archived
    .map(batch => ({
      ...batch,
      report: { ...batch.report, entries: batch.report.entries.filter(entry => (entry.smokeSource || "").includes(smokeSource)) }
    }))
    .filter(batch => batch.report.entries.length);
}

// 输出给页面的批次视图：选样带上墨锭现状和可挑选的试磨结果
export function batchView(db, batch) {
  return {
    ...batch,
    selections: batch.selections.map(sel => {
      const item = findItem(db, sel.itemId);
      const results = item ? testResultsOf(item) : [];
      return {
        ...sel,
        glueRatio: item?.glueRatio ?? "",
        ageYears: item?.ageYears ?? "",
        itemStatus: item?.status ?? "已删除",
        results: results.map((test, index) => ({
          index,
          at: test.at || "",
          paper: test.paper || "",
          score: Number(test.score) || 0,
          note: test.note || ""
        }))
      };
    })
  };
}
