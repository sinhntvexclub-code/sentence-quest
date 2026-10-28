const { sql, uid, requireAuth, method } = require("./_lib/db");

module.exports = async (req, res) => {
  if (!method(req, res, ["POST"])) return;
  const me = requireAuth(req, res);
  if (!me) return;
  try {
    await sql()`INSERT INTO reports (id, user_id, username, sentence_id, note)
      VALUES (${uid()}, ${me.id}, ${me.username}, ${String(req.body?.sentenceId || "")}, ${String(req.body?.note || "").slice(0, 500)})`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};
