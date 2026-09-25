const stages = ["待试磨", "已试磨", "重点观察"];

export function page() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>墨锭试磨室</title>
  <style>
    :root { --bg:#f1f3ef; --panel:#fff; --ink:#20241f; --muted:#687066; --line:#d4ddd0; --accent:#526f43; --warn:#9b4937; --ok:#3f6b49; }
    * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--ink); font-family:Arial,"PingFang SC",sans-serif; }
    header { padding:22px 28px; background:#fff; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:16px; align-items:center; }
    h1 { margin:0; font-size:26px; } h2 { margin:0 0 12px; font-size:18px; } h3 { margin:0; font-size:16px; }
    .tabs { display:flex; gap:8px; } .tabs button { background:#e7ece4; color:var(--ink); } .tabs button.active { background:var(--accent); color:#fff; }
    main.view-items { display:grid; grid-template-columns:380px 1fr; gap:22px; padding:22px 28px; }
    main.view-batches { display:grid; grid-template-columns:minmax(320px,420px) 1fr; gap:22px; padding:22px 28px; align-items:start; }
    form,.panel,.card,.stat { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:16px; }
    label { display:block; margin:10px 0 5px; color:var(--muted); font-size:13px; } input,select,textarea { width:100%; border:1px solid var(--line); border-radius:6px; padding:9px; font:inherit; background:#fff; } textarea { min-height:68px; }
    button { border:0; border-radius:6px; background:var(--accent); color:#fff; padding:10px 13px; font-weight:700; cursor:pointer; } button.secondary { background:#69736a; } button.danger { background:var(--warn); } button:disabled { opacity:.5; cursor:not-allowed; }
    .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin-bottom:14px; } .stat strong { display:block; font-size:24px; }
    .toolbar { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; } .toolbar select,.toolbar input { width:auto; min-width:160px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; } .card { display:grid; gap:8px; }
    .meta { color:var(--muted); font-size:13px; } .pill { display:inline-block; border:1px solid var(--line); border-radius:999px; padding:3px 8px; font-size:12px; }
    .logs { border-top:1px solid var(--line); padding-top:8px; max-height:90px; overflow:auto; } .warn { color:var(--warn); font-weight:700; } .ok { color:var(--ok); font-weight:700; }
    .batch-list,.candidate-list { display:grid; gap:10px; }
    .batch-card { display:grid; gap:10px; }
    .batch-head { display:flex; justify-content:space-between; align-items:center; gap:8px; }
    .sel-list { display:grid; gap:6px; }
    .sel-row { display:flex; justify-content:space-between; align-items:center; gap:8px; border:1px solid var(--line); border-radius:6px; padding:7px 9px; font-size:13px; background:#fafcf9; }
    .sel-row .who { color:var(--muted); }
    .cand-row { display:grid; grid-template-columns:1fr auto; gap:6px 10px; border:1px solid var(--line); border-radius:6px; padding:10px; background:#fafcf9; align-items:center; }
    .cand-row .cand-meta { grid-column:1 / -1; font-size:13px; color:var(--muted); }
    .cand-row .cand-plan { grid-column:1; display:flex; gap:6px; } .cand-row .cand-plan input { padding:6px; font-size:13px; }
    .cand-row button { grid-column:2; grid-row:2; padding:7px 10px; }
    .cand-row.locked { opacity:.65; }
    .report { border-top:1px dashed var(--line); padding-top:10px; display:grid; gap:6px; }
    .report-entry { border:1px solid var(--line); border-left-width:4px; border-radius:6px; padding:8px 10px; font-size:13px; display:grid; gap:3px; }
    .report-entry.pass { border-left-color:var(--ok); } .report-entry.fail { border-left-color:var(--warn); }
    .report-detail { color:var(--muted); }
    .archived { background:#f6f6f3; }
    .empty { color:var(--muted); font-size:13px; padding:6px 0; }
    .row2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
    @media (max-width:900px){ header{display:block;padding:18px 16px;} .tabs{margin-top:10px;} main.view-items,main.view-batches{grid-template-columns:1fr;padding:16px;} }
  </style>
</head>
<body>
  <header>
    <div><h1>墨锭试磨室</h1><div class="meta">墨锭建档、试磨批次与评审归档</div></div>
    <div style="display:flex;gap:10px;align-items:center">
      <div class="tabs">
        <button id="tabItems" class="active">墨锭档案</button>
        <button id="tabBatches">试磨批次</button>
      </div>
      <button id="reload" class="secondary">刷新</button>
    </div>
  </header>

  <main id="viewItems" class="view-items">
    <section>
      <form id="createForm"><h2>新增墨锭</h2><div id="fields"></div><label>初始状态</label><select name="status">${stages.map(s => "<option>" + s + "</option>").join("")}</select><button>保存墨锭</button></form>
      <form id="actionForm" style="margin-top:14px"><h2>创建试磨记录</h2><label>选择墨锭</label><select name="id" id="itemSelect"></select><div id="extraFields"></div><button>提交记录</button></form>
    </section>
    <section>
      <div class="stats" id="stats"></div>
      <div class="toolbar"><select id="statusFilter"><option value="">全部状态</option>${stages.map(s => "<option>" + s + "</option>").join("")}</select><input id="search" placeholder="搜索编号或关键词"></div>
      <div class="panel"><h2>选择墨锭后录入试磨记录，系统会保留多次试磨结果并更新评分状态。</h2><div class="grid" id="cards"></div></div>
    </section>
  </main>

  <main id="viewBatches" class="view-batches" hidden>
    <section style="display:grid;gap:14px">
      <form id="batchForm" class="panel">
        <h2>新建试磨批次</h2>
        <label>批次名称</label><input name="name" required placeholder="例如：2026秋黄山松烟批次">
        <label>批次编号（可选）</label><input name="code" placeholder="留空自动生成">
        <div class="row2">
          <div><label>烟料来源</label><select name="smokeSource" id="batchSmoke"><option value="">不限</option></select></div>
          <div><label>胶料比例</label><select name="glueRatio" id="batchGlue"><option value="">不限</option></select></div>
        </div>
        <label>存放年限</label><select name="ageYears" id="batchAge"><option value="">不限</option></select>
        <div class="actions"><button>创建批次</button></div>
      </form>

      <div class="panel">
        <h2>按条件选样</h2>
        <div class="row2">
          <div><label>烟料来源</label><select id="candSmoke"><option value="">不限</option></select></div>
          <div><label>胶料比例</label><select id="candGlue"><option value="">不限</option></select></div>
        </div>
        <label>存放年限</label><select id="candAge"><option value="">不限</option></select>
        <label>选入批次</label><select id="candBatch"></select>
        <div class="row2" style="margin-top:8px">
          <div><label>默认计划日期</label><input type="date" id="defaultDate"></div>
          <div><label>默认责任人</label><input id="defaultOwner" placeholder="责任人姓名"></div>
        </div>
        <div class="candidate-list" id="candidates" style="margin-top:10px"></div>
      </div>
    </section>

    <section style="display:grid;gap:14px">
      <div class="panel">
        <h2>未归档批次</h2>
        <div class="batch-list" id="activeBatches"></div>
      </div>
      <div class="panel archived">
        <h2>历史报告（已归档）</h2>
        <div class="toolbar"><select id="reportSmoke"><option value="">全部烟料来源</option></select></div>
        <div class="batch-list" id="reports"></div>
      </div>
    </section>
  </main>

  <script>
    const fields = [['code','墨锭编号','text'],['smokeSource','烟料来源','text'],['glueRatio','胶料比例','text'],['ageYears','存放年限','number'],['storage','存放位置','text']];
    const stages = ['待试磨','已试磨','重点观察'];
    const extraFields = [['paper','试磨纸张'],['water','加水量'],['speed','出墨速度'],['colorLayer','墨色层次'],['sediment','沉淀情况'],['score','评分']];
    let items = [];
    let batches = [];
    let reports = [];
    let facets = { smokeSources: [], glueRatios: [], ageYears: [], reportSmoke: [] };

    async function api(path, options) {
      const res = await fetch(path, options && options.body ? Object.assign({}, options, { headers: { 'Content-Type': 'application/json' } }) : options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || '请求失败');
      return data;
    }
    function esc(v) {
      return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }
    function el(id) { return document.getElementById(id); }

    /* ---------- 墨锭档案（原有建档 / 备注 / 试磨流程） ---------- */
    function renderForms() {
      el('fields').innerHTML = fields.map(f => '<label>' + f[1] + '</label><input name="' + f[0] + '" type="' + f[2] + '" ' + (f[0] === 'code' ? 'required' : '') + '>').join('');
      el('extraFields').innerHTML = extraFields.map(f => '<label>' + f[1] + '</label><input name="' + f[0] + '">').join('');
    }
    function renderItems() {
      el('itemSelect').innerHTML = items.map(item => '<option value="' + esc(item.id || item.code) + '">' + esc(item.code || item.id) + ' · ' + esc(item.smokeSource || '') + '</option>').join('');
      const stats = Object.fromEntries(stages.map(s => [s, items.filter(i => i.status === s).length]));
      el('stats').innerHTML = Object.entries(stats).map(kv => '<div class="stat"><span>' + kv[0] + '</span><strong>' + kv[1] + '</strong></div>').join('');
      const status = el('statusFilter').value;
      const q = el('search').value.trim();
      const visible = items.filter(item => (!status || item.status === status) && (!q || JSON.stringify(item).includes(q)));
      el('cards').innerHTML = visible.map(cardHtml).join('') || '<div class="empty">暂无墨锭</div>';
      document.querySelectorAll('[data-status]').forEach(sel => sel.onchange = async () => { await api('/api/items/' + sel.dataset.status, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) }); await loadItems(); });
      document.querySelectorAll('[data-note]').forEach(btn => btn.onclick = async () => { const note = prompt('记录备注'); if (note) { await api('/api/items/' + btn.dataset.note + '/logs', { method: 'POST', body: JSON.stringify({ step: '备注', note }) }); await loadItems(); } });
    }
    function cardHtml(item) {
      const main = fields.slice(0, 4).map(f => '<div><b>' + f[1] + '</b> ' + esc(item[f[0]]) + '</div>').join('');
      const logs = (item.logs || []).slice(-4).map(l => '<div>' + esc(l.step) + '：' + esc(l.note) + '</div>').join('');
      return '<article class="card"><h3>' + esc(item.code || item.id) + '</h3><span class="pill">' + esc(item.status) + '</span>' + main +
        '<label>状态</label><select data-status="' + esc(item.id || item.code) + '">' + stages.map(s => '<option ' + (s === item.status ? 'selected' : '') + '>' + s + '</option>').join('') + '</select>' +
        '<button class="secondary" data-note="' + esc(item.id || item.code) + '">追加备注</button>' +
        '<div class="logs meta">' + (logs || '暂无记录') + '</div></article>';
    }

    /* ---------- 试磨批次 ---------- */
    function fillSelect(node, values, allLabel, current) {
      node.innerHTML = ['<option value="">' + allLabel + '</option>'].concat(values.map(v => '<option value="' + esc(v) + '">' + esc(v) + '</option>')).join('');
      if (current) node.value = current;
    }
    function renderFacetSelects() {
      fillSelect(el('batchSmoke'), facets.smokeSources, '不限');
      fillSelect(el('candSmoke'), facets.smokeSources, '不限');
      fillSelect(el('batchGlue'), facets.glueRatios, '不限');
      fillSelect(el('candGlue'), facets.glueRatios, '不限');
      fillSelect(el('batchAge'), facets.ageYears.slice().sort((a, b) => a - b), '不限');
      fillSelect(el('candAge'), facets.ageYears.slice().sort((a, b) => a - b), '不限');
    }
    function renderBatchTarget() {
      const active = batches.filter(b => b.status !== '已归档');
      el('candBatch').innerHTML = active.length
        ? active.map(b => '<option value="' + esc(b.id) + '">' + esc(b.name) + '</option>').join('')
        : '<option value="">（请先创建批次）</option>';
    }
    async function loadCandidates() {
      const params = new URLSearchParams();
      if (el('candSmoke').value) params.set('smokeSource', el('candSmoke').value);
      if (el('candGlue').value) params.set('glueRatio', el('candGlue').value);
      if (el('candAge').value) params.set('ageYears', el('candAge').value);
      const list = await api('/api/batches/candidates?' + params.toString());
      if (!list.length) { el('candidates').innerHTML = '<div class="empty">没有符合条件的墨锭</div>'; return; }
      el('candidates').innerHTML = list.map(c => {
        const lock = c.locked ? '（已在批次：' + esc(c.lockedBy.name) + '）' : '';
        return '<div class="cand-row' + (c.locked ? ' locked' : '') + '">' +
          '<div><b>' + esc(c.code) + '</b> <span class="pill">' + esc(c.status) + '</span></div>' +
          '<div class="cand-meta">' + esc(c.smokeSource) + ' · 胶比' + esc(c.glueRatio) + ' · ' + esc(c.ageYears) + '年 · ' + esc(c.storage) + lock + '</div>' +
          '<div class="cand-plan"><input type="date" value="' + esc(el('defaultDate').value) + '" data-date="' + esc(c.code) + '"><input placeholder="责任人" value="' + esc(el('defaultOwner').value) + '" data-owner="' + esc(c.code) + '"></div>' +
          '<button ' + (c.locked ? 'disabled' : '') + ' data-add="' + esc(c.code) + '">选入</button></div>';
      }).join('');
      document.querySelectorAll('[data-add]').forEach(btn => btn.onclick = () => addCandidate(btn.dataset.add));
    }
    async function addCandidate(code) {
      const batchId = el('candBatch').value;
      if (!batchId) return alert('请先创建并选择一个未归档批次');
      const date = document.querySelector('[data-date="' + code + '"]').value;
      const owner = document.querySelector('[data-owner="' + code + '"]').value.trim();
      try {
        await api('/api/batches/' + batchId + '/selections', { method: 'POST', body: JSON.stringify({ code, plannedDate: date, owner }) });
        await loadBatches();
      } catch (e) { alert(e.message); }
    }
    function reportHtml(b) {
      if (!b.report) return '';
      const r = b.report;
      const entries = r.entries.map(e => {
        const head = (e.qualified ? '<span class="ok">合格</span> ' : '<span class="warn">不合格</span> ') + esc(e.code) + ' · ' + esc(e.owner) + ' · 计划' + esc(e.plannedDate);
        const detail = e.result
          ? '<div class="report-detail">评分 ' + esc(e.result.score) + (e.result.paper ? ' · ' + esc(e.result.paper) : '') + (e.result.detail ? ' · ' + esc(e.result.detail) : '') + (e.result.note ? ' · ' + esc(e.result.note) : '') + '</div>'
          : '';
        const reason = e.qualified ? '' : '<div class="warn">原因：' + esc(e.reason) + '</div>';
        return '<div class="report-entry ' + (e.qualified ? 'pass' : 'fail') + '">' + head + detail + reason + '</div>';
      }).join('');
      return '<div class="report"><div class="meta">评审报告 · 合格 ' + r.passCount + ' 块 / 不合格 ' + r.rejectCount + ' 块' + (r.reviewer ? ' · 评审人：' + esc(r.reviewer) : '') + '</div>' + entries + '</div>';
    }
    function activeBatchHtml(b) {
      const sels = b.selections.map(s =>
        '<div class="sel-row"><span><b>' + esc(s.code) + '</b> <span class="who">' + esc(s.owner) + ' · 计划' + esc(s.plannedDate) + '</span></span>' +
        '<button class="danger" data-remove="' + esc(b.id) + '|' + esc(s.code) + '">移出</button></div>'
      ).join('');
      const crit = [b.smokeSource, b.glueRatio ? '胶比' + b.glueRatio : '', b.ageYears != null ? b.ageYears + '年' : ''].filter(Boolean).join(' · ');
      return '<article class="panel batch-card"><div class="batch-head"><h3>' + esc(b.name) + '</h3><span class="pill">' + esc(b.status) + '</span></div>' +
        '<div class="meta">' + (crit || '不限筛选条件') + ' · 已选 ' + b.selections.length + ' 块 · 建档 ' + esc(b.createdAt.slice(0, 10)) + '</div>' +
        '<div class="sel-list">' + (sels || '<div class="empty">尚未选入墨锭</div>') + '</div>' +
        reportHtml(b) +
        '<div class="actions"><button data-review="' + esc(b.id) + '">生成评审报告</button><button class="secondary" data-archive="' + esc(b.id) + '">归档</button></div></article>';
    }
    function reportCardHtml(r) {
      const entries = r.entries.map(e => {
        const head = (e.qualified ? '<span class="ok">合格</span> ' : '<span class="warn">不合格</span> ') + esc(e.code);
        const detail = e.result ? '<div class="report-detail">评分 ' + esc(e.result.score) + (e.result.paper ? ' · ' + esc(e.result.paper) : '') + '</div>' : '';
        const reason = e.qualified ? '' : '<div class="warn">原因：' + esc(e.reason) + '</div>';
        return '<div class="report-entry ' + (e.qualified ? 'pass' : 'fail') + '">' + head + detail + reason + '</div>';
      }).join('');
      return '<article class="panel"><div class="batch-head"><h3>' + esc(r.name) + '</h3><span class="pill">已归档</span></div>' +
        '<div class="meta">烟料：' + esc(r.smokeSource || '不限') + ' · 合格 ' + r.passCount + ' / 不合格 ' + r.rejectCount + ' · 归档于 ' + esc(r.archivedAt.slice(0, 10)) + '</div>' + entries + '</article>';
    }
    async function renderActiveBatches(fullList) {
      const active = fullList.filter(b => b.status !== '已归档');
      if (!active.length) { el('activeBatches').innerHTML = '<div class="empty">暂无未归档批次</div>'; return; }
      const details = await Promise.all(active.map(b => api('/api/batches/' + b.id)));
      el('activeBatches').innerHTML = details.map(activeBatchHtml).join('');
      document.querySelectorAll('[data-remove]').forEach(btn => btn.onclick = async () => {
        const parts = btn.dataset.remove.split('|');
        await api('/api/batches/' + parts[0] + '/selections/' + encodeURIComponent(parts[1]), { method: 'DELETE' });
        await loadBatches();
      });
      document.querySelectorAll('[data-review]').forEach(btn => btn.onclick = async () => {
        const reviewer = prompt('评审人（可选）') || '';
        try { await api('/api/batches/' + btn.dataset.review + '/review', { method: 'POST', body: JSON.stringify({ reviewer }) }); await loadBatches(); }
        catch (e) { alert(e.message); }
      });
      document.querySelectorAll('[data-archive]').forEach(btn => btn.onclick = async () => {
        if (!confirm('归档后批次内容不可再改动，确认归档？')) return;
        try { await api('/api/batches/' + btn.dataset.archive + '/archive', { method: 'POST' }); await loadBatches(); }
        catch (e) { alert(e.message); }
      });
    }
    async function renderReports() {
      fillSelect(el('reportSmoke'), facets.reportSmoke || [], '全部烟料来源', el('reportSmoke').value);
      if (!reports.length) { el('reports').innerHTML = '<div class="empty">暂无已归档报告</div>'; return; }
      el('reports').innerHTML = reports.map(reportCardHtml).join('');
    }

    /* ---------- 加载与事件 ---------- */
    async function loadItems() { items = await api('/api/items'); renderItems(); }
    async function loadBatches() {
      batches = await api('/api/batches');
      renderBatchTarget();
      await renderActiveBatches(batches);
      await loadReports();
      await loadCandidates();
    }
    async function loadReports() {
      const params = new URLSearchParams();
      if (el('reportSmoke').value) params.set('smokeSource', el('reportSmoke').value);
      reports = await api('/api/reports?' + params.toString());
      await renderReports();
    }

    el('createForm').onsubmit = async event => { event.preventDefault(); await api('/api/items', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(el('createForm')).entries())) }); el('createForm').reset(); await loadItems(); };
    el('actionForm').onsubmit = async event => { event.preventDefault(); await api('/api/items/' + el('itemSelect').value + '/action', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(el('actionForm')).entries())) }); el('actionForm').reset(); await loadItems(); };
    el('statusFilter').onchange = renderItems; el('search').oninput = renderItems;

    el('batchForm').onsubmit = async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(el('batchForm')).entries());
      try {
        await api('/api/batches', { method: 'POST', body: JSON.stringify(data) });
        el('batchForm').reset();
        renderFacetSelects();
        await loadBatches();
      } catch (e) { alert(e.message); }
    };
    ['candSmoke', 'candGlue', 'candAge'].forEach(id => el(id).onchange = loadCandidates);
    el('defaultDate').onchange = loadCandidates; el('defaultOwner').onchange = loadCandidates;
    el('reportSmoke').onchange = loadReports;

    function showTab(which) {
      const itemsOn = which === 'items';
      el('viewItems').hidden = !itemsOn;
      el('viewBatches').hidden = itemsOn;
      el('tabItems').classList.toggle('active', itemsOn);
      el('tabBatches').classList.toggle('active', !itemsOn);
    }
    el('tabItems').onclick = () => showTab('items');
    el('tabBatches').onclick = () => { showTab('batches'); loadBatches(); };
    el('reload').onclick = async () => {
      facets = await api('/api/batches/facets');
      const rf = await api('/api/reports/facets'); facets.reportSmoke = rf.smokeSources;
      renderFacetSelects();
      await Promise.all([loadItems(), loadBatches()]);
    };

    renderForms();
    (async function init() {
      facets = await api('/api/batches/facets');
      const rf = await api('/api/reports/facets'); facets.reportSmoke = rf.smokeSources;
      renderFacetSelects();
      await Promise.all([loadItems(), loadBatches()]);
    })();
  </script>
</body>
</html>`;
}
