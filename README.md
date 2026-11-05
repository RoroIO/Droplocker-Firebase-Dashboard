# Guest Rental Failure Dashboard

Static dashboard of error logs from `guest-rental-logs-default-rtdb`. The build (`npm run build`)
pulls every log day from Firebase (~1 min), groups errors by failure type and location, and writes
`public/index.html` + `public/data.json`. A daily scheduled job triggers a redeploy so the data refreshes every 24h.

Local: `npm run build && npm run preview`

## Deploy on Vercel
1. Push this folder to a Git repo and import it in Vercel (framework preset: Other — `vercel.json` sets build/output).
2. Project → Settings → Git → Deploy Hooks: create one for your production branch and copy the URL.
3. Project → Settings → Environment Variables:
   - `DEPLOY_HOOK_URL` = the hook URL
   - `CRON_SECRET` = any random string (Vercel sends it to the cron route automatically)
4. Redeploy. The cron in `vercel.json` hits `/api/rebuild` daily at 06:00 UTC, which calls the hook.

## Deploy on Netlify
1. Push to Git and import in Netlify (`netlify.toml` sets build/publish/functions).
2. Site configuration → Build & deploy → Build hooks: create one and copy the URL.
3. Site configuration → Environment variables: `BUILD_HOOK_URL` = the hook URL.
4. Redeploy. `netlify/functions/rebuild.mjs` runs daily at 06:00 UTC and calls the hook.

Optional env var on either platform: `FIREBASE_DB_URL` to point at a different database.
