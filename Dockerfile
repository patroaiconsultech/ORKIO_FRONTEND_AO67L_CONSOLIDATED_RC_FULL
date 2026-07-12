FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html postcss.config.cjs tailwind.config.cjs vite.config.js public_sw.js server.cjs ./
COPY public ./public
COPY src ./src

RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.cjs public_sw.js ./
COPY public ./public
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["node", "server.cjs"]
