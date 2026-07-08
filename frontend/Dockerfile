# Stage 1 — build the Vite/React app
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# VITE_API_URL must be set at BUILD time (Vite bakes env vars into the
# compiled JS) — pass it as a build arg when building the image, e.g.:
#   docker build --build-arg VITE_API_URL=https://api.example.com/api .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# Stage 2 — serve the built static files with nginx
FROM nginx:alpine

# This is the fix for the "Not Found" / blank-page-on-refresh problem we hit
# on Render — baked directly into the container this time, so it's never
# a per-host dashboard setting you can forget to configure again.
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
