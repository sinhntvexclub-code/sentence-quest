const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql, publicUser, method } = require("../_lib/db");

module.exports = async (req, res) => {
  if (!method(req, res, ["POST"])) return;
  try {
    const name = String(req.body?.username || "").trim().toLowerCase();
    const db = sql();
    const rows = await db`SELECT * FROM users WHERE username = ${name}`;
    const user = rows[0];
    if (!user || !bcrypt.compareSync(String(req.body?.password || ""), user.password_hash))
      return res.status(401).json({ error: "Ten dang nhap hoac mat khau sai" });
    const token = jwt.sign(publicUser(user), process.env.JWT_SECRET || "dev-secret-please-change", { expiresIn: "30d" });
    res.json({ token, user: publicUser(user) });
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};
