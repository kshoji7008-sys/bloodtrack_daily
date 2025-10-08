// script_print.js - handles print table generation and PDF output
// reuses STORAGE_KEY
const STORAGE_KEY = "bloodtrack_daily_records_v1";

function loadRecords(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }catch(e){ return []; } }

function renderPrintTable(monthStr){
  const container = document.getElementById('printContainer');
  container.innerHTML = '';
  if(!monthStr) { container.textContent = '月を選択してください'; return; }
  const recs = loadRecords().filter(r=> r.date && r.date.startsWith(monthStr)).sort((a,b)=> a.date < b.date ? 1 : -1).slice().reverse();
  // build header
  const headerTitle = document.createElement('div');
  const [y, m] = monthStr.split('-');
  headerTitle.innerHTML = `<h3 style="text-align:center">${y}年${m}月 血糖値記録表</h3>`;
  container.appendChild(headerTitle);

  // build table
  const table = document.createElement('table');
  table.className = 'print-table';
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.className = 'header-row';
  const cols = [
    '日付',
    '朝 体温','朝 Libre','朝 単位','朝 食後',
    '昼 前','昼 Libre','昼 単位','昼 食後',
    '夜 前','夜 Libre','夜 単位','夜 食後',
    '就寝前','ランタス','血圧上','血圧下','備考','ルムジェブ残','ランタス残'
  ];
  cols.forEach(c=>{ const th = document.createElement('th'); th.textContent = c; headerRow.appendChild(th); });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  // For each day in month, show row (even if empty) - get number of days
  const daysInMonth = new Date(Number(y), Number(m), 0).getDate();
  for(let day=1; day<=daysInMonth; day++){
    const dayStr = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const rec = recs.find(r=> r.date === dayStr);
    const tr = document.createElement('tr');
    const cells = [];
    cells.push(dayStr);
    // morning
    cells.push(rec?.morning?.temp ?? '');
    cells.push(rec?.morning?.libre ?? '');
    cells.push(rec?.morning?.unit ?? '');
    cells.push(rec?.morning?.after ?? '');
    // noon
    cells.push(rec?.noon?.before ?? '');
    cells.push(rec?.noon?.libre ?? '');
    cells.push(rec?.noon?.unit ?? '');
    cells.push(rec?.noon?.after ?? '');
    // evening
    cells.push(rec?.evening?.before ?? '');
    cells.push(rec?.evening?.libre ?? '');
    cells.push(rec?.evening?.unit ?? '');
    cells.push(rec?.evening?.after ?? '');
    // others
    cells.push(rec?.beforeSleep ?? '');
    cells.push(rec?.lantus ?? '');
    cells.push(rec?.bp?.high ?? '');
    cells.push(rec?.bp?.low ?? '');
    cells.push(rec?.note ?? '');
    cells.push(rec?.lumjev_remain ?? '');
    cells.push(rec?.lantus_remain ?? '');

    cells.forEach(c=>{ const td = document.createElement('td'); 
      if(typeof c === 'number') td.textContent = String(c); else td.textContent = c; 
      if(td.textContent.length > 10) td.classList.add('note-cell');
      tr.appendChild(td); });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
  // hint
  const hint = document.createElement('p');
  hint.style.marginTop = '8px';
  hint.textContent = '「PDFで出力」ボタンでA4横のPDFがダウンロードされます。';
  container.appendChild(hint);
}

async function downloadPdfForMonth(monthStr){
  if(!monthStr) return alert('月を選択してください');
  const container = document.getElementById('printContainer');
  if(!container.innerHTML.trim()) return alert('まず「表を表示」ボタンを押してください');

  // use html2canvas to capture printContainer and create PDF with jspdf
  const el = container;
  // increase scale for better quality
  const scale = 2;
  // temporarily set background white for canvas
  el.style.background = '#fff';

  const canvas = await html2canvas(el, {scale: scale, useCORS: true, scrollY: -window.scrollY});
  // compute PDF dimensions for A4 landscape in mm
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const imgData = canvas.toDataURL('image/png');
  const pageWidth = 297;
  const pageHeight = 210;
  const imgProps = { width: canvas.width, height: canvas.height };
  const imgRatio = imgProps.width / imgProps.height;
  let renderWidth = pageWidth - 16; // margins 8mm
  let renderHeight = renderWidth / imgRatio;
  if(renderHeight > (pageHeight - 20)) { renderHeight = pageHeight - 20; renderWidth = renderHeight * imgRatio; }

  pdf.addImage(imgData, 'PNG', 8, 8, renderWidth, renderHeight);
  const filename = `血糖値記録_${monthStr}.pdf`;
  pdf.save(filename);
  el.style.background = '';
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('renderTable').addEventListener('click', ()=>{
    const m = document.getElementById('printMonth').value;
    renderPrintTable(m);
  });
  document.getElementById('downloadPdf').addEventListener('click', ()=>{
    const m = document.getElementById('printMonth').value;
    downloadPdfForMonth(m);
  });
});