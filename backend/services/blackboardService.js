const axios = require('axios');
const { User } = require('../models');
const logger = require('../config/logger');

class BlackboardService {
  constructor() {
    this.clientId = process.env.BLACKBOARD_CLIENT_ID;
    this.clientSecret = process.env.BLACKBOARD_CLIENT_SECRET;
    this.authUrl = process.env.BLACKBOARD_AUTH_URL;
    this.tokenUrl = process.env.BLACKBOARD_TOKEN_URL;
    this.userInfoUrl = process.env.BLACKBOARD_USER_INFO_URL;
    this.redirectUri = process.env.BLACKBOARD_REDIRECT_URI;
  }

  // Generate authorization URL for Blackboard OAuth
  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'read',
      state: state
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async getAccessToken(code) {
    try {
      const response = await axios.post(this.tokenUrl, {
        grant_type: 'authorization_code',
        code: code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get Blackboard access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Blackboard');
    }
  }

  // Get user information from Blackboard
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get(`${this.userInfoUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get Blackboard user info:', error.response?.data || error.message);
      throw new Error('Failed to get user information from Blackboard');
    }
  }

  // Map Blackboard user roles to system roles
  mapBlackboardRole(blackboardUser) {
    // Check if user is a staff member (potential cafeteria admin)
    if (blackboardUser.systemRoleIds && blackboardUser.systemRoleIds.includes('Staff')) {
      // Map staff to cafeteria_admin role
      return 'cafeteria_admin';
    }

    // Default to student role
    return 'student';
  }

  // Create or update user from Blackboard data
  async provisionUser(blackboardUser) {
    try {
      const email = blackboardUser.userName + '@usiu.ac.ke'; // Blackboard username + domain
      const name = `${blackboardUser.name.given} ${blackboardUser.name.family}`;
      const role = this.mapBlackboardRole(blackboardUser);

      // Check if user already exists
      let user = await User.findOne({ where: { email } });

      if (user) {
        // Update existing user
        user.name = name;
        user.role = role; // Update role if changed
        await user.save();
        logger.info(`Updated existing Blackboard user: ${email}`);
      } else {
        // Create new user
        user = await User.create({
          email,
          name,
          role,
          // Password is not needed for OAuth users
          password_hash: null
        });
        logger.info(`Created new Blackboard user: ${email}`);
      }

      return user;
    } catch (error) {
      logger.error('Failed to provision Blackboard user:', error);
      throw new Error('Failed to create or update user account');
    }
  }

  // Validate Blackboard user has required permissions
  validateUserAccess(blackboardUser) {
    // Basic validation - user must be active
    if (!blackboardUser.availability || blackboardUser.availability.available !== 'Yes') {
      throw new Error('User account is not active');
    }

    return true;
  }
}

module.exports = new BlackboardService();