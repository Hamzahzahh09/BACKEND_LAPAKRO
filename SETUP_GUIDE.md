# LapakRo Backend - Setup & Deployment Guide

## Prerequisites

- Node.js 18+
- MySQL 5.7+
- npm or yarn

## Installation

```bash
cd backend
npm install
```

## Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=roblox_store

# Node Environment
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=24h

# Email (Mailtrap)
MAILTRAP_HOST=live.smtp.mailtrap.io
MAILTRAP_PORT=587
MAILTRAP_USER=your_mailtrap_user
MAILTRAP_PASS=your_mailtrap_password
MAILTRAP_FROM_EMAIL=noreply@lapakro.com

# Application
PORT=3001
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
```

## Database Setup

### Option 1: Using Migrations (Recommended)

```bash
# Run all pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Option 2: Synchronize Database (Development Only)

```bash
npm run db:sync
```

## Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

## Database Migrations

### Generate a New Migration
```bash
npm run migration:generate -- -n MigrationName
```

### Create Empty Migration
```bash
npm run migration:create -- -n MigrationName
```

### View Migration History
Migrations are stored in `src/migrations/` directory.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start application |
| `npm run start:dev` | Start with watch mode |
| `npm run build` | Build for production |
| `npm run start:prod` | Run production build |
| `npm run migration:run` | Run pending migrations |
| `npm run migration:revert` | Revert last migration |
| `npm run db:sync` | Sync database schema (dev only) |
| `npm run seed` | Seed database with sample data |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Project Structure

```
src/
├── admin/              # Admin management
├── auth/               # Authentication & Authorization
├── chat/               # Real-time messaging
├── common/             # Shared utilities
│   ├── email/          # Email service
│   ├── exceptions/     # Exception classes
│   ├── filters/        # Exception filters
│   ├── guards/         # Auth & rate limit guards
│   ├── logger/         # Logging service
│   └── middleware/     # HTTP middleware
├── disputes/           # Dispute resolution
├── migrations/         # Database migrations
├── payment/            # Payment processing
├── products/           # Product management
├── reviews/            # Reviews & ratings
├── transactions/       # Order management
├── users/              # User management
├── wallet/             # Wallet & transactions
├── app.module.ts       # Main application module
├── database.ts         # TypeORM configuration
├── db-sync.ts          # Database sync script
├── main.ts             # Application entry point
└── seed.ts             # Database seeding
```

## Key Features Implemented

### Authentication & Security
- JWT-based authentication
- Bcrypt password hashing
- Role-based access control
- Rate limiting (global & per-user)
- CORS & Helmet security headers

### Logging & Monitoring
- Comprehensive request logging
- Error tracking with context
- Request ID tracking
- Performance monitoring

### Email Notifications
- Welcome emails
- Order confirmations
- Payment notifications
- Dispute updates
- Seller approvals

### Database
- TypeORM migrations
- Proper indexing
- Foreign key constraints
- Timestamp tracking

### E-Commerce Features
- Product management
- Shopping cart
- Order processing
- Escrow system
- Payment processing
- Seller ratings
- Dispute resolution
- Real-time chat
- Reviews & ratings

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
Solution: Ensure MySQL is running and credentials are correct in `.env`

### Migration Fails
```
Migration table already exists
```
Solution: Check database and ensure migration history is intact

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3001
```
Solution: Change PORT in `.env` or kill the process using the port

## Deployment Checklist

- [ ] Update `.env` with production values
- [ ] Set `NODE_ENV=production`
- [ ] Run `npm run build`
- [ ] Run migrations: `npm run migration:run`
- [ ] Configure SSL/HTTPS
- [ ] Set up environment variables securely
- [ ] Configure rate limiting appropriately
- [ ] Set up log aggregation
- [ ] Configure database backups
- [ ] Set up monitoring & alerting

## Performance Tips

1. **Database Optimization**
   - Indexes are created in migrations
   - Use pagination for large datasets
   - Consider caching frequently accessed data

2. **Rate Limiting**
   - Global limit: 100 requests/minute
   - Per-user limit: 60 requests/minute
   - Configure based on your needs

3. **Email Service**
   - Currently using Mailtrap (sandbox)
   - Switch to production email service before going live

## Support

For issues or questions, refer to the main project documentation or create an issue on GitHub.
