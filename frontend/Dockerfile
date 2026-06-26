# Etapa 1: Construcción (Build)
FROM node:22-alpine AS builder

WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Argumento para activar el modo mantenimiento en tiempo de construcción
ARG VITE_MAINTENANCE_MODE=false
ENV VITE_MAINTENANCE_MODE=$VITE_MAINTENANCE_MODE

# Construimos la aplicación estática
RUN npm run build

# Etapa 2: Servidor Web Ultraligero (Nginx)
FROM nginx:alpine

# Copiamos la configuración personalizada de Nginx para Single Page Applications
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos los archivos estáticos generados por React en la Etapa 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
