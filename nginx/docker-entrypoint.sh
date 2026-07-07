#!/bin/sh
envsubst '${NGINX_HOST}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
exec nginx -g 'daemon off;'
