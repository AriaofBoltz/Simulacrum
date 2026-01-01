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

4. Start the server:
   ```
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

### Server Owner Features

- As the server owner, you can assign titles and colors to users via API (e.g., using tools like Postman):
  - POST `/admin/set-title`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "userId": 2, "title": "Moderator", "color": "#ff0000" }`

## Security Notes

- Change the JWT_SECRET in production.
- Use HTTPS in production.
- The app is for demonstration; add more security measures as needed.

## Technologies Used

- Backend: Node.js, Express, Socket.io
- Database: SQLite
- Frontend: Vanilla HTML, CSS, JavaScript
