const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/', chatController.sendMessage);
router.get('/conversations', chatController.getConversations);
router.get('/thread/:productId/:otherUserId', chatController.getThread);
router.patch('/read/:productId/:otherUserId', chatController.markAsRead);

module.exports = router;