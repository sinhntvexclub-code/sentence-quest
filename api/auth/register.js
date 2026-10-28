const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql, uid, publicUser, method } = require("../_lib/db");

module.exports = async (req, res) => {
  if (!method(req, res, ["POST"])) return;
  try {
    const { username, fullName, className, password, teacherCode } = req.body || {};
    const name = String(username || "").trim().toLowerCase();
    if (!name || !fullName || !password || String(password).length < 4)
      return res.status(400).json({ error: "Thieu thong tin: ten dang nhap, ho ten, mat khau (toi thieu 4 ky tu)" });
    const db = sql();
    const existed = await db`SELECT id FROM users WHERE username = ${name}`;
    if (existed.length) return res.status(409).json({ error: "Ten dang nhap da ton tai" });
    let role = "student";
    if (teacherCode) {
      if (!process.env.TEACHER_CODE || teacherCode !== process.env.TEACHER_CODE)
        return res.status(403).json({ error: "Ma giao vien khong dung" });
      role = "teacher";
    }
    const user = {
      id: uid(), username: name, full_name: String(fullName).trim(),
      class_name: String(className || "").trim(), role,
      password_hash: bcrypt.hashSync(String(password), 10),
    };
    await db`INSERT INTO users (id, username, full_name, class_name, role, password_hash)
      VALUES (${user.id}, ${user.username}, ${user.full_name}, ${user.class_name}, ${user.role}, ${user.password_hash})`;
    await db`INSERT INTO progress (user_id) VALUES (${user.id})`;
    const token = jwt.sign(publicUser(user), process.env.JWT_SECRET || "dev-secret-please-change", { expiresIn: "30d" });
    res.json({ token, user: publicUser(user) });
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};
