const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
require('dotenv').config();

const { sequelize, User } = require('./models');

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user-specific room
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible in routes
app.set('io', io);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connection and server start
const PORT = process.env.PORT || 3000;

sequelize.authenticate()
  .then(() => {
    console.log('Database connected');
    // Sync database for development/testing
    return sequelize.sync();
  })
  .then(async () => {
    console.log('Database synced');
    // Seed cafeterias
    const { Cafeteria } = require('./models');
    const cafeterias = [
      { id: 'pauls-cafe', name: 'Paul Caffe' },
      { id: 'cafelater', name: 'Cafelater' },
      { id: 'sironi-student', name: 'Sironi Student Center' },
      { id: 'sironi-humanity', name: 'Sironi Humanity' }
    ];
    for (const cafe of cafeterias) {
      const exists = await Cafeteria.findOne({ where: { id: cafe.id } });
      if (!exists) {
        await Cafeteria.create(cafe);
      }
    }
    console.log('Cafeterias seeded');

    // Seed admin users for each cafeteria
    const adminUsers = [
      { id: 'admin-paul-caffe', name: 'Paul Caffe Admin', email: 'pauladmin@campus.com', password: 'PaulAdmin2024!', cafeteria_id: 'pauls-cafe' },
      { id: 'admin-cafelater', name: 'Cafelater Admin', email: 'cafelateradmin@campus.com', password: 'CafeLater2024!', cafeteria_id: 'cafelater' },
      { id: 'admin-sironi-student', name: 'Sironi Student Admin', email: 'sironistudentadmin@campus.com', password: 'SironiStudent2024!', cafeteria_id: 'sironi-student' },
      { id: 'admin-sironi-humanity', name: 'Sironi Humanity Admin', email: 'sironihumanityadmin@campus.com', password: 'SironiHumanity2024!', cafeteria_id: 'sironi-humanity' }
    ];
    for (const admin of adminUsers) {
      const exists = await User.findOne({ where: { email: admin.email } });
      if (!exists) {
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        await User.create({
          id: admin.id,
          name: admin.name,
          email: admin.email,
          password_hash: hashedPassword,
          role: 'admin',
          cafeteria_id: admin.cafeteria_id
        });
      }
    }
    console.log('Admin users seeded');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err);
  });

module.exports = app;