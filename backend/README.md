# FastAPI Backend

A modern FastAPI backend with Google OAuth authentication and Azure OpenAI integration.

## Features

- FastAPI with async support
- Google OAuth authentication
- SQLite database with SQLAlchemy
- Azure OpenAI integration
- Docker containerization
- Health checks and monitoring

## Quick Start

### Local Development

1. Install dependencies with uv:
```bash
uv sync
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Run with Docker Compose (development):
```bash
docker compose -f docker-compose.dev.yml up --build
```

4. Or run directly:
```bash
uv run uvicorn app.main:app --reload
```

### Production Deployment

The backend is automatically deployed via GitHub Actions when changes are pushed to the main branch.

#### Automated Deployment (Recommended)

1. **Set up GitHub Secrets** in your repository settings:
   - `SERVER_HOST`: Your server's IP address or hostname
   - `SERVER_USER`: SSH username for your server
   - `SERVER_SSH_KEY`: Private SSH key for server access
   - `SERVER_PATH`: Path to your project on the server (e.g., `/home/user/keynotai2/backend`)

2. **Push to main branch**: The GitHub Action will automatically:
   - Build the Docker image
   - Push to GitHub Container Registry
   - Deploy to your server via SSH
   - Pull the latest image and restart services

#### Manual Deployment

1. **On your server**, clone the repository:
```bash
git clone https://github.com/kristoffer/keynotai2.git
cd keynotai2/backend
```

2. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your production values
```

3. **Deploy using the script**:
```bash
./deploy.sh <your-github-username> <your-github-token>
```

Or manually:
```bash
export GITHUB_REPOSITORY="kristoffer/keynotai2"
docker compose pull backend
docker compose up -d backend
```

### Development vs Production

- **Development**: Use `docker-compose.dev.yml` for local development with hot reloading
- **Production**: Use `docker-compose.yml` which pulls pre-built images from the registry

```bash
# Development
docker compose -f docker-compose.dev.yml up --build

# Production
docker compose up -d
```

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8123/docs`
- ReDoc: `http://localhost:8123/redoc`

## Environment Variables

See `.env.example` for all required environment variables.

## Monitoring

The application includes health checks accessible at `http://localhost:8123/health`.

## Troubleshooting

For deployment issues, see `DEPLOYMENT.md` for detailed troubleshooting steps.

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd <repository-folder>/backend
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Google OAuth Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to APIs & Services > OAuth consent screen
   - Set up the consent screen for your application
4. Navigate to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" as the application type
   - Add authorized redirect URIs:
     - `http://localhost:8000/api/v1/auth/callback` (for local development)
     - Add your production URLs if needed
5. Copy the Client ID and Client Secret

### 5. Environment Variables

Create a `.env` file in the root directory with the following variables:

```
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
SECRET_KEY=YOUR_SECURE_SECRET_KEY
JWT_SECRET_KEY=YOUR_SECURE_JWT_SECRET_KEY
REDIRECT_URL=http://localhost:8000/api/v1/auth/callback
FRONTEND_URL=http://localhost:3000
AZURE_OPENAI_API_KEY=YOUR_AZURE_OPENAI_API_KEY
AZURE_OPENAI_ENDPOINT=YOUR_AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_DEPLOYMENT=YOUR_AZURE_OPENAI_MODEL_DEPLOYMENT
```

### 6. Run the application

```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

## API Endpoints

### Authentication

- `GET /api/v1/auth/login` - Redirects to Google login
- `GET /api/v1/auth/callback` - OAuth callback from Google
- `GET /api/v1/auth/logout` - Logout and clear cookies
- `GET /api/v1/auth/me` - Get current user info

### Protected Routes

- `GET /api/v1/protected/protected` - Example protected route

### Users

- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create a user
- `GET /api/v1/users/{user_id}` - Get a specific user
- `PUT /api/v1/users/{user_id}` - Update a user
- `DELETE /api/v1/users/{user_id}` - Delete a user

### Items

- `GET /api/v1/items` - List items
- `POST /api/v1/items` - Create an item

### AI

- `POST /api/v1/ai/chat` - Send a chat request to Azure OpenAI
- `POST /api/v1/ai/chat/stream` - Send a streaming chat request to Azure OpenAI

## Notes

- For production, make sure to set `secure=True` for cookies and use HTTPS
- Update CORS settings for your production frontend URL
- Consider adding refresh tokens for longer sessions