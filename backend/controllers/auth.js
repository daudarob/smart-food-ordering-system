const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { User, sequelize } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123456789012345678901234567890123456789012345678901234567890';

const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required(),
  password: Joi.string()
    .min(8)
    .max(50)
    .when('$role', {
      is: Joi.valid('student', 'staff'),
      then: Joi.string()
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
        .messages({
          'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        }),
      otherwise: Joi.string()
        .pattern(/^(?=.*[a-z])(?=.*\d)/)
        .messages({
          'string.pattern.base': 'Password must contain at least one lowercase letter and one number'
        })
    })
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 50 characters'
    }),
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters'
    })
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
  const logger = require('../config/logger');
  try {
    // Determine role first to apply correct validation
    const { email, password, name } = req.body;
    let role = 'student';
    const emailDomain = email.split('@')[1].toLowerCase();

    if (emailDomain === 'campus.com') {
      role = 'cafeteria_admin';
    } else if (emailDomain === 'usiu.ac.ke') {
      const localPart = email.split('@')[0];
      if (localPart.includes('staff') || localPart.includes('admin') || localPart.includes('faculty')) {
        role = 'staff';
      } else {
        role = 'student';
      }
    } else if (['daystar.ac.ke', 'uonbi.ac.ke', 'strathmore.edu'].includes(emailDomain)) {
      role = 'student';
    }

    const { error } = registerSchema.validate(req.body, { context: { role } });
    if (error) {
      logger.warn('Registration validation failed', {
        error: error.details[0].message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check for existing user with proper error handling
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      logger.warn('Registration attempt with existing email', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email address already exists. Please use a different email or try logging in instead.'
      });
    }

    // Skip password uniqueness check for now to allow registration

    const hashedPassword = await bcrypt.hash(password, 10);

    // Validate email domain for students/staff only
    if (role !== 'cafeteria_admin' && !['usiu.ac.ke', 'daystar.ac.ke', 'uonbi.ac.ke', 'strathmore.edu'].includes(emailDomain)) {
      logger.warn('Registration attempt with invalid email domain', {
        email,
        domain: emailDomain,
        ip: req.ip
      });
      return res.status(400).json({
        error: 'Email must be a valid university-affiliated email address (@usiu.ac.ke, @daystar.ac.ke, @uonbi.ac.ke, or @strathmore.edu)'
      });
    }

    // For testing/development, make the first user admin if no admins exist
    if (role === 'student') {
      const adminCount = await User.count({ where: { role: 'cafeteria_admin' } });
      if (adminCount === 0) {
        role = 'cafeteria_admin'; // First user becomes admin for testing
      }
    }

    const user = await User.create({
      email,
      password_hash: hashedPassword,
      name,
      role
    });

    const token = jwt.sign({ id: user.id, role: user.role, cafeteria_id: user.cafeteria_id }, JWT_SECRET, { expiresIn: '168h' });

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip
    });

    res.status(201).json({
      userId: user.id,
      token,
      name: user.name,
      role: user.role,
      email: user.email,
      message: 'Account created successfully. You can now log in with your credentials.'
    });
  } catch (error) {
    logger.error('Registration failed', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  const logger = require('../config/logger');
  try {
    logger.info('Login attempt started', {
      email: req.body?.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const { error } = loginSchema.validate(req.body);
    if (error) {
      logger.warn('Login validation failed', {
        error: error.details[0].message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = req.body;
    logger.debug('Login validation passed', { email });

    // Fetch user from database using raw query to avoid Sequelize interference with password_hash
    const [users] = await sequelize.query(
      'SELECT id, email, password_hash, name, role, cafeteria_id FROM users WHERE email = ?',
      { replacements: [email] }
    );

    logger.debug('Database query result', { userCount: users.length, email });

    if (users.length === 0) {
      logger.warn('Login attempt with non-existent email', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    logger.debug('User found in database', { userId: user.id, email: user.email, role: user.role });

    logger.debug('Password hash check', {
      hasPasswordHash: user.password_hash !== null && user.password_hash !== undefined,
      passwordHashLength: user.password_hash ? user.password_hash.length : 0,
      email
    });

    if (!user.password_hash) {
      logger.warn('Login attempt with user having no password hash', {
        email,
        userId: user.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ error: 'This account was created via OAuth integration and does not support password login. Please use the appropriate OAuth provider or contact support.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    logger.debug('Password comparison result', { isValidPassword, email });

    if (!isValidPassword) {
      logger.warn('Login attempt with invalid password', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, cafeteria_id: user.cafeteria_id }, JWT_SECRET);
    logger.debug('JWT token generated', { userId: user.id, email });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip
    });

    const responseData = {
      userId: user.id,
      token,
      name: user.name,
      role: user.role,
      email: user.email,
      cafeteria_id: user.cafeteria_id
    };
    res.json(responseData);
  } catch (error) {
    logger.error('Login failed', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    // Don't expose internal error details to client
    res.status(500).json({ error: 'Authentication service temporarily unavailable. Please try again later.' });
  }
};

const updateProfile = async (req, res) => {
  const logger = require('../config/logger');
  try {
    const { error } = updateProfileSchema.validate(req.body);
    if (error) {
      logger.warn('Profile update validation failed', {
        error: error.details[0].message,
        userId: req.user?.id,
        ip: req.ip
      });
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, phone, address } = req.body;
    const userId = req.user.id; // From auth middleware

    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn('Profile update attempted for non-existent user', {
        userId,
        ip: req.ip
      });
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update({ name, phone, address });

    logger.info('Profile updated successfully', {
      userId,
      email: user.email,
      ip: req.ip
    });

    res.json({ message: 'Profile updated successfully', user: { id: user.id, name: user.name, email: user.email, phone: user.phone, address: user.address, profile_picture: user.profile_picture } });
  } catch (error) {
    logger.error('Profile update failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: req.ip
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const changePassword = async (req, res) => {
  const logger = require('../config/logger');
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      logger.warn('Password change validation failed - missing fields', {
        userId: req.user?.id,
        ip: req.ip
      });
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      logger.warn('Password change validation failed - password too short', {
        userId: req.user?.id,
        ip: req.ip
      });
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn('Password change attempted for non-existent user', {
        userId,
        ip: req.ip
      });
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      logger.warn('Password change failed - incorrect current password', {
        userId,
        email: user.email,
        ip: req.ip
      });
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password_hash: hashedNewPassword });

    logger.info('Password changed successfully', {
      userId,
      email: user.email,
      ip: req.ip
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Password change failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: req.ip
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const verifyToken = async (req, res) => {
  const logger = require('../config/logger');
  try {
    // If we reach here, the token is valid (checked by authenticate middleware)
    const user = await User.findByPk(req.user.id);
    if (!user) {
      logger.warn('Token verification failed - user not found', {
        userId: req.user.id,
        ip: req.ip
      });
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('Token verified successfully', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      cafeteria_id: user.cafeteria_id
    });
  } catch (error) {
    logger.error('Token verification failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: req.ip
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profiles');
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with user ID
    const userId = req.user.id;
    const extension = path.extname(file.originalname);
    const filename = `profile_${userId}_${Date.now()}${extension}`;
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const uploadProfilePicture = async (req, res) => {
  const logger = require('../config/logger');
  try {
    const userId = req.user.id;

    if (!req.file) {
      logger.warn('Profile picture upload failed - no file provided', {
        userId,
        ip: req.ip
      });
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Delete old profile picture if exists
    const user = await User.findByPk(userId);
    if (user && user.profile_picture) {
      const oldPath = path.join(__dirname, '../', user.profile_picture);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
          logger.info('Old profile picture deleted', {
            userId,
            oldPath: user.profile_picture
          });
        } catch (deleteError) {
          logger.warn('Failed to delete old profile picture', {
            userId,
            oldPath: user.profile_picture,
            error: deleteError.message
          });
        }
      }
    }

    // Update user with new profile picture path
    const profilePicturePath = `uploads/profiles/${req.file.filename}`;
    await User.update(
      { profile_picture: profilePicturePath },
      { where: { id: userId } }
    );

    logger.info('Profile picture uploaded successfully', {
      userId,
      filename: req.file.filename,
      size: req.file.size,
      ip: req.ip
    });

    res.json({
      message: 'Profile picture uploaded successfully',
      profile_picture: profilePicturePath
    });
  } catch (error) {
    logger.error('Profile picture upload failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      filename: req.file?.filename,
      ip: req.ip
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};


const addToFavorites = async (req, res) => {
  const logger = require('../config/logger');
  try {
    const { menuItemId } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const favorites = user.favorites || [];
    if (!favorites.includes(menuItemId)) {
      favorites.push(menuItemId);
      await user.update({ favorites });
    }

    logger.info('Added to favorites', { userId, menuItemId });
    res.json({ message: 'Added to favorites', favorites });
  } catch (error) {
    logger.error('Add to favorites failed', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const removeFromFavorites = async (req, res) => {
  const logger = require('../config/logger');
  try {
    const { menuItemId } = req.params;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const favorites = user.favorites || [];
    const updatedFavorites = favorites.filter(id => id !== menuItemId);
    await user.update({ favorites: updatedFavorites });

    logger.info('Removed from favorites', { userId, menuItemId });
    res.json({ message: 'Removed from favorites', favorites: updatedFavorites });
  } catch (error) {
    logger.error('Remove from favorites failed', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getFavorites = async (req, res) => {
  const logger = require('../config/logger');
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const favorites = user.favorites || [];
    res.json({ favorites });
  } catch (error) {
    logger.error('Get favorites failed', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { register, login, updateProfile, verifyToken, changePassword, uploadProfilePicture, upload, addToFavorites, removeFromFavorites, getFavorites };