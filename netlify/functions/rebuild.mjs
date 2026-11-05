// Netlify scheduled function: triggers a fresh build daily so the build re-pulls the logs.
export default async () => {
  const r = await fetch(process.env.BUILD_HOOK_URL, { method: "POST" });
  return new Response(null, { status: r.ok ? 200 : 502 });
};

export const config = { schedule: "0 6 * * *" };
