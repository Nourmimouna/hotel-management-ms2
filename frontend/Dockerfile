FROM nginx:alpine

# Copy your HTML files directly
COPY public/ /usr/share/nginx/html/

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf
COPY ssl.conf /etc/nginx/conf.d/default.conf

# Create SSL certificates
RUN mkdir -p /etc/nginx/certs
RUN apk add --no-cache openssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/nginx-selfsigned.key \
    -out /etc/nginx/certs/nginx-selfsigned.crt \
    -subj "/C=AT/ST=Vienna/L=Vienna/O=Hotel/CN=localhost"

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
