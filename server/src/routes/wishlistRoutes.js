const express = require('express');
const router = express.Router();
const { addToWishlist, getWishlist, removeFromWishlist } = require('../controllers/wishlistController');

router.post('/', addToWishlist);
router.get('/', getWishlist);
router.delete('/:product_id', removeFromWishlist);

module.exports = router;