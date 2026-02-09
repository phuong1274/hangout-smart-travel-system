# HSTS FRONTEND:
Environment: React 19 + Vite 7 + TypeScript
UI Library: Ant Design 6
State Management: Zustand 5 (client state) + TanStack Query 5 (server state)
Routing: React Router 7

## Why these choices:

### React + Vite (not Next.js):
- HSTS is primarily an authenticated app (~90% features behind login) -> no SSR/SEO needed.
- Simpler than Next.js, easier to onboard 5 team members.
- Better code sharing with React Native if we build mobile later.
- SRS states "web-based application" for current phase (LI-4).

### Feature-Based Architecture (not folder-by-type):
- Inspired by Bulletproof React.
- Each feature is an independent module -> team of 5 can work in parallel without merge conflicts.
- Scales well with 13 features and 5 actor roles.
- Clear boundary: Feature A does NOT import directly from Feature B's internals, only through `index.ts` barrel export.

### Ant Design (not MUI, not shadcn/ui):
- Rich component library (Table, Form, DatePicker, Layout, Modal, Menu...).
- Built-in Admin/Dashboard layout patterns -> fits HSTS Admin, Partner, Moderator pages.
- Professional look with minimal custom CSS needed.

### Zustand + TanStack Query (not Redux):
- **TanStack Query** handles server state (API data, caching, pagination, refetch) -> replaces 80% of Redux usage.
- **Zustand** only for client state (auth token, UI state like sidebar collapsed, filter params).
- Less boilerplate than Redux Toolkit. Simpler mental model.
- Rule: **NEVER store API data in Zustand**. TanStack Query already caches it.

## Getting Started:

```bash
cd HSTS.FE
npm install
npm run dev       # Dev server at http://localhost:3000
npm run build     # Production build
npm run lint      # ESLint check
npm run preview   # Preview production build
```

##### !Focus
- `features/auth/` is the **example feature**. Follow this pattern for all new features.
- Do NOT remove `components/common/ProtectedRoute.tsx` - it handles role-based access.
- Do NOT remove `stores/auth.store.ts` - it manages JWT tokens and user session.
- Do NOT import feature internals directly. Always import through `index.ts`.

## Architecture Overview:

```
src/
├── app/              # App setup: App.tsx, routes.tsx, providers.tsx
├── assets/           # Static files: images, fonts
├── components/       # Shared components (used by 2+ features)
│   ├── layouts/      # Layout per role: Public, Admin, Traveler, Partner, Moderator
│   └── common/       # ProtectedRoute, LoadingScreen, NotFoundPage, etc.
├── config/           # Constants, env config, role definitions
├── features/         # ★ CORE - Each feature is an independent module
├── hooks/            # Shared custom hooks (used by 2+ features)
├── lib/              # 3rd-party configs: axios instance, query client
├── pages/            # Page components grouped by role (thin wrappers)
├── stores/           # Global Zustand stores (auth only)
├── types/            # Shared TypeScript types (API response, etc.)
└── utils/            # Shared utility functions
```

## Explain Layers:

# `features/` - Feature Modules (The Core):
- Each feature is a self-contained module with its own api, components, types, etc.
- Features map to SRS: auth, users, profile, trips, itinerary, budget, expenses, destinations, weather, reviews, transportation, dashboard.
- A feature MUST export its public API through `index.ts` (barrel export).
- A feature MUST NOT import from another feature's internal files.

Structure of each feature:
```
features/<name>/
├── api/
│   ├── <name>.api.ts       # Pure axios functions (shareable with React Native)
│   └── <name>.query.ts     # TanStack Query hooks (useQuery, useMutation)
├── components/             # Feature-specific React components
├── hooks/                  # Feature-specific custom hooks
├── stores/                 # Feature-specific Zustand stores (client state only)
├── types/
│   └── <name>.type.ts      # TypeScript interfaces and types
├── utils/                  # Feature-specific helpers
└── index.ts                # ★ Barrel export - the ONLY entry point
```

# `pages/` - Page Components:
- Pages are organized by actor role: `public/`, `traveler/`, `partner/`, `moderator/`, `admin/`.
- Pages are **thin** - they only assemble components from `features/` and wrap them in a layout.
- Pages do NOT contain business logic.

Example:
```tsx
// pages/traveler/TripsPage.tsx
import { TripList, useTrips } from '@/features/trips';
export const TripsPage = () => {
  const { data, isLoading } = useTrips();
  return <TripList trips={data} loading={isLoading} />;
};
```

# `components/layouts/` - Layouts:
- One layout per actor role. Each has sidebar navigation, header with user avatar, logout.
- PublicLayout: For guest/unauthenticated pages (Home, Login, Register).
- TravelerLayout, AdminLayout, PartnerLayout, ModeratorLayout: For authenticated pages.

# `lib/` - Third-party Configuration:
- `axios.ts`: Axios instance with JWT interceptor (auto-attach Bearer token from Zustand, auto-redirect on 401).
- `query-client.ts`: TanStack Query client with default staleTime (5min), retry (1), no refetchOnWindowFocus.
- `i18n.ts`: i18next configuration with namespace-per-feature pattern and browser language detection.

# `stores/` - Global State:
- `auth.store.ts`: Auth state (JWT, user). Uses Zustand `persist` middleware to save to localStorage.
- `currency.store.ts`: Multi-currency state (selected currency, convert, format). Persisted to localStorage.
- Feature-specific client state goes in `features/<name>/stores/`.

# `app/routes.tsx` - Routing:
- Role-based route protection using `ProtectedRoute` component.
- Routes are grouped: public -> traveler -> admin -> partner -> moderator -> 404.

## How to Create a New Feature:

Example: Creating the `trips` feature.

**Step 1**: Define types
```typescript
// features/trips/types/trip.type.ts
export interface Trip {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'PLANNED' | 'ONGOING' | 'COMPLETED';
}

export interface CreateTripRequest {
  name: string;
  startDate: string;
  endDate: string;
}
```

**Step 2**: Create API functions
```typescript
// features/trips/api/trip.api.ts
import api from '@/lib/axios';
import type { Trip, CreateTripRequest } from '../types/trip.type';
import type { PagedResponse, PagedRequest } from '@/types/api.type';

export const tripApi = {
  getAll: (params: PagedRequest) =>
    api.get<PagedResponse<Trip>>('/api/trips', { params }),
  getById: (id: number) =>
    api.get<Trip>(`/api/trips/${id}`),
  create: (data: CreateTripRequest) =>
    api.post<Trip>('/api/trips', data),
};
```

**Step 3**: Create TanStack Query hooks
```typescript
// features/trips/api/trip.query.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripApi } from './trip.api';

export const tripKeys = {
  all: ['trips'] as const,
  list: (params: PagedRequest) => [...tripKeys.all, 'list', params] as const,
  detail: (id: number) => [...tripKeys.all, 'detail', id] as const,
};

export const useTrips = (params: PagedRequest) =>
  useQuery({
    queryKey: tripKeys.list(params),
    queryFn: () => tripApi.getAll(params).then(res => res.data),
  });

export const useCreateTrip = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tripApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripKeys.all }),
  });
};
```

**Step 4**: Create components
```typescript
// features/trips/components/TripList.tsx
// ... React component using Ant Design Table, etc.
```

**Step 5**: Create barrel export
```typescript
// features/trips/index.ts
export { TripList } from './components/TripList';
export { useTrips, useCreateTrip } from './api/trip.query';
export type { Trip, CreateTripRequest } from './types/trip.type';
```

**Step 6**: Create page and add route
```typescript
// pages/traveler/TripsPage.tsx
import { TripList, useTrips } from '@/features/trips';
```

## Import Rules:

```
CORRECT:
import { TripList } from '@/features/trips';           // Through barrel export
import { useAuthStore } from '@/stores/auth.store';     // Global store
import { LoadingScreen } from '@/components/common';    // Shared component
import api from '@/lib/axios';                          // Lib

WRONG:
import { TripList } from '@/features/trips/components/TripList';  // Bypassing barrel
import { tripApi } from '@/features/trips/api/trip.api';          // Internal file
```

## Data Flow:

```
User Action -> Component -> TanStack Query hook -> api function -> Axios -> Backend API
                                  |
                          Auto caching & refetch
                                  |
UI state (filter, modal) -> Zustand store -> Component re-render
```

## Feature Mapping (SRS -> Code):

| SRS Code | Feature Name | Feature Module |
|----------|-------------|----------------|
| FE-01 | Transportation Management | `features/transportation/` |
| FE-02 | Itinerary Planning Support | `features/itinerary/` |
| FE-03 | Customizable Itinerary Planning | `features/itinerary/` |
| FE-04 | Trip Preference Collection | `features/trips/` |
| FE-05 | Trip Management | `features/trips/` |
| FE-06 | Estimated Budget Management | `features/budget/` |
| FE-07 | Destination Management | `features/destinations/` |
| FE-08 | Weather Management | `features/weather/` |
| FE-09 | Review & Moderation | `features/reviews/` |
| FE-10 | Account Management | `features/users/` |
| FE-11 | User Profile Management | `features/profile/` |
| FE-12 | Statistics and Analytics | `features/dashboard/` |
| FE-13 | Expense Recording & Tracking | `features/expenses/` |

## Internationalization (i18n):

Uses `react-i18next` with namespace-per-feature pattern.

### Structure:
```
src/locales/
├── en/                    # English (default)
│   ├── common.json        # Shared: nav, actions, status, errors, currency labels
│   ├── auth.json          # Auth feature: sign in, sign up, validation
│   ├── trips.json         # Trips feature
│   ├── admin.json         # Admin feature: sidebar, dashboard, users
│   ├── destinations.json  # Destinations feature
│   ├── expenses.json      # Expenses feature
│   ├── reviews.json       # Reviews feature
│   └── profile.json       # Profile feature
└── vi/                    # Vietnamese (add later)
    └── ...                # Same file names, translated values
```

### How to use in components:
```tsx
// Default namespace (common)
const { t } = useTranslation();
t('nav.signIn')          // -> "Sign In"
t('appName')             // -> "Hangout - Smart Travel System"

// Feature-specific namespace
const { t } = useTranslation('auth');
t('signIn.title')        // -> "Sign In"
t('validation.emailRequired')  // -> "Please enter your email"

// Interpolation
t('signIn.subtitle', { appName: 'HSTS' })  // -> "Welcome to HSTS"
```

### How to add a new language:
1. Copy `src/locales/en/` to `src/locales/vi/` (or any language code)
2. Translate all JSON values
3. Import and register in `src/lib/i18n.ts`:
```typescript
import commonVI from '@/locales/vi/common.json';
// ... other imports

export const resources = {
  en: { ... },
  vi: { common: commonVI, auth: authVI, ... },
};
```

## Multi-Currency:

Supports 6 currencies: VND, USD, EUR, JPY, KRW, THB.

### How to use:
```tsx
import { useCurrency } from '@/hooks/use-currency';

const { format, convert, formatConverted, currency } = useCurrency();

format(500000)                    // "₫500,000" (current currency = VND)
format(25, 'USD')                 // "$25.00"
convert(25, 'USD')                // 635,000 (USD -> current currency)
convert(25, 'USD', 'EUR')         // 23 (USD -> EUR)
formatConverted(25, 'USD')        // "₫635,000" (convert + format)
```

### Components:
- `<LanguageSwitcher />` - Dropdown to switch language, placed in all layout headers.
- `<CurrencySwitcher />` - Dropdown to switch currency, placed in all layout headers.

###### .env
```
VITE_API_URL=https://localhost:7000
VITE_GOOGLE_MAPS_KEY=<your_key>
VITE_GOOGLE_OAUTH_CLIENT_ID=<your_client_id>
VITE_CLOUDINARY_CLOUD_NAME=<your_cloud_name>
```

###### Library in project:
- React 19 + TypeScript
- Vite 7 (build tool)
- Ant Design 6 + @ant-design/icons (UI)
- @ant-design/charts (dashboard charts)
- Zustand 5 (client state)
- @tanstack/react-query 5 (server state)
- React Router 7 (routing)
- Axios (HTTP client)
- Day.js (date handling)
- react-i18next + i18next (internationalization)
- i18next-browser-languagedetector (auto language detection)
- ESLint + Prettier (code style)
