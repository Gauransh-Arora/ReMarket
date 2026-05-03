const express = require('express');
const router = express.Router();
const { submitReview, getUserReviews, getUserRatingSummary } = require('../controllers/reviewController');

router.post('/', submitReview);
router.get('/user/:user_id', getUserReviews);
router.get('/summary/:user_id', getUserRatingSummary);

module.exports = router;