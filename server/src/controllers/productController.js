const pool = require('../../db');

const getProducts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.product_id as id, p.name, p.description, p.price, p.seller_id,
        u.name as seller_name, c.name as category, p.status, p.image_url
      FROM products p
      LEFT JOIN users u ON u.id = p.seller_id
      LEFT JOIN categories c ON c.category_id = p.category_id
      WHERE p.status = 'available'
      ORDER BY p.created_at DESC
    `);

    res.json({ products: result.rows });
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getMyProducts = async (req, res) => {
  const userId = req.user.sub;
  try {
    const result = await pool.query(`
      SELECT 
        p.product_id as id,
        p.name,
        p.description,
        p.price,
        p.condition,
        c.name as category,
        p.status,
        p.created_at
      FROM public.products p
      JOIN public.categories c ON c.category_id = p.category_id
      WHERE p.seller_id = $1
      ORDER BY p.created_at DESC
    `, [userId]);

    res.json({ products: result.rows });
  } catch (error) {
    console.error('getMyProducts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const addProduct = async (req, res) => {
  const sellerId = req.user.sub;
  const { name, description, price, categoryId, condition } = req.body;

  if (!name || !price || !categoryId) {
    return res.status(400).json({ message: 'Name, price, and categoryId are required' });
  }

  try {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(`
      INSERT INTO public.products (seller_id, category_id, name, description, price, condition, status, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, 'available', $7)
      RETURNING product_id as id, name
    `, [sellerId, categoryId, name, description, price, condition || 'Good', imageUrl]);

    res.status(201).json({ 
      message: 'Product listed successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('addProduct error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteProduct = async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM public.products WHERE product_id = $1 AND seller_id = $2 RETURNING name',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product not found or you are not the seller' });
    }

    res.json({ message: `Product "${result.rows[0].name}" deleted successfully` });
  } catch (error) {
    console.error('deleteProduct error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateProduct = async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.params;
  const { name, description, price, categoryId, condition, status } = req.body;

  try {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    
    let query = 'UPDATE public.products SET name = name'; // Dummy start
    const params = [id, userId];
    let count = 3;

    if (name) { query += `, name = $${count++}`; params.push(name); }
    if (description) { query += `, description = $${count++}`; params.push(description); }
    if (price) { query += `, price = $${count++}`; params.push(price); }
    if (categoryId) { query += `, category_id = $${count++}`; params.push(categoryId); }
    if (condition) { query += `, condition = $${count++}`; params.push(condition); }
    if (status) { query += `, status = $${count++}`; params.push(status.toLowerCase()); }
    if (imageUrl) { query += `, image_url = $${count++}`; params.push(imageUrl); }

    query += ` WHERE product_id = $1 AND seller_id = $2 RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }

    res.json({ message: 'Product updated successfully', product: result.rows[0] });
  } catch (error) {
    console.error('updateProduct error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getProducts, getMyProducts, addProduct, updateProduct, deleteProduct };
