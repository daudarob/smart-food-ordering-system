const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // TODO: Move to config

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const updateProfileSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().allow(''),
  address: Joi.string().allow('')
});

const register = async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password, name } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // For testing, make the first user admin
    const userCount = await User.count();
    const role = userCount === 0 ? 'admin' : 'user';

    const user = await User.create({
      email,
      password_hash: hashedPassword,
      name,
      role
    });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ userId: user.id, token, name: user.name, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    console.log('LOGIN FUNCTION STARTED');
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`);

    const user = await User.findOne({ where: { email } });
    console.log(`User found: ${!!user}`);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    console.log(`User password_hash: ${user.password_hash ? 'exists' : 'null/undefined'}`);
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log(`Password valid: ${isValidPassword}`);
    if (!isValidPassword) return res.status(401).json({ error: 'Invalid credentials' });

    console.log('Reached after password validation');
    console.log('User object:', { id: user.id, role: user.role, cafeteria_id: user.cafeteria_id });
    console.log('About to sign JWT for user:', user.id);
    console.log('JWT_SECRET exists:', !!JWT_SECRET);
    const token = jwt.sign({ id: user.id, role: user.role, cafeteria_id: user.cafeteria_id }, JWT_SECRET, { expiresIn: '24h' });
    console.log('JWT signed successfully, token length:', token.length);

    const responseData = { userId: user.id, token, name: user.name, role: user.role, cafeteria_id: user.cafeteria_id };
    console.log('Sending response...');
    res.json(responseData);
    console.log('Response sent');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { error } = updateProfileSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, phone, address } = req.body;
    const userId = req.user.id; // From auth middleware

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ name, phone, address });

    res.json({ message: 'Profile updated successfully', user: { id: user.id, name: user.name, email: user.email, phone: user.phone, address: user.address } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { register, login, updateProfile };