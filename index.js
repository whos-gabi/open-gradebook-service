'use strict';

const express = require('express');
const { roleMiddleware, ROLES } = require('./auth/roleMiddleware');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'open-gradebook-service' });
});

/*
// Demo route: only TEACHER role can add grades.
app.post('/grades', roleMiddleware(ROLES.TEACHER), (req, res) => {
  const { studentId, value } = req.body || {};
  res.json({
    message: 'Grade recorded (demo response)',
    grade: { studentId, value },
    performedBy: req.user?.role_id,
  });
});

// Demo route: only ADMIN role can create new subjects.
app.post('/subjects', roleMiddleware(ROLES.ADMIN), (req, res) => {
  const { name } = req.body || {};
  res.json({
    message: 'Subject created (demo response)',
    subject: { name },
    performedBy: req.user?.role_id,
  });
});

// Demo route: ADMIN or TEACHER can view class reports.
app.get('/reports', roleMiddleware(ROLES.ADMIN, ROLES.TEACHER), (_req, res) => {
  res.json({
    message: 'Reports available (demo response)',
    allowedRoles: [ROLES.ADMIN, ROLES.TEACHER],
    performedBy: req.user?.role_id,
  });
});
*/

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});

