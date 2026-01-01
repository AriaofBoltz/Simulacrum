const request = require('supertest');
const express = require('express');
const db = require('../database/db');
const bcrypt = require('bcryptjs');

// Create a test server that doesn't automatically listen
const createTestServer = () => {
  const expressApp = express();
  expressApp.use(express.json());
  expressApp.use('/auth', require('../server/routes/auth'));
  return expressApp;
};

describe('Authentication API', () => {
  let testApp;

  beforeAll(async () => {
    // Create test app
    testApp = createTestServer();
    
    // Set up test database - use promises to ensure proper async handling
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users', (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['testuser', hashedPassword], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Clean up
    await db.run('DELETE FROM users');
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(testApp)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'testpassword'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('username', 'testuser');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(testApp)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(testApp)
        .post('/auth/register')
        .send({
          username: 'newuser',
          password: 'newpassword'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('username', 'newuser');
    });

    it('should reject duplicate username', async () => {
      const response = await request(testApp)
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'anotherpassword'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username already exists');
    });
  });
});