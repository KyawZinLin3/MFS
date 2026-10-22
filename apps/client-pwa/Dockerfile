FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/client-pwa/package.json ./apps/client-pwa/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN npm install --workspace apps/client-pwa --include-workspace-root --no-audit --no-fund
COPY apps/client-pwa ./apps/client-pwa
RUN npm run --workspace apps/client-pwa build

FROM nginx:1.27-alpine
COPY apps/client-pwa/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/client-pwa/dist /usr/share/nginx/html
EXPOSE 80
