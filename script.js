
// storage keys
const STORAGE_KEY = "bloodtrack_records_v4";
const DRAFT_PREFIX = "draft_";
const DATA_PREFIX = "data_";

// field ids mapping
const fields = [
  "morning_temp","morning_libre","morning_unit","morning_after",
  "noon_before","noon_libre","noon_unit","noon_after",
  "evening_before","evening_libre","evening_unit","evening_after",
  "before_sleep","lantus","bp_high","bp_low","note","lumjev_remain","lantus_remain"
];

const dateInput = document.getElementById('date');
const toast = document.getElementById('toast');

function todayISO(){ const d=new Date(); return d.toISOString().slice(0,10); }
function showToast(msg='保存しました！'){ toast.textContent = msg; toast.style.opacity = '1'; setTimeout(()=> toast.style.opacity='0', 3000); }

function clearForm(){ fields.forEach(id=> document.getElementById(id).value = ''); }

function loadRecordForDate(date){
  if(!date) return null;
  const data = localStorage.getItem(DATA_PREFIX + date);
  if(data) return JSON.parse(data);
  const draft = localStorage.getItem(DRAFT_PREFIX + date);
  if(draft) return JSON.parse(draft);
  return null;
}

function fillForm(obj){
  if(!obj){ clearForm(); return; }
  fields.forEach(id => { document.getElementById(id).value = obj[id] ?? ''; });
}

function saveDraft(date){
  if(!date){ alert('日付を選択してください'); return; }
  const rec = {};
  fields.forEach(id => rec[id] = document.getElementById(id).value);
  localStorage.setItem(DRAFT_PREFIX + date, JSON.stringify(rec));
  showToast('下書きを保存しました');
  renderList();
}

function saveFinal(date){
  if(!date){ alert('日付を選択してください'); return; }
  const rec = {};
  fields.forEach(id => rec[id] = document.getElementById(id).value);
  localStorage.setItem(DATA_PREFIX + date, JSON.stringify(rec));
  localStorage.removeItem(DRAFT_PREFIX + date);
  showToast('保存しました');
  renderList();
  renderReportIfNeeded();
}

function getAllDates(){
  const keys = Object.keys(localStorage);
  const dates = [];
  keys.forEach(k=>{ if(k.startsWith(DATA_PREFIX)){ dates.push(k.slice(DATA_PREFIX.length)); } });
  return dates.sort().reverse();
}

function renderList(){
  const tbody = document.querySelector('#dataTable tbody');
  tbody.innerHTML = '';
  const dates = getAllDates();
  dates.forEach(d=>{
    const r = JSON.parse(localStorage.getItem(DATA_PREFIX + d));
    const tr = document.createElement('tr');
    const morning = r?.morning_libre ? `${r.morning_libre}` : '';
    const noon = r?.noon_libre ? `${r.noon_libre}` : '';
    const eve = r?.evening_libre ? `${r.evening_libre}` : '';
    const bp = (r?.bp_high || '') + (r?.bp_low ? '/' + r.bp_low : '');
    const remain = `L:${r?.lumjev_remain||''} R:${r?.lantus_remain||''}`;
    tr.innerHTML = `<td>${d}</td><td>${morning}</td><td>${noon}</td><td>${eve}</td><td>${r?.before_sleep||''}</td><td>${bp}</td><td>${remain}</td><td>${r?.note||''}</td>
      <td><button class="edit" data-date="${d}">編集</button> <button class="del" data-date="${d}">削除</button></td>`;
    tbody.appendChild(tr);
  });
  // attach events
  document.querySelectorAll('.edit').forEach(b=> b.addEventListener('click', e=>{
    const d = e.currentTarget.dataset.date;
    const obj = loadRecordForDate(d);
    fillForm(obj);
    dateInput.value = d;
    window.scrollTo({top:0, behavior:'smooth'});
  }));
  document.querySelectorAll('.del').forEach(b=> b.addEventListener('click', e=>{
    const d = e.currentTarget.dataset.date;
    if(confirm(d + ' を削除しますか？')){
      localStorage.removeItem(DATA_PREFIX + d);
      renderList();
      renderReportIfNeeded();
    }
  }));
  document.getElementById('counts').textContent = `総件数： ${dates.length}`;
}

function exportCsv(){
  const dates = getAllDates().slice().reverse();
  if(!dates.length) return alert('データがありません');
  const header = [
    'date', ...fields
  ];
  const rows = dates.map(d => {
    const r = JSON.parse(localStorage.getItem(DATA_PREFIX + d));
    return [d, ...fields.map(f=> r?.[f] ?? '')];
  });
  const csv = [header.join(',')].concat(rows.map(r=> r.map(c=> '"' + String(c).replace(/"/g,'""') + '"').join(','))).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `bloodtrack_export.csv`; a.click(); URL.revokeObjectURL(url);
}

function clearAll(){
  if(!confirm('全データを削除しますか？')) return;
  const keys = Object.keys(localStorage);
  keys.forEach(k=> { if(k.startsWith(DATA_PREFIX) || k.startsWith(DRAFT_PREFIX)) localStorage.removeItem(k); });
  renderList();
  renderReportIfNeeded();
}

// Report & Chart
let myChart = null;
function computeMonthReport(monthStr){
  if(!monthStr) return {count:0};
  // collect dates in this month
  const keys = Object.keys(localStorage).filter(k=> k.startsWith(DATA_PREFIX));
  const recs = keys.map(k=> ({date: k.slice(DATA_PREFIX.length), data: JSON.parse(localStorage.getItem(k))}))
                 .filter(r=> r.date.startsWith(monthStr)).sort((a,b)=> a.date < b.date ? 1 : -1).slice().reverse();
  if(!recs.length) return {count:0};
  const labels = [], values = [];
  recs.forEach(r=>{
    const pick = r.data.morning_libre ?? r.data.noon_libre ?? r.data.evening_libre ?? r.data.before_sleep ?? null;
    labels.push(r.date);
    values.push(pick);
  });
  const nums = values.filter(v=> v!==null && v!==undefined).map(Number).filter(n=> !isNaN(n));
  if(!nums.length) return {count:0};
  const sum = nums.reduce((a,b)=>a+b,0), avg = sum/nums.length;
  return {count: nums.length, avg: Number(avg.toFixed(2)), max: Math.max(...nums), min: Math.min(...nums), labels, values};
}

function renderReport(){
  const month = document.getElementById('reportMonth').value;
  const out = document.getElementById('reportSummary');
  out.innerHTML = '';
  if(!month) return;
  const rpt = computeMonthReport(month);
  if(rpt.count === 0){ out.textContent = 'データがありません'; if(myChart){ myChart.destroy(); myChart = null; } return; }
  out.innerHTML = `<p>件数: ${rpt.count} 平均: ${rpt.avg} 最大: ${rpt.max} 最小: ${rpt.min}</p>`;
  const ctx = document.getElementById('chart').getContext('2d');
  if(myChart) myChart.destroy();
  myChart = new Chart(ctx, {type:'line', data: { labels: rpt.labels, datasets: [{ label: '代表的なLibre値', data: rpt.values, fill:false, tension:0.2 }] }, options: { responsive:true, maintainAspectRatio:false }});
}

function renderPrintTable(monthStr){
  const container = document.getElementById('printContainer');
  container.innerHTML = '';
  if(!monthStr) { container.textContent = '月を選択してください'; return; }
  const keys = Object.keys(localStorage).filter(k=> k.startsWith(DATA_PREFIX));
  const recs = keys.map(k=> ({date: k.slice(DATA_PREFIX.length), data: JSON.parse(localStorage.getItem(k))}))
                 .filter(r=> r.date.startsWith(monthStr))
                 .sort((a,b)=> a.date < b.date ? 1 : -1).slice().reverse();
  const [y,m] = monthStr.split('-');
  const title = document.createElement('h3'); title.style.textAlign='center'; title.textContent = `${y}年${m}月 血糖値記録表`;
  container.appendChild(title);
  const table = document.createElement('table'); table.className='print-table';
  const cols = ['日付','朝 体温','朝 Libre','朝 単位','朝 食後','昼 前','昼 Libre','昼 単位','昼 食後','夜 前','夜 Libre','夜 単位','夜 食後','就寝前','ランタス','血圧上','血圧下','備考','ルムジェブ残','ランタス残'];
  const thead = document.createElement('thead'); const trh = document.createElement('tr'); cols.forEach(c=>{ const th=document.createElement('th'); th.textContent=c; trh.appendChild(th); }); thead.appendChild(trh); table.appendChild(thead);
  const tbody = document.createElement('tbody');
  const daysInMonth = new Date(Number(y), Number(m), 0).getDate();
  for(let d=1; d<=daysInMonth; d++){
    const dayStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const rec = recs.find(r=> r.date === dayStr)?.data;
    const tr = document.createElement('tr');
    const cells = [
      dayStr,
      rec?.morning_temp ?? '', rec?.morning_libre ?? '', rec?.morning_unit ?? '', rec?.morning_after ?? '',
      rec?.noon_before ?? '', rec?.noon_libre ?? '', rec?.noon_unit ?? '', rec?.noon_after ?? '',
      rec?.evening_before ?? '', rec?.evening_libre ?? '', rec?.evening_unit ?? '', rec?.evening_after ?? '',
      rec?.before_sleep ?? '', rec?.lantus ?? '', rec?.bp_high ?? '', rec?.bp_low ?? '',
      rec?.note ?? '', rec?.lumjev_remain ?? '', rec?.lantus_remain ?? ''
    ];
    cells.forEach(c=>{ const td = document.createElement('td'); td.textContent = c; if(String(c).length>10) td.classList.add('note-cell'); tr.appendChild(td); });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody); container.appendChild(table);
}

async function downloadPdfForMonth(monthStr){
  if(!monthStr) return alert('月を選択してください');
  const container = document.getElementById('printContainer');
  if(!container.innerHTML.trim()) return alert('まず「表を表示」してください');
  const el = container;
  el.style.background = '#fff';
  const canvas = await html2canvas(el, {scale:2, useCORS:true, scrollY:-window.scrollY});
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
  const imgData = canvas.toDataURL('image/png');
  const pageWidth = 297, pageHeight = 210;
  const imgRatio = canvas.width / canvas.height;
  let renderWidth = pageWidth - 16;
  let renderHeight = renderWidth / imgRatio;
  if(renderHeight > (pageHeight - 20)){ renderHeight = pageHeight - 20; renderWidth = renderHeight * imgRatio; }
  pdf.addImage(imgData, 'PNG', 8, 8, renderWidth, renderHeight);
  const filename = `血糖値記録_${monthStr}.pdf`;
  pdf.save(filename);
  el.style.background = '';
}

// init
document.addEventListener('DOMContentLoaded', ()=>{
  // init date default to 2026-01-01 if earlier
  const defaultDate = '2026-01-01';
  const d = new Date(); dateInput.value = (d < new Date(defaultDate) ? defaultDate : d.toISOString().slice(0,10));
  // events
  dateInput.addEventListener('change', ()=>{
    const date = dateInput.value;
    if(!date) return;
    const data = loadRecordForDate(date);
    if(data) fillForm(data); else clearForm();
  });
  document.getElementById('draftSave').addEventListener('click', ()=> saveDraft(dateInput.value));
  document.getElementById('save').addEventListener('click', ()=> saveFinal(dateInput.value));
  document.getElementById('exportCsv').addEventListener('click', exportCsv);
  document.getElementById('clearAll').addEventListener('click', clearAll);
  document.getElementById('reportMonth').addEventListener('change', renderReport);
  document.getElementById('renderTable').addEventListener('click', ()=> renderPrintTable(document.getElementById('printMonth').value));
  document.getElementById('downloadPdf').addEventListener('click', ()=> downloadPdfForMonth(document.getElementById('printMonth').value));
  renderList();
});
