const bcrypt = require('bcrypt');
const { User } = require('./models');
const { sequelize } = require('./config/database');

async function updatePassword() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    const user = await User.findOne({ where: { email: 'dabdulahi@usiu.ac.ke' } });
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User role:', user.role);
    const hashedPassword = await bcrypt.hash('student123', 10);
    await user.update({ password_hash: hashedPassword });
    console.log('Password updated');
  } catch (error) {
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

updatePassword();