# HSTS FRONTEND:
Environment: Node.js (v18+)
Framework: React + Vite (JavaScript)
UI Library: Ant Design (AntD)

## Technical Setup:
Turn on terminal in the root directory:

- Install Dependencies:
-> npm install

- Environment Variables:
Create a `.env` file in the root directory based on `.env.example`:
```env
VITE_API_BASE_URL=https://localhost:7139/api
VITE_TIMEOUT=10000
```

- Development:
-> npm run dev

- Build:
-> npm run build

##### !Focus
Feature-Based Architecture: This project maps 1-to-1 with the Backend's Clean Architecture layers. Do not mix business logic between features. Use path aliases (`@/...`) for all internal imports.

## Explain Layers:

# Features Layer (src/features/):
- Contains business modules (e.g., Auth, Users, Schedules). This is the "Application" equivalent in FE.
- **api/**: Defines Axios calls for specific features (maps to BE Controllers/Endpoints).
- **hooks/**: Contains React Query logic for server-state management.
- **components/**: UI components exclusive to the specific feature.
- **pages/**: View components representing full screens/routes.

# Components Layer (src/components/):
- Contains Shared/Global UI components (e.g., DataTable, SearchFilter).
- These are "Value Objects" equivalent for the UI—reusable, atomic, and business-logic-free.
- Includes global **ErrorBoundary** for system resilience.

# Lib Layer (src/lib/):
- Implements configurations for external libraries (Infrastructure equivalent).
- **axios.js**: Configured with interceptors to handle **ErrorOr** patterns, automatic **Bearer Token** attachment, and 401 auto-logout.
- **react-query.js**: Global caching and synchronization configuration.

# Store Layer (src/store/):
- Manages global state (e.g., Auth Session) using **Zustand**.
- Standardized Auth flow: `user`, `token`, `role`, and `isAuthenticated`.

# Routes Layer (src/routes/):
- Receives URL requests and translates them into specific Page components (maps to API Layer routing).
- **ProtectedRoute**: Implements **RBAC (Role-Based Access Control)** based on Backend role definitions.
- **Lazy Loading**: Utilizes `React.lazy` and `Suspense` for route-based code splitting and performance optimization.

###### .env Structure
```
VITE_APP_NAME="Hangout - Smart Travel System"
VITE_API_BASE_URL=https://localhost:XXXX/api
VITE_TIMEOUT=10000

# THIRD-PARTY SERVICES 
VITE_GOOGLE_MAPS_KEY=
VITE_GOOGLE_OAUTH_CLIENT_ID=
VITE_CLOUDINARY_CLOUD_NAME=
```

###### Core Libraries:
- TanStack Query (React Query)
- Axios (with Interceptors)
- Zustand (State Management)
- Ant Design (UI Framework)
- React Router v6
