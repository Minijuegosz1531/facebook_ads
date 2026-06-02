# Multi-stage build for the Angular SPA: build with Node, serve with nginx.
# nginx proxies /api/* to whichever backend has the network alias `api`.

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:1.27-alpine AS runtime
# Angular 17+ application builder emits dist/<project>/browser/.
COPY --from=build /app/dist/web-angular/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4200
