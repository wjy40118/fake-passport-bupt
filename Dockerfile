FROM node:14 AS build

WORKDIR /usr/src/app

COPY package*.json yarn.lock  ./

RUN yarn install --frozen-lockfile --production=false

COPY . .

RUN yarn build



FROM node:14

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY package*.json yarn.lock  ./

RUN yarn install --frozen-lockfile

COPY --from=build /usr/src/app/dist dist
COPY static static
COPY .env .env

# ---- Uncomment them (below) if you are not using docker-compose ----
# ENV PORT=10985
# EXPOSE 10985

CMD [ "node", "dist" ]
