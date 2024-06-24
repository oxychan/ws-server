FROM node:18.16.0-alpine3.17
RUN mkdir -p /opt/app/ws-server
WORKDIR /opt/app/ws-server
COPY package*.json ./
RUN npm install
COPY src/ ./src
EXPOSE 8081
CMD ["npm", "run", "pm2"]