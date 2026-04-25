#!/bin/sh
set -e

generate_self_signed() {
    local domain=$1
    local cert_dir="/etc/letsencrypt/live/$domain"
    mkdir -p "$cert_dir"
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout "$cert_dir/privkey.pem" \
        -out "$cert_dir/fullchain.pem" \
        -subj "/CN=$domain" 2>/dev/null
    echo "nginx-init: self-signed cert created for $domain (temporary)"
}

if [ ! -f "/etc/letsencrypt/live/saber11.ieplayasdelviento.edu.co/fullchain.pem" ]; then
    echo "nginx-init: SSL certs not found — generating temporary self-signed certs..."
    generate_self_signed "saber11.ieplayasdelviento.edu.co"
    generate_self_signed "saber11-api.ieplayasdelviento.edu.co"
fi

exec nginx -g "daemon off;"
