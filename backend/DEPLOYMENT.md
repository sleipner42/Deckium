# Backend Deployment Guide

This guide will help you deploy the FastAPI backend using Docker and Docker Compose.

## Prerequisites

- Docker installed on your server
- Docker Compose installed
- Your server should have ports 8123 available

## Deployment Steps

### 1. Prepare Environment Variables

Copy the example environment file and fill in your actual values:

```bash
cp .env.example .env
```

Edit the `.env` file with your production values:

- `DATABASE_URL` - Path to SQLite database (default: /app/data/app.db)
- `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret  
- `SECRET_KEY` - A secure secret key (at least 32 characters)
- `JWT_SECRET_KEY` - A secure JWT secret key (at least 32 characters)
- `REDIRECT_URL` - Your production callback URL (e.g., https://yourdomain.com/auth/callback)
- `FRONTEND_URL` - Your frontend URL (e.g., https://yourdomain.com)
- `AZURE_OPENAI_API_KEY` - Your Azure OpenAI API key
- `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI endpoint
- `AZURE_OPENAI_DEPLOYMENT` - Your Azure OpenAI deployment name

### 2. Create Data Directory

```bash
mkdir -p data
```

### 3. Build and Start the Application

```bash
docker compose up -d --build
```

### 4. Verify Deployment

Check if the application is running:

```bash
docker compose ps
```

Check the logs:

```bash
docker compose logs backend
```

Test the API:

```bash
curl http://localhost:8123/
```

## Management Commands

### View logs
```bash
docker compose logs -f backend
```

### Stop the application
```bash
docker compose down
```

### Restart the application
```bash
docker compose restart backend
```

### Update the application
```bash
docker compose down
docker compose up -d --build
```

### Access the container shell
```bash
docker compose exec backend bash
```

## Database

The SQLite database will be stored in the `./data` directory on your host machine, which is mounted as a volume in the container. This ensures data persistence across container restarts.

## Security Notes

- Make sure to use strong, unique secret keys in production
- Keep your `.env` file secure and never commit it to version control
- Consider using a reverse proxy (nginx) with SSL termination for production
- Update the `REDIRECT_URL` and `FRONTEND_URL` to match your production domain

## Troubleshooting

### SQLite Permission Error on Server

If you encounter this error on your server:
```
sqlite3.OperationalError: unable to open database file
```

This is typically caused by permission issues with the mounted volume. The fixes included:

1. **Entrypoint Script**: Automatically creates and checks data directory permissions
2. **Proper User Setup**: Container runs as non-root user with correct permissions
3. **Runtime Directory Creation**: Database directory is created with proper permissions at startup

If you still encounter permission issues:

1. **Check volume permissions**:
   ```bash
   ls -la ./data
   sudo chown -R 1000:1000 ./data
   ```

2. **Alternative database path** (if needed):
   ```bash
   # In your .env file
   DATABASE_URL=/tmp/app.db
   ```

3. **SELinux issues** (on RHEL/CentOS):
   ```bash
   sudo setsebool -P container_manage_cgroup on
   ```

### Port already in use
If port 8123 is already in use, you can change it in the `docker-compose.yml` file:

```yaml
ports:
  - "8080:8000"  # Change 8080 to any available port
```

### Database issues
If you encounter database issues, you can reset the database by removing the data directory:

```bash
sudo rm -rf data
mkdir -p data
docker compose restart backend
```

### Container won't start
Check the logs for detailed error information:

```bash
docker compose logs backend
```

Common issues:
- Missing environment variables
- Port conflicts
- Volume permission issues
- Network connectivity problems 