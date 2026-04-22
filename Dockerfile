# Build arg: set to empty string for nginx-proxy deployments (single host),
# or to the full backend URL for split deployments (e.g. Railway, Render).
ARG VITE_API_URL=

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
ARG VITE_API_URL
RUN VITE_API_URL=$VITE_API_URL npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
