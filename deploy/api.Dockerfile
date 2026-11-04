# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN apk add --no-cache openssl && corepack enable
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @mcvc/api...
COPY apps/api apps/api
RUN pnpm --filter @mcvc/api exec prisma generate && pnpm --filter @mcvc/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/api
USER node
EXPOSE 4000
# Apply migrations, ensure platform bootstrap data (FITAG cities, plans, admin),
# optionally load demo stores (SEED_DEMO=true), then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/scripts/bootstrap-platform.js && if [ \"$SEED_DEMO\" = true ]; then node -r @swc-node/register prisma/seed.ts; fi && node dist/main.js"]
