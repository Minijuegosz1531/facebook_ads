# Multi-stage build for Next.js with `output: 'standalone'`.
# The runtime image only ships the server bundle + traced node_modules — small.

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `public/` is optional in Next.js. Ensure it exists so the runtime stage's
# `COPY --from=build /app/public ./public` always finds a directory (empty or
# not), even on repos that don't ship any static assets.
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next.js standalone server reads PORT and HOSTNAME from env.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next standalone output: a self-contained server.js with the minimum required.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
