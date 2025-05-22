# Backend Deployment Guide

This guide will help you deploy the FastAPI backend using Docker and Docker Compose.

## Prerequisites

- Docker installed on your server
- Docker Compose installed
- Your server should have ports 8000 available

## Deployment Steps

### 1. Prepare Environment Variables

Copy the example environment file and fill in your actual values:

```bash
cp .env.example .env
```

Edit the `.env` file with your production values:

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
docker-compose up -d --build
```

### 4. Verify Deployment

Check if the application is running:

```bash
docker-compose ps
```

Check the logs:

```bash
docker-compose logs backend
```

Test the API:

```bash
curl http://localhost:8000/
```

## Management Commands

### View logs
```bash
docker-compose logs -f backend
```

### Stop the application
```bash
docker-compose down
```

### Restart the application
```bash
docker-compose restart backend
```

### Update the application
```bash
docker-compose down
docker-compose up -d --build
```

### Access the container shell
```bash
docker-compose exec backend bash
```

## Database

The SQLite database will be stored in the `./data` directory on your host machine, which is mounted as a volume in the container. This ensures data persistence across container restarts.

## Security Notes

- Make sure to use strong, unique secret keys in production
- Keep your `.env` file secure and never commit it to version control
- Consider using a reverse proxy (nginx) with SSL termination for production
- Update the `REDIRECT_URL` and `FRONTEND_URL` to match your production domain

## Troubleshooting

### Port already in use
If port 8000 is already in use, you can change it in the `docker-compose.yml` file:

```yaml
ports:
  - "8080:8000"  # Change 8080 to any available port
```

### Database issues
If you encounter database issues, you can reset the database by removing the data directory:

```bash
sudo rm -rf data
mkdir -p data
docker-compose restart backend
``` 