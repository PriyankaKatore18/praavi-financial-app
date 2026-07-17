<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c9ff2ca0-9e98-4c28-9404-97f37ad5469d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Split Deployment

If you deploy the frontend to Vercel and the backend to Render:

1. Set `VITE_API_BASE_URL` on Vercel to your Render backend URL with `/api`.
   Example: `https://your-render-service.onrender.com/api`
2. Set `ALLOWED_ORIGINS` on Render to your Vercel app URL.
   Example: `https://your-app.vercel.app`
3. Set `SUPABASE_DB_URL` and `JWT_SECRET` on Render.
4. Render will provide `PORT` automatically. The server reads it now.

Important:
This app uses `/api` routes from the same server by default, so login will fail on a Vercel-only frontend until `VITE_API_BASE_URL` points to the deployed backend.
