// Build step for Vercel/Netlify: pulls error logs from Firebase RTDB, aggregates them,
// and writes public/index.html + public/data.json. Scheduled redeploys re-run this daily.
import { mkdir, copyFile, writeFile } from "node:fs/promises";

const DB = process.env.FIREBASE_DB_URL || "https://guest-rental-logs-default-rtdb.firebaseio.com";
const CONCURRENCY = 12;

async function get(path, shallow = false) {
  const url = `${DB}/${path.split("/").map(encodeURIComponent).join("/")}.json${shallow ? "?shallow=true" : ""}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      return (await res.json()) || {};
    } catch (err) {
      if (attempt === 4) throw new Error(`GET ${path}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

function normalize(msg) {
  return (msg || "(no message)")
    .replace(/\s*\((mobile|Wesko)\)/g, "")
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, "<id>")
    .replace(/\d{4,}/g, "#")
    .trim()
    .slice(0, 90);
}

function locationName(loc) {
  const i = loc.indexOf("_");
  if (i < 0) return `${loc} [other]`;
  const name = loc.slice(i + 1).replace(/_[0-9a-f]{8}-[0-9a-f-]{27,}$/, "") || "(unnamed)";
  return `${name} [${loc.slice(0, i)}]`;
}

const started = Date.now();
const locs = Object.keys(await get("logs", true));
const jobs = (await mapLimit(locs, 16, async (l) => Object.keys(await get(`logs/${l}`, true)).map((d) => [l, d]))).flat();
console.log(`${locs.length} locations, ${jobs.length} location-days`);

const types = {}, locations = {}, rows = [];
await mapLimit(jobs, CONCURRENCY, async ([loc, day]) => {
  const events = await get(`logs/${loc}/${day}/events`);
  const counts = new Map();
  for (const e of Object.values(events)) {
    if (!e || ["info", "debug", undefined].includes(e.level)) continue;
    const type = normalize(e.message);
    types[type] ??= e.event || "?";
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  if (counts.size) locations[loc] = locationName(loc);
  for (const [type, n] of counts) rows.push([type, loc, day, n]);
});

await mkdir("public", { recursive: true });
await copyFile("src/index.html", "public/index.html");
await writeFile("public/data.json", JSON.stringify({ generated: new Date().toISOString(), types, locations, rows }));
console.log(`wrote public/data.json (${rows.length} rows) in ${((Date.now() - started) / 1000).toFixed(0)}s`);
