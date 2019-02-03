FROM mhart/alpine-node:10

WORKDIR /app
COPY . .

RUN npm install
RUN npm run bootstrap
RUN npm run build

EXPOSE 3000 8000