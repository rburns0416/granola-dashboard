# Granola Dashboard

React dashboard for Granola meeting transcripts. Auto-detects meeting type (status, 1:1, brainstorm, sales, planning) and extracts decisions, action items, blockers, and key quotes.

## Quick Start

```bash
npm install
cp .env.example .env   # add your API keys
npm start
```

## Deploy

**Railway (recommended):**
1. Push to GitHub
2. Go to [railway.com](https://railway.com) → New Project → Deploy from GitHub
3. Add env vars: `REACT_APP_GRANOLA_API_KEY`, `REACT_APP_ANTHROPIC_API_KEY`
4. Railway auto-detects the config and deploys

Or via CLI:
```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

**Docker:**
```bash
docker build -t granola-dashboard .
docker run -p 80:80 granola-dashboard
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_GRANOLA_API_KEY` | For API mode | Granola API token |
| `REACT_APP_ANTHROPIC_API_KEY` | Optional | Enhanced extraction via Claude |
