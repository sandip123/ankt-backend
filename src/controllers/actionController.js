const sheetService = require('../services/sheetService');
const { issueSession, authorizeUpdate } = require('../services/session');

async function handleAction(req, res) {
  const data = req.body || {};

  try {
    switch (data.action) {
      case 'login': {
        const username = String(data.username || '').trim();
        const password = String(data.password || '').trim();

        if (!username || !password) {
          return res.status(400).json({
            success: false,
            message: 'Username and password are required'
          });
        }

        const user = await sheetService.login(username, password);
        const summary = await sheetService.getSummary();
        return res.json({
          success: true,
          message: 'Login successful',
          user,
          token: issueSession(user),
          summary
        });
      }

      case 'getFlats': {
        const result = await sheetService.getFlats(data.series);
        return res.json({ success: true, ...result });
      }

      case 'getFlatDetails': {
        const result = await sheetService.findFlat(data.flatNo);
        return res.json({ success: true, flat: result.flat });
      }

      case 'updateFlat': {
        const result = await sheetService.updateFlat(data.flatNo, authorizeUpdate(req));
        return res.json({
          success: true,
          message: 'Flat details updated successfully',
          ...result
        });
      }

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }
  } catch (error) {
    const status = Number(error.status) || 500;
    if (data.action === 'updateFlat') {
      console.error('[flat-update] Failed', {
        flatNo: String(data.flatNo || '').trim(),
        fields: Object.keys(data).filter((field) => !['action', 'flatNo', 'updatedBy'].includes(field)),
        status,
        error: error.message
      });
    }
    const message = error.expose
      ? error.publicMessage
      : status === 500
        ? 'Server error'
        : error.publicMessage || error.message;

    return res.status(status).json({
      success: false,
      message
    });
  }
}

module.exports = { handleAction };
