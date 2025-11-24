#!/usr/bin/env node

/**
 * Load Testing Script for SFO Application
 * Tests concurrent user registration and login performance
 * Simulates 10,000 USIU-A students creating accounts and logging in
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS) || 100; // Start with 100, scale up to 10000
const TOTAL_USERS = parseInt(process.env.TOTAL_USERS) || 1000; // Total users to create
const BATCH_SIZE = 50; // Process users in batches
const TEST_DURATION = 300; // 5 minutes test duration

// USIU email domains
const USIU_DOMAINS = ['@usiu.ac.ke', '@daystar.ac.ke', '@strathmore.edu', '@uonbi.ac.ke'];

// Metrics tracking
let metrics = {
  registrations: { success: 0, failed: 0, responseTimes: [] },
  logins: { success: 0, failed: 0, responseTimes: [] },
  totalRequests: 0,
  errors: [],
  startTime: null,
  endTime: null
};

// Generate random USIU student data
function generateUserData(index) {
  const domains = USIU_DOMAINS;
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const studentId = String(100000 + index).padStart(6, '0');

  return {
    email: `student${studentId}${domain}`,
    password: `Pass${studentId}!`,
    name: `Student ${studentId}`
  };
}

// Test user registration
async function testRegistration(userData) {
  const startTime = performance.now();

  try {
    const response = await axios.post(`${BASE_URL}/api/auth/register`, userData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const responseTime = performance.now() - startTime;

    if (response.status === 201) {
      metrics.registrations.success++;
      metrics.registrations.responseTimes.push(responseTime);
      return { success: true, token: response.data.token, responseTime };
    } else {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  } catch (error) {
    const responseTime = performance.now() - startTime;
    metrics.registrations.failed++;
    metrics.registrations.responseTimes.push(responseTime);

    const errorMsg = error.response?.data?.error || error.message;
    metrics.errors.push(`Registration failed for ${userData.email}: ${errorMsg}`);

    return { success: false, error: errorMsg, responseTime };
  }
}

// Test user login
async function testLogin(userData) {
  const startTime = performance.now();

  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: userData.email,
      password: userData.password
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const responseTime = performance.now() - startTime;

    if (response.status === 200) {
      metrics.logins.success++;
      metrics.logins.responseTimes.push(responseTime);
      return { success: true, responseTime };
    } else {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  } catch (error) {
    const responseTime = performance.now() - startTime;
    metrics.logins.failed++;
    metrics.logins.responseTimes.push(responseTime);

    const errorMsg = error.response?.data?.error || error.message;
    metrics.errors.push(`Login failed for ${userData.email}: ${errorMsg}`);

    return { success: false, error: errorMsg, responseTime };
  }
}

// Process users in batches with concurrency control
async function processBatch(users, batchIndex) {
  console.log(`Processing batch ${batchIndex + 1}, users ${batchIndex * BATCH_SIZE + 1}-${(batchIndex + 1) * BATCH_SIZE}`);

  const promises = users.map(async (userData, index) => {
    // Registration
    const regResult = await testRegistration(userData);

    // If registration successful, test login
    if (regResult.success) {
      // Small delay to simulate real user behavior
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

      await testLogin(userData);
    }

    return regResult;
  });

  await Promise.allSettled(promises);
}

// Monitor system health during test
async function monitorHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error.message);
    return null;
  }
}

// Calculate statistics
function calculateStats(times) {
  if (times.length === 0) return { avg: 0, min: 0, max: 0, p95: 0, p99: 0 };

  const sorted = [...times].sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return { avg, min, max, p95, p99 };
}

// Main test execution
async function runLoadTest() {
  console.log('='.repeat(60));
  console.log('SFO Load Testing - Concurrent User Registration & Login');
  console.log('='.repeat(60));
  console.log(`Target: ${TOTAL_USERS} users, ${CONCURRENT_USERS} concurrent`);
  console.log(`Backend URL: ${BASE_URL}`);
  console.log(`Test Duration: ${TEST_DURATION} seconds`);
  console.log('');

  metrics.startTime = new Date();

  // Generate test users
  const testUsers = [];
  for (let i = 0; i < TOTAL_USERS; i++) {
    testUsers.push(generateUserData(i));
  }

  // Process users in batches
  const batches = [];
  for (let i = 0; i < testUsers.length; i += BATCH_SIZE) {
    batches.push(testUsers.slice(i, i + BATCH_SIZE));
  }

  console.log(`Starting load test with ${batches.length} batches...`);

  // Process batches with controlled concurrency
  const batchPromises = [];
  const semaphore = new Semaphore(CONCURRENT_USERS);

  for (let i = 0; i < batches.length; i++) {
    batchPromises.push(
      semaphore.acquire().then(async (release) => {
        try {
          await processBatch(batches[i], i);
        } finally {
          release();
        }
      })
    );

    // Small delay between batch starts to avoid overwhelming the system
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  await Promise.allSettled(batchPromises);

  metrics.endTime = new Date();
  const duration = (metrics.endTime - metrics.startTime) / 1000;

  // Final health check
  console.log('\nPerforming final health check...');
  const finalHealth = await monitorHealth();

  // Calculate and display results
  console.log('\n' + '='.repeat(60));
  console.log('LOAD TEST RESULTS');
  console.log('='.repeat(60));

  console.log(`\nTest Duration: ${duration.toFixed(2)} seconds`);
  console.log(`Total Users Processed: ${TOTAL_USERS}`);

  console.log('\nREGISTRATION RESULTS:');
  console.log(`- Successful: ${metrics.registrations.success}`);
  console.log(`- Failed: ${metrics.registrations.failed}`);
  console.log(`- Success Rate: ${((metrics.registrations.success / TOTAL_USERS) * 100).toFixed(2)}%`);

  if (metrics.registrations.responseTimes.length > 0) {
    const regStats = calculateStats(metrics.registrations.responseTimes);
    console.log(`- Response Time (ms) - Avg: ${regStats.avg.toFixed(2)}, Min: ${regStats.min.toFixed(2)}, Max: ${regStats.max.toFixed(2)}`);
    console.log(`- P95: ${regStats.p95.toFixed(2)}ms, P99: ${regStats.p99.toFixed(2)}ms`);
  }

  console.log('\nLOGIN RESULTS:');
  console.log(`- Successful: ${metrics.logins.success}`);
  console.log(`- Failed: ${metrics.logins.failed}`);
  console.log(`- Success Rate: ${((metrics.logins.success / metrics.registrations.success) * 100).toFixed(2)}%`);

  if (metrics.logins.responseTimes.length > 0) {
    const loginStats = calculateStats(metrics.logins.responseTimes);
    console.log(`- Response Time (ms) - Avg: ${loginStats.avg.toFixed(2)}, Min: ${loginStats.min.toFixed(2)}, Max: ${loginStats.max.toFixed(2)}`);
    console.log(`- P95: ${loginStats.p95.toFixed(2)}ms, P99: ${loginStats.p99.toFixed(2)}ms`);
  }

  console.log('\nSYSTEM HEALTH:');
  if (finalHealth) {
    console.log(`- Status: ${finalHealth.status}`);
    console.log(`- Database: ${finalHealth.database}`);
    console.log(`- Cache: ${finalHealth.cache}`);
    console.log(`- Memory Usage: ${finalHealth.memory.rss} RSS, ${finalHealth.memory.heapUsed} Heap`);
    console.log(`- Uptime: ${finalHealth.uptime}`);
  } else {
    console.log('- Health check failed');
  }

  console.log('\nERROR SUMMARY:');
  if (metrics.errors.length > 0) {
    console.log(`Total errors: ${metrics.errors.length}`);
    // Show first 10 errors
    metrics.errors.slice(0, 10).forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
    if (metrics.errors.length > 10) {
      console.log(`... and ${metrics.errors.length - 10} more errors`);
    }
  } else {
    console.log('No errors encountered');
  }

  // Performance assessment
  console.log('\nPERFORMANCE ASSESSMENT:');
  const regSuccessRate = (metrics.registrations.success / TOTAL_USERS) * 100;
  const loginSuccessRate = (metrics.logins.success / metrics.registrations.success) * 100;

  if (regSuccessRate >= 99.5 && loginSuccessRate >= 99.5) {
    console.log('✅ EXCELLENT: System handles load well with high success rates');
  } else if (regSuccessRate >= 95 && loginSuccessRate >= 95) {
    console.log('⚠️  GOOD: System performs adequately but may need optimization');
  } else {
    console.log('❌ POOR: System struggling under load - requires immediate attention');
  }

  if (finalHealth && finalHealth.status === 'healthy') {
    console.log('✅ System health is good');
  } else {
    console.log('❌ System health degraded');
  }

  console.log('\n' + '='.repeat(60));
}

// Semaphore for concurrency control
class Semaphore {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.currentConcurrent = 0;
    this.waitQueue = [];
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this.currentConcurrent < this.maxConcurrent) {
        this.currentConcurrent++;
        resolve(this.release.bind(this));
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release() {
    this.currentConcurrent--;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift();
      this.currentConcurrent++;
      resolve(this.release.bind(this));
    }
  }
}

// Run the test
if (require.main === module) {
  runLoadTest().catch(console.error);
}

module.exports = { runLoadTest, generateUserData };