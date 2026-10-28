// Sentence Quest — frontend (1 trang, mobile-first).
// Du lieu cau hoi nap tu game-data.json (1489 cau that, khong sua noi dung).
const GROUPS = {1:"So sánh",2:"Liên từ",3:"Bị động",4:"Mệnh đề quan hệ",5:"Động từ & cấu trúc",6:"Tường thuật",7:"Điều kiện & ước",8:"It & chuyển đổi thì",9:"Đảo ngữ",10:"Suy luận khuyết thiếu",11:"Rút gọn mệnh đề",12:"Tổng hợp từ khóa"};
let DATA = [], byStage = {}, STAGES = [];
let token = localStorage.getItem("sq_token"), user = null, progress = null;
let P = null, Q = null, roomId = null, myRoomName = "", timerInt = null;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// ---------- API ----------
async function api(path, method, body) {
  const r = await fetch(path, { method: method || "GET",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || ("Lỗi " + r.status));
  return data;
}
async function saveProgress() {
  localStorage.setItem("sq_progress", JSON.stringify(progress));
  try { progress = await api("/api/progress", "PUT", progress); localStorage.removeItem("sq_pending"); }
  catch (e) { localStorage.setItem("sq_pending", "1"); } // mat mang: giu ban local, dong bo lai sau
}
window.addEventListener("online", () => { if (localStorage.getItem("sq_pending") && token) saveProgress(); });

// ---------- Cham diem ----------
function norm(s) {
  return String(s || "").toLowerCase()
    .replace(/n't/g, " not").replace(/'re/g, " are").replace(/'ve/g, " have")
    .replace(/'ll/g, " will").replace(/'m/g, " am").replace(/'d/g, " would")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function lev(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return d[m][n];
}
// typed = phan hoc sinh go (phan hoan thanh neu co mo dau, toan bo cau neu khong)
function grade(typed, item) {
  const full = item.op ? (item.op + " " + typed) : typed;
  const nf = norm(full);
  if (item.kw && !nf.includes(norm(item.kw))) return { level: "red", reason: "Thiếu từ khóa bắt buộc: " + item.kw };
  if (nf === norm(item.a) || (item.v || []).some((x) => norm(x) === nf)) return { level: "green" };
  const wordsA = norm(item.a).split(" "), wordsF = nf.split(" ");
  if (wordsA.length === wordsF.length && lev(nf, norm(item.a)) <= 2) return { level: "yellow" };
  return { level: "red" };
}
function instructionOf(item) {
  if (item.op) return "Hoàn thành câu bắt đầu bằng: “" + item.op + "”";
  return item.kw ? ("Viết lại câu, bắt buộc dùng từ: " + item.kw) : "Viết lại câu giữ nguyên nghĩa.";
}
function todayStr(d) { const t = d || new Date(); return t.toISOString().slice(0, 10); }
function addDays(str, n) { const d = new Date(str); d.setDate(d.getDate() + n); return todayStr(d); }

// ---------- Dang nhap ----------
function showAuthTab(which) {
  $("formLogin").classList.toggle("hidden", which !== "login");
  $("formRegister").classList.toggle("hidden", which !== "register");
  $("tabLogin").classList.toggle("active", which === "login");
  $("tabRegister").classList.toggle("active", which === "register");
}
async function doLogin(e) {
  e.preventDefault();
  try {
    const d = await api("/api/auth/login", "POST", { username: $("loginUser").value, password: $("loginPass").value });
    token = d.token; localStorage.setItem("sq_token", token); user = d.user; await afterLogin();
  } catch (err) { $("authMsg").textContent = err.message; }
}
async function doRegister(e) {
  e.preventDefault();
  try {
    const d = await api("/api/auth/register", "POST", { username: $("regUser").value, fullName: $("regName").value,
      className: $("regClass").value, password: $("regPass").value, teacherCode: $("regTeacherCode").value || undefined });
    token = d.token; localStorage.setItem("sq_token", token); user = d.user; await afterLogin();
  } catch (err) { $("authMsg").textContent = err.message; }
}
function logout() {
  token = null; user = null; progress = null; localStorage.removeItem("sq_token");
  $("screen-main").classList.add("hidden"); $("screen-auth").classList.remove("hidden");
}
async function afterLogin() {
  try { progress = await api("/api/progress"); }
  catch (e) { progress = JSON.parse(localStorage.getItem("sq_progress") || "null") || { stars: {}, xp: 0, coins: 0, errorBox: [], streak: 0, lastPlayDate: null, skippedGroups: [] }; }
  $("screen-auth").classList.add("hidden"); $("screen-main").classList.remove("hidden");
  $("userChip").classList.remove("hidden");
  $("userChip").textContent = user.fullName + (user.className ? " · " + user.className : "") + (user.role === "teacher" ? " · Giáo viên" : "");
  $("teacherTabBtn").style.display = user.role === "teacher" ? "" : "none";
  renderStats(); renderMap(); showTab("map");
}
function renderStats() {
  const stars = Object.values(progress.stars || {}).reduce((a, b) => a + b, 0);
  $("statStars").textContent = stars; $("statXp").textContent = progress.xp || 0;
  $("statCoins").textContent = progress.coins || 0; $("statStreak").textContent = progress.streak || 0;
  const due = (progress.errorBox || []).filter((x) => x.due <= todayStr()).length;
  $("dueBanner").innerHTML = due ? `<p class="feedback yellow"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg> Có ${due} câu đến hạn ôn — vào tab Ôn tập.</p>` : "";
}

// ---------- Ban do chang ----------
function starsOf(stageId) {
  const items = byStage[stageId] || [];
  const gr = items.length ? items[0].gr : 0;
  if ((progress.skippedGroups || []).includes(gr) && items.length && items[0].id.startsWith("MD")) return 1;
  return (progress.stars || {})[stageId] || 0;
}
function isUnlocked(stageId) {
  const i = STAGES.indexOf(stageId); if (i <= 0) return true;
  const prev = STAGES[i - 1];
  if (starsOf(prev) < 1) return false;
  const gPrev = (byStage[prev][0] || {}).gr, gCur = (byStage[stageId][0] || {}).gr;
  if (gPrev !== gCur) {
    const prevStages = STAGES.filter((s) => (byStage[s][0] || {}).gr === gPrev);
    const ratio = prevStages.filter((s) => starsOf(s) >= 1).length / prevStages.length;
    if (ratio < 0.6) return false;
  }
  return true;
}
function renderMap() {
  let html = "";
  for (const g of Object.keys(GROUPS).map(Number)) {
    const stages = STAGES.filter((s) => (byStage[s][0] || {}).gr === g);
    if (!stages.length) continue;
    const hasScaffold = stages.some((s) => (byStage[s][0] || {}).id.startsWith("MD"));
    const skipped = (progress.skippedGroups || []).includes(g);
    html += `<div class="group"><h3>Nhóm ${g} — ${GROUPS[g]} ${g === 12 ? '<span class="boss"><svg class="ic" viewBox="0 0 24 24" fill="#C6A14A" aria-hidden="true"><path d="M3 7l4 4 5-6 5 6 4-4-1.5 12h-15L3 7z"/></svg> Vùng Boss</span>' : ""}</h3>`;
    if (hasScaffold && !skipped) html += `<button onclick="startSkipTest(${g})"><svg class="ic" viewBox="0 0 24 24" fill="#E8A100" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg> Thi vượt nhóm ${g} (10 câu, đạt 8/10 thì bỏ qua chặng mở đường)</button>`;
    if (skipped) html += `<p class="muted"><svg class="ic" viewBox="0 0 24 24" fill="#2E7D32" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z"/></svg> Đã thi vượt nhóm này.</p>`;
    html += `<div class="stagegrid">`;
    for (const s of stages) {
      const st = starsOf(s), locked = !isUnlocked(s);
      html += `<button class="stagebtn ${locked ? "locked" : ""}" onclick="${locked ? "" : `startPlay('${s}')`}">
        <b>${s}</b><br><span class="stars">${"★".repeat(st)}${"☆".repeat(3 - st)}</span><br><small>${byStage[s].length} câu</small></button>`;
    }
    html += `</div></div>`;
  }
  $("tab-map").innerHTML = html;
}
function showTab(name) {
  for (const t of ["map", "review", "board", "room", "teacher"]) {
    $("tab-" + t).classList.toggle("hidden", t !== name);
    document.querySelectorAll(".tabbtn").forEach((b) => { if (b.textContent.includes({ map: "Chặng", review: "Ôn tập", board: "Bảng tuần", room: "Phòng", teacher: "Giáo viên" }[t])) b.classList.toggle("active", t === name); });
  }
  if (name === "review") renderReview();
  if (name === "board") renderBoard();
  if (name === "room") renderRoomTab();
  if (name === "teacher") renderTeacher();
}

// ---------- Vong choi ----------
function phaseOf(idx, n) {
  const p = idx / n;
  if (p < 0.25) return "tiles";
  if (p < 0.5) return "gap";
  if (p < 0.75) return "hint";
  if (idx < n - 1) return "free";
  return "timed";
}
function baseOf(item, isLast) { return isLast ? 50 : item.df * 10; }
function startPlay(stageId) {
  const items = byStage[stageId];
  P = { stage: stageId, items, idx: 0, hearts: 3, practice: false, score: 0, correct: 0,
    combo: 0, usedHint3: false, wrongIds: [], attempt: 1, hintLevel: 0, baseSum: 0 };
  P.baseSum = items.reduce((a, it, i) => a + baseOf(it, i === items.length - 1), 0);
  $("screen-main").classList.add("hidden"); $("screen-play").classList.remove("hidden");
  renderQuestion();
}
function quitPlay() {
  clearInterval(timerInt);
  if (P && P.wrongIds.length) { upsertErrorBox(P.wrongIds); saveProgress(); }
  P = null; $("screen-play").classList.add("hidden"); $("screen-main").classList.remove("hidden"); renderStats(); renderMap();
}
function upsertErrorBox(ids) {
  const box = progress.errorBox || [];
  for (const id of ids) {
    const ex = box.find((x) => x.id === id);
    if (ex) { ex.box = 1; ex.due = addDays(todayStr(), 1); }
    else box.push({ id, box: 1, due: addDays(todayStr(), 1) });
  }
  progress.errorBox = box;
}
function renderQuestion() {
  clearInterval(timerInt);
  const it = P.items[P.idx], n = P.items.length;
  P.attempt = 1; P.hintLevel = 0; P.placed = []; P.blankIdx = [];
  $("playTitle").textContent = P.stage + " — Câu " + (P.idx + 1) + "/" + n;
  $("playHearts").textContent = P.hearts; $("playScore").textContent = P.score;
  $("playBar").style.width = Math.round((P.idx / n) * 100) + "%";
  $("playOriginal").textContent = it.o;
  $("playInstruction").textContent = instructionOf(it);
  $("playFeedback").classList.add("hidden");
  $("btnCheck").classList.remove("hidden"); $("btnNext").classList.add("hidden");
  $("timer").classList.add("hidden");
  const target = it.op ? it.c : it.a;
  const phase = phaseOf(P.idx, n);
  const area = $("playArea");
  if (phase === "tiles") {
    const words = target.split(" ");
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    area.innerHTML = `<div class="answerline" id="answerLine"></div><div class="tilebank" id="tileBank"></div>
      <p class="muted">Chạm vào thẻ để đặt, chạm lại thẻ đã đặt để gỡ.</p>`;
    shuffled.forEach((w, i) => {
      const b = document.createElement("button");
      b.className = "tile"; b.textContent = w;
      b.onclick = () => { if (P.placed.includes(i)) return; P.placed.push(i); b.classList.add("used"); drawPlaced(); };
      $("tileBank").appendChild(b);
    });
    window.drawPlaced = () => {
      const line = $("answerLine"); line.innerHTML = "";
      P.placed.forEach((bi) => {
        const b = document.createElement("button");
        b.className = "tile"; b.textContent = shuffled[bi];
        b.onclick = () => { P.placed = P.placed.filter((x) => x !== bi); document.querySelectorAll("#tileBank .tile")[bi].classList.remove("used"); drawPlaced(); };
        line.appendChild(b);
      });
    };
    P.tileWords = shuffled;
  } else if (phase === "gap") {
    const words = target.split(" ");
    const cand = words.map((w, i) => ({ w, i })).filter((x) => x.w.replace(/[^a-z]/gi, "").length > 3)
      .sort((a, b) => b.w.length - a.w.length).slice(0, 2).map((x) => x.i);
    P.blankIdx = cand; P.gapWords = words;
    area.innerHTML = words.map((w, i) => cand.includes(i)
      ? `<input class="gapinput" data-gi="${i}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">`
      : esc(w)).join(" ");
    if (it.op) area.innerHTML = "<b>" + esc(it.op) + "</b> " + area.innerHTML;
  } else if (phase === "hint") {
    area.innerHTML = `<input id="typedInput" placeholder="Gõ phần hoàn thành..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
      <div class="row"><button onclick="useHint(1)">Gợi ý 1 (−20%)</button><button onclick="useHint(2)">Gợi ý 2 (−50%, mất combo)</button><button onclick="useHint(3)">Gợi ý 3 (tối đa 25%)</button></div>
      <p id="hintText" class="muted"></p>`;
    P.hintTarget = target;
  } else {
    area.innerHTML = `<input id="typedInput" placeholder="${it.op ? "Gõ phần hoàn thành..." : "Gõ toàn bộ câu..."}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">`;
    if (phase === "timed") {
      let left = 60;
      $("timer").classList.remove("hidden");
      $("timer").textContent = "⏱ " + left + " giây";
      timerInt = setInterval(() => {
        left--; $("timer").textContent = "⏱ " + left + " giây";
        if (left <= 0) { clearInterval(timerInt); autoFail(); }
      }, 1000);
    }
  }
  const first = area.querySelector("input");
  if (first) first.focus();
}
function useHint(level) {
  P.hintLevel = level;
  if (level === 3) P.usedHint3 = true;
  if (level === 2) P.combo = 0;
  const words = P.hintTarget.split(" ");
  const masked = words.map((w) => {
    if (level === 1) return w[0] + "…";
    if (level === 2) return w.slice(0, Math.ceil(w.length / 2)) + "…";
    return w.slice(0, -1) + "…";
  }).join(" ");
  $("hintText").textContent = "Gợi ý mức " + level + ": " + masked;
}
function getTyped() {
  const it = P.items[P.idx], phase = phaseOf(P.idx, P.items.length);
  if (phase === "tiles") return P.placed.map((i) => P.tileWords[i]).join(" ");
  if (phase === "gap") {
    const words = [...P.gapWords];
    document.querySelectorAll("[data-gi]").forEach((inp) => { words[+inp.dataset.gi] = inp.value.trim(); });
    return words.join(" ");
  }
  return ($("typedInput") ? $("typedInput").value.trim() : "");
}
function autoFail() {
  const it = P.items[P.idx];
  P.wrongIds.push(it.id); P.hearts--; P.combo = 0;
  showFeedback("red", "Hết giờ! Đáp án đúng: " + it.a + "<br>" + esc(it.e));
  if (P.hearts <= 0) P.practice = true;
}
function showFeedback(level, html) {
  const fb = $("playFeedback");
  fb.className = "feedback " + level; fb.innerHTML = html;
  fb.classList.remove("hidden");
  $("btnCheck").classList.add("hidden"); $("btnNext").classList.remove("hidden");
}
function submitAnswer() {
  clearInterval(timerInt);
  const it = P.items[P.idx];
  const typed = getTyped();
  const g = grade(typed, it);
  const base = baseOf(it, P.idx === P.items.length - 1);
  if (g.level === "yellow") {
    const fb = $("playFeedback");
    fb.className = "feedback yellow";
    fb.innerHTML = "Gần đúng rồi — kiểm tra lại chính tả rồi gõ lại (không mất lượt).";
    fb.classList.remove("hidden");
    return;
  }
  if (g.level === "green") {
    let factor = P.attempt === 1 ? 1 : 0.5;
    if (P.hintLevel === 1) factor *= 0.8;
    if (P.hintLevel === 2) factor *= 0.5;
    if (P.hintLevel === 3) factor = Math.min(factor, 0.25);
    let pts = Math.round(base * factor);
    P.combo++;
    if (P.combo >= 3) pts += 5;
    P.score += pts; P.correct++;
    showFeedback("green", `<svg class="ic" viewBox="0 0 24 24" fill="#2E7D32" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z"/></svg> Đúng! +${pts} điểm.<br>Đáp án: ${esc(it.a)}<br>${esc(it.e)}<br><button onclick="reportAnswer('${it.id}')">Báo đáp án khác</button>`);
    return;
  }
  if (P.attempt === 1) {
    P.attempt = 2;
    const fb = $("playFeedback");
    fb.className = "feedback red";
    fb.innerHTML = `<svg class="ic" viewBox="0 0 24 24" fill="#C62828" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5 13.6L13.6 12 17 8.6 15.4 7 12 10.4 8.6 7 7 8.6 10.4 12 7 15.4 8.6 17 12 13.6 15.4 17 17 15.4z"/></svg> ` + esc(g.reason || "Sai cấu trúc.") + " " + esc(it.e) + "<br>Gõ lại (được 50% điểm).";
    fb.classList.remove("hidden");
    return;
  }
  P.wrongIds.push(it.id); P.hearts--; P.combo = 0;
  if (P.hearts <= 0) P.practice = true;
  showFeedback("red", `<svg class="ic" viewBox="0 0 24 24" fill="#C62828" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5 13.6L13.6 12 17 8.6 15.4 7 12 10.4 8.6 7 7 8.6 10.4 12 7 15.4 8.6 17 12 13.6 15.4 17 17 15.4z"/></svg> Sai. Đáp án đúng: ${esc(it.a)}<br>${esc(it.e)}<br>Lỗi thường gặp: ${esc(it.m)}<br><button onclick="reportAnswer('${it.id}')">Báo đáp án khác</button>`);
}
function nextQuestion() {
  P.idx++;
  if (P.idx >= P.items.length) finishPlay(); else renderQuestion();
}
async function finishPlay() {
  clearInterval(timerInt);
  const n = P.items.length, ratio = P.correct / n, scoreRatio = Math.min(1, P.score / P.baseSum);
  let stars = 0;
  if (!P.practice) {
    if (ratio >= 0.95 && scoreRatio >= 0.9 && !P.usedHint3) stars = 3;
    else if (ratio >= 0.85 && scoreRatio >= 0.7) stars = 2;
    else if (ratio >= 0.7) stars = 1;
  }
  const prevStars = (progress.stars || {})[P.stage] || 0;
  progress.stars = { ...(progress.stars || {}), [P.stage]: Math.max(prevStars, stars) };
  progress.xp = (progress.xp || 0) + P.score;
  progress.coins = (progress.coins || 0) + P.correct * 2;
  const today = todayStr();
  if (progress.lastPlayDate !== today) {
    progress.streak = progress.lastPlayDate === addDays(today, -1) ? (progress.streak || 0) + 1 : 1;
    progress.lastPlayDate = today;
  }
  upsertErrorBox(P.wrongIds);
  await saveProgress();
  try { await api("/api/attempts", "POST", { stage: P.stage, correct: P.correct, total: n, score: P.score, errors: P.wrongIds }); } catch (e) {}
  $("playArea").innerHTML = `<h2>${P.practice ? "Chế độ Luyện" : "Hoàn thành " + P.stage + "!"} <svg class="ic" viewBox="0 0 24 24" fill="#C6A14A" aria-hidden="true"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></h2>
    <p>Đúng ${P.correct}/${n} câu · ${P.score} điểm · ${"★".repeat(stars)}${"☆".repeat(3 - stars)}</p>
    ${P.practice ? "<p class=\"muted\">Hết tim nên chặng này không tính sao — cứ luyện tiếp, không bị kẹt.</p>" : ""}
    <p class="muted">${P.wrongIds.length ? P.wrongIds.length + " câu sai đã vào Hộp câu sai, ôn lại ngày mai." : "Không câu nào sai. Tuyệt vời!"}</p>`;
  $("playOriginal").textContent = ""; $("playInstruction").textContent = "";
  $("playFeedback").classList.add("hidden");
  $("btnCheck").classList.add("hidden"); $("btnNext").classList.add("hidden");
  $("playTitle").textContent = "Kết quả " + P.stage;
  const back = document.createElement("button");
  back.className = "primary"; back.textContent = "Về bản đồ chặng";
  back.onclick = () => { $("screen-play").classList.add("hidden"); $("screen-main").classList.remove("hidden"); renderStats(); renderMap(); };
  $("playArea").appendChild(back);
  P = null;
}
async function reportAnswer(sentenceId) {
  const note = prompt("Em nghĩ đáp án khác là gì? (để trống nếu chỉ báo đáp án chưa chuẩn)");
  if (note === null) return;
  try { await api("/api/reports", "POST", { sentenceId, note }); alert("Đã gửi báo cáo cho giáo viên."); }
  catch (e) { alert("Không gửi được: " + e.message); }
}

// ---------- Quiz don: thi vuot + on tap (dung chung 1 luong, khong ghi de nut) ----------
function startQuiz(items, title, onDone, record) {
  Q = { items, idx: 0, correct: 0, onDone, record: record || null };
  $("screen-main").classList.add("hidden"); $("screen-quiz").classList.remove("hidden");
  $("quizTitle").textContent = title;
  renderQuizQ();
}
function renderQuizQ() {
  const it = Q.items[Q.idx];
  $("quizOriginal").textContent = it.o;
  $("quizInstruction").textContent = instructionOf(it);
  $("quizInput").value = "";
  $("quizFeedback").classList.add("hidden");
  $("quizCheck").classList.remove("hidden"); $("quizNext").classList.add("hidden");
  $("quizInput").focus();
}
function submitQuiz() {
  const it = Q.items[Q.idx];
  const g = grade($("quizInput").value.trim(), it);
  const fb = $("quizFeedback");
  if (g.level === "yellow") { fb.className = "feedback yellow"; fb.innerHTML = "Gần đúng — kiểm tra chính tả rồi gõ lại."; fb.classList.remove("hidden"); return; }
  if (g.level === "green") { Q.correct++; if (Q.record) Q.record.correct.push(it.id); fb.className = "feedback green"; }
  else { if (Q.record) Q.record.wrong.push(it.id); fb.className = "feedback red"; }
  fb.innerHTML = (g.level === "green" ? `<svg class="ic" viewBox="0 0 24 24" fill="#2E7D32" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z"/></svg> Đúng!` : `<svg class="ic" viewBox="0 0 24 24" fill="#C62828" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5 13.6L13.6 12 17 8.6 15.4 7 12 10.4 8.6 7 7 8.6 10.4 12 7 15.4 8.6 17 12 13.6 15.4 17 17 15.4z"/></svg> Sai. Đáp án: ` + esc(it.a)) + "<br>" + esc(it.e);
  fb.classList.remove("hidden");
  $("quizCheck").classList.add("hidden"); $("quizNext").classList.remove("hidden");
}
function nextQuiz() {
  Q.idx++;
  if (Q.idx >= Q.items.length) {
    const cb = Q.onDone, correct = Q.correct, record = Q.record;
    Q = null; $("screen-quiz").classList.add("hidden"); $("screen-main").classList.remove("hidden");
    if (cb) cb(correct, record);
  } else renderQuizQ();
}
function quitQuiz() {
  Q = null; $("screen-quiz").classList.add("hidden"); $("screen-main").classList.remove("hidden");
}
function startSkipTest(g) {
  const pool = DATA.filter((s) => s.gr === g && s.id.startsWith("MD"));
  const items = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
  startQuiz(items, "Thi vượt Nhóm " + g + " — " + GROUPS[g], async (correct) => {
    if (correct >= 8) {
      if (!(progress.skippedGroups || []).includes(g)) progress.skippedGroups.push(g);
      for (const s of STAGES.filter((x) => (byStage[x][0] || {}).gr === g && (byStage[x][0] || {}).id.startsWith("MD")))
        progress.stars[s] = Math.max(progress.stars[s] || 0, 1);
      await saveProgress();
      alert(`Đạt ${correct}/10 — thi vượt thành công! Đã bỏ qua chặng mở đường nhóm ${g}.`);
    } else alert(`Được ${correct}/10 — chưa đạt 8/10, hãy luyện thêm rồi thi lại.`);
    renderMap();
  });
}

// ---------- On tap Leitner ----------
function renderReview() {
  const due = (progress.errorBox || []).filter((x) => x.due <= todayStr());
  if (!due.length) { $("tab-review").innerHTML = "<p>Không có câu nào đến hạn ôn. Hộp của em có " + (progress.errorBox || []).length + " câu đang chờ.</p>"; return; }
  let html = `<p>Có ${due.length} câu đến hạn ôn hôm nay.</p><button class="primary" onclick="startReview()">Bắt đầu ôn</button><ul>`;
  for (const x of due) { const it = DATA.find((s) => s.id === x.id); if (it) html += `<li>${esc(it.o)} <small>(hộp ${x.box})</small></li>`; }
  $("tab-review").innerHTML = html + "</ul>";
}
function startReview() {
  const due = (progress.errorBox || []).filter((x) => x.due <= todayStr());
  const items = due.map((x) => DATA.find((s) => s.id === x.id)).filter(Boolean);
  const boxOf = Object.fromEntries(due.map((x) => [x.id, x.box]));
  const record = { correct: [], wrong: [] };
  startQuiz(items, "Ôn tập câu sai", async () => {
    for (const id of record.correct) {
      const box = boxOf[id];
      const ex = progress.errorBox.find((x) => x.id === id);
      if (!ex) continue;
      if (box === 1) { ex.box = 3; ex.due = addDays(todayStr(), 3); }
      else if (box === 3) { ex.box = 7; ex.due = addDays(todayStr(), 7); }
      else progress.errorBox = progress.errorBox.filter((x) => x.id !== id);
    }
    for (const id of record.wrong) {
      const ex = progress.errorBox.find((x) => x.id === id);
      if (ex) { ex.box = 1; ex.due = addDays(todayStr(), 1); }
    }
    await saveProgress();
    alert(`Ôn xong: đúng ${record.correct.length}/${items.length} câu.`);
    renderStats(); renderReview();
  }, record);
}

// ---------- Bang tuan / Phong / Giao vien ----------
async function renderBoard() {
  try {
    const d = await api("/api/leaderboard?className=" + encodeURIComponent(user.className || ""));
    let html = `<h3>Bảng tuần — lớp ${esc(user.className || "tất cả")} (reset thứ Hai)</h3><table><tr><th>Hạng</th><th>Học sinh</th><th>Điểm</th><th>Lượt chơi</th></tr>`;
    d.rows.forEach((r, i) => { html += `<tr><td>${i + 1}</td><td>${esc(r.fullName)}</td><td>${r.score}</td><td>${r.stages}</td></tr>`; });
    $("tab-board").innerHTML = html + "</table>";
  } catch (e) { $("tab-board").innerHTML = "<p>" + esc(e.message) + "</p>"; }
}
function renderRoomTab() {
  $("tab-room").innerHTML = `
    ${user.role === "teacher" ? `<h3>Tạo phòng tiếp sức</h3>
      <select id="roomStage">${STAGES.map((s) => `<option value="${s}">${s}</option>`).join("")}</select>
      <button class="primary" onclick="createRoom()">Tạo phòng</button><p id="createdRoom"></p>` : ""}
    <h3>Vào phòng</h3>
    <input id="joinPin" placeholder="Mã PIN 4 số" inputmode="numeric">
    <input id="joinName" placeholder="Tên của em" value="${esc(user.fullName)}">
    <button class="primary" onclick="joinRoom()">Vào phòng</button>`;
}
async function createRoom() {
  try {
    const stage = $("roomStage").value;
    const questionIds = (byStage[stage] || []).slice(0, 10).map((s) => s.id);
    const r = await api("/api/rooms", "POST", { stage, questionIds });
    $("createdRoom").innerHTML = `Phòng đã tạo! Mã PIN: <b>${r.pin}</b> — chặng ${r.stage}. Học sinh nhập PIN này để vào. <button onclick="openRoom('${r.id}','${esc(user.fullName)}')">Mở phòng</button>`;
  } catch (e) { alert(e.message); }
}
async function joinRoom() {
  try {
    const r = await api("/api/rooms/join", "POST", { pin: $("joinPin").value, name: $("joinName").value });
    openRoom(r.id, $("joinName").value);
  } catch (e) { alert(e.message); }
}
function openRoom(id, name) {
  roomId = id; myRoomName = name;
  $("screen-main").classList.add("hidden"); $("screen-room").classList.remove("hidden");
  pollRoom();
  roomTimer = setInterval(pollRoom, 3000);
}
function leaveRoom() {
  clearInterval(roomTimer); roomId = null;
  $("screen-room").classList.add("hidden"); $("screen-main").classList.remove("hidden");
}
async function pollRoom() {
  if (!roomId) return;
  try {
    const r = await fetch("/api/rooms/" + roomId).then((x) => x.json());
    $("roomTitle").textContent = "Phòng " + r.pin + " — Chặng " + r.stage + " — Điểm đội: " + r.teamScore;
    $("roomInfo").textContent = "Thành viên: " + r.members.map((m) => m.name + " (" + m.score + ")").join(" · ");
    if (r.status === "done") {
      const s = await fetch("/api/rooms/" + roomId + "/summary").then((x) => x.json());
      $("roomQuestion").innerHTML = `<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 3h16v2h-2v14h2v2H4v-2h2V5H4V3zm4 2v14h8V5H8z"/></svg> Hết buổi! Điểm đội: ` + s.teamScore;
      $("roomInstruction").textContent = "";
      $("roomAnswerArea").classList.add("hidden"); $("roomWait").textContent = "";
      $("roomSummary").innerHTML = "<h3>3 lỗi sai nhiều nhất</h3><ol>" +
        s.top.map((t) => { const it = DATA.find((x) => x.id === t.sentenceId); return `<li>${it ? esc(it.o) + " → " + esc(it.a) : esc(t.sentenceId)} (${t.count} lần)</li>`; }).join("") + "</ol>";
      clearInterval(roomTimer);
      return;
    }
    const q = DATA.find((s) => s.id === r.questionIds[r.currentIndex]);
    const turn = r.members[r.turnIndex];
    $("roomQuestion").textContent = q ? q.o : "";
    $("roomInstruction").textContent = q ? instructionOf(q) : "";
    if (turn && turn.name === myRoomName) {
      $("roomAnswerArea").classList.remove("hidden"); $("roomWait").textContent = "Đến lượt em!";
    } else {
      $("roomAnswerArea").classList.add("hidden");
      $("roomWait").textContent = turn ? "Đang chờ " + turn.name + " trả lời..." : "Chờ thêm thành viên...";
    }
    pollRoom.currentQ = q;
  } catch (e) { /* cho poll sau */ }
}
async function submitRoomAnswer() {
  const q = pollRoom.currentQ;
  if (!q) return;
  const g = grade($("roomInput").value.trim(), q);
  try {
    await fetch("/api/rooms/" + roomId + "/answer", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: myRoomName, correct: g.level === "green" }) });
    $("roomInput").value = "";
    pollRoom();
  } catch (e) { alert(e.message || "Không gửi được"); }
}
async function renderTeacher() {
  if (user.role !== "teacher") { $("tab-teacher").innerHTML = "<p>Chỉ giáo viên mới xem được mục này.</p>"; return; }
  try {
    const [students, errors, reports] = await Promise.all([
      api("/api/teacher/students"), api("/api/teacher/class-errors"), api("/api/teacher/reports")]);
    let html = "<h3>Học sinh</h3><table><tr><th>Họ tên</th><th>Lớp</th><th>XP</th><th>Sao</th><th>Câu sai chờ ôn</th></tr>";
    for (const s of students) {
      const p = s.progress || {};
      html += `<tr><td>${esc(s.fullName)}</td><td>${esc(s.className)}</td><td>${p.xp || 0}</td><td>${Object.values(p.stars || {}).reduce((a, b) => a + b, 0)}</td><td>${(p.errorBox || []).length}</td></tr>`;
    }
    html += "</table><h3>3 lỗi cả lớp sai nhiều nhất</h3><ol>";
    for (const t of errors.top) { const it = DATA.find((x) => x.id === t.sentenceId); html += `<li>${it ? esc(it.o) + " → " + esc(it.a) : esc(t.sentenceId)} (${t.count} lần)</li>`; }
    html += "</ol><h3>Báo đáp án khác từ học sinh</h3><ul>";
    for (const r of reports) { const it = DATA.find((x) => x.id === r.sentenceId); html += `<li>${esc(r.username)} — ${it ? esc(it.o) : esc(r.sentenceId)}<br><small>${esc(r.note || "(không ghi chú)")}</small></li>`; }
    $("tab-teacher").innerHTML = html + "</ul>";
  } catch (e) { $("tab-teacher").innerHTML = "<p>" + esc(e.message) + "</p>"; }
}

// ---------- Khoi dong ----------
(async function init() {
  try {
    const r = await fetch("game-data.json");
    DATA = await r.json();
  } catch (e) {
    document.body.innerHTML = "<p>Không tải được game-data.json. Kiểm tra lại file trong thư mục public.</p>";
    return;
  }
  for (const s of DATA) { (byStage[s.st] = byStage[s.st] || []).push(s); }
  STAGES = Object.keys(byStage).sort();
  if (token) {
    try { user = (await api("/api/auth/me")).user; await afterLogin(); }
    catch (e) { logout(); }
  }
})();
