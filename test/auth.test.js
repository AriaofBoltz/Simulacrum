const request = require('supertest');
const app = require('../server/server');
const db = require('../database/db');
const bcrypt = require('bcryptjs');

describe('Authentication API', () => {
  beforeAll(async () => {
    // Set up test database
    await db.run('DELETE FROM users');
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['testuser', hashedPassword]);
  });

  afterAll(async () => {
    // Clean up
    await db.run('DELETE FROM users');
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
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
      const response = await request(app)
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
      const response = await request(app)
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
      const response = await request(app)
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