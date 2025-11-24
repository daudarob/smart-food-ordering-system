const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration for SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,

  // SQLite-specific options
  dialectOptions: {
    // Enable foreign key constraints
    foreign_keys: true,
  },

  // Pool settings for SQLite (simplified)
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },

  // Define options
  define: {
    timestamps: true,
    underscored: true,
  },
});

// Test connection with retry logic
const connectWithRetry = async (maxRetries = 5) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
      return;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error.message);

      if (i === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.pow(2, i) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Handle connection errors (Sequelize v6+)
// Note: Error handling is managed through the authenticate method and retry logic

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connection...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connection...');
  await sequelize.close();
  process.exit(0);
});

module.exports = { sequelize, connectWithRetry };