FROM node:20.20.2-alpine AS build
ARG VITE_API_BASE_URL
ARG VITE_STREAM_TIMEOUT_MS
ARG VITE_OIDC_AUTHORIZATION_ENDPOINT
ARG VITE_OIDC_TOKEN_ENDPOINT
ARG VITE_OIDC_END_SESSION_ENDPOINT
ARG VITE_OIDC_CLIENT_ID
ARG VITE_OIDC_REDIRECT_URI
ARG VITE_OIDC_POST_LOGOUT_REDIRECT_URI
ARG VITE_OIDC_SCOPE
ARG VITE_OIDC_AUDIENCE
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY scripts/verify-lockfile.mjs ./scripts/verify-lockfile.mjs
RUN node scripts/verify-lockfile.mjs
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY . .
RUN npm run check:server
RUN npm run check:sw
RUN npm test
RUN npm run build
RUN npm run verify:dist
RUN npm run build:evidence

FROM node:20.20.2-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs ./server.mjs
COPY --from=build /app/public-config.js ./public-config.js
COPY --from=build /app/build-evidence ./build-evidence
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
