const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/transportLog.controller');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', ctrl.list);

module.exports = router;
