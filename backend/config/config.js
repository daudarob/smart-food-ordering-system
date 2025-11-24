module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: console.log
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'sfo_test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    // Additional test settings
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    }
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    // Production optimizations
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
    // Read replica configuration for load distribution
    replication: process.env.DB_READ_REPLICA_HOST ? {
      read: [
        {
          host: process.env.DB_READ_REPLICA_HOST,
          port: process.env.DB_READ_REPLICA_PORT || 5432,
          username: process.env.DB_READ_REPLICA_USER || process.env.DB_USER,
          password: process.env.DB_READ_REPLICA_PASSWORD || process.env.DB_PASSWORD,
          database: process.env.DB_READ_REPLICA_NAME || process.env.DB_NAME,
        }
      ],
      write: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
    } : undefined
  }
};