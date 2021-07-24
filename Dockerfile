FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

ENV PORT=10985

EXPOSE 10985

CMD [ "node", "." ]