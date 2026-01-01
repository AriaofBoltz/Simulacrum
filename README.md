[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/) [![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript) [![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML) [![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS) 

# Simple Self-Hosted Messaging System

A stylish, real-time messaging system with web browser clients, supporting private messages, group chats, and user titles with custom colors.

## Features

- User authentication (register/login)
- Private messaging
- Group chats
- Server owner can assign custom titles and colors to users
- Real-time messaging with WebSockets
- Stylish UI with gradients and animations
- Self-hosted with SQLite database

## Installation

1. Clone or download the project files.

2. Install Node.js (version 14 or higher) from https://nodejs.org.

3. Navigate to the project directory and install dependencies:
   ```
   npm install
   ```

4. **Windows Users (Recommended)**:
   - **Option 1**: Double-click `start.bat` to automatically install dependencies, check for updates, and start the server.
   - **Option 2**: Double-click `install.bat` to install dependencies, then run `start.bat` or `npm start`.

4. **Manual Installation & Start**:
   ```bash
   # First, install all dependencies
   npm install
   
   # Then start the server
   npm start
   ```

5. Open a web browser and go to `http://localhost:3000` (or the configured port).

## Deployment

### Local Deployment

- Run `npm start` to start the server on port 3000.
- Access via `http://localhost:3000`.

### Production Deployment

1. Set environment variables:
   - `PORT`: Port to run the server (default 3000)
   - `JWT_SECRET`: Secret key for JWT tokens (change from default for security)

2. Use a process manager like PM2:
   ```
   npm install -g pm2
   pm2 start server/server.js --name "chat-app"
   ```

3. For self-hosting on a server:
   - Ensure Node.js is installed on the server.
   - Upload the project files.
   - Run `npm install` and `npm start`.
   - Configure firewall to allow the port.
   - Optionally, use a reverse proxy like Nginx.

### Database

- The app uses SQLite (`database/chat.db`), which is created automatically.
- No additional setup required.

## Usage

1. Register a new account (first user becomes server owner).
2. Login with your credentials.
3. Select a user from the list for private chat or create/join a group.
4. Send messages in real-time.

## Troubleshooting

### "Cannot find module" errors

If you see errors like `Cannot find module 'helmet'` or similar:

1. **Run the start.bat file** (Windows) - It will automatically install all dependencies
2. **Manual fix**: Run `npm install` to install all required dependencies
3. **Clear cache**: If issues persist, try:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

### Server won't start

- Check that Node.js is installed: `node --version`
- Verify all dependencies are installed: `npm list`
- Check for port conflicts: Try a different port in your .env file
- Review error logs in the `logs/` directory

### Database issues

- Ensure the `database/` directory exists and is writable
- Check file permissions
- The SQLite database will be created automatically on first run

### Connection problems

- Verify CORS settings in your .env file
- Check firewall settings
- Ensure the server port is open and accessible

## Common Commands

```bash
# Install dependencies
npm install

# Start server
npm start

# Start server with auto-restart (development)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Server Owner Features

- As the server owner, you can assign titles and colors to users via API (e.g., using tools like Postman):
  - POST `/admin/set-title`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "userId": 2, "title": "Moderator", "color": "#ff0000" }`

### Console Commands

The server supports console commands for administration. After starting the server, you can use the following commands:

- `setOwner <username>` - Set a user as an owner (admin)
- `DeleteUser <username>` - Delete a user from the system
- `Exit` - Gracefully shut down the server
- `help` - Show this help message

Example usage:
```
> setOwner john_doe
User "john_doe" is now an owner.

> DeleteUser spam_user
User "spam_user" has been deleted.

> Exit
Shutting down server...
Server closed.
```

## Security Notes

- Change the JWT_SECRET in production.
- Use HTTPS in production.
- The app is for demonstration; add more security measures as needed.

## Technologies Used

- Backend: Node.js, Express, Socket.io
- Database: SQLite
- Frontend: Vanilla HTML, CSS, JavaScript
