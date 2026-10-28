const { sql, fromJson, publicRoom, method } = require("../_lib/db");

module.exports = async (req, res) => {
  if (!method(req, res, ["POST"])) return;
  try {
    const db = sql();
    const pin = String(req.body?.pin || "").trim();
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nhap ten cua em" });
    const rows = await db`SELECT * FROM rooms WHERE pin = ${pin} AND status = 'open'`;
    const room = rows[0];
    if (!room) return res.status(404).json({ error: "Ma PIN khong dung hoac phong da dong" });
    const members = fromJson(room.members, []);
    if (!members.some((m) => m.name === name)) {
      members.push({ name, score: 0 });
      await db`UPDATE rooms SET members = ${JSON.stringify(members)} WHERE id = ${room.id}`;
    }
    const fresh = await db`SELECT * FROM rooms WHERE id = ${room.id}`;
    res.json(publicRoom(fresh[0]));
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};
