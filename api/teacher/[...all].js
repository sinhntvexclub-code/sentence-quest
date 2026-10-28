// Gop 3 route cu api/teacher/{students,class-errors,reports}.js thanh 1 function
// (gioi han 12 function cua goi Vercel Hobby). Than tung handler giu nguyen van
// ban goc, chi them bo dieu phoi theo doan URL; kiem tra quyen giao vien giu nguyen.

const { fromJson, method, publicProgress, publicUser, requireTeacher, sql } = require("../_lib/db");

async function studentsHandler(req, res) {
  if (!method(req, res, ["GET"])) return;
  const me = requireTeacher(req, res);
  if (!me) return;
  try {
    const db = sql();
    const cls = String(req.query.className || "").trim();
    const students = cls
      ? await db`SELECT * FROM users WHERE role = 'student' AND class_name = ${cls}`
      : await db`SELECT * FROM users WHERE role = 'student'`;
    const prog = await db`SELECT * FROM progress`;
    const byUser = Object.fromEntries(prog.map((p) => [p.user_id, publicProgress(p)]));
    res.json(students.map((u) => ({ ...publicUser(u), progress: byUser[u.id] || publicProgress(null) })));
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};

async function classErrorsHandler(req, res) {
  if (!method(req, res, ["GET"])) return;
  const me = requireTeacher(req, res);
  if (!me) return;
  try {
    const cls = String(req.query.className || "").trim();
    const rows = cls
      ? await sql()`SELECT * FROM attempts WHERE class_name = ${cls}`
      : await sql()`SELECT * FROM attempts`;
    const counts = {};
    for (const a of rows) for (const id of fromJson(a.errors, [])) counts[id] = (counts[id] || 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([sentenceId, count]) => ({ sentenceId, count }));
    res.json({ className: cls || "Tat ca cac lop", top });
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};

async function reportsHandler(req, res) {
  if (!method(req, res, ["GET"])) return;
  const me = requireTeacher(req, res);
  if (!me) return;
  try {
    const rows = await sql()`SELECT * FROM reports ORDER BY created_at DESC LIMIT 200`;
    res.json(rows.map((r) => ({ id: r.id, username: r.username, sentenceId: r.sentence_id, note: r.note, createdAt: r.created_at })));
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};

module.exports = async (req, res) => {
  // Vercel catch-all [...all]: /api/teacher/<doan> -> req.query.all = [<doan>].
  const all = req.query.all;
  const segs = Array.isArray(all) ? all : (all ? [all] : []);
  const handlers = { students: studentsHandler, "class-errors": classErrorsHandler, reports: reportsHandler };
  if (segs.length !== 1 || !handlers[segs[0]])
    return res.status(404).json({ error: "Khong tim thay" });
  return handlers[segs[0]](req, res);
};