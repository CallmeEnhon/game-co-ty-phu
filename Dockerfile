# MonoConCard Dockerfile - Nginx Alpine Web Server
FROM nginx:alpine

# Copy static web files to Nginx HTML root
COPY . /usr/share/nginx/html

# Expose HTTP port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
