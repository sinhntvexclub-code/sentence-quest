const { sql, publicUser, publicProgress, requireTeacher, method } = require("../_lib/db");

module.exports = async (req, res) => {
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
