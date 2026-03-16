# Stage 1: Build React app with Vite
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies (cached layer until package*.json changes)
COPY package*.json .
RUN npm ci

# Inject Vite env vars at build time — Vite bakes these into the JS bundle
ARG VITE_APP_NAME
ARG VITE_TIMEOUT
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_MAPS_KEY
ARG VITE_GOOGLE_OAUTH_CLIENT_ID
ARG VITE_CLOUDINARY_CLOUD_NAME

ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_TIMEOUT=$VITE_TIMEOUT
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_MAPS_KEY=$VITE_GOOGLE_MAPS_KEY
ENV VITE_GOOGLE_OAUTH_CLIENT_ID=$VITE_GOOGLE_OAUTH_CLIENT_ID
ENV VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME

COPY . .
RUN npm run build

# Stage 2: Serve built files with nginx
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
