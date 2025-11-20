# Step 1: Build the Angular app
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps
COPY . .
ARG BUILD_CONFIGURATION=production
ENV NG_BUILD_SKIP_FONT_GENERATION=1
RUN npm run build -- --configuration ${BUILD_CONFIGURATION}

# Step 2: Use Nginx to serve the Angular app
FROM nginx:alpine
RUN apk add --no-cache gettext
ENV PORTAL_BACKEND_SERVER=portalbackend:8080 \
    PORTAL_BACKEND_CONTEXT=services
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/fl-platform/browser /usr/share/nginx/html
EXPOSE 80
CMD ["/bin/sh", "-c", "envsubst '$$PORTAL_BACKEND_SERVER $$PORTAL_BACKEND_CONTEXT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
