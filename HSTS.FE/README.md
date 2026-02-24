# HSTS FRONTEND (Hangout - Smart Travel System)

**Environment:** Node.js (v18+)  
**Framework:** React + Vite (JavaScript)  
**UI Library:** Ant Design (AntD)  

## Technical Setup

### Installation
1. Turn on terminal in the root directory:
```
npm install
```
2. Environment Variables
Get .env from non-git source. Create a .env file in the root directory with the following structure:
```
VITE_API_BASE_URL=https://localhost:7139/api
```
3. Development
```
npm run dev
```
```
npm run build
```
!Focus
Feature-Based Architecture: This project maps 1-to-1 with the Backend's Clean Architecture layers. Do not mix business logic between features.

## Explain Layers (Directory Structure)
### Features Layer (src/features/)
Contains business modules (e.g., Auth, Users, Schedules). This is the "Application" equivalent in FE.

- api/: Defines Axios calls for specific features (maps to BE Controllers).

- hooks/: Contains React Query logic (maps to Application Handlers).

- components/: UI components exclusive to the feature.

- pages/: View components that represent a full screen/route.

### Components Layer (src/components/)
Contains Shared/Global UI components (e.g., CustomTable, PageHeader). These are "Value Objects" equivalent for the UI—reusable and business-logic-free.

### Lib Layer (src/lib/)
Implements configurations for external libraries (Infrastructure equivalent).

- axios.js: Configured with interceptors to handle ErrorOr and FluentValidation responses from BE.

- react-query.js: Global caching and synchronization configuration.

### Store Layer (src/store/)
Manages global state (e.g., Auth Session) using Zustand.

### Routes Layer (src/routes/)
Receives URL requests and translates them into specific Page components (maps to API Layer routing).

## Core Libraries
- TanStack Query (React Query): For data fetching and server-state management.

- Axios: HTTP client with error-matching for BE ErrorOr patterns.

- Zustand: Lightweight global state management.

- Ant Design: UI framework for a minimalist, professional interface.

- React Router v6: For client-side navigation.