FROM php:8.1-apache

RUN a2enmod rewrite \
    && apt-get update \
    && apt-get install -y --no-install-recommends libzip-dev \
    && docker-php-ext-install zip pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

ENV APACHE_DOCUMENT_ROOT=/var/www/html
# Live state under /var/www/html/data is intentionally excluded from the build context by .dockerignore.
# Keep that directory on persistent Chabokan storage so installed Windows client signatures remain valid.
COPY . /var/www/html/
RUN mkdir -p /var/www/html/data \
    && chown -R www-data:www-data /var/www/html/data \
    && chmod -R 750 /var/www/html/data \
    && sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf
EXPOSE 80
