const { sql, uid, requireAuth, method } = require("./_lib/db");

module.exports = async (req, res) => {
  if (!method(req, res, ["POST"])) return;
  const me = requireAuth(req, res);
  if (!me) return;
  try {
    const b = req.body || {};
    const rec = {
      id: uid(), user_id: me.id, username: me.username, full_name: me.fullName,
      class_name: me.className, stage: String(b.stage || ""),
      correct: +b.correct || 0, total: +b.total || 0, score: +b.score || 0,
      errors: Array.isArray(b.errors) ? b.errors.filter(Boolean) : [],
    };
    await sql()`INSERT INTO attempts (id, user_id, username, full_name, class_name, stage, correct, total, score, errors)
      VALUES (${rec.id}, ${rec.user_id}, ${rec.username}, ${rec.full_name}, ${rec.class_name}, ${rec.stage}, ${rec.correct}, ${rec.total}, ${rec.score}, ${JSON.stringify(rec.errors)})`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};
