const ConsoleCommands = require('../server/console');
const db = require('../database/db');

// Mock server object
const mockServer = {
  close: (callback) => {
    console.log('Server closed');
    if (callback) callback();
  }
};

// Mock app object
const mockApp = {
  get: (key) => {
    if (key === 'io') {
      return {
        to: (userId) => ({
          emit: (event, data) => {
            console.log(`Socket.IO emit to ${userId}: ${event}`, data);
          }
        }),
        sockets: {
          sockets: new Map()
        },
        close: () => {
          console.log('Socket.IO closed');
        }
      };
    }
  }
};

describe('Console Commands', () => {
  let consoleCommands;

  beforeAll(() => {
    consoleCommands = new ConsoleCommands(mockServer, mockApp);
  });

  afterAll(() => {
    // Clean up test data
    db.run('DELETE FROM users WHERE username LIKE "test%"', (err) => {
      if (err) console.error('Cleanup error:', err.message);
    });
  });

  test('setOwner command', (done) => {
    const testUsername = 'testuser_owner_' + Date.now();
    
    // First, create a test user
    db.run('INSERT INTO users (username, password, is_owner) VALUES (?, ?, 0)', [testUsername, 'testpass'], (err) => {
      expect(err).toBeFalsy();
      
      // Test the setOwner command
      consoleCommands.setOwner(testUsername);
      
      // Verify the user is now an owner
      setTimeout(() => {
        db.get('SELECT is_owner FROM users WHERE username = ?', [testUsername], (err, user) => {
          expect(err).toBeFalsy();
          expect(user.is_owner).toBe(1);
          done();
        });
      }, 500);
    });
  }, 10000); // 10 second timeout

  test('DeleteUser command', (done) => {
    const testUsername = 'testuser_delete_' + Date.now();
    
    // First, create a test user
    db.run('INSERT INTO users (username, password, is_owner) VALUES (?, ?, 0)', [testUsername, 'testpass'], (err) => {
      expect(err).toBeFalsy();
      
      // Test the DeleteUser command
      consoleCommands.deleteUser(testUsername);
      
      // Verify the user is deleted
      setTimeout(() => {
        db.get('SELECT id FROM users WHERE username = ?', [testUsername], (err, user) => {
          expect(err).toBeFalsy();
          expect(user).toBeFalsy();
          done();
        });
      }, 500);
    });
  }, 10000); // 10 second timeout

  test('help command', () => {
    const originalLog = console.log;
    console.log = jest.fn();
    
    consoleCommands.help();
    
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Available commands'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('setOwner'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('DeleteUser'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Exit'));
    
    console.log = originalLog;
  });
});