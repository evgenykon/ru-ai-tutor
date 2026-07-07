FROM node:24

ENV NODE_ENV=production

WORKDIR /app

RUN npm install -g bun

COPY package.json bun.lock ./
RUN bun install --production

COPY . .

CMD ["sh", "-c", "bun run migrate:deploy && bun run prisma:generate && bun start"]
