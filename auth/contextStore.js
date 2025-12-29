const sessionStore = new Map();

const setUserContext = (token, user) => {
  if (!token || !user) {
    return;
  }
  sessionStore.set(token, {
    user,
    issuedAt: new Date(),
  });
};

const getUserContext = (token) => {
  if (!token) {
    return undefined;
  }
  const entry = sessionStore.get(token);
  return entry?.user;
};

const clearUserContext = (token) => {
  if (!token) {
    return;
  }
  sessionStore.delete(token);
};

module.exports = {
  setUserContext,
  getUserContext,
  clearUserContext,
};

