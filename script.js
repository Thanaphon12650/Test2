/*
 * ค่าใช้จ่ายการเรียนของฉัน — Supabase + Anonymous Auth
 * ใส่ Project URL และ publishable/anon key ของโปรเจกต์ตัวเองด้านล่าง
 * ห้ามใส่ service_role/secret key ในโค้ดฝั่งหน้าเว็บเด็ดขาด
 */
var SUPABASE_URL = "ใส่_SUPABASE_PROJECT_URL_ที่นี่";
var SUPABASE_ANON_KEY = "ใส่_SUPABASE_PUBLISHABLE_OR_ANON_KEY_ที่นี่";

var expenses = [];
var currentUser = null;
var db = null;
var appReady = false;

function money(n) {
  return Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function esc(v) {
  return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function $(id) { return document.getElementById(id); }
function toast(msg) {
  var t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function () { t.classList.remove("show"); }, 2400);
}
function showPage(id) {
  document.querySelectorAll(".page").forEach(function (p) { p.style.display = "none"; });
  $(id).style.display = "block";
  document.querySelectorAll("nav button").forEach(function (b) {
    b.classList.toggle("on", b.getAttribute("data-page") === id);
  });
  window.scrollTo(0, 0);
}
function itemHTML(item, withDelete) {
  var sub = esc(item.date) + " · " + esc(item.category);
  if (item.note) sub += " · " + esc(item.note);
  return "<div class=\"expense-item\"><div><strong>" + esc(item.name) + "</strong><small>" + sub +
    "</small></div><div style=\"text-align:right\"><div class=\"amt\">" + money(item.amount) + " บาท</div>" +
    (withDelete ? "<button type=\"button\" class=\"del\" data-id=\"" + esc(item.id) + "\">ลบ</button>" : "") +
    "</div></div>";
}
function render() {
  var total = 0, cats = {}, now = new Date(), monthTotal = 0, months = {};
  expenses.forEach(function (it) {
    var a = Number(it.amount || 0), c = it.category || "อื่น ๆ";
    total += a;
    cats[c] = (cats[c] || 0) + a;
    var d = new Date(it.date + "T00:00:00");
    if (isNaN(d.getTime())) return;
    var key = d.getFullYear() + "-" + d.getMonth();
    months[key] = (months[key] || 0) + a;
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) monthTotal += a;
  });
  $("total").textContent = money(total);
  $("count").textContent = expenses.length;
  $("monthTotal").textContent = money(monthTotal);
  var entries = Object.keys(cats).map(function (k) { return [k, cats[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  $("categoryChart").innerHTML = entries.length === 0
    ? '<p class="empty">ยังไม่มีข้อมูล ไปที่แท็บ “บันทึก” เพื่อเพิ่มรายการแรก</p>'
    : entries.map(function (e) {
        var pct = total > 0 ? e[1] / total * 100 : 0;
        return '<div class="chart-item"><div class="chart-label"><span>' + esc(e[0]) + '</span><span>' +
          money(e[1]) + ' บาท (' + pct.toFixed(0) + '%)</span></div><div class="bar-bg"><div class="bar-fill" style="width:' +
          pct + '%"></div></div></div>';
      }).join("");
  var list = [], max = 0;
  for (var i = 5; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var v = months[d.getFullYear() + "-" + d.getMonth()] || 0;
    if (v > max) max = v;
    list.push({ label: d.toLocaleDateString("th-TH", { month: "short" }), v: v });
  }
  $("monthChart").innerHTML = list.map(function (m) {
    var h = max > 0 ? Math.round(m.v / max * 80) : 0;
    return '<div title="' + money(m.v) + ' บาท"><span>' + (m.v > 0 ? Math.round(m.v).toLocaleString("th-TH") : "") +
      '</span><i style="height:' + h + '%"></i><span>' + esc(m.label) + '</span></div>';
  }).join("");
  var recent = expenses.slice(-5).reverse();
  $("recent").innerHTML = recent.length === 0
    ? '<p class="empty">ยังไม่มีรายการค่าใช้จ่าย</p>'
    : recent.map(function (it) { return itemHTML(it, false); }).join("");
  renderHistory();
}
function renderHistory() {
  var kw = $("historySearch").value.trim().toLowerCase();
  var sel = $("historyCategory").value;
  var rows = expenses.filter(function (it) {
    var hit = String(it.name || "").toLowerCase().includes(kw) || String(it.category || "").toLowerCase().includes(kw) ||
      String(it.date || "").includes(kw) || String(it.note || "").toLowerCase().includes(kw);
    return hit && (sel === "all" || it.category === sel);
  }).slice().reverse();
  $("historyList").innerHTML = rows.length === 0
    ? '<p class="empty">ไม่พบรายการค่าใช้จ่าย</p>'
    : rows.map(function (it) { return itemHTML(it, true); }).join("");
}
function showDbError(prefix, error) {
  console.error(prefix, error);
  toast(prefix + (error && error.message ? ": " + error.message : " กรุณาลองใหม่"));
}
async function loadExpenses() {
  var result = await db.from("expenses")
    .select("id, date, name, category, amount, note, created_at")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: true });
  if (result.error) throw result.error;
  expenses = (result.data || []).map(function (row) {
    return { id: row.id, date: row.date, name: row.name, category: row.category,
      amount: Number(row.amount), note: row.note || "", created_at: row.created_at };
  });
  render();
}
async function initApp() {
  if (!window.supabase || !window.supabase.createClient) {
    toast("โหลดไลบรารี Supabase ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ต"); return;
  }
  if (SUPABASE_URL.indexOf("https://") !== 0 || SUPABASE_ANON_KEY.indexOf("ใส่_") === 0) {
    toast("กรุณาตั้งค่า Supabase URL และ publishable/anon key ใน script.js");
    console.error("Supabase config is not set. Edit SUPABASE_URL and SUPABASE_ANON_KEY in script.js.");
    return;
  }
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  try {
    var sessionResult = await db.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    var session = sessionResult.data.session;
    if (!session) {
      var signInResult = await db.auth.signInAnonymously();
      if (signInResult.error) throw signInResult.error;
      session = signInResult.data.session;
    }
    if (!session || !session.user) throw new Error("ไม่พบเซสชันผู้ใช้แบบไม่ระบุตัวตน");
    currentUser = session.user;
    await loadExpenses();
    appReady = true;
  } catch (error) {
    showDbError("เริ่มต้นระบบไม่สำเร็จ", error);
  }
}

$("historyList").addEventListener("click", async function (ev) {
  var btn = ev.target.closest(".del");
  if (!btn || !appReady) return;
  if (!confirm("ลบรายการนี้ใช่ไหม")) return;
  btn.disabled = true;
  var id = btn.getAttribute("data-id");
  var result = await db.from("expenses").delete().eq("id", id).eq("user_id", currentUser.id);
  if (result.error) {
    btn.disabled = false;
    showDbError("ลบรายการไม่สำเร็จ", result.error);
    return;
  }
  expenses = expenses.filter(function (it) { return String(it.id) !== id; });
  render();
  toast("ลบรายการแล้ว");
});

$("expenseForm").addEventListener("submit", async function (ev) {
  ev.preventDefault();
  if (!appReady) { toast("ระบบกำลังเชื่อมต่อ กรุณารอสักครู่แล้วลองใหม่"); return; }
  var date = $("date").value, name = $("name").value.trim();
  var amount = Number($("amount").value), category = $("category").value, note = $("note").value.trim();
  if (!date || !name || !Number.isFinite(amount) || amount <= 0) {
    toast("กรอกข้อมูลให้ครบและใส่จำนวนเงินให้ถูกต้อง"); return;
  }
  var saveButton = $("saveButton");
  saveButton.disabled = true;
  saveButton.textContent = "กำลังบันทึก...";
  var result = await db.from("expenses").insert({
    user_id: currentUser.id, date: date, name: name, category: category, amount: amount, note: note || null
  }).select("id, date, name, category, amount, note, created_at").single();
  saveButton.disabled = false;
  saveButton.textContent = "บันทึกรายจ่าย";
  if (result.error) { showDbError("บันทึกรายจ่ายไม่สำเร็จ", result.error); return; }
  var row = result.data;
  expenses.push({ id: row.id, date: row.date, name: row.name, category: row.category,
    amount: Number(row.amount), note: row.note || "", created_at: row.created_at });
  this.reset();
  $("date").value = localDateString();
  render();
  showPage("dashboard");
  toast("บันทึกรายจ่ายแล้ว");
});
function localDateString() {
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

$("historySearch").addEventListener("input", renderHistory);
$("historyCategory").addEventListener("change", renderHistory);
document.querySelectorAll("nav button").forEach(function (b) {
  b.addEventListener("click", function () { showPage(b.getAttribute("data-page")); });
});
$("date").value = localDateString();
showPage("dashboard");
initApp();
