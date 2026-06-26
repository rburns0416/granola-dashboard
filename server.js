const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const GRANOLA_API_KEY = process.env.GRANOLA_API_KEY || process.env.REACT_APP_GRANOLA_API_KEY;

app.use(express.static(path.join(__dirname, 'build')));

app.get('/api/meetings', async (req, res) => {
  if (!GRANOLA_API_KEY) return res.status(500).json({ error: 'No API key configured' });
  try {
    const response = await fetch('https://api.granola.ai/v1/docs', {
      headers: { 'Authorization': `Bearer ${GRANOLA_API_KEY}` }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/meetings/:id', async (req, res) => {
  if (!GRANOLA_API_KEY) return res.status(500).json({ error: 'No API key configured' });
  try {
    const response = await fetch(`https://api.granola.ai/v1/docs/${req.params.id}`, {
      headers: { 'Authorization': `Bearer ${GRANOLA_API_KEY}` }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => console.log(`Listening on port ${port}`));
