# FastAPI Backend with Google OAuth Authentication

This is a FastAPI backend application with Google OAuth authentication integration.

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

## Notes

- For production, make sure to set `secure=True` for cookies and use HTTPS
- Update CORS settings for your production frontend URL
- Consider adding refresh tokens for longer sessions
