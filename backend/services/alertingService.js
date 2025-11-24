const logger = require('../config/logger');
const monitoringService = require('./monitoringService');

class AlertingService {
  constructor() {
    this.alerts = new Map();
    this.alertCooldown = 5 * 60 * 1000; // 5 minutes cooldown between similar alerts

    // Check for alerts every minute
    setInterval(() => this.checkAlerts(), 60000);
  }

  // Check for critical issues and send alerts
  async checkAlerts() {
    try {
      const health = await monitoringService.healthCheck();
      const metrics = monitoringService.getMetrics();

      // High error rate alert
      if (metrics.requests > 10) {
        const errorRate = metrics.errors / metrics.requests;
        if (errorRate > 0.3) { // 30% error rate
          this.sendAlert('HIGH_ERROR_RATE', {
            message: `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
            errorRate,
            totalRequests: metrics.requests,
            totalErrors: metrics.errors
          });
        }
      }

      // Slow response time alert
      if (metrics.averageResponseTime > 5000) { // 5 seconds average
        this.sendAlert('SLOW_RESPONSE_TIME', {
          message: `Slow response time: ${metrics.averageResponseTime}ms average`,
          averageResponseTime: metrics.averageResponseTime
        });
      }

      // High memory usage alert
      const memUsage = metrics.memoryUsage;
      if (memUsage.heapUsed > 800 * 1024 * 1024) { // > 800MB
        this.sendAlert('HIGH_MEMORY_USAGE', {
          message: `High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
        });
      }

      // Database connection issues (skip in development for SQLite)
      if (metrics.databaseConnections === 0 && process.env.NODE_ENV !== 'development') {
        this.sendAlert('DATABASE_DISCONNECTED', {
          message: 'Database connection lost',
          databaseConnections: metrics.databaseConnections
        });
      }

      // System health degraded
      if (health.status === 'degraded') {
        this.sendAlert('SYSTEM_DEGRADED', {
          message: 'System health degraded',
          checks: health.checks
        });
      }

    } catch (error) {
      logger.error('Error checking alerts:', error);
    }
  }

  // Send alert with cooldown to prevent spam
  sendAlert(alertType, data) {
    const now = Date.now();
    const lastAlert = this.alerts.get(alertType);

    if (lastAlert && (now - lastAlert) < this.alertCooldown) {
      return; // Still in cooldown
    }

    this.alerts.set(alertType, now);

    // Log critical alert
    logger.error(`ALERT: ${alertType}`, {
      alertType,
      ...data,
      timestamp: new Date().toISOString()
    });

    // Here you would integrate with external alerting systems:
    // - Send email notifications
    // - Send SMS alerts
    // - Integrate with Slack/Discord webhooks
    // - Send to monitoring dashboards
    // - Trigger PagerDuty/OpsGenie alerts

    this.sendExternalAlert(alertType, data);
  }

  // Send alerts to external systems
  async sendExternalAlert(alertType, data) {
    try {
      // Send to Slack webhook
      if (process.env.SLACK_WEBHOOK_URL) {
        const slackMessage = {
          text: `🚨 ALERT: ${alertType}`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `🚨 ${alertType}`
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: data.message
              }
            },
            {
              type: 'section',
              fields: Object.entries(data).map(([key, value]) => ({
                type: 'mrkdwn',
                text: `*${key}:* ${value}`
              }))
            }
          ]
        };

        // Make actual HTTP request to Slack
        const axios = require('axios');
        await axios.post(process.env.SLACK_WEBHOOK_URL, slackMessage);
        logger.info('Slack alert sent successfully');
      }

      // Send email alert using SendGrid
      if (process.env.ALERT_EMAIL && process.env.SENDGRID_API_KEY) {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const msg = {
          to: process.env.ALERT_EMAIL,
          from: process.env.SENDGRID_FROM_EMAIL || 'alerts@sfo-system.com',
          subject: `🚨 SFO System Alert: ${alertType}`,
          html: `
            <h2>${alertType}</h2>
            <p>${data.message}</p>
            <ul>
              ${Object.entries(data).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('')}
            </ul>
            <p><em>Timestamp: ${new Date().toISOString()}</em></p>
          `,
        };

        await sgMail.send(msg);
        logger.info('Email alert sent successfully');
      }

      // Send SMS alert using Twilio
      if (process.env.TWILIO_ACCOUNT_SID && process.env.ALERT_PHONE_NUMBER) {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        await client.messages.create({
          body: `🚨 SFO ALERT: ${alertType} - ${data.message}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: process.env.ALERT_PHONE_NUMBER
        });

        logger.info('SMS alert sent successfully');
      }

    } catch (error) {
      logger.error('Failed to send external alert:', error);
    }
  }

  // Manual alert trigger (for testing or custom alerts)
  triggerAlert(alertType, message, data = {}) {
    this.sendAlert(alertType, { message, ...data });
  }

  // Get current alert status
  getAlertStatus() {
    const alerts = {};
    for (const [type, timestamp] of this.alerts.entries()) {
      alerts[type] = {
        lastTriggered: new Date(timestamp).toISOString(),
        cooldownRemaining: Math.max(0, this.alertCooldown - (Date.now() - timestamp))
      };
    }
    return alerts;
  }
}

module.exports = new AlertingService();