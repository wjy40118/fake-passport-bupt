FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# ---- Uncomment them (below) if you are not using docker-compose ----
# ENV PORT=10985
# EXPOSE 10985

CMD [ "node", "." ]