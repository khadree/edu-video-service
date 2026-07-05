# Multi-stage build for production

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript code
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:22-alpine

# Install ffmpeg for video metadata extraction
RUN apk add --no-cache ffmpeg

# Strip npm's own CLI + yarn + corepack — not needed at runtime,
# and their bundled deps are what's driving the Node.js CVEs
# RUN rm -rf /usr/local/lib/node_modules/npm \
#            /usr/local/lib/node_modules/corepack \
#            /opt/yarn-v* \
#     && rm -f /usr/local/bin/npm /usr/local/bin/npx \
#              /usr/local/bin/yarn /usr/local/bin/yarnpkg \
#              /usr/local/bin/corepack

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy built application and production dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Create uploads directory
RUN mkdir -p /app/uploads/temp && \
    chown -R nodejs:nodejs /app/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start application
CMD ["node", "dist/server.js"]
