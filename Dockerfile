FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json ./
RUN npm install
COPY frontend ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install --omit=dev
COPY backend ./
COPY --from=web /web/dist /app/frontend/dist
EXPOSE 4000 4100
CMD ["node", "src/server.js"]
