# GiftDrop on Vercel
1. Push this folder to GitHub and import it in Vercel (no build settings needed).
2. Project > Storage: add an Upstash Redis database (Marketplace) and a Blob store. Connect both to the project.
3. Redeploy. Env vars are added automatically (KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_*, and BLOB_READ_WRITE_TOKEN).
Limits: media uploads max 4 MB each (Vercel function body limit).
