'use strict';

const express = require('express');

const app = express();
const PORT = process.env.PORT || 4000;

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'open-gradebook-service' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});

