const pool = require('../../db');


const checkout = async (req, res) => {
    const { product_id, offer_id, final_price, seller_id } = req.body;
    const buyer_id = req.user.sub;

    if (!product_id || !final_price || !seller_id) {
        return res.status(400).json({ message: 'Product ID, Final Price, and Seller ID are required' });
    }

    try {
        await pool.query(
            'CALL public.sp_finalize_deal($1, $2, $3, $4, $5)',
            [product_id, buyer_id, seller_id, offer_id || null, final_price]
        );

        res.status(200).json({ message: 'Transaction completed successfully' });
    } catch (err) {
        console.error('Checkout error:', err);
        if (err.message.includes('TRANSACTION_ERROR')) {
            return res.status(409).json({ message: 'Product is no longer available (Double Selling prevented)' });
        }
        res.status(500).json({ error: err.message });
    }
};

const getMyTransactions = async (req, res) => {
    const userId = req.user.sub;
    try {
        const result = await pool.query(
            `SELECT t.transaction_id, p.name as product_name, t.final_price, t.transaction_date, t.status,
             CASE WHEN t.buyer_id = $1 THEN 'Bought' ELSE 'Sold' END as role
             FROM public.transactions t
             JOIN public.products p ON t.product_id = p.product_id
             WHERE t.buyer_id = $1 OR t.seller_id = $1
             ORDER BY t.transaction_date DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { checkout, getMyTransactions };
