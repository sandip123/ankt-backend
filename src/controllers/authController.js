const sheetService = require('../services/sheetService');

async function login(req, res, next) {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '').trim();

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  try {
    const user = await sheetService.login(username, password);
    return res.json({
      success: true,
      message: 'Login successful',
      user
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { login };
