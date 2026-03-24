const express = require('express')
const pool = require('./db')
require('dotenv').config()

const app = express()
app.use(express.json())

// Test route — raw SQL
app.get('/test', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.name, COUNT(p.product_id) as total_products
            FROM categories c
            LEFT JOIN products p ON c.category_id = p.category_id
            GROUP BY c.name
        `)
        res.json(result.rows)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})