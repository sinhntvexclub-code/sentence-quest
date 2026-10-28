// Dung chung cho cac Vercel Serverless Functions.
// Dung driver HTTP cua Neon (@neondatabase/serverless) — khong dung TCP pool,
// vi serverless function khong giu ket noi lau duoc.
const { neon } = require("@neondatabase/serverless");
const jwt = require("jsonwebtoken");

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Chua cau hinh DATABASE_URL");
  return neon(url);
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Neon tra ve JSONB da parse san; phong truong hop tra ve chuoi.
function fromJson(v, fallback) {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return fallback; } }
  return v;
}
function publicUser(u) {
  return { id: u.id, username: u.username, fullName: u.full_name, className: u.class_name, role: u.role };
}
function publicRoom(r) {
  return {
    id: r.id, pin: r.pin, teacherId: r.teacher_id, stage: r.stage,
    questionIds: fromJson(r.question_ids, []), currentIndex: r.current_index,
    members: fromJson(r.members, []), turnIndex: r.turn_index,
    teamScore: r.team_score, answers: fromJson(r.answers, []),
    status: r.status, createdAt: r.created_at,
  };
}
function defaultProgress() {
  return { stars: {}, xp: 0, coins: 0, errorBox: [], streak: 0, lastPlayDate: null, skippedGroups: [] };
}
function publicProgress(p) {
  if (!p) return defaultProgress();
  return {
    stars: fromJson(p.stars, {}), xp: p.xp || 0, coins: p.coins || 0,
    errorBox: fromJson(p.error_box, []), streak: p.streak || 0,
    lastPlayDate: p.last_play_date || null, skippedGroups: fromJson(p.skipped_groups, []),
  };
}
function getUser(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || req.headers.Authorization || "");
  if (!m) return null;
  try { return jwt.verify(m[1], process.env.JWT_SECRET || "dev-secret-please-change"); }
  catch { return null; }
}
function requireAuth(req, res) {
  const u = getUser(req);
  if (!u) { res.status(401).json({ error: "Chua dang nhap" }); return null; }
  return u;
}
function requireTeacher(req, res) {
  const u = requireAuth(req, res);
  if (!u) return null;
  if (u.role !== "teacher") { res.status(403).json({ error: "Chi giao vien moi xem duoc" }); return null; }
  return u;
}
// Thu Hai dau tuan (gio dia phuong cua function).
function weekStart(d = new Date()) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  return t;
}
function method(req, res, allowed) {
  if (!allowed.includes(req.method)) { res.status(405).json({ error: "Method khong ho tro" }); return false; }
  return true;
}
module.exports = { sql, uid, fromJson, publicUser, publicRoom, defaultProgress, publicProgress, getUser, requireAuth, requireTeacher, weekStart, method };
