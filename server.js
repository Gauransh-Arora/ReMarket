const express = require('express')
const pool = require('./db') 
require('dotenv').config()
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const authRoutes = require('./src/routes/authRoutes');
const { authenticate } = require('./src/middlewares/authMiddleware');
const chatRoutes = require('./src/routes/chatRoutes');

const app = express()
app.use(helmet());
app.use(express.json())
app.use(cookieParser());

app.use('/auth', authRoutes);
app.use('/chat', authenticate, chatRoutes);

app.get('/test', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.name, COUNT(p.product_id) as total_products
            FROM categories c
            LEFT JOIN products p ON c.category_id = p.category_id
            GROUP BY c.name
        `)
        res.json({
            user: req.user,
            data: result.rows
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})
