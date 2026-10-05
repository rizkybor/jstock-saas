# Single-container Laravel API for demo/staging deploys (Render, etc).
# Not a production-grade php-fpm+nginx setup — php artisan serve is a single
# process, which is fine for a client demo's traffic but not for real load.
FROM php:8.3-cli-alpine

RUN apk add --no-cache postgresql-dev libzip-dev oniguruma-dev \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql mbstring zip bcmath

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY . .
RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080
CMD ["/start.sh"]
