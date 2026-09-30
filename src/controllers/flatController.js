const sheetService = require('../services/sheetService');

async function getFlats(req, res, next) {
  try {
    const result = await sheetService.getFlats(req.query.series);
    return res.json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

async function getFlatDetails(req, res, next) {
  try {
    const result = await sheetService.findFlat(req.params.flatNo);
    return res.json({ success: true, flat: result.flat });
  } catch (error) {
    return next(error);
  }
}

async function updateFlat(req, res, next) {
  try {
    const result = await sheetService.updateFlat(req.params.flatNo, req.body);
    return res.json({
      success: true,
      message: 'Flat details updated successfully',
      ...result
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getFlats,
  getFlatDetails,
  updateFlat
};
