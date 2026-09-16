FROM node:18-alpine AS builder

# Install required packages
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm i -g pnpm

# Copy monorepo configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source
COPY . .

# Build shared and api
RUN pnpm --filter @repo/shared build
RUN pnpm --filter api build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Install pnpm for prod dependencies resolution if needed, though we can just run node dist/main
RUN npm i -g pnpm

# Copy built assets
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Install ONLY production dependencies (for smaller image)
RUN pnpm install --prod --ignore-scripts

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]

