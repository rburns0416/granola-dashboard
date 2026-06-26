# Granola Dashboard

A real-time meeting intelligence dashboard powered by [Granola](https://granola.ai). Auto-loads all your meetings, extracts action items, decisions, blockers, and key quotes — and aggregates them into a single actionable view.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/new?repository=https://github.com/rburns0416/granola-dashboard&envs=GRANOLA_API_KEY&envDescription=Your+Granola+API+key&envLink=https://docs.granola.ai/introduction)

## Features

- **Auto-loads all meetings** from your Granola account
- **Smart extraction** — pulls action items, decisions, blockers, and quotes from AI summaries
- **Cross-meeting action tracker** — see all open action items in one place, filter by owner
- **Meeting analytics** — meetings this week, open actions, top collaborators, busiest day
- **Full-text search** across meeting titles and summaries
- **Type filtering** — 1:1, Status, Planning, Brainstorm, Sales
- **Auto-refresh** every 15 minutes
- **Export** — copy action items or meeting summaries as Markdown
- **Full transcript** and **rendered summary** for each meeting

## One-Click Deploy

1. Click the **Deploy on Railway** button above
2. Enter your Granola API key (get it from Granola → Settings → API & Integrations)
3. Done — your dashboard is live in ~2 minutes

## Local Development

```bash
git clone https://github.com/rburns0416/granola-dashboard.git
cd granola-dashboard
npm install
cp .env.example .env   # add your Granola API key
npm run build
npm start              # runs on http://localhost:3000
```

For dev mode with hot reload: `npm run dev`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GRANOLA_API_KEY` | Yes | Your Granola API key (get from Settings → API & Integrations) |

## How It Works

The app runs a lightweight Express server that proxies requests to the [Granola API](https://docs.granola.ai/introduction), avoiding CORS issues. The React frontend auto-fetches your meetings on load and parses Granola's AI-generated summaries to extract structured data.

Meeting details are kept in memory (not persisted) to avoid storage limits. Completed action item checkboxes persist in your browser's localStorage.

## Tech Stack

- React 18 + Tailwind CSS
- Express.js (API proxy + static server)
- Granola Public API
- Railway (hosting)
