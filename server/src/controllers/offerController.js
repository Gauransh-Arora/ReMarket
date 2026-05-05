const pool = require('../../db');

/**
 * Place a new offer on a product.
 * This is gated by the trg_enforce_sunday_offers trigger in the DB.
 */
const placeOffer = async (req, res) => {
    const { product_id, offered_price } = req.body;
    const buyer_id = req.user.sub;

    if (!product_id || !offered_price) {
        return res.status(400).json({ message: 'Product ID and Offered Price are required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO public.offers (product_id, buyer_id, offered_price, offer_status)
             VALUES ($1, $2, $3, 'Pending')
             RETURNING *`,
            [product_id, buyer_id, offered_price]
        );

        res.status(201).json({ 
            message: 'Offer placed successfully!', 
            offer: result.rows[0] 
        });
    } catch (err) {
        console.error('Place offer error:', err);
        // Custom handling for the Sunday-only trigger exception
        if (err.message.includes('OFFER_RESTRICTION')) {
            return res.status(403).json({ 
                message: 'Campus Policy: Negotiations and offers are only permitted on Sundays.' 
            });
        }
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get offers related to the user (either sent or received).
 */
const getMyOffers = async (req, res) => {
    const userId = req.user.sub;
    try {
        const result = await pool.query(
            `SELECT 
                o.offer_id, o.offered_price, o.offer_date, o.offer_status,
                p.name as product_name, p.product_id, p.price as original_price,
                u_buyer.name as buyer_name, u_seller.name as seller_name,
                p.seller_id, o.buyer_id
             FROM public.offers o
             JOIN public.products p ON o.product_id = p.product_id
             JOIN public.users u_buyer ON o.buyer_id = u_buyer.id
             JOIN public.users u_seller ON p.seller_id = u_seller.id
             LEFT JOIN public.transactions t ON t.offer_id = o.offer_id
             WHERE (o.buyer_id = $1 OR p.seller_id = $1)
               AND t.transaction_id IS NULL
             ORDER BY o.offer_date DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Get offers error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Respond to an offer (Accept/Reject).
 */
const respondToOffer = async (req, res) => {
    const { offer_id, action } = req.body; // action: 'Accepted' or 'Rejected'
    const seller_id = req.user.sub;

    if (!offer_id || !['Accepted', 'Rejected'].includes(action)) {
        return res.status(400).json({ message: 'Valid offer_id and action (Accepted/Rejected) required' });
    }

    try {
        const result = await pool.query(
            `UPDATE public.offers o
             SET offer_status = $1
             FROM public.products p
             WHERE o.offer_id = $2 AND o.product_id = p.product_id AND p.seller_id = $3
             RETURNING o.*, p.name as product_name`,
            [action, offer_id, seller_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Offer not found or unauthorized' });
        }

        res.json({ message: `Offer ${action.toLowerCase()} successfully`, offer: result.rows[0] });
    } catch (err) {
        console.error('Respond to offer error:', err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { placeOffer, getMyOffers, respondToOffer };
