FROM node:24 AS builder
RUN npm install -g bun
WORKDIR /app
COPY package.json .
RUN bun install
COPY . .
RUN bun build src/index.ts --outdir dist --target bun

FROM oven/bun:1.3 AS runner
WORKDIR /app
COPY --from=builder /app/dist/index.js .
CMD ["bun", "run", "index.js"]
