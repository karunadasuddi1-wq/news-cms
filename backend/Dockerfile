# Backend — Node.js + Express + Sequelize API
FROM node:22-alpine

WORKDIR /app

# sqlite3 is a native module (compiled via node-gyp) — Alpine needs these
# build tools present, or `npm install` fails partway through with a
# confusing gyp/bindings error. Removed again after install to keep the
# final image small.
RUN apk add --no-cache --virtual .build-deps python3 make g++

COPY package*.json ./
RUN npm install --omit=dev \
    && apk del .build-deps

COPY . .

ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/server.js"]
