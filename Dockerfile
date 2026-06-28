# Imagen única para los dos procesos (server + worker). El comando se elige en compose.
FROM node:20-slim

WORKDIR /app

# Deps primero (cache de capas)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Código
COPY . .

# tsx (dependency) corre TS directo, sin build. El comando lo define cada servicio.
CMD ["npm", "run", "start:server"]
