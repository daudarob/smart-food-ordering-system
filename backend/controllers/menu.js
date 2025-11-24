const Joi = require('joi');
const { MenuItem, Category, Cafeteria } = require('../models');
const { sequelize } = require('../config/database');

const createCategorySchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional()
});

const updateCategorySchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional()
});

const createMenuItemSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  price: Joi.number().positive().required(),
  category_id: Joi.string().uuid().required(),
  image_url: Joi.string().uri().optional(),
  available: Joi.boolean().optional().default(true),
  stock: Joi.number().integer().min(0).optional().default(0)
});

const updateMenuItemSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
  category_id: Joi.string().uuid().optional(),
  image_url: Joi.string().uri().optional(),
  available: Joi.boolean().optional(),
  stock: Joi.number().integer().min(0).optional()
});

const createCategory = async (req, res) => {
  const logger = require('../config/logger');
  try {
    const { error } = createCategorySchema.validate(req.body);
    if (error) {
      logger.warn('Category creation validation failed', {
        error: error.details[0].message,
        userId: req.user?.id,
        cafeteriaId: req.user?.cafeteria_id,
        ip: req.ip
      });
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, description } = req.body;
    const category = await Category.create({ name, description, cafeteria_id: req.user.cafeteria_id });

    // Invalidate menu cache when category is created
    const cacheService = require('../services/cacheService');
    await cacheService.del(`menu:all::${req.user.cafeteria_id}`);
    await cacheService.del(`menu:all::public`);

    console.log('Emitting menuUpdated event for category create');
    req.app.get('io').emit('menuUpdated');

    logger.info('Category created successfully', {
      categoryId: category.id,
      name: category.name,
      userId: req.user.id,
      cafeteriaId: req.user.cafeteria_id,
      ip: req.ip
    });

    res.status(201).json(category);
  } catch (error) {
    logger.error('Category creation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      cafeteriaId: req.user?.cafeteria_id,
      name: req.body?.name,
      ip: req.ip
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { error } = updateCategorySchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    // Check if admin owns this category
    if (req.user.role === 'cafeteria_admin' && category.cafeteria_id !== req.user.cafeteria_id) {
      return res.status(403).json({ error: 'Access denied: Category belongs to another cafeteria' });
    }

    const { name, description } = req.body;
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    await category.save();

    // Invalidate menu cache when category is updated
    const cacheService = require('../services/cacheService');
    await cacheService.del(`menu:all::${req.user.cafeteria_id}`);
    await cacheService.del(`menu:all::public`);

    console.log('Emitting menuUpdated event for category update');
    req.app.get('io').emit('menuUpdated');

    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    // Check if cafeteria admin owns this category
    if (req.user.role === 'cafeteria_admin' && category.cafeteria_id !== req.user.cafeteria_id) {
      return res.status(403).json({ error: 'Access denied: Category belongs to another cafeteria' });
    }

    await category.destroy();

    // Invalidate menu cache when category is deleted
    const cacheService = require('../services/cacheService');
    await cacheService.del(`menu:all::${req.user.cafeteria_id}`);
    await cacheService.del(`menu:all::public`);

    console.log('Emitting menuUpdated event for category delete');
    req.app.get('io').emit('menuUpdated');

    res.json({ message: 'Category deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createMenuItem = async (req, res) => {
  try {
    const { error } = createMenuItemSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, description, price, category_id, image_url, available, stock } = req.body;

    // Check if category belongs to admin's cafeteria
    if (req.user.role === 'cafeteria_admin') {
      const category = await Category.findByPk(category_id);
      if (!category || category.cafeteria_id !== req.user.cafeteria_id) {
        return res.status(403).json({ error: 'Access denied: Category belongs to another cafeteria' });
      }
    }

    const menuItem = await MenuItem.create({ name, description, price, category_id, image_url, available, stock, cafeteria_id: req.user.cafeteria_id });

    // Invalidate menu cache when menu is updated
    const cacheService = require('../services/cacheService');
    await cacheService.del(`menu:all::${req.user.cafeteria_id}`);
    await cacheService.del(`menu:all::public`);

    console.log('Emitting menuUpdated event');
    req.app.get('io').emit('menuUpdated');
    res.status(201).json(menuItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const { error } = updateMenuItemSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { id } = req.params;
    const menuItem = await MenuItem.findByPk(id);
    if (!menuItem) return res.status(404).json({ error: 'Menu item not found' });

    // Check if admin owns this menu item
    if (req.user.role === 'cafeteria_admin' && menuItem.cafeteria_id !== req.user.cafeteria_id) {
      return res.status(403).json({ error: 'Access denied: Menu item belongs to another cafeteria' });
    }

    const { name, description, price, category_id, image_url, available, stock } = req.body;

    // Check if new category belongs to admin's cafeteria
    if (req.user.role === 'cafeteria_admin' && category_id !== undefined) {
      const category = await Category.findByPk(category_id);
      if (!category || category.cafeteria_id !== req.user.cafeteria_id) {
        return res.status(403).json({ error: 'Access denied: Category belongs to another cafeteria' });
      }
    }

    // Track price change if price is being updated
    if (price !== undefined && price !== menuItem.price) {
      const { PriceHistory } = require('../models');
      await PriceHistory.create({
        menu_item_id: id,
        old_price: menuItem.price,
        new_price: price,
        change_type: 'individual',
        change_reason: 'Admin price update',
        changed_by: req.user.id,
        cafeteria_id: menuItem.cafeteria_id
      });
    }

    if (name !== undefined) menuItem.name = name;
    if (description !== undefined) menuItem.description = description;
    if (price !== undefined) menuItem.price = price;
    if (category_id !== undefined) menuItem.category_id = category_id;
    if (image_url !== undefined) menuItem.image_url = image_url;
    if (available !== undefined) menuItem.available = available;
    if (stock !== undefined) menuItem.stock = stock;
    await menuItem.save();

    // Invalidate menu cache when menu is updated
    const cacheService = require('../services/cacheService');
    await cacheService.del(`menu:all::${req.user.cafeteria_id}`);
    await cacheService.del(`menu:all::public`);

    console.log('Emitting menuUpdated event for update');
    req.app.get('io').emit('menuUpdated');
    res.json(menuItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const menuItem = await MenuItem.findByPk(id);
    if (!menuItem) return res.status(404).json({ error: 'Menu item not found' });

    // Check if admin owns this menu item
    if (req.user.role === 'cafeteria_admin' && menuItem.cafeteria_id !== req.user.cafeteria_id) {
      return res.status(403).json({ error: 'Access denied: Menu item belongs to another cafeteria' });
    }

    await menuItem.destroy();

    // Invalidate menu cache when menu is updated
    const cacheService = require('../services/cacheService');
    await cacheService.del(`menu:all::${req.user.cafeteria_id}`);
    await cacheService.del(`menu:all::public`);

    console.log('Emitting menuUpdated event for delete');
    req.app.get('io').emit('menuUpdated');
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCategories = async (req, res) => {
  try {
    const { cafeteria } = req.query;
    const where = {};

    // Determine cafeteria filter
    let cafeteriaFilter = null;
    if (cafeteria) {
      // If cafeteria is specified in query, use it (for student selection)
      cafeteriaFilter = cafeteria;
      console.log('MenuController: Filtering categories by selected cafeteria:', cafeteria);
    } else if (req.user && req.user.role === 'cafeteria_admin' && req.user.cafeteria_id) {
      cafeteriaFilter = req.user.cafeteria_id;
      console.log('MenuController: Filtering categories for cafeteria admin, cafeteria_id:', req.user.cafeteria_id);
    } else if (req.user && (req.user.role === 'student' || req.user.role === 'staff') && req.user.cafeteria_id) {
      cafeteriaFilter = req.user.cafeteria_id;
      console.log('MenuController: Filtering categories for student/staff, cafeteria_id:', req.user.cafeteria_id);
    } else {
      console.log('MenuController: No category filter applied (no user or no cafeteria assigned)');
    }

    if (cafeteriaFilter) {
      where.cafeteria_id = cafeteriaFilter;
    }

    const categories = await Category.findAll({
      where,
      attributes: ['id', 'name', 'description']
    });

    console.log('MenuController: Retrieved categories count:', categories.length);
    if (categories.length > 0) {
      console.log('MenuController: Sample categories:', categories.slice(0, 3).map(c => ({ id: c.id, name: c.name })));
    }

    res.json(categories);
  } catch (error) {
    console.error('MenuController: Error in getCategories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const cacheService = require('../services/cacheService');

const getMenuItems = async (req, res) => {
  try {
    const { category, search, cafeteria } = req.query;
    const cacheKey = `menu:${category || 'all'}:${search || ''}:${cafeteria || req.user?.cafeteria_id || 'public'}`;

    console.log('MenuController: getMenuItems called with query:', { category, search, cafeteria });
    console.log('MenuController: User info:', req.user ? { role: req.user.role, cafeteria_id: req.user.cafeteria_id } : 'No user');

    // Try to get from cache first
    const cachedMenu = await cacheService.get(cacheKey);
    if (cachedMenu) {
      console.log('MenuController: Returning cached menu items, count:', cachedMenu.length);
      return res.json(cachedMenu);
    }

    const where = { available: true };

    // Determine cafeteria filter
    let cafeteriaFilter = null;
    if (cafeteria) {
      // If cafeteria is specified in query, use it (for student selection)
      cafeteriaFilter = cafeteria;
      console.log('MenuController: Filtering by selected cafeteria:', cafeteria);
    } else if (req.user && req.user.role === 'cafeteria_admin' && req.user.cafeteria_id) {
      cafeteriaFilter = req.user.cafeteria_id;
      console.log('MenuController: Filtering for cafeteria admin, cafeteria_id:', req.user.cafeteria_id);
    } else if (req.user && req.user.role === 'student' && req.user.cafeteria_id) {
      // Students should only see menu items from their assigned cafeteria
      cafeteriaFilter = req.user.cafeteria_id;
      console.log('MenuController: Filtering for student, cafeteria_id:', req.user.cafeteria_id);
    } else {
      console.log('MenuController: No cafeteria filter applied (public access or no user)');
    }

    if (cafeteriaFilter) {
      where.cafeteria_id = cafeteriaFilter;
    }

    if (category) {
      where.category_id = category;
      console.log('MenuController: Filtering by category:', category);
    }

    if (search) {
      where.name = { [require('sequelize').Op.like]: `%${search}%` };
      console.log('MenuController: Filtering by search term:', search);
    }

    console.log('MenuController: Final where clause:', where);

    const menuItems = await MenuItem.findAll({
      where,
      include: [{
        model: Category,
        attributes: ['name'],
        required: false, // Make it a left join
        where: req.user && req.user.role === 'cafeteria_admin' && req.user.cafeteria_id ? { cafeteria_id: req.user.cafeteria_id } : undefined
      }],
      attributes: ['id', 'name', 'description', 'price', 'image_url', 'category_id', 'cafeteria_id', 'stock', 'available']
    });

    console.log('MenuController: Retrieved menu items count:', menuItems.length);
    if (menuItems.length > 0) {
      console.log('MenuController: Sample item:', {
        id: menuItems[0].id,
        name: menuItems[0].name,
        cafeteria_id: menuItems[0].cafeteria_id,
        category: menuItems[0].Category?.name
      });
    }

    // Cache the result for 10 minutes
    await cacheService.set(cacheKey, menuItems, 600);

    res.json(menuItems);
  } catch (error) {
    console.error('MenuController: Error in getMenuItems:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const menuItem = await MenuItem.findByPk(id, {
      include: [{
        model: Category,
        attributes: ['name']
      }]
    });

    if (!menuItem) return res.status(404).json({ error: 'Menu item not found' });

    res.json(menuItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCafeterias = async (req, res) => {
  try {
    const cafeterias = await Cafeteria.findAll({
      attributes: ['id', 'name', 'image_url']
    });
    res.json(cafeterias);
  } catch (error) {
    console.error('Error fetching cafeterias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPriceHistory = async (req, res) => {
  try {
    const { PriceHistory } = require('../models');
    const { page = 1, limit = 20, menu_item_id, start_date, end_date } = req.query;

    const where = { cafeteria_id: req.user.cafeteria_id };

    if (menu_item_id) {
      where.menu_item_id = menu_item_id;
    }

    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[require('sequelize').Op.gte] = new Date(start_date);
      if (end_date) where.created_at[require('sequelize').Op.lte] = new Date(end_date);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await PriceHistory.findAndCountAll({
      where,
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          attributes: ['name', 'description']
        },
        {
          model: require('../models').User,
          as: 'changedBy',
          attributes: ['name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      priceHistory: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getCategories, getMenuItems, getMenuItemById, getCafeterias, createCategory, updateCategory, deleteCategory, createMenuItem, updateMenuItem, deleteMenuItem, getPriceHistory };
