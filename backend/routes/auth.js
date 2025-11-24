const express = require('express');
const { register, login, updateProfile, verifyToken, changePassword, uploadProfilePicture, upload, addToFavorites, removeFromFavorites, getFavorites } = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify', authenticate, verifyToken);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.post('/upload-profile-picture', authenticate, upload.single('profile_picture'), uploadProfilePicture);
router.post('/favorites', authenticate, addToFavorites);
router.delete('/favorites/:menuItemId', authenticate, removeFromFavorites);
router.get('/favorites', authenticate, getFavorites);

module.exports = router;