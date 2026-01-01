const readline = require('readline');
const db = require('../database/db');
const winston = require('winston');

// Configure logging
const consoleLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/console.log' })
  ]
});

class ConsoleCommands {
  constructor(server, app) {
    this.server = server;
    this.io = app.get('io');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });

    this.commands = {
      setOwner: this.setOwner.bind(this),
      DeleteUser: this.deleteUser.bind(this),
      Exit: this.exit.bind(this),
      help: this.help.bind(this)
    };
  }

  start() {
    console.log('Console commands available. Type "help" for a list of commands.');
    this.rl.prompt();

    this.rl.on('line', (line) => {
      this.handleCommand(line.trim());
      this.rl.prompt();
    }).on('close', () => {
      console.log('Console interface closed.');
      process.exit(0);
    });
  }

  handleCommand(line) {
    const parts = line.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    if (this.commands[command]) {
      try {
        this.commands[command](...args);
      } catch (error) {
        console.error(`Error executing command: ${error.message}`);
        consoleLogger.error(`Command execution error: ${error.message}`);
      }
    } else {
      console.log(`Unknown command: ${command}. Type "help" for a list of commands.`);
    }
  }

  setOwner(username) {
    if (!username) {
      console.log('Usage: setOwner <username>');
      return;
    }

    // Check if user exists
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
      if (err) {
        console.error('Database error:', err.message);
        consoleLogger.error(`setOwner error: ${err.message}`);
        return;
      }

      if (!user) {
        console.log(`User "${username}" not found.`);
        return;
      }

      // Update user to be owner
      db.run('UPDATE users SET is_owner = 1 WHERE id = ?', [user.id], (err) => {
        if (err) {
          console.error('Database error:', err.message);
          consoleLogger.error(`setOwner update error: ${err.message}`);
          return;
        }

        console.log(`User "${username}" is now an owner.`);
        consoleLogger.info(`User "${username}" (ID: ${user.id}) set as owner`);

        // Notify the user if they are connected
        if (this.io) {
          this.io.to(user.id).emit('notification', {
            message: 'You have been granted owner privileges.',
            type: 'success'
          });
        }
      });
    });
  }

  deleteUser(username) {
    if (!username) {
      console.log('Usage: DeleteUser <username>');
      return;
    }

    // Check if user exists
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
      if (err) {
        console.error('Database error:', err.message);
        consoleLogger.error(`DeleteUser error: ${err.message}`);
        return;
      }

      if (!user) {
        console.log(`User "${username}" not found.`);
        return;
      }

      const userId = user.id;

      // Delete messages sent by the user
      db.run('DELETE FROM messages WHERE sender_id = ?', [userId], (err) => {
        if (err) {
          console.error('Error deleting messages:', err.message);
          consoleLogger.error(`DeleteUser messages error: ${err.message}`);
          return;
        }

        // Delete group memberships
        db.run('DELETE FROM group_members WHERE user_id = ?', [userId], (err) => {
          if (err) {
            console.error('Error deleting memberships:', err.message);
            consoleLogger.error(`DeleteUser memberships error: ${err.message}`);
            return;
          }

          // Delete user
          db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
            if (err) {
              console.error('Error deleting user:', err.message);
              consoleLogger.error(`DeleteUser final error: ${err.message}`);
              return;
            }

            console.log(`User "${username}" has been deleted.`);
            consoleLogger.info(`User "${username}" (ID: ${userId}) deleted`);

            // Disconnect the user if they are connected
            if (this.io) {
              const socket = this.io.sockets.sockets.get(userId);
              if (socket) {
                socket.disconnect(true);
              }
            }
          });
        });
      });
    });
  }

  exit() {
    console.log('Shutting down server...');
    consoleLogger.info('Server shutdown initiated from console');

    // Close Socket.IO connections
    if (this.io) {
      this.io.close();
    }

    // Close the server
    this.server.close(() => {
      console.log('Server closed.');
      consoleLogger.info('Server closed');
      process.exit(0);
    });

    // Force close after timeout
    setTimeout(() => {
      console.log('Forcing server shutdown...');
      consoleLogger.warn('Forced server shutdown');
      process.exit(1);
    }, 5000);
  }

  help() {
    console.log('Available commands:');
    console.log('  setOwner <username>   - Set a user as an owner (admin)');
    console.log('  DeleteUser <username> - Delete a user from the system');
    console.log('  Exit                  - Gracefully shut down the server');
    console.log('  help                  - Show this help message');
  }
}

module.exports = ConsoleCommands;