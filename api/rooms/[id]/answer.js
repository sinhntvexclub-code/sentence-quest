const { sql, fromJson, publicRoom, method } = require("../../_lib/db");

module.exports = async (req, res) => {
  if (!method(req, res, ["POST"])) return;
  try {
    const db = sql();
    const rows = await db`SELECT * FROM rooms WHERE id = ${req.query.id}`;
    const room = rows[0];
    if (!room || room.status !== "open") return res.status(404).json({ error: "Phong khong mo" });
    const members = fromJson(room.members, []);
    const answers = fromJson(room.answers, []);
    const questionIds = fromJson(room.question_ids, []);
    const member = members[room.turn_index];
    const name = String(req.body?.name || "").trim();
    if (!member || member.name !== name) return res.status(403).json({ error: "Chua den luot cua em" });
    const correct = !!req.body?.correct;
    const qid = questionIds[room.current_index];
    if (correct) { room.team_score += 10; member.score += 10; }
    answers.push({ name, questionId: qid, correct, errors: correct ? [] : [qid] });
    let currentIndex = room.current_index + 1;
    let status = room.status;
    let turnIndex = room.turn_index;
    if (currentIndex >= questionIds.length) status = "done";
    else turnIndex = (turnIndex + 1) % members.length;
    await db`UPDATE rooms SET answers = ${JSON.stringify(answers)}, current_index = ${currentIndex},
      team_score = ${room.team_score}, members = ${JSON.stringify(members)},
      turn_index = ${turnIndex}, status = ${status} WHERE id = ${room.id}`;
    const fresh = await db`SELECT * FROM rooms WHERE id = ${room.id}`;
    res.json(publicRoom(fresh[0]));
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};
