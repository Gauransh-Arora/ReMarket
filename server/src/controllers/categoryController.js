const pool = require('../../db');

const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT category_id as id, name FROM public.categories ORDER BY name ASC'
    );

    res.json({ categories: result.rows });
  } catch (error) {
    console.error('getCategories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getCategories };
