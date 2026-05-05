const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.post('/', offerController.placeOffer);
router.get('/my-offers', offerController.getMyOffers);
router.post('/respond', offerController.respondToOffer);

module.exports = router;
