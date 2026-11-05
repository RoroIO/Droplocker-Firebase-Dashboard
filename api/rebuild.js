// Vercel Cron target (see vercel.json): triggers a fresh deployment so the build re-pulls the logs.
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  const r = await fetch(process.env.DEPLOY_HOOK_URL, { method: "POST" });
  res.status(r.ok ? 200 : 502).json({ triggered: r.ok });
}
