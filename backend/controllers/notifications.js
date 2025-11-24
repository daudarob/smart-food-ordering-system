const { Notification } = require('../models');
const notificationService = require('../services/notificationService');

const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      order: [['created_at', 'DESC']],
      limit: 100
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ error: 'Failed to fetch notification' });
  }
};

const createNotification = async (req, res) => {
  try {
    const { type, title, message, recipient_id, order_id } = req.body;

    const notification = await Notification.create({
      type,
      title,
      message,
      recipient_id,
      order_id,
      status: 'unread',
      created_at: new Date()
    });

    // Send real-time notification if WebSocket is available
    if (global.io) {
      global.io.to(`user_${recipient_id}`).emit('notification', {
        id: notification.id,
        type,
        title,
        message,
        order_id,
        created_at: notification.created_at
      });
    }

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notification.update({ status: 'read' });
    res.json(notification);
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { status: 'read' },
      { where: { status: 'unread' } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notification.destroy();
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

const sendOrderStatusNotification = async (orderId, userId, status) => {
  try {
    const notification = await Notification.create({
      type: 'order_status',
      title: 'Order Status Update',
      message: `Your order #${orderId} status has been updated to: ${status}`,
      recipient_id: userId,
      order_id: orderId,
      status: 'unread',
      created_at: new Date()
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`user_${userId}`).emit('notification', {
        id: notification.id,
        type: 'order_status',
        title: 'Order Status Update',
        message: `Your order #${orderId} status has been updated to: ${status}`,
        order_id: orderId,
        created_at: notification.created_at
      });
    }

    return notification;
  } catch (error) {
    console.error('Error sending order status notification:', error);
    throw error;
  }
};

module.exports = {
  getAllNotifications,
  getNotificationById,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendOrderStatusNotification
};