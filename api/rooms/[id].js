const { sql, publicRoom, method } = require("../_lib/db");

module.exports = async (req, res) => {
  if (!method(req, res, ["GET"])) return;
  try {
    const rows = await sql()`SELECT * FROM rooms WHERE id = ${req.query.id}`;
    if (!rows[0]) return res.status(404).json({ error: "Khong tim thay phong" });
    res.json(publicRoom(rows[0]));
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};
