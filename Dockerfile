FROM node:18.16.0-alpine3.17
RUN mkdir -p /usr/src/app/ws-server
WORKDIR /usr/src/app/ws-server

COPY package*.json ./
RUN npm install
COPY src/ ./src

EXPOSE 8081
CMD ["npm", "run", "pm2"]