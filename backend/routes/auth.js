const express = require('express');
const { register, login, updateProfile } = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.put('/profile', authenticate, updateProfile);

module.exports = router;