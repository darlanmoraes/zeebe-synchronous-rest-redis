FROM node:8.4.0

WORKDIR /app

COPY package.json package.json
RUN npm install

COPY src src
COPY tsconfig.json tsconfig.json
RUN npm run build
COPY zeebe/random-number.bpmn zeebe/random-number.bpmn

EXPOSE 3000

CMD [ "node", "build" ]