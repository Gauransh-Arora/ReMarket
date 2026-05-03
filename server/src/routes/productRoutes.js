const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middlewares/uploadMiddleware');

const { authenticate } = require('../middlewares/authMiddleware');

router.get('/', productController.getProducts);


router.get('/my-products', authenticate, productController.getMyProducts);
router.post('/', authenticate, upload.single('image'), productController.addProduct);
router.delete('/:id', authenticate, productController.deleteProduct);
router.patch('/:id', authenticate, upload.single('image'), productController.updateProduct);

module.exports = router;
