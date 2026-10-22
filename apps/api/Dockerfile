FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm install --workspace apps/api --include-workspace-root --no-audit --no-fund
COPY apps/api ./apps/api
RUN npm run --workspace apps/api db:generate && npm run --workspace apps/api build && npm prune --omit=dev --workspace apps/api --include-workspace-root
EXPOSE 4000
CMD ["sh", "-c", "npm run --workspace apps/api db:migrate && if [ \"$SEED_DEMO_DATA\" = \"true\" ]; then npm run --workspace apps/api db:seed; fi && npm run --workspace apps/api start"]
