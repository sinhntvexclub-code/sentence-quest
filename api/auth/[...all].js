// Gop 3 route cu api/auth/{register,login,me}.js thanh 1 function (gioi han 12
// function cua goi Vercel Hobby). Than tung handler giu nguyen van ban goc,
// chi them bo dieu phoi theo doan URL phia duoi; URL frontend goi khong doi.

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { method, publicUser, requireAuth, sql, uid } = require("../_lib/db");

async function registerHandler(req, res) {
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

async function loginHandler(req, res) {
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

async function meHandler(req, res) {
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

module.exports = async (req, res) => {
  // Vercel catch-all [...all]: /api/auth/<doan> -> req.query.all = [<doan>].
  const all = req.query.all;
  const segs = Array.isArray(all) ? all : (all ? [all] : []);
  const handlers = { register: registerHandler, login: loginHandler, me: meHandler };
  if (segs.length !== 1 || !handlers[segs[0]])
    return res.status(404).json({ error: "Khong tim thay" });
  return handlers[segs[0]](req, res);
};