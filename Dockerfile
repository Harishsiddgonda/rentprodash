# Multi-stage Dockerfile for RentPro
# Stage 1: Build frontend web application
FROM node:20-alpine AS frontend-builder
WORKDIR /app/mobile
COPY mobile/package*.json ./
RUN npm ci
COPY mobile/ ./
RUN npm run build:web

# Stage 2: Runtime environment
FROM node:20-alpine
WORKDIR /app

# Install production backend dependencies
COPY backend/package*.json ./backend/
RUN npm --prefix backend ci --omit=dev

# Copy backend code and persistent database
COPY backend/ ./backend/
COPY database/ ./database/

# Copy compiled frontend from Stage 1 into mobile/dist
COPY --from=frontend-builder /app/mobile/dist ./mobile/dist

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

CMD ["node", "backend/src/server.js"]
