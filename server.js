const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const GRANOLA_API_KEY = process.env.GRANOLA_API_KEY || process.env.REACT_APP_GRANOLA_API_KEY;
const BASE_URL = 'https://public-api.granola.ai/v1';

console.log('API key configured:', GRANOLA_API_KEY ? `yes (${GRANOLA_API_KEY.substring(0, 8)}...)` : 'NO');

app.get('/api/meetings/:id', async (req, res) => {
  if (!GRANOLA_API_KEY) return res.status(500).json({ error: 'No API key configured' });
  try {
    const response = await fetch(`${BASE_URL}/notes/${req.params.id}?include=transcript`, {
      headers: { 'Authorization': `Bearer ${GRANOLA_API_KEY}` }
    });
    const data = await response.json();
    console.log('Detail keys:', JSON.stringify(Object.keys(data)));
    if (data.note) console.log('Note keys:', JSON.stringify(Object.keys(data.note)));
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/meetings', async (req, res) => {
  if (!GRANOLA_API_KEY) return res.status(500).json({ error: 'No API key configured' });
  try {
    let allNotes = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      const url = cursor
        ? `${BASE_URL}/notes?cursor=${encodeURIComponent(cursor)}`
        : `${BASE_URL}/notes`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${GRANOLA_API_KEY}` }
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json(data);

      allNotes = allNotes.concat(data.notes || []);
      hasMore = data.hasMore === true;
      cursor = data.cursor || null;
    }

    console.log(`Fetched ${allNotes.length} total meetings`);
    res.json({ notes: allNotes });
  } catch (err) {
    console.error('Fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => console.log(`Listening on port ${port}`));
