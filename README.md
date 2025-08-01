# Motor Backend API

A TypeScript Express.js backend application with PostgreSQL and Sequelize ORM.

## Features

- ✅ TypeScript with strict configuration
- ✅ Express.js web framework
- ✅ PostgreSQL database with Sequelize ORM
- ✅ Type-safe database models
- ✅ RESTful API endpoints
- ✅ OpenAI integration for embeddings and LLM
- ✅ Environment variable configuration
- ✅ Database migrations and seeding
- ✅ Development hot-reload with nodemon
- ✅ MVC architecture with controllers and services

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

1. Install PostgreSQL and create a database:
```sql
CREATE DATABASE motor_backend_dev;
CREATE DATABASE motor_backend_test;
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Update `.env` file with your database credentials and OpenAI API key:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=motor_backend_dev
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
OPENAI_API_KEY=your_openai_api_key
```

### 3. Initialize Database

```bash
# Initialize database tables
npm run db:init

# Seed with sample data (optional)
npm run db:seed
```

### 4. Start Development Server

```bash
# Development mode with hot-reload
npm run dev

# Or build and run
npm run build
npm start
```

## API Endpoints

### Health Check API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/api/health/status` | Comprehensive system health |
| GET | `/api/health/database` | Database health status |
| GET | `/api/health/s3` | S3 service health |
| GET | `/api/health/llm` | LLM service health |
| GET | `/api/health/embedding` | Embedding service health |
| GET | `/api/health/document` | Document service health |
| GET | `/api/health/chat` | Chat service health |
| GET | `/api/health/auth` | Auth service health |
| GET | `/api/health/user` | User service health |
| GET | `/api/health/token-blacklist` | Token blacklist service health |

### Users API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| GET | `/api/users/:id` | Get user by ID |
| GET | `/api/users/email/:email` | Get user by email |
| POST | `/api/users` | Create new user |
| PUT | `/api/users/:id` | Update user |
| PATCH | `/api/users/:id/deactivate` | Deactivate user |
| DELETE | `/api/users/:id` | Delete user |

### Example API Usage

#### Create User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }'
```

#### Get All Users
```bash
curl http://localhost:3000/api/users
```

## Project Structure

```
src/
├── config/          # Configuration files
│   └── database.ts  # Database configuration
├── database/        # Database connection
│   └── connection.ts
├── models/          # Sequelize models
│   └── user.model.ts
├── routes/          # API routes
│   └── user.routes.ts
├── services/        # Business logic
│   └── user.service.ts
├── scripts/         # Database scripts
│   ├── init-db.ts   # Initialize database
│   └── seed-db.ts   # Seed sample data
├── types/           # TypeScript type definitions
│   └── user.types.ts
└── index.ts         # Application entry point
```

## Available Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run watch` - Build with watch mode
- `npm run clean` - Clean build directory
- `npm run db:init` - Initialize database tables
- `npm run db:seed` - Seed database with sample data

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `motor_backend_dev` |
| `DB_USER` | Database user | `postgres` |
| `OPENAI_API_KEY` | OpenAI API key | Required for LLM/embedding services |
| `AWS_ACCESS_KEY_ID` | AWS access key | Required for S3 operations |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Required for S3 operations |
| `AWS_S3_BUCKET_NAME` | S3 bucket name | Required for document storage |
| `AWS_REGION` | AWS region | `us-east-1` |
| `JWT_SECRET` | JWT signing secret | Required for authentication |

## Development

### Adding New Models

1. Create model in `src/models/`
2. Define types in `src/types/`
3. Create service in `src/services/`
4. Add routes in `src/routes/`
5. Update main app to include routes

### Database Operations

```typescript
// Create
const user = await User.create({ firstName: 'John', lastName: 'Doe', email: 'john@example.com' });

// Find
const users = await User.findAll();
const user = await User.findByPk(1);
const user = await User.findOne({ where: { email: 'john@example.com' } });

// Update
await user.update({ firstName: 'Jane' });

// Delete
await user.destroy();
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
#   a t l a s - a i - b a c k e n d 
 
 