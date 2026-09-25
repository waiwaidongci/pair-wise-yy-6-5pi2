const fields = [["code","墨锭编号","text"],["smokeSource","烟料来源","text"],["glueRatio","胶料比例","text"],["ageYears","存放年限","number"],["storage","存放位置","text"]];
const stages = ["待试磨","已试磨","重点观察"];
const extraFields = [["paper","试磨纸张"],["water","加水量"],["speed","出墨速度"],["colorLayer","墨色层次"],["sediment","沉淀情况"],["score","评分"]];

export function page() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>墨锭试磨室</title>
  <style>
    :root { --bg:#f1f3ef; --panel:#fff; --ink:#20241f; --muted:#687066; --line:#d4ddd0; --accent:#526f43; --warn:#9b4937; }
    * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--ink); font-family:Arial,"PingFang SC",sans-serif; }
    header { padding:22px 28px; background:#fff; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:16px; align-items:center; }
    h1 { margin:0; font-size:26px; } h2 { margin:0 0 12px; font-size:18px; } main { display:grid; grid-template-columns:380px 1fr; gap:22px; padding:22px 28px; }
    form,.panel,.card,.stat { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:16px; }
    label { display:block; margin:10px 0 5px; color:var(--muted); font-size:13px; } input,select,textarea { width:100%; border:1px solid var(--line); border-radius:6px; padding:9px; font:inherit; background:#fff; } textarea { min-height:68px; }
    button { border:0; border-radius:6px; background:var(--accent); color:#fff; padding:10px 13px; font-weight:700; cursor:pointer; } button.secondary { background:#69736a; }
    .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin-bottom:14px; } .stat strong { display:block; font-size:24px; }
    .toolbar { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; } .toolbar select,.toolbar input { width:auto; min-width:160px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; } .card { display:grid; gap:8px; align-content:start; }
    .meta { color:var(--muted); font-size:13px; } .pill { display:inline-block; border:1px solid var(--line); border-radius:999px; padding:3px 8px; font-size:12px; }
    .logs { border-top:1px solid var(--line); padding-top:8px; max-height:90px; overflow:auto; } .warn { color:var(--warn); font-weight:700; }
    .batch-area { padding:0 28px 22px; display:grid; gap:14px; }
    .batch-grid { display:grid; grid-template-columns:400px 1fr; gap:16px; align-items:start; }
    .cand { display:grid; grid-template-columns:auto 1fr 140px 110px; gap:8px; align-items:center; padding:6px 0; border-bottom:1px dashed var(--line); font-size:13px; }
    .cand input[type="checkbox"] { width:auto; }
    .sel-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; font-size:13px; padding:4px 0; }
    .review-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:0 0 8px; }
    .batch-area .card h3 { margin:0; }
    @media (max-width:900px){ header{display:block;padding:18px 16px;} main{grid-template-columns:1fr;padding:16px;} .batch-area{padding:0 16px 16px;} .batch-grid{grid-template-columns:1fr;} .review-row{grid-template-columns:1fr;} }
  </style>
</head>
<body>
  <header><div><h1>墨锭试磨室</h1><div class="meta">墨锭建档、试磨记录、批次评审和评分统计</div></div><button id="reload">刷新</button></header>
  <main>
    <section>
      <form id="createForm"><h2>新增墨锭</h2><div id="fields"></div><label>初始状态</label><select name="status">${stages.map(s => '<option>'+s+'</option>').join('')}</select><button>保存墨锭</button></form>
      <form id="actionForm" style="margin-top:14px"><h2>创建试磨记录</h2><label>选择墨锭</label><select name="id" id="itemSelect"></select><div id="extraFields"></div><button>提交记录</button></form>
    </section>
    <section>
      <div class="stats" id="stats"></div>
      <div class="toolbar"><select id="statusFilter"><option value="">全部状态</option>${stages.map(s => '<option>'+s+'</option>').join('')}</select><input id="search" placeholder="搜索编号或关键词"></div>
      <div class="panel"><h2>选择墨锭后录入试磨记录，系统会保留多次试磨结果并更新评分状态。</h2><div class="grid" id="cards"></div></div>
    </section>
  </main>
  <section class="batch-area">
    <div class="panel">
      <h2>试磨批次</h2>
      <div class="batch-grid">
        <form id="batchForm">
          <h2>筛选选样</h2>
          <label>批次名称（选入新建批次时必填）</label><input name="name" placeholder="如：九月松烟复测">
          <label>筛选条件</label>
          <div class="toolbar">
            <input name="smokeSource" placeholder="烟料来源（包含匹配）">
            <input name="glueRatio" placeholder="胶料比例（精确，如 7.5%）">
            <input name="minAge" type="number" placeholder="年限 ≥">
            <input name="maxAge" type="number" placeholder="年限 ≤">
          </div>
          <button type="button" class="secondary" id="filterBtn">筛选墨锭</button>
          <div id="candidateList" style="margin:10px 0"></div>
          <label>选入到</label>
          <select id="targetBatch"><option value="">新建批次</option></select>
          <button style="margin-top:10px">保存选样</button>
        </form>
        <div>
          <h2>批次列表</h2>
          <div class="grid" id="batchList"></div>
        </div>
      </div>
    </div>
    <div class="panel">
      <h2>历史报告</h2>
      <div class="toolbar"><select id="reportSmoke"><option value="">全部烟料来源</option></select></div>
      <div class="grid" id="reportList"></div>
    </div>
  </section>
  <script>
    const fields = [["code","墨锭编号","text"],["smokeSource","烟料来源","text"],["glueRatio","胶料比例","text"],["ageYears","存放年限","number"],["storage","存放位置","text"]];
    const stages = ["待试磨","已试磨","重点观察"];
    const extraFields = [["paper","试磨纸张"],["water","加水量"],["speed","出墨速度"],["colorLayer","墨色层次"],["sediment","沉淀情况"],["score","评分"]];
    const createForm = document.querySelector('#createForm');
    const actionForm = document.querySelector('#actionForm');
    const cards = document.querySelector('#cards');
    const statsEl = document.querySelector('#stats');
    const itemSelect = document.querySelector('#itemSelect');
    const batchForm = document.querySelector('#batchForm');
    const candidateList = document.querySelector('#candidateList');
    const targetBatch = document.querySelector('#targetBatch');
    const batchList = document.querySelector('#batchList');
    const reportSmoke = document.querySelector('#reportSmoke');
    const reportList = document.querySelector('#reportList');
    let items = [];
    let batches = [];
    let candidates = [];
    let reports = [];
    async function api(path, options) {
      const res = await fetch(path, options && options.body ? { ...options, headers:{ 'Content-Type':'application/json' } } : options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '请求失败');
      return data;
    }
    function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }
    function renderForms() {
      document.querySelector('#fields').innerHTML = fields.map(([key,label,type]) => '<label>'+label+'</label><input name="'+key+'" type="'+type+'" '+(key==='code'?'required':'')+'>').join('');
      document.querySelector('#extraFields').innerHTML = extraFields.map(([key,label]) => '<label>'+label+'</label><input name="'+key+'">').join('');
    }
    function render() {
      itemSelect.innerHTML = items.map(item => '<option value="'+(item.id || item.code)+'">'+(item.code || item.id)+' · '+(item.name || item.shipType || item.source || item.plateSize || '')+'</option>').join('');
      const stats = Object.fromEntries(stages.map(s => [s, items.filter(i => i.status === s).length]));
      statsEl.innerHTML = Object.entries(stats).map(([k,v]) => '<div class="stat"><span>'+k+'</span><strong>'+v+'</strong></div>').join('');
      const status = document.querySelector('#statusFilter').value;
      const q = document.querySelector('#search').value.trim();
      const visible = items.filter(item => (!status || item.status === status) && (!q || JSON.stringify(item).includes(q)));
      cards.innerHTML = visible.map(item => cardHtml(item)).join('');
      document.querySelectorAll('[data-status]').forEach(sel => sel.onchange = async () => { await api('/api/items/'+sel.dataset.status, { method:'PATCH', body: JSON.stringify({ status: sel.value }) }); await load(); });
      document.querySelectorAll('[data-note]').forEach(btn => btn.onclick = async () => { const id = btn.dataset.note; const note = prompt('记录备注'); if (note) { await api('/api/items/'+id+'/logs', { method:'POST', body: JSON.stringify({ step:'备注', note }) }); await load(); } });
      renderSmokeOptions();
    }
    function cardHtml(item) {
      const main = fields.slice(0,4).map(([key,label]) => '<div><b>'+label+'</b> '+(item[key] ?? '')+'</div>').join('');
      const tasks = (item.tasks || []).map(t => '<div class="meta">任务 '+t.position+' · '+t.status+' · '+t.tension+'</div>').join('');
      const logs = (item.logs || []).slice(-4).map(l => '<div>'+l.step+'：'+l.note+'</div>').join('');
      return '<article class="card"><h3>'+(item.code || item.id)+'</h3><span class="pill">'+item.status+'</span>'+main+tasks+'<label>状态</label><select data-status="'+(item.id || item.code)+'">'+stages.map(s => '<option '+(s===item.status?'selected':'')+'>'+s+'</option>').join('')+'</select><button class="secondary" data-note="'+(item.id || item.code)+'">追加备注</button><div class="logs meta">'+(logs || '暂无记录')+'</div></article>';
    }
    async function load() { items = await api('/api/items'); render(); }

    // ===== 试磨批次 =====
    async function loadBatches() { batches = await api('/api/batches'); renderTargetBatches(); renderBatches(); }
    async function loadReports() {
      reports = await api('/api/reports' + (reportSmoke.value ? '?smokeSource=' + encodeURIComponent(reportSmoke.value) : ''));
      renderReports();
    }
    function renderSmokeOptions() {
      const current = reportSmoke.value;
      const sources = [...new Set(items.map(i => i.smokeSource).filter(Boolean))];
      reportSmoke.innerHTML = '<option value="">全部烟料来源</option>' + sources.map(s => '<option>'+esc(s)+'</option>').join('');
      reportSmoke.value = current;
    }
    function renderTargetBatches() {
      const current = targetBatch.value;
      const open = batches.filter(b => b.status !== '已归档');
      targetBatch.innerHTML = '<option value="">新建批次</option>' + open.map(b => '<option value="'+b.id+'">'+esc(b.name)+'</option>').join('');
      targetBatch.value = current;
    }
    function renderCandidates() {
      candidateList.innerHTML = candidates.length ? candidates.map(c => {
        const busy = c.busyBatch ? ' <span class="warn">已在未归档批次「'+esc(c.busyBatch)+'」</span>' : '';
        return '<div class="cand"><input type="checkbox" data-cand="'+esc(c.key)+'" '+(c.busyBatch?'disabled':'')+'><div><b>'+esc(c.code)+'</b> '+esc(c.smokeSource)+' · '+esc(c.glueRatio)+' · '+esc(c.ageYears)+'年'+busy+'</div><input type="date" data-date="'+esc(c.key)+'"><input data-owner="'+esc(c.key)+'" placeholder="责任人"></div>';
      }).join('') : '<div class="meta">没有符合条件的墨锭</div>';
    }
    function renderBatches() {
      batchList.innerHTML = batches.length ? batches.map(batchCard).join('') : '<div class="meta">还没有批次，先按烟料、胶比和年限筛选墨锭。</div>';
      batches.forEach(b => {
        if (!b.report) return;
        b.report.entries.forEach(e => {
          const pick = document.querySelector('[data-pick="'+b.id+'|'+e.itemId+'"]');
          if (pick && e.testIndex !== null && e.testIndex !== undefined) pick.value = String(e.testIndex);
        });
      });
      document.querySelectorAll('[data-remove]').forEach(btn => btn.onclick = async () => {
        const [batchId, itemId] = btn.dataset.remove.split('|');
        try { await api('/api/batches/'+batchId+'/selections/'+encodeURIComponent(itemId), { method:'DELETE' }); await loadBatches(); }
        catch (e) { alert(e.message); }
      });
      document.querySelectorAll('[data-save-report]').forEach(btn => btn.onclick = async () => {
        const b = batches.find(x => x.id === btn.dataset.saveReport);
        const entries = b.selections.map(sel => ({
          itemId: sel.itemId,
          testIndex: document.querySelector('[data-pick="'+b.id+'|'+sel.itemId+'"]').value,
          reason: document.querySelector('[data-reason="'+b.id+'|'+sel.itemId+'"]').value.trim()
        }));
        try { await api('/api/batches/'+b.id+'/report', { method:'POST', body: JSON.stringify({ entries }) }); await loadBatches(); }
        catch (e) { alert(e.message); }
      });
      document.querySelectorAll('[data-archive]').forEach(btn => btn.onclick = async () => {
        if (!confirm('归档后批次内容不能再改动，确认归档？')) return;
        try { await api('/api/batches/'+btn.dataset.archive+'/archive', { method:'POST' }); await loadBatches(); await loadReports(); }
        catch (e) { alert(e.message); }
      });
    }
    function batchCard(b) {
      const open = b.status !== '已归档';
      const rows = b.selections.map(sel => {
        const head = '<b>'+esc(sel.code)+'</b> '+esc(sel.smokeSource)+' · '+esc(sel.glueRatio)+' · '+esc(sel.ageYears)+'年 · 计划 '+esc(sel.planDate)+' · '+esc(sel.owner)
          + (open ? ' <button class="secondary" data-remove="'+b.id+'|'+esc(sel.itemId)+'">移出</button>' : '');
        if (!open) return '<div class="sel-row">'+head+'</div>';
        const existing = (b.report && b.report.entries.find(e => e.itemId === sel.itemId)) || {};
        const opts = sel.results.map(r => '<option value="'+r.index+'">#'+(r.index+1)+' '+(r.at||'').slice(0,10)+' '+esc(r.paper||'记录')+' '+r.score+'分</option>').join('');
        return '<div class="sel-row">'+head+'</div><div class="review-row"><select data-pick="'+b.id+'|'+esc(sel.itemId)+'"><option value="">— 无合格结果 —</option>'+opts+'</select>'
          + '<input data-reason="'+b.id+'|'+esc(sel.itemId)+'" placeholder="缺记录或评分低于80时填写原因" value="'+esc(existing.reason||'')+'"></div>';
      }).join('');
      const report = b.report ? '<div class="logs meta">'+b.report.entries.map(e => '<div>'+esc(e.code)+'：'+(e.score !== null ? '评分 '+e.score+(e.paper ? ' · '+esc(e.paper) : '') : '无合格结果')+(e.reason ? ' · 原因：'+esc(e.reason) : '')+'</div>').join('')+'</div>' : '';
      const actions = open
        ? '<div class="toolbar" style="margin:4px 0 0"><button data-save-report="'+b.id+'">保存评审报告</button><button class="secondary" data-archive="'+b.id+'">归档批次</button></div>'
        : '<div class="meta">归档于 '+(b.archivedAt||'').slice(0,10)+'，内容已锁定</div>';
      return '<article class="card"><h3>'+esc(b.name)+'</h3><span class="pill">'+b.status+'</span><div class="meta">创建于 '+(b.createdAt||'').slice(0,10)+' · '+b.selections.length+' 块墨锭</div>'+rows+actions+report+'</article>';
    }
    function renderReports() {
      reportList.innerHTML = reports.length ? reports.map(b =>
        '<article class="card"><h3>'+esc(b.name)+'</h3><span class="pill">已归档</span><div class="meta">归档于 '+(b.archivedAt||'').slice(0,10)+'</div>'
        + b.report.entries.map(e => '<div><b>'+esc(e.code)+'</b> '+esc(e.smokeSource)+'：'+(e.score !== null ? '评分 '+e.score : '无合格结果')+(e.reason ? ' · 原因：'+esc(e.reason) : '')+'</div>').join('')+'</article>'
      ).join('') : '<div class="meta">暂无归档报告</div>';
    }
    document.querySelector('#filterBtn').onclick = async () => {
      const fd = new FormData(batchForm);
      const params = new URLSearchParams();
      for (const key of ['smokeSource','glueRatio','minAge','maxAge']) {
        const value = String(fd.get(key) || '').trim();
        if (value) params.set(key, value);
      }
      candidates = await api('/api/batch-candidates?' + params.toString());
      renderCandidates();
    };
    batchForm.onsubmit = async event => {
      event.preventDefault();
      const fd = new FormData(batchForm);
      const selections = [...document.querySelectorAll('[data-cand]:checked')].map(box => ({
        itemId: box.dataset.cand,
        planDate: document.querySelector('[data-date="'+CSS.escape(box.dataset.cand)+'"]').value,
        owner: document.querySelector('[data-owner="'+CSS.escape(box.dataset.cand)+'"]').value.trim()
      }));
      try {
        if (targetBatch.value) {
          await api('/api/batches/'+targetBatch.value+'/selections', { method:'POST', body: JSON.stringify({ selections }) });
        } else {
          await api('/api/batches', { method:'POST', body: JSON.stringify({ name: String(fd.get('name') || '').trim(), selections }) });
        }
        batchForm.reset(); candidates = []; renderCandidates();
        await loadBatches();
      } catch (e) { alert(e.message); }
    };
    reportSmoke.onchange = loadReports;

    createForm.onsubmit = async event => { event.preventDefault(); await api('/api/items', { method:'POST', body: JSON.stringify(Object.fromEntries(new FormData(createForm).entries())) }); createForm.reset(); await load(); };
    actionForm.onsubmit = async event => { event.preventDefault(); await api('/api/items/'+itemSelect.value+'/action', { method:'POST', body: JSON.stringify(Object.fromEntries(new FormData(actionForm).entries())) }); actionForm.reset(); await load(); };
    document.querySelector('#statusFilter').onchange = render; document.querySelector('#search').oninput = render;
    document.querySelector('#reload').onclick = () => { load(); loadBatches(); loadReports(); };
    renderForms(); load(); loadBatches(); loadReports();
  </script>
</body>
</html>`;
}
