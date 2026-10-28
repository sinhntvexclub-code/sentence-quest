const { sql, publicProgress, defaultProgress, requireAuth, method } = require("./_lib/db");

module.exports = async (req, res) => {
  const me = requireAuth(req, res);
  if (!me) return;
  try {
    const db = sql();
    if (req.method === "GET") {
      const rows = await db`SELECT * FROM progress WHERE user_id = ${me.id}`;
      return res.json(publicProgress(rows[0]));
    }
    if (req.method === "PUT") {
      const b = req.body || {};
      const cur = publicProgress((await db`SELECT * FROM progress WHERE user_id = ${me.id}`)[0]);
      const next = {
        stars: b.stars && typeof b.stars === "object" ? b.stars : cur.stars,
        xp: Number.isFinite(+b.xp) ? +b.xp : cur.xp,
        coins: Number.isFinite(+b.coins) ? +b.coins : cur.coins,
        errorBox: Array.isArray(b.errorBox) ? b.errorBox : cur.errorBox,
        streak: Number.isFinite(+b.streak) ? +b.streak : cur.streak,
        lastPlayDate: b.lastPlayDate || cur.lastPlayDate,
        skippedGroups: Array.isArray(b.skippedGroups) ? b.skippedGroups : cur.skippedGroups,
      };
      await db`INSERT INTO progress (user_id, stars, xp, coins, error_box, streak, last_play_date, skipped_groups)
        VALUES (${me.id}, ${JSON.stringify(next.stars)}, ${next.xp}, ${next.coins}, ${JSON.stringify(next.errorBox)}, ${next.streak}, ${next.lastPlayDate}, ${JSON.stringify(next.skippedGroups)})
        ON CONFLICT (user_id) DO UPDATE SET stars = EXCLUDED.stars, xp = EXCLUDED.xp, coins = EXCLUDED.coins,
          error_box = EXCLUDED.error_box, streak = EXCLUDED.streak, last_play_date = EXCLUDED.last_play_date,
          skipped_groups = EXCLUDED.skipped_groups, updated_at = NOW()`;
      return res.json(next);
    }
    return res.status(405).json({ error: "Method khong ho tro" });
  } catch (e) { res.status(500).json({ error: "Loi may chu: " + e.message }); }
};
