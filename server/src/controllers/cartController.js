const pool = require('../../db');

const addToCart = async (req, res) => {
    const { product_id } = req.body;
    const user_id = req.user.sub;
    try {
        const existing = await pool.query(
            'SELECT 1 FROM public.cart WHERE user_id = $1 AND product_id = $2',
            [user_id, product_id]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Item already in cart' });
        }

        await pool.query(
            'INSERT INTO public.cart (user_id, product_id) VALUES ($1, $2)',
            [user_id, product_id]
        );
        res.status(201).json({ message: 'Added to cart' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getCart = async (req, res) => {
    const user_id = req.user.sub;
    try {
        const result = await pool.query(
            `SELECT c.cart_id, p.product_id, p.name, p.price, p.seller_id, p.status, p.image_url, c.added_at
             FROM public.cart c
             JOIN public.products p ON c.product_id = p.product_id
             WHERE c.user_id = $1`,
            [user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const removeFromCart = async (req, res) => {
    const { product_id } = req.params;
    const user_id = req.user.sub;
    try {
        await pool.query(
            'DELETE FROM public.cart WHERE user_id = $1 AND product_id = $2',
            [user_id, product_id]
        );
        res.json({ message: 'Removed from cart' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

module.exports = { addToCart, getCart, removeFromCart };
