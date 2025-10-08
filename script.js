
const fields = [
  "temp","morning_libre","morning_unit","morning_after",
  "noon_before","noon_libre","noon_unit","noon_after",
  "eve_before","eve_libre","eve_unit","eve_after",
  "before_sleep","lantus","bp_high","bp_low",
  "memo","rum_left","lantus_left"
];

const dateInput = document.getElementById("date");
const toast = document.getElementById("toast");

function showToast() {
  toast.classList.remove("opacity-0");
  setTimeout(() => toast.classList.add("opacity-0"), 3000);
}

function clearForm() {
  fields.forEach(id => document.getElementById(id).value = "");
}

function loadData(date, draft=false) {
  const key = (draft ? "draft_" : "data_") + date;
  const data = localStorage.getItem(key);
  if (data) {
    const parsed = JSON.parse(data);
    fields.forEach(id => {
      document.getElementById(id).value = parsed[id] ?? "";
    });
  } else {
    clearForm();
  }
}

function saveData(date, draft=false) {
  if (!date) return alert("日付を選択してください");
  const key = (draft ? "draft_" : "data_") + date;
  const record = {};
  fields.forEach(id => record[id] = document.getElementById(id).value);
  localStorage.setItem(key, JSON.stringify(record));
  if (!draft) localStorage.removeItem("draft_" + date);
  showToast();
}

dateInput.addEventListener("change", () => {
  const date = dateInput.value;
  if (!date) return;
  const dataKey = "data_" + date;
  const draftKey = "draft_" + date;
  if (localStorage.getItem(dataKey)) {
    loadData(date);
  } else if (localStorage.getItem(draftKey)) {
    loadData(date, true);
  } else {
    clearForm();
  }
});

document.getElementById("draftSave").addEventListener("click", () => {
  saveData(dateInput.value, true);
});

document.getElementById("save").addEventListener("click", () => {
  saveData(dateInput.value, false);
});
