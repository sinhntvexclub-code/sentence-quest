const { sql, fromJson, method } = require("../../_lib/db");

module.exports = async (req, res) => {
  if (!method(req, res, ["GET"])) return;
  try {
    const rows = await sql()`SELECT * FROM rooms WHERE id = ${req.query.id}`;
    const room = rows[0];
    if (!room) return res.status(404).json({ error: "Khong tim thay phong" });
    const counts = {};
    for (const a of fromJson(room.answers, [])) for (const id of a.errors || []) counts[id] = (counts[id] || 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([sentenceId, count]) => ({ sentenceId, count }));
    res.json({ teamScore: room.team_score, members: fromJson(room.members, []), top, status: room.status });
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};
