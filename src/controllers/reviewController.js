const pool = require('../../db');

const submitReview = async (req, res) => {
    const { transaction_id, rating, comment } = req.body;
    const reviewer_id = req.user.sub;
    try {
        await pool.query(
            'CALL submit_review($1, $2, $3, $4)',
            [transaction_id, reviewer_id, rating, comment]
        );
        res.status(201).json({ message: 'Review submitted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getUserReviews = async (req, res) => {
    const { user_id } = req.params;
    try {
        const result = await pool.query(
            `SELECT u.name AS reviewer, r.rating, r.comment
             FROM reviews r
             JOIN users u ON r.reviewer_id = u.id
             WHERE r.reviewee_id = $1
             ORDER BY r.review_id DESC`,
            [user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getUserRatingSummary = async (req, res) => {
    const { user_id } = req.params;
    try {
        const result = await pool.query(
            `SELECT
                COALESCE(AVG(r.rating), 0) AS avg_rating,
                COUNT(r.review_id) AS total_reviews,
                CASE
                    WHEN AVG(r.rating) >= 4 THEN 'Good'
                    WHEN AVG(r.rating) >= 2 THEN 'Average'
                    ELSE 'Poor'
                END AS rating_status
             FROM reviews r
             WHERE r.reviewee_id = $1`,
            [user_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { submitReview, getUserReviews, getUserRatingSummary };