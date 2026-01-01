# Simple Messaging System - Release Documentation

## Version 1.0.0 - First Official Release

### Release Date
January 1, 2026

### Overview
This is the first official release of the Simple Messaging System, a self-hosted real-time messaging platform with support for private messages, group chats, and user management.

## Features

### Core Features
- **User Authentication**: Secure registration and login system
- **Private Messaging**: One-to-one real-time messaging
- **Group Chats**: Create and manage group conversations
- **User Management**: Admin panel for user administration
- **Real-time Updates**: Instant message delivery using WebSockets
- **File Uploads**: Support for profile pictures and attachments

### Technical Features
- **RESTful API**: Well-structured backend endpoints
- **WebSocket Integration**: Real-time communication with Socket.IO
- **SQLite Database**: Lightweight, file-based data storage
- **JWT Authentication**: Secure token-based authentication
- **Responsive UI**: Modern, mobile-friendly interface

## Installation

### Prerequisites
- Node.js 14+ (recommended: Node.js 18+)
- npm 6+ (or yarn)
- Git (for cloning the repository)

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/simple-messaging-system.git
   cd simple-messaging-system
   ```

2. **Windows Quick Start (Recommended)**:
   - Simply double-click `start.bat` file
   - The script will automatically:
     - Check for Node.js installation
     - Install dependencies if needed
     - Check for updates (if using git)
     - Create required directories
     - Set up configuration files
     - Start the server


2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

5. **Access the application**:
   Open your browser and navigate to `http://localhost:3000`

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=3000

# JWT Authentication
JWT_SECRET=your-very-secure-secret-key-change-this-in-production
JWT_EXPIRES_IN=1h

# Security Settings
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
RATE_LIMIT_MAX=100 # limit each IP to 100 requests per windowMs

# File Upload Settings
MAX_FILE_SIZE=5242880 # 5MB
ALLOWED_FILE_TYPES=.jpg,.jpeg,.png,.gif

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### Security Recommendations

1. **Change the JWT secret**: Use a strong, random secret key
2. **Use HTTPS**: Always use HTTPS in production
3. **Database backup**: Regularly backup your SQLite database
4. **Rate limiting**: Adjust rate limits based on your expected traffic
5. **File uploads**: Validate file types and sizes

## Deployment

### Local Deployment

For local development and testing:

```bash
npm run dev
```

This uses nodemon for automatic server restart on file changes.

### Production Deployment

#### Option 1: Direct Node.js Deployment

```bash
npm start
```

Use a process manager like PM2:

```bash
npm install -g pm2
pm2 start server/server.js --name "messaging-system"
pm2 save
pm2 startup
```

#### Option 2: Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t messaging-system .
docker run -p 3000:3000 -v $(pwd)/database:/app/database -v $(pwd)/uploads:/app/uploads messaging-system
```

#### Option 3: Cloud Deployment (AWS, Heroku, etc.)

1. **Heroku**:
   ```bash
   heroku create
   git push heroku main
   heroku config:set JWT_SECRET=your-secret-key
   heroku open
   ```

2. **AWS EC2**:
   - Launch an EC2 instance
   - Install Node.js and npm
   - Clone the repository
   - Follow the installation steps above
   - Set up a reverse proxy with Nginx

## API Documentation

### Authentication Routes

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user information

### Chat Routes

- `GET /chat/users` - Get list of users
- `GET /chat/groups` - Get list of groups
- `POST /chat/groups` - Create a new group
- `GET /chat/messages` - Get message history

### Admin Routes (require admin privileges)

- `GET /admin/users` - Get all users
- `POST /admin/set-title` - Set user title and color
- `GET /admin/pending` - Get pending group memberships
- `POST /admin/approve` - Approve group membership

## WebSocket Events

### Client to Server

- `authenticate` - Authenticate with JWT token
- `private-message` - Send private message
- `group-message` - Send group message
- `join-group` - Join a group

### Server to Client

- `authenticated` - Authentication successful
- `auth-error` - Authentication failed
- `private-message` - Received private message
- `group-message` - Received group message
- `user-list` - Updated user list
- `group-list` - Updated group list

## Database Schema

### Tables

1. **users**: Stores user information
   - `id`: Primary key
   - `username`: Unique username
   - `password`: Hashed password
   - `is_owner`: Admin flag
   - `title`: Custom title
   - `title_color`: Title color
   - `profile_picture`: Profile picture path
   - `description`: User description

2. **groups**: Stores group information
   - `id`: Primary key
   - `name`: Group name

3. **group_members**: User-group relationships
   - `group_id`: Foreign key to groups
   - `user_id`: Foreign key to users
   - `status`: Membership status (approved/pending)

4. **messages**: Stores all messages
   - `id`: Primary key
   - `sender_id`: Foreign key to users
   - `receiver_id`: Foreign key to users (NULL for group messages)
   - `group_id`: Foreign key to groups (NULL for private messages)
   - `content`: Message content
   - `timestamp`: Message timestamp

## Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Ensure the `database` directory exists and is writable
   - Check file permissions

2. **Authentication failures**:
   - Verify JWT_SECRET matches in .env and server configuration
   - Check token expiration

3. **WebSocket connection issues**:
   - Ensure CORS is properly configured
   - Check firewall settings
   - Verify WebSocket port is open

4. **File upload problems**:
   - Check uploads directory permissions
   - Verify file size limits
   - Ensure allowed file types are correct

## Upgrading

### From Previous Versions

1. Backup your database: `cp database/chat.db database/chat.db.backup`
2. Pull the latest changes: `git pull origin main`
3. Install new dependencies: `npm install`
4. Restart the server

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or feature requests:

- Open an issue on GitHub
- Check our documentation
- Join our community chat

## Roadmap

### Future Features
- Message search functionality
- Message reactions and emojis
- Typing indicators
- Read receipts
- End-to-end encryption
- Video/audio calling
- Mobile applications

## Changelog

### Version 1.0.0
- Initial release
- Core messaging functionality
- User authentication
- Group chat support
- Admin panel
- Real-time updates

## Contact

For more information, please contact:
- Email: support@messaging-system.com
- Website: https://messaging-system.com
- GitHub: https://github.com/yourusername/simple-messaging-system