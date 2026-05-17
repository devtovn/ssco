# Docker Setup Guide

This guide explains how to set up and run the Product Price Comparison Website using Docker Compose for local development.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0 or higher
- At least 4GB of available RAM
- At least 10GB of available disk space

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SSCO
```

### 2. Set Up Environment Variables

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` and update the following important variables:
- `JWT_SECRET` - Change to a secure random string
- `JWT_REFRESH_SECRET` - Change to a different secure random string
- `POSTGRES_PASSWORD` - Change to a secure password
- API keys for e-commerce platforms (optional for development)
- AI service API keys (optional for development)

### 3. Start the Services

Start all services in development mode:

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Backend API** on port 4000
- **Frontend** on port 3000

### 4. Verify Services are Running

Check the status of all services:

```bash
docker-compose ps
```

All services should show as "Up" and healthy.

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Documentation**: http://localhost:4000/api-docs

## Docker Services

### PostgreSQL Database

- **Image**: postgres:15-alpine
- **Port**: 5432 (configurable via `POSTGRES_PORT`)
- **Database**: price_comparison
- **User**: pricecompare (configurable)
- **Data Volume**: `postgres_data`

The database is initialized with the schema on first startup using the init script at `scripts/init-db.sql`.

### Redis Cache

- **Image**: redis:7-alpine
- **Port**: 6379 (configurable via `REDIS_PORT`)
- **Max Memory**: 512MB with LRU eviction policy
- **Data Volume**: `redis_data`
- **Persistence**: AOF (Append-Only File) enabled

### Backend (Express.js)

- **Build Context**: ./backend
- **Port**: 4000 (configurable via `BACKEND_PORT`)
- **Hot Reload**: Enabled in development mode
- **Dependencies Volume**: `backend_node_modules`

The backend uses multi-stage Docker build:
- **Development**: Uses `tsx watch` for hot-reload
- **Production**: Compiles TypeScript and runs optimized build

### Frontend (Next.js)

- **Build Context**: ./frontend
- **Port**: 3000 (configurable via `FRONTEND_PORT`)
- **Hot Reload**: Enabled in development mode
- **Dependencies Volume**: `frontend_node_modules`
- **Build Cache Volume**: `frontend_next`

The frontend uses multi-stage Docker build:
- **Development**: Uses `next dev` for hot-reload
- **Production**: Creates standalone optimized build

## Development Workflow

### View Logs

View logs for all services:

```bash
docker-compose logs -f
```

View logs for a specific service:

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Restart Services

Restart all services:

```bash
docker-compose restart
```

Restart a specific service:

```bash
docker-compose restart backend
```

### Stop Services

Stop all services (keeps data):

```bash
docker-compose stop
```

Stop and remove all containers (keeps data):

```bash
docker-compose down
```

Stop and remove all containers and volumes (deletes data):

```bash
docker-compose down -v
```

### Rebuild Services

Rebuild all services after code changes:

```bash
docker-compose build
```

Rebuild a specific service:

```bash
docker-compose build backend
```

Rebuild and restart:

```bash
docker-compose up -d --build
```

### Execute Commands in Containers

Run a command in the backend container:

```bash
docker-compose exec backend npm run lint
```

Run a command in the frontend container:

```bash
docker-compose exec frontend npm run type-check
```

Access PostgreSQL CLI:

```bash
docker-compose exec postgres psql -U pricecompare -d price_comparison
```

Access Redis CLI:

```bash
docker-compose exec redis redis-cli
```

### Database Management

Run database migrations:

```bash
docker-compose exec backend npm run migrate
```

Seed the database:

```bash
docker-compose exec backend npm run seed
```

Backup the database:

```bash
docker-compose exec postgres pg_dump -U pricecompare price_comparison > backup.sql
```

Restore the database:

```bash
cat backup.sql | docker-compose exec -T postgres psql -U pricecompare price_comparison
```

## Volume Management

### List Volumes

```bash
docker volume ls | grep price-comparison
```

### Inspect a Volume

```bash
docker volume inspect price-comparison_postgres_data
```

### Remove Unused Volumes

```bash
docker volume prune
```

## Troubleshooting

### Services Won't Start

1. Check if ports are already in use:
   ```bash
   netstat -ano | findstr :3000
   netstat -ano | findstr :4000
   netstat -ano | findstr :5432
   netstat -ano | findstr :6379
   ```

2. Check Docker logs:
   ```bash
   docker-compose logs
   ```

3. Verify environment variables:
   ```bash
   docker-compose config
   ```

### Database Connection Issues

1. Verify PostgreSQL is healthy:
   ```bash
   docker-compose ps postgres
   ```

2. Check PostgreSQL logs:
   ```bash
   docker-compose logs postgres
   ```

3. Test connection:
   ```bash
   docker-compose exec postgres pg_isready -U pricecompare
   ```

### Redis Connection Issues

1. Verify Redis is healthy:
   ```bash
   docker-compose ps redis
   ```

2. Check Redis logs:
   ```bash
   docker-compose logs redis
   ```

3. Test connection:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

### Hot Reload Not Working

1. Ensure volumes are properly mounted:
   ```bash
   docker-compose config
   ```

2. Restart the service:
   ```bash
   docker-compose restart backend
   docker-compose restart frontend
   ```

3. Rebuild if necessary:
   ```bash
   docker-compose up -d --build
   ```

### Out of Memory Issues

1. Increase Docker memory allocation in Docker Desktop settings
2. Reduce Redis max memory in docker-compose.yml
3. Check container resource usage:
   ```bash
   docker stats
   ```

### Permission Issues (Linux)

If you encounter permission issues on Linux:

```bash
sudo chown -R $USER:$USER .
```

## Production Deployment

For production deployment, use the production target in Dockerfiles:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Key differences in production:
- Multi-stage builds with optimized images
- No source code volumes (baked into image)
- Production environment variables
- Health checks enabled
- Resource limits configured
- Security hardening applied

## Network Configuration

All services run on the `price-comparison-network` bridge network, allowing them to communicate using service names as hostnames:

- Backend connects to PostgreSQL at `postgres:5432`
- Backend connects to Redis at `redis:6379`
- Frontend connects to Backend at `backend:4000` (internal) or `localhost:4000` (external)

## Health Checks

All services have health checks configured:

- **PostgreSQL**: `pg_isready` check every 10s
- **Redis**: `redis-cli ping` check every 10s
- **Backend**: HTTP check on `/health` endpoint every 30s
- **Frontend**: HTTP check on root endpoint every 30s

## Security Considerations

For development:
- Default passwords are used (change in production)
- All ports are exposed to localhost
- Debug logging is enabled

For production:
- Use strong passwords and secrets
- Limit port exposure
- Enable TLS/SSL
- Use environment-specific configurations
- Implement proper logging and monitoring
- Regular security updates

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [PostgreSQL Docker Documentation](https://hub.docker.com/_/postgres)
- [Redis Docker Documentation](https://hub.docker.com/_/redis)
