HSTS.FE – Frontend Setup Guide
1. Overview

HSTS.FE is the frontend application built with:

React (Vite)

JavaScript

Axios

Ant Design

React Router

This project is designed to integrate with the HSTS.BE (.NET 8 backend).

2. Requirements

Make sure you have the following installed:

Node.js ≥ 18 (recommended 20+)

npm ≥ 9

Check your versions:

node -v
npm -v
3. Installation
3.1 Clone the repository
git clone <repository-url>
cd HSTS.FE
3.2 Install dependencies
npm install
4. Environment Configuration

This project uses environment variables following the Vite convention.

4.1 Create .env file

Copy the example file:

cp .env.example .env

(Windows: manually copy .env.example and rename it to .env)

Update the environment variables according to your backend configuration.

5. Running the Project

Start the development server:

npm run dev

Default URL:

http://localhost:5173
6. Project Structure
src/
  api/
    api.js
    authService.js

  components/
    ProtectedRoute.jsx
    Layout/
      SharedLayout.jsx

  contexts/
    AuthContext.jsx

  hooks/
    useAuth.js

  pages/
    auth/
    traveler/
    partner/
    moderator/
    admin/
    shared/

  App.jsx
  main.jsx
7. Communication with Backend (.NET 8)

The frontend communicates with the backend using:

Axios instance (api.js)

Refresh token queue interceptor

Bearer token via Authorization header

withCredentials: true (if backend uses cookies)

8. Authentication Flow
Login

Frontend calls:

POST /api/auth/login

Backend should return:

{
  "accessToken": "...",
  "user": { ... }
}

The frontend stores the access token locally.

Normal API Request

The Axios interceptor automatically attaches:

Authorization: Bearer <accessToken>
Token Expiration

If an API call returns 401:

Interceptor automatically calls:

POST /api/auth/refresh

If refresh succeeds:

Access token is updated

Original request is retried

If refresh fails:

User is logged out

Local storage is cleared

9. Important Backend Configuration (.NET 8)
CORS Configuration

If frontend and backend run on different origins, enable CORS in .NET:

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});
10. Production Build

Build the project:

npm run build

The production build output will be located in:

dist/
11. Troubleshooting Checklist

If the frontend cannot communicate with the backend:

Check	Status
Backend is running	
Correct backend port	
Environment variables are set	
CORS is enabled	
Refresh endpoint path is correct