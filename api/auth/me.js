const { sql, publicUser, requireAuth, method } = require("../_lib/db");

module.exports = async (req, res) => {
  if (!method(req, res, ["GET"])) return;
  const me = requireAuth(req, res);
  if (!me) return;
  try {
    const db = sql();
    const rows = await db`SELECT * FROM users WHERE id = ${me.id}`;
    if (!rows[0]) return res.status(404).json({ error: "Khong tim thay tai khoan" });
    res.json({ user: publicUser(rows[0]) });
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};
