const pool = require('../../db');

// Inserts a new message into the chat table
const sendMessage = async (req, res) => {
  const senderId = req.user.sub;
  const { productId, receiverId, messageText } = req.body;

  if (!productId || !receiverId || !messageText) {
    return res.status(400).json({ message: 'productId, receiverId, and messageText are required' });
  }

  if (senderId === receiverId) {
    return res.status(400).json({ message: 'You cannot send a message to yourself' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.chat (product_id, sender_id, receiver_id, message_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [productId, senderId, receiverId, messageText]
    );

    res.status(201).json({
      message: 'Message sent successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Returns all unique conversations for the logged-in user, grouped by product and other person,
// with the latest message preview and unread count
const getConversations = async (req, res) => {
  const userId = req.user.sub;

  try {
    const result = await pool.query(
      `WITH convos AS (
         SELECT
           c.product_id,
           CASE WHEN c.sender_id = $1 THEN c.receiver_id ELSE c.sender_id END AS other_user_id,
           MAX(c.sent_at) AS last_message_at,
           COUNT(*) FILTER (WHERE c.receiver_id = $1 AND c.is_read = false) AS unread_count
         FROM public.chat c
         WHERE c.sender_id = $1 OR c.receiver_id = $1
         GROUP BY c.product_id, other_user_id
       )
       SELECT
         cv.product_id,
         p.name AS product_name,
         cv.other_user_id,
         u.name AS other_user_name,
         cv.last_message_at,
         cv.unread_count,
         (
           SELECT message_text
           FROM public.chat sub
           WHERE sub.product_id = cv.product_id
             AND (
               (sub.sender_id = $1 AND sub.receiver_id = cv.other_user_id)
               OR
               (sub.receiver_id = $1 AND sub.sender_id = cv.other_user_id)
             )
           ORDER BY sub.sent_at DESC
           LIMIT 1
         ) AS last_message_text
       FROM convos cv
       JOIN public.users    u ON u.id = cv.other_user_id
       JOIN public.products p ON p.product_id = cv.product_id
       ORDER BY cv.last_message_at DESC`,
      [userId]
    );

    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('getConversations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Returns all messages between the logged-in user and one other user for a specific product,
// ordered oldest to newest
const getThread = async (req, res) => {
  const { productId, otherUserId } = req.params;
  const userId = req.user.sub;

  try {
    const result = await pool.query(
      `SELECT
         message_id,
         sender_id,
         receiver_id,
         message_text,
         sent_at,
         is_read
       FROM public.chat
       WHERE product_id = $1
         AND (
           (sender_id = $2 AND receiver_id = $3)
           OR
           (sender_id = $3 AND receiver_id = $2)
         )
       ORDER BY sent_at ASC`,
      [productId, userId, otherUserId]
    );

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('getThread error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Marks all unread messages sent to the logged-in user in a thread as read
const markAsRead = async (req, res) => {
  const { productId, otherUserId } = req.params;
  const userId = req.user.sub;

  try {
    const result = await pool.query(
      `UPDATE public.chat
       SET    is_read = true
       WHERE  product_id  = $1
         AND  receiver_id = $2
         AND  sender_id   = $3
         AND  is_read     = false
       RETURNING message_id`,
      [productId, userId, otherUserId]
    );

    res.json({
      message: 'Messages marked as read',
      updatedCount: result.rowCount,
    });
  } catch (error) {
    console.error('markAsRead error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { sendMessage, getConversations, getThread, markAsRead };
