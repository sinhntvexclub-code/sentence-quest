const { sql, requireAuth, weekStart, method } = require("./_lib/db");

module.exports = async (req, res) => {
  if (!method(req, res, ["GET"])) return;
  const me = requireAuth(req, res);
  if (!me) return;
  try {
    const cls = String(req.query.className || "").trim();
    const since = weekStart();
    const rows = cls
      ? await sql()`SELECT * FROM attempts WHERE created_at >= ${since.toISOString()} AND class_name = ${cls}`
      : await sql()`SELECT * FROM attempts WHERE created_at >= ${since.toISOString()}`;
    const sums = {};
    for (const a of rows) {
      sums[a.user_id] = sums[a.user_id] || { userId: a.user_id, username: a.username, fullName: a.full_name, className: a.class_name, score: 0, stages: 0 };
      sums[a.user_id].score += a.score; sums[a.user_id].stages += 1;
    }
    const list = Object.values(sums).sort((x, y) => y.score - x.score).slice(0, 50);
    res.json({ weekStart: since.toISOString().slice(0, 10), rows: list });
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};
