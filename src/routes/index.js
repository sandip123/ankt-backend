const express = require('express');

const actionController = require('../controllers/actionController');
const authController = require('../controllers/authController');
const flatController = require('../controllers/flatController');

const router = express.Router();

router.post('/', actionController.handleAction);
router.post('/auth/login', authController.login);
router.get('/flats', flatController.getFlats);
router.get('/flats/:flatNo', flatController.getFlatDetails);
router.put('/flats/:flatNo', flatController.updateFlat);

module.exports = router;
