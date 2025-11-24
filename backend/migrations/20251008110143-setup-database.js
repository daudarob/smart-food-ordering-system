'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // For SQLite, we don't need UUID extensions or custom enums
    // The ENUM types are handled by Sequelize for SQLite
    // This migration is primarily for PostgreSQL
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      // Enable UUID extension
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

      // Create enums
      await queryInterface.sequelize.query("CREATE TYPE user_role AS ENUM ('user', 'admin');");
      await queryInterface.sequelize.query("CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');");
      await queryInterface.sequelize.query("CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');");
    }
  },

  async down (queryInterface, Sequelize) {
    // Drop enums
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS payment_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS order_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS user_role;');

    // Drop extension (optional, as it might be used elsewhere)
    // await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS "uuid-ossp";');
  }
};
