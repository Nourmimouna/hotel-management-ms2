.PHONY: help build up down logs clean restart seed-db migrate-db test

help:
	@echo "Hotel Management System - Available Commands:"
	@echo "  make build          - Build all Docker images"
	@echo "  make up             - Start all services"
	@echo "  make down           - Stop all services"
	@echo "  make logs           - Show logs from all services"
	@echo "  make restart        - Restart all services"
	@echo "  make seed-db        - Populate database with sample data"
	@echo "  make clean          - Clean up containers and volumes"

build:
	@echo "Building Docker images..."
	docker-compose build --no-cache

up:
	@echo "Starting Hotel Management System..."
	docker-compose up -d
	@echo "Application starting at http://localhost"

down:
	@echo "Stopping all services..."
	docker-compose down

logs:
	docker-compose logs -f

restart: down up

clean:
	@echo "Cleaning up..."
	docker-compose down -v --remove-orphans
	docker system prune -f

seed-db:
	@echo "Seeding database..."
	docker-compose exec backend npm run seed

migrate-db:
	@echo "Migrating to MongoDB..."
	docker-compose exec backend node scripts/migrate-to-mongo.js
