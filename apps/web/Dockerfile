FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN npm install --workspace apps/web --include-workspace-root --no-audit --no-fund
COPY apps/web ./apps/web
RUN npm run --workspace apps/web build

FROM nginx:1.27-alpine
ENV API_UPSTREAM=api:4000
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
