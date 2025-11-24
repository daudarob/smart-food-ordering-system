const { Sequelize } = require('sequelize');
const config = require('./config/config.js');

const sequelize = new Sequelize(config.development);

async function checkSeeders() {
  try {
    await sequelize.authenticate();
    console.log('Connection established.');

    const users = await sequelize.query('SELECT * FROM users', { type: Sequelize.QueryTypes.SELECT });
    console.log('Users:', users);

    const cafeterias = await sequelize.query('SELECT * FROM cafeterias', { type: Sequelize.QueryTypes.SELECT });
    console.log('Cafeterias:', cafeterias);

    const categories = await sequelize.query('SELECT * FROM categories', { type: Sequelize.QueryTypes.SELECT });
    console.log('Categories:', categories);

    const menuItems = await sequelize.query('SELECT * FROM menu_items', { type: Sequelize.QueryTypes.SELECT });
    console.log('Menu Items:', menuItems);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkSeeders();