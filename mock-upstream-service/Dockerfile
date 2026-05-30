FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY shared-libs/package.json ./shared-libs/package.json
COPY auth-service/package.json ./auth-service/package.json
COPY gateway-service/package.json ./gateway-service/package.json
COPY rate-limiter-service/package.json ./rate-limiter-service/package.json
COPY logging-service/package.json ./logging-service/package.json
COPY frontend-dashboard/package.json ./frontend-dashboard/package.json
COPY mock-upstream-service/package.json ./mock-upstream-service/package.json
RUN npm install
COPY . .
WORKDIR /app/mock-upstream-service
EXPOSE 4010
CMD ["npm", "start"]
