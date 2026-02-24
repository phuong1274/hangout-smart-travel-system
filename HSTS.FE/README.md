# HSTS FRONTEND (Hangout - Smart Travel System)

Environment: Node.js (v18+ recommended)
Framework: React + Vite (JavaScript)
UI Library: Ant Design (AntD)

## Core Philosophy

- Hangout is an Algorithm-based destination scheduling system (Strictly NO AI).

- The frontend is built using a Feature-Based Architecture to seamlessly map 1-to-1 with the Backend's Clean Architecture (Domain/Application layers).

## Tech Stack

- Build Tool: Vite

- Routing: React Router v6

- Data Fetching & Caching: TanStack Query (React Query)

- HTTP Client: Axios (Configured with interceptors for BE ErrorOr & FluentValidation)

- State Management: Zustand (For global states like Auth Session)

- Styling/UI: Ant Design & Custom CSS/LESS

## Getting Started

1. Install Dependencies
{
npm install
}
2. Environment Variables

- Copy .env.example and rename it to .env.

- Update the VITE_API_BASE_URL to match your local backend port.

- Add third-party keys (Google Maps, Cloudinary) if needed.

3. Run Development Server
{
npm run dev
}
## Folder Structure (Feature-Based)
```
src/
├── assets/ # Static assets (images, global styles)
├── components/ # Shared/Global UI components (e.g., CustomTable)
├── config/ # Global configurations and constants (constants.js)
├── features/ # CORE: Business modules (auth, schedules, users, etc.)
│ └── [feature]/
│ ├── api/ # Axios API calls
│ ├── components/ # Feature-specific UI components
│ ├── hooks/ # React Query hooks (useQuery, useMutation)
│ └── pages/ # Smart components / Page layouts
├── hooks/ # Shared utility hooks
├── layouts/ # App layout wrappers (MainLayout, AuthLayout)
├── lib/ # Third-party library setups (axios.js, react-query.js)
├── routes/ # Global router configuration
├── store/ # Zustand global stores
└── utils/ # Helper functions (formatters, parsers)
```
## Development Guidelines

- Feature Isolation: Always create new pages and UI components inside their respective src/features/[module-name]/ folder.
Do not clutter the global src/components/ unless the component is used across multiple features.

- API Calls: Define API endpoints in features/[module]/api/ and wrap them in custom hooks using React Query inside features/[module]/hooks/.

- Error Handling: Backend validation errors (HTTP 400 from FluentValidation) are automatically caught and displayed via Ant Design's notification system in src/lib/axios.js.

- Configuration: Do not hardcode magic strings. Use src/config/constants.js for app-wide constants, pagination settings, and roles.