# Multi-stage Dockerfile for JobeVidz Server

# Stage 1: Build
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY server/package*.json ./server/
COPY package*.json ./

# Install dependencies
RUN cd server && npm ci

# Copy source code
COPY server/src ./server/src
COPY server/tsconfig.json ./server/

# Build TypeScript
RUN cd server && npm run build

# Stage 2: Production
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    yt-dlp \
    curl

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files and install production dependencies only
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/server/dist ./server/dist

# Copy necessary directories
COPY --chown=nodejs:nodejs uploads ./uploads
COPY --chown=nodejs:nodejs data ./data

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server/dist/index.js"]

