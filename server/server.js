const express = require('express')
const cors = require('cors')
const pool = require('./db') 
const path = require('path')
require('dotenv').config()
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const authRoutes = require('./src/routes/authRoutes');
const { authenticate } = require('./src/middlewares/authMiddleware');
const chatRoutes = require('./src/routes/chatRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const productRoutes = require('./src/routes/productRoutes');
const wishlistRoutes = require('./src/routes/wishlistRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const http = require('http');
const { Server } = require('socket.io');

const app = express()
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});


app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json())
app.use(cookieParser());

app.use('/auth', authRoutes)
app.use('/chat', authenticate, chatRoutes)
app.use('/categories', categoryRoutes)
app.use('/products', productRoutes)
app.use('/wishlist', authenticate, wishlistRoutes)
app.use('/reviews', authenticate, reviewRoutes)
app.use('/cart', authenticate, cartRoutes)
app.use('/transactions', authenticate, transactionRoutes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/test', async (req, res) => {
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


io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})
