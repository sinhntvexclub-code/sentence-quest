const { sql, requireTeacher, method } = require("../_lib/db");

module.exports = async (req, res) => {
  if (!method(req, res, ["GET"])) return;
  const me = requireTeacher(req, res);
  if (!me) return;
  try {
    const rows = await sql()`SELECT * FROM reports ORDER BY created_at DESC LIMIT 200`;
    res.json(rows.map((r) => ({ id: r.id, username: r.username, sentenceId: r.sentence_id, note: r.note, createdAt: r.created_at })));
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};
