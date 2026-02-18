# Nashville Development Tracker

Live map of Nashville Metro Planning Commission development cases.

## Required File Structure

Your GitHub repo MUST have exactly this structure:

```
your-repo/
├── netlify.toml                          ← Build config + redirect
├── public/
│   └── index.html                        ← The tracker app
└── netlify/
    └── functions/
        └── nashville-data.mjs            ← Serverless proxy function
```

## How to Deploy

1. Create a new GitHub repo
2. Upload ALL files preserving the folder structure above
3. In Netlify: **Add new site → Import from GitHub → select repo → Deploy**
4. Wait ~30 seconds for the build
5. Visit your new URL

## Verify the Function Deployed

After deploying, go to your Netlify dashboard:
- Click on your site
- Go to **Logs → Functions**
- You should see `nashville-data` listed

If it's NOT listed, the function file wasn't in the right location. Double-check that `netlify/functions/nashville-data.mjs` exists in your repo (not just `functions/` — it must be `netlify/functions/`).

## How It Works

Nashville's ArcGIS server blocks browser requests (no CORS headers). The serverless function runs server-side on Netlify, fetches the data where CORS doesn't apply, and passes it back to your browser.
