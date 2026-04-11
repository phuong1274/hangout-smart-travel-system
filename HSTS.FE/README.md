# HSTS FRONTEND (Hangout - Smart Travel System)

## Project Overview
- **Environment:** Node.js (v20+)
- **Framework:** React 19 + Vite 7 (JavaScript)
- **UI Library:** Ant Design (AntD) 6.x
- **State Management:** Zustand 5
- **Server State Handling:** TanStack React Query 5
- **Routing:** React Router v7

## Technical Setup
Open the terminal in the `HSTS.FE` directory:

- **Install Dependencies:**
  ```bash
  npm install
  ```

- **Environment Variables:**
  Create a `.env` file based on `.env.example`:
  ```env
  VITE_APP_NAME="Hangout - Smart Travel System"
  VITE_API_BASE_URL=https://localhost:7139
  VITE_TIMEOUT=10000

  # THIRD-PARTY SERVICES 
  VITE_GOOGLE_MAPS_KEY=your_google_maps_key
  VITE_GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
  VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
  ```

- **Run Development Server:**
  ```bash
  npm run dev
  ```

- **Build Project:**
  ```bash
  npm run build
  ```

##### 💡 Architectural Rules (Feature-Based Architecture)
The project is organized by features (modules), mapping 1-1 with the Business layers in the Backend.
- Do not mix business logic between features.
- Use Path Alias (`@/...`) for internal imports (configured in `jsconfig.json` and `vite.config.js`).

## Directory Structure (src/)

### 1. Features Layer (`src/features/`)
Contains core business logic (equivalent to the BE Application layer). Each sub-directory represents a module (e.g., `auth`, `users`, `home`, `schedules`):
- **api/**: Defines feature-specific Axios calls (mapped to BE Controllers).
- **hooks/**: Contains React Query logic for server state management.
- **components/**: UI components exclusive to this feature.
- **pages/**: Components representing entire screens/routes.
- **styles/**: CSS Modules specific to the feature.
- **assets/**: Feature-specific resources (images, icons).

### 2. Components Layer (`src/components/`)
- Contains shared/global UI components.
- **UI/**: Reusable atomic components (DataTable, SearchFilter, AppPagination).
- **Sidebar/**: Main navigation sidebar.
- **Errors/**: Error pages (403, 404) and ErrorBoundary for runtime exception handling.

### 3. Lib Layer (`src/lib/`)
- Configuration for external libraries (equivalent to the Infrastructure layer).
- **axios.js**: Configures interceptors for: XSRF-TOKEN attachment, automatic Token Refresh, 401 auto-logout, and centralized error notifications.
- **react-query.js**: Global caching and synchronization configuration.

### 4. Store Layer (`src/store/`)
- Manages global client state (e.g., Auth Session) using **Zustand**.
- Data is persisted to `localStorage` to maintain state upon page refresh.

### 5. Routes Layer (`src/routes/`)
- Defines application routing and security.
- **paths.js**: Centralized URL constant management.
- **ProtectedRoute**: Implements **RBAC (Role-Based Access Control)** based on permissions defined by the Backend.
- **index.jsx**: Utilizes `lazy` and `Suspense` for performance optimization (code splitting).

### 6. Utils & Layouts
- **utils/**: Shared utility functions (date formatting, string manipulation, storage).
- **layouts/**: Primary layout wrappers (`MainLayout` for authenticated users, `AuthLayout` for login/registration pages).

###### Core Libraries:
- **TanStack Query:** Server state management and caching.
- **Axios:** HTTP request handling with robust interceptors.
- **Zustand:** Lightweight and efficient client state management.
- **Ant Design:** Enterprise-grade UI component library.
- **React Router Dom:** Single Page Application (SPA) navigation.
