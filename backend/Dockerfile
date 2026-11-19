FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
COPY scripts ./scripts
COPY api-contract.json ./
ENV NODE_ENV=production PORT=5001
USER node
EXPOSE 5001
CMD ["node", "src/index.js"]
