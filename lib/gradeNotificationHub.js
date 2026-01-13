const connectionsByStudentId = new Map();

const registerStudentSocket = (studentUserId, ws) => {
  connectionsByStudentId.set(studentUserId, ws);
};

const unregisterStudentSocket = (studentUserId) => {
  connectionsByStudentId.delete(studentUserId);
};

const publishGradeNotification = (studentUserId, payload) => {
  const ws = connectionsByStudentId.get(studentUserId);
  if (!ws) return;
  if (ws.readyState !== ws.OPEN) {
    connectionsByStudentId.delete(studentUserId);
    return;
  }
  ws.send(JSON.stringify({ type: 'gradeAdded', payload }));
};

module.exports = {
  registerStudentSocket,
  unregisterStudentSocket,
  publishGradeNotification,
};

