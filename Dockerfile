# from: https://raw.githubusercontent.com/vercel/next.js/refs/heads/canary/examples/with-docker/Dockerfile
# ============================================
# Stage 1: Dependencies Installation Stage
# ============================================
ARG NODE_VERSION=24.13.0-slim

FROM node:${NODE_VERSION} AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

# Install project dependencies with frozen lockfile for reproducible builds
RUN npm ci --no-audit --no-fund

# ============================================
# Stage 2: Build Next.js application in standalone mode
# ============================================
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

# Copy project dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source code
COPY . .

ENV NODE_ENV=production

RUN npm run build
# ============================================
# Stage 3: Run Next.js application
# ============================================

FROM node:${NODE_VERSION} AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy production assets
COPY --from=builder --chown=node:node /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown node:node .next

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

CMD ["node", "server.js"]