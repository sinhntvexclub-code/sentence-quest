// Gop 5 route cu api/rooms/** thanh 1 function (gioi han 12 function cua goi
// Vercel Hobby). Than tung handler giu nguyen van ban goc; bo dieu phoi nap
// req.query.id tu doan URL truoc khi goi handler cu (vi handler cu doc id o do).
// Thu tu uu tien: 'join' la tu khoa, phai xu ly truoc khi coi doan dau la <id>.

const { fromJson, method, publicRoom, requireTeacher, sql, uid } = require("../_lib/db");

async function createHandler(req, res) {
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

async function joinHandler(req, res) {
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

async function getHandler(req, res) {
  if (!method(req, res, ["GET"])) return;
  try {
    const rows = await sql()`SELECT * FROM rooms WHERE id = ${req.query.id}`;
    if (!rows[0]) return res.status(404).json({ error: "Khong tim thay phong" });
    res.json(publicRoom(rows[0]));
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};

async function answerHandler(req, res) {
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

async function summaryHandler(req, res) {
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

function pathSegs(req, prefix) {
  // Lay doan URL tu req.url thay vi req.query.all (xem ghi chu o api/auth).
  try {
    const p = new URL(req.url || "/", "http://localhost").pathname;
    const rest = p.startsWith(prefix) ? p.slice(prefix.length) : p;
    return rest.split("/").filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
  } catch { return []; }
}

module.exports = async (req, res) => {
  //   /api/rooms                 -> segs = []
  //   /api/rooms/join            -> segs = ["join"]
  //   /api/rooms/<id>            -> segs = [<id>]
  //   /api/rooms/<id>/answer|summary -> segs = [<id>, "answer"|"summary"]
  // Cac handler goc doc id tu req.query.id nen nap san gia tri do truoc khi goi.
  const segs = pathSegs(req, "/api/rooms");
  if (segs.length === 0) return createHandler(req, res);
  if (segs.length === 1 && segs[0] === "join") return joinHandler(req, res);
  if (segs.length === 1) { req.query.id = segs[0]; return getHandler(req, res); }
  if (segs.length === 2 && segs[1] === "answer") { req.query.id = segs[0]; return answerHandler(req, res); }
  if (segs.length === 2 && segs[1] === "summary") { req.query.id = segs[0]; return summaryHandler(req, res); }
  return res.status(404).json({ error: "Khong tim thay" });
};