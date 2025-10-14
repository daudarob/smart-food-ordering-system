const Joi = require('joi');
const { MenuItem, Category } = require('../models');

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
  available: Joi.boolean().optional().default(true)
});

const updateMenuItemSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  price: Joi.number().positive().optional(),
  category_id: Joi.string().uuid().optional(),
  image_url: Joi.string().uri().optional(),
  available: Joi.boolean().optional()
});

const createCategory = async (req, res) => {
  try {
    const { error } = createCategorySchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, description } = req.body;
    const category = await Category.create({ name, description, cafeteria_id: req.user.cafeteria_id });
    res.status(201).json(category);
  } catch (error) {
    console.error(error);
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
    if (req.user.role === 'admin' && category.cafeteria_id !== req.user.cafeteria_id) {
      return res.status(403).json({ error: 'Access denied: Category belongs to another cafeteria' });
    }

    const { name, description } = req.body;
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    await category.save();

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

    // Check if admin owns this category
    if (req.user.role === 'admin' && category.cafeteria_id !== req.user.cafeteria_id) {
      return res.status(403).json({ error: 'Access denied: Category belongs to another cafeteria' });
    }

    await category.destroy();
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

    const { name, description, price, category_id, image_url, available } = req.body;

    // Check if category belongs to admin's cafeteria
    if (req.user.role === 'admin') {
      const category = await Category.findByPk(category_id);
      if (!category || category.cafeteria_id !== req.user.cafeteria_id) {
        return res.status(403).json({ error: 'Access denied: Category belongs to another cafeteria' });
      }
    }

    const menuItem = await MenuItem.create({ name, description, price, category_id, image_url, available, cafeteria_id: req.user.cafeteria_id });
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
    if (req.user.role === 'admin' && menuItem.cafeteria_id !== req.user.cafeteria_id) {
      return res.status(403).json({ error: 'Access denied: Menu item belongs to another cafeteria' });
    }

    const { name, description, price, category_id, image_url, available } = req.body;

    // Check if new category belongs to admin's cafeteria
    if (req.user.role === 'admin' && category_id !== undefined) {
      const category = await Category.findByPk(category_id);
      if (!category || category.cafeteria_id !== req.user.cafeteria_id) {
        return res.status(403).json({ error: 'Access denied: Category belongs to another cafeteria' });
      }
    }

    if (name !== undefined) menuItem.name = name;
    if (description !== undefined) menuItem.description = description;
    if (price !== undefined) menuItem.price = price;
    if (category_id !== undefined) menuItem.category_id = category_id;
    if (image_url !== undefined) menuItem.image_url = image_url;
    if (available !== undefined) menuItem.available = available;
    await menuItem.save();

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
    if (req.user.role === 'admin' && menuItem.cafeteria_id !== req.user.cafeteria_id) {
      return res.status(403).json({ error: 'Access denied: Menu item belongs to another cafeteria' });
    }

    await menuItem.destroy();
    req.app.get('io').emit('menuUpdated');
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCategories = async (req, res) => {
  try {
    const where = {};
    if (req.user && req.user.role === 'admin' && req.user.cafeteria_id) {
      where.cafeteria_id = req.user.cafeteria_id;
    }
    const categories = await Category.findAll({
      where,
      attributes: ['id', 'name', 'description']
    });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMenuItems = async (req, res) => {
  try {
    const { category, search } = req.query;
    const where = { available: true };

    if (req.user && req.user.role === 'admin' && req.user.cafeteria_id) {
      where.cafeteria_id = req.user.cafeteria_id;
    }

    if (category) {
      where.category_id = category;
    }

    if (search) {
      where.name = { [require('sequelize').Op.like]: `%${search}%` };
    }

    const menuItems = await MenuItem.findAll({
      where,
      include: [{
        model: Category,
        attributes: ['name'],
        where: req.user && req.user.role === 'admin' && req.user.cafeteria_id ? { cafeteria_id: req.user.cafeteria_id } : undefined
      }],
      attributes: ['id', 'name', 'description', 'price', 'image_url', 'category_id']
    });

    res.json(menuItems);
  } catch (error) {
    console.error(error);
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

module.exports = { getCategories, getMenuItems, getMenuItemById, createCategory, updateCategory, deleteCategory, createMenuItem, updateMenuItem, deleteMenuItem };