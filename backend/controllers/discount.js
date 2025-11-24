const { Discount, Category, MenuItem } = require('../models');

const createDiscount = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      value,
      scope,
      category_id,
      menu_item_id,
      start_date,
      end_date,
      usage_limit
    } = req.body;

    // Validate scope-specific requirements
    if (scope === 'category' && !category_id) {
      return res.status(400).json({ error: 'Category ID is required for category scope' });
    }
    if (scope === 'item' && !menu_item_id) {
      return res.status(400).json({ error: 'Menu item ID is required for item scope' });
    }

    // Validate date range
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (startDate >= endDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const discount = await Discount.create({
      name,
      description,
      type,
      value,
      scope,
      category_id: scope === 'category' ? category_id : null,
      menu_item_id: scope === 'item' ? menu_item_id : null,
      start_date: startDate,
      end_date: endDate,
      usage_limit: usage_limit || null,
      is_active: true
    });

    const discountWithAssociations = await Discount.findByPk(discount.id, {
      include: [
        { model: Category, as: 'category' },
        { model: MenuItem, as: 'menuItem' }
      ]
    });

    res.status(201).json(discountWithAssociations);
  } catch (error) {
    console.error('Error creating discount:', error);
    res.status(500).json({ error: 'Failed to create discount' });
  }
};

const getAllDiscounts = async (req, res) => {
  try {
    const { scope, is_active } = req.query;

    const whereClause = {};
    if (scope) whereClause.scope = scope;
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';

    const discounts = await Discount.findAll({
      where: whereClause,
      include: [
        { model: Category, as: 'category' },
        { model: MenuItem, as: 'menuItem' }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(discounts);
  } catch (error) {
    console.error('Error fetching discounts:', error);
    res.status(500).json({ error: 'Failed to fetch discounts' });
  }
};

const getDiscountById = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await Discount.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        { model: MenuItem, as: 'menuItem' }
      ]
    });

    if (!discount) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    res.json(discount);
  } catch (error) {
    console.error('Error fetching discount:', error);
    res.status(500).json({ error: 'Failed to fetch discount' });
  }
};

const updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      type,
      value,
      scope,
      category_id,
      menu_item_id,
      start_date,
      end_date,
      usage_limit,
      is_active
    } = req.body;

    const discount = await Discount.findByPk(id);
    if (!discount) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    // Validate scope-specific requirements
    if (scope === 'category' && !category_id) {
      return res.status(400).json({ error: 'Category ID is required for category scope' });
    }
    if (scope === 'item' && !menu_item_id) {
      return res.status(400).json({ error: 'Menu item ID is required for item scope' });
    }

    // Validate date range if dates are provided
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      if (startDate >= endDate) {
        return res.status(400).json({ error: 'End date must be after start date' });
      }
    }

    await discount.update({
      name,
      description,
      type,
      value,
      scope,
      category_id: scope === 'category' ? category_id : null,
      menu_item_id: scope === 'item' ? menu_item_id : null,
      start_date: start_date ? new Date(start_date) : discount.start_date,
      end_date: end_date ? new Date(end_date) : discount.end_date,
      usage_limit: usage_limit || null,
      is_active
    });

    const updatedDiscount = await Discount.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        { model: MenuItem, as: 'menuItem' }
      ]
    });

    res.json(updatedDiscount);
  } catch (error) {
    console.error('Error updating discount:', error);
    res.status(500).json({ error: 'Failed to update discount' });
  }
};

const deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await Discount.findByPk(id);
    if (!discount) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    await discount.destroy();
    res.json({ message: 'Discount deleted successfully' });
  } catch (error) {
    console.error('Error deleting discount:', error);
    res.status(500).json({ error: 'Failed to delete discount' });
  }
};

const toggleDiscountStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await Discount.findByPk(id);
    if (!discount) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    await discount.update({ is_active: !discount.is_active });

    const updatedDiscount = await Discount.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        { model: MenuItem, as: 'menuItem' }
      ]
    });

    res.json(updatedDiscount);
  } catch (error) {
    console.error('Error toggling discount status:', error);
    res.status(500).json({ error: 'Failed to toggle discount status' });
  }
};

const incrementUsageCount = async (discountId) => {
  try {
    const discount = await Discount.findByPk(discountId);
    if (discount && discount.is_active) {
      const newUsageCount = discount.usage_count + 1;

      // Check if usage limit is reached
      if (discount.usage_limit && newUsageCount >= discount.usage_limit) {
        await discount.update({
          usage_count: newUsageCount,
          is_active: false
        });
      } else {
        await discount.update({ usage_count: newUsageCount });
      }
    }
  } catch (error) {
    console.error('Error incrementing usage count:', error);
  }
};

module.exports = {
  createDiscount,
  getAllDiscounts,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
  toggleDiscountStatus,
  incrementUsageCount
};