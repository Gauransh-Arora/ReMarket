const pool = require('../../db');

const addToWishlist = async (req, res) => {
    const { product_id } = req.body;
    const user_id = req.user.sub;
    try {
        await pool.query(
            'INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2)',
            [user_id, product_id]
        );
        res.status(201).json({ message: 'Added to wishlist' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getWishlist = async (req, res) => {
    const user_id = req.user.sub;
    try {
        const result = await pool.query(
            `SELECT w.wishlist_id, p.product_id, p.name, p.price, p.status, w.added_at
             FROM wishlist w
             JOIN products p ON w.product_id = p.product_id
             WHERE w.user_id = $1`,
            [user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const removeFromWishlist = async (req, res) => {
    const { product_id } = req.params;
    const user_id = req.user.sub;
    try {
        await pool.query(
            'DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2',
            [user_id, product_id]
        );
        res.json({ message: 'Removed from wishlist' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

module.exports = { addToWishlist, getWishlist, removeFromWishlist };