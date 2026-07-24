# Portable image: builds the React client and runs the single Bun server.
# Works on any host that runs a container (Railway / Render / Fly).
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app
COPY --from=build /app ./
ENV PORT=8080
EXPOSE 8080
CMD ["bun", "run", "src/server/index.ts"]
