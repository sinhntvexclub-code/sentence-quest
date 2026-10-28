const { sql, uid, publicRoom, requireTeacher, method } = require("../_lib/db");

module.exports = async (req, res) => {
  if (!method(req, res, ["POST"])) return;
  const me = requireTeacher(req, res);
  if (!me) return;
  try {
    const db = sql();
    const stage = String(req.body?.stage || "C01");
    const questionIds = Array.isArray(req.body?.questionIds) ? req.body.questionIds.filter(Boolean).slice(0, 20) : [];
    if (!questionIds.length) return res.status(400).json({ error: "Chang khong co cau hoi" });
    let pin = "";
    for (let i = 0; i < 20; i++) {
      pin = String(Math.floor(1000 + Math.random() * 9000));
      const clash = await db`SELECT id FROM rooms WHERE pin = ${pin} AND status = 'open'`;
      if (!clash.length) break;
    }
    const room = { id: uid(), pin, teacher_id: me.id, stage };
    await db`INSERT INTO rooms (id, pin, teacher_id, stage, question_ids, members, answers)
      VALUES (${room.id}, ${room.pin}, ${room.teacher_id}, ${room.stage}, ${JSON.stringify(questionIds)}, ${JSON.stringify([])}, ${JSON.stringify([])})`;
    const rows = await db`SELECT * FROM rooms WHERE id = ${room.id}`;
    res.json(publicRoom(rows[0]));
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};
