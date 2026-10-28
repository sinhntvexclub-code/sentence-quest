const { sql, fromJson, requireTeacher, method } = require("../_lib/db");

module.exports = async (req, res) => {
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
