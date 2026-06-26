const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const GRANOLA_API_KEY = process.env.GRANOLA_API_KEY || process.env.REACT_APP_GRANOLA_API_KEY;

console.log('API key configured:', GRANOLA_API_KEY ? `yes (${GRANOLA_API_KEY.substring(0, 8)}...)` : 'NO');

app.get('/api/meetings/:id', async (req, res) => {
  if (!GRANOLA_API_KEY) return res.status(500).json({ error: 'No API key configured' });
  try {
    const url = `https://api.granola.ai/v1/docs/${req.params.id}`;
    console.log('Fetching:', url);
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${GRANOLA_API_KEY}` }
    });
    console.log('Response status:', response.status);
    const text = await response.text();
    try {
      res.json(JSON.parse(text));
    } catch {
      console.log('Non-JSON response:', text.substring(0, 200));
      res.status(response.status).json({ error: text.substring(0, 200) });
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/meetings', async (req, res) => {
  if (!GRANOLA_API_KEY) return res.status(500).json({ error: 'No API key configured' });
  try {
    const url = 'https://api.granola.ai/v1/docs';
    console.log('Fetching:', url);
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${GRANOLA_API_KEY}` }
    });
    console.log('Response status:', response.status);
    const text = await response.text();
    try {
      res.json(JSON.parse(text));
    } catch {
      console.log('Non-JSON response:', text.substring(0, 200));
      res.status(response.status).json({ error: text.substring(0, 200) });
    }
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
