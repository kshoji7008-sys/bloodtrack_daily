// script.js - main app logic
const STORAGE_KEY = "bloodtrack_daily_records_v1";
const DRAFT_KEY = "bloodtrack_daily_draft_v1";

function todayISO(){ const d = new Date(); return d.toISOString().slice(0,10); }

function loadRecords(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }catch(e){ return []; } }
function saveRecords(r){ localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); }

function loadDraft(){ try{ return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); }catch(e){ return null; } }
function saveDraft(d){ localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }

function readForm(){ const get = id=> document.getElementById(id).value;
  return {
    date: get('date'),
    morning: {
      temp: emptyToNull(get('morning_temp')),
      libre: emptyToNull(get('morning_libre')),
      unit: emptyToNull(get('morning_unit')),
      after: emptyToNull(get('morning_after'))
    },
    noon: {
      before: emptyToNull(get('noon_before')),
      libre: emptyToNull(get('noon_libre')),
      unit: emptyToNull(get('noon_unit')),
      after: emptyToNull(get('noon_after'))
    },
    evening: {
      before: emptyToNull(get('evening_before')),
      libre: emptyToNull(get('evening_libre')),
      unit: emptyToNull(get('evening_unit')),
      after: emptyToNull(get('evening_after'))
    },
    beforeSleep: emptyToNull(get('before_sleep')),
    lantus: emptyToNull(get('lantus')),
    bp: { high: emptyToNull(get('bp_high')), low: emptyToNull(get('bp_low')) },
    note: get('note') || "",
    lumjev_remain: emptyToNull(get('lumjev_remain')),
    lantus_remain: emptyToNull(get('lantus_remain'))
  };
}

function emptyToNull(v){ if(v===null || v==="") return null; const n = Number(v); return isNaN(n)? v : n; }

function fillForm(obj){
  if(!obj) return;
  document.getElementById('date').value = obj.date || todayISO();
  const set = (id, val)=> { if(val===null||val===undefined) document.getElementById(id).value = ''; else document.getElementById(id).value = val; };
  if(obj.morning){ set('morning_temp', obj.morning.temp); set('morning_libre', obj.morning.libre); set('morning_unit', obj.morning.unit); set('morning_after', obj.morning.after); }
  if(obj.noon){ set('noon_before', obj.noon.before); set('noon_libre', obj.noon.libre); set('noon_unit', obj.noon.unit); set('noon_after', obj.noon.after); }
  if(obj.evening){ set('evening_before', obj.evening.before); set('evening_libre', obj.evening.libre); set('evening_unit', obj.evening.unit); set('evening_after', obj.evening.after); }
  set('before_sleep', obj.beforeSleep);
  set('lantus', obj.lantus);
  if(obj.bp){ set('bp_high', obj.bp.high); set('bp_low', obj.bp.low); }
  set('note', obj.note);
  set('lumjev_remain', obj.lumjev_remain);
  set('lantus_remain', obj.lantus_remain);
}

function renderTable(){
  const tbody = document.querySelector("#dataTable tbody");
  const records = loadRecords().sort((a,b)=> a.date < b.date ? 1 : -1);
  tbody.innerHTML = "";
  for(const rec of records){
    const tr = document.createElement('tr');
    const morning = formatSlot(rec.morning);
    const noon = formatSlot(rec.noon);
    const evening = formatSlot(rec.evening);
    const bp = rec.bp ? (rec.bp.high||'') + '/' + (rec.bp.low||'') : '';
    const remain = `L:${rec.lumjev_remain||''} / R:${rec.lantus_remain||''}`;
    tr.innerHTML = `<td>${rec.date}</td><td>${morning}</td><td>${noon}</td><td>${evening}</td><td>${rec.beforeSleep||''}</td><td>${bp}</td><td>${remain}</td><td>${rec.note||''}</td>
      <td><button class="edit" data-date="${rec.date}">編集</button> <button class="del" data-date="${rec.date}">削除</button></td>`;
    tbody.appendChild(tr);
  }
  document.querySelectorAll('.edit').forEach(b=> b.addEventListener('click', e=>{
    const d = e.currentTarget.dataset.date; editRecord(d);
  }));
  document.querySelectorAll('.del').forEach(b=> b.addEventListener('click', e=>{
    const d = e.currentTarget.dataset.date; if(confirm(d + " を削除しますか？")){ deleteRecord(d); }
  }));
  document.getElementById('counts').textContent = `総件数： ${records.length}`;
}

function formatSlot(slot){
  if(!slot) return '';
  const parts = [];
  if(slot.temp!==undefined && slot.temp!==null) parts.push(slot.temp);
  if(slot.libre!==undefined && slot.libre!==null) parts.push(slot.libre);
  if(slot.unit!==undefined && slot.unit!==null) parts.push('U:'+slot.unit);
  if(slot.after!==undefined && slot.after!==null) parts.push('⇒'+slot.after);
  return parts.join(' / ');
}

function saveButtonHandler(){
  const data = readForm();
  if(!data.date) return alert('日付を入力してください');
  const records = loadRecords();
  const existing = records.find(r=> r.date === data.date);
  if(existing){
    if(!confirm(data.date + " のデータは既にあります。上書きしますか？")) return;
    const idx = records.findIndex(r=> r.date === data.date);
    records[idx] = data;
  }else{
    records.push(data);
  }
  saveRecords(records);
  // clear draft after successful save
  localStorage.removeItem(DRAFT_KEY);
  renderTable();
  alert('保存しました');
}

function saveDraftHandler(){
  const data = readForm();
  saveDraft(data);
  alert('下書きを保存しました（localStorage）');
}

function loadDraftHandler(){
  const d = loadDraft();
  if(!d) return alert('下書きは見つかりません');
  fillForm(d);
  alert('下書きを復元しました');
}

function editRecord(date){
  const records = loadRecords();
  const rec = records.find(r=> r.date === date);
  if(!rec) return alert('データがありません');
  fillForm(rec);
  // scroll to top
  window.scrollTo({top:0, behavior:'smooth'});
}

function deleteRecord(date){
  let records = loadRecords();
  records = records.filter(r=> r.date !== date);
  saveRecords(records);
  renderTable();
}

function exportCsv(){
  const records = loadRecords();
  if(!records.length) return alert('データがありません');
  const header = [
    "date",
    "morning_temp","morning_libre","morning_unit","morning_after",
    "noon_before","noon_libre","noon_unit","noon_after",
    "evening_before","evening_libre","evening_unit","evening_after",
    "before_sleep","lantus","bp_high","bp_low","note","lumjev_remain","lantus_remain"
  ];
  const rows = records.map(r => [
    r.date,
    r.morning?.temp ?? '', r.morning?.libre ?? '', r.morning?.unit ?? '', r.morning?.after ?? '',
    r.noon?.before ?? '', r.noon?.libre ?? '', r.noon?.unit ?? '', r.noon?.after ?? '',
    r.evening?.before ?? '', r.evening?.libre ?? '', r.evening?.unit ?? '', r.evening?.after ?? '',
    r.beforeSleep ?? '', r.lantus ?? '', r.bp?.high ?? '', r.bp?.low ?? '', (r.note||'') , r.lumjev_remain ?? '', r.lantus_remain ?? ''
  ]);
  const csv = [header.join(',')].concat(rows.map(r=> r.map(c=> '"' + String(c).replace(/"/g,'""') + '"').join(','))).join("\n");
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'bloodtrack_export.csv'; a.click();
  URL.revokeObjectURL(url);
}

function clearAll(){
  if(!confirm('全データを削除しますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DRAFT_KEY);
  renderTable();
  alert('全データを削除しました');
}

// Report functions - use 'libre' values (prefer morning/noon/evening libre and before_sleep) for chart
let myChart = null;
function computeMonthReport(monthStr){
  if(!monthStr) return {count:0};
  const recs = loadRecords().filter(r=> r.date && r.date.startsWith(monthStr));
  if(!recs.length) return {count:0};
  // gather libre readings in date order
  const labels = [];
  const values = [];
  recs.sort((a,b)=> a.date < b.date ? 1 : -1).slice().reverse().forEach(r=>{
    // prefer morning libre, else noon, else evening, else beforeSleep
    const pick = (r.morning?.libre ?? r.noon?.libre ?? r.evening?.libre ?? r.beforeSleep ?? null);
    labels.push(r.date);
    values.push(pick);
  });
  const nums = values.filter(v=> v!==null && v!==undefined).map(Number).filter(n=> !isNaN(n));
  if(!nums.length) return {count:0};
  const sum = nums.reduce((a,b)=> a+b, 0);
  const avg = sum / nums.length;
  return {count: nums.length, avg: Number(avg.toFixed(2)), max: Math.max(...nums), min: Math.min(...nums), labels, values};
}

function renderReport(){
  const month = document.getElementById('reportMonth').value;
  const out = document.getElementById('reportSummary');
  out.innerHTML = '';
  if(!month) return;
  const rpt = computeMonthReport(month);
  if(rpt.count === 0){ out.textContent = 'データがありません'; if(myChart) { myChart.destroy(); myChart = null; } return; }
  out.innerHTML = `<p>件数: ${rpt.count} 平均: ${rpt.avg} 最大: ${rpt.max} 最小: ${rpt.min}</p>`;
  const ctx = document.getElementById('chart').getContext('2d');
  if(myChart) myChart.destroy();
  myChart = new Chart(ctx, {type:'line', data: { labels: rpt.labels, datasets: [{ label: 'libre 値（代表）', data: rpt.values, fill:false, tension:0.2 }] }, options: { responsive:true, maintainAspectRatio:false }});
}

document.addEventListener('DOMContentLoaded', ()=>{
  // init date default to 2026-01-01 as user's start if today is before that, else today.
  const dateInput = document.getElementById('date');
  const initial = (()=>{ const d = new Date(); const defaultDate = '2026-01-01'; return (d < new Date(defaultDate) ? defaultDate : d.toISOString().slice(0,10)); })();
  dateInput.value = initial;
  document.getElementById('save').addEventListener('click', saveButtonHandler);
  document.getElementById('saveDraft').addEventListener('click', saveDraftHandler);
  document.getElementById('loadDraft').addEventListener('click', loadDraftHandler);
  document.getElementById('exportCsv').addEventListener('click', exportCsv);
  document.getElementById('clearAll').addEventListener('click', clearAll);
  document.getElementById('reportMonth').addEventListener('change', renderReport);

  renderTable();
});