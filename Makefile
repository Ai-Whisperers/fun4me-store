# =============================================================================
# Vete Platform - Makefile
# Docker deployment commands for Supabase Cloud + Cloudflare Tunnel
# =============================================================================

.PHONY: help setup build up down logs shell health clean tunnel-up tunnel-down

# Default target
help:
	@echo "Vete Platform - Docker Deployment"
	@echo "=================================="
	@echo ""
	@echo "Prerequisites:"
	@echo "  - Docker and Docker Compose installed"
	@echo "  - Supabase Cloud project (REQUIRED)"
	@echo "  - Cloudflare account with tunnel (for production)"
	@echo ""
	@echo "Quick Start:"
	@echo "  make setup          - Create .env from template"
	@echo "  make build          - Build Docker images"
	@echo "  make up             - Start services"
	@echo "  make health         - Check application health"
	@echo ""
	@echo "Development:"
	@echo "  make logs           - View all logs"
	@echo "  make logs-web       - View web app logs"
	@echo "  make shell          - Shell into web container"
	@echo "  make restart        - Restart web service"
	@echo ""
	@echo "Production (Cloudflare Tunnel):"
	@echo "  make tunnel-up      - Start with Cloudflare tunnel"
	@echo "  make tunnel-down    - Stop all services"
	@echo "  make tunnel-logs    - View tunnel logs"
	@echo ""
	@echo "Maintenance:"
	@echo "  make down           - Stop all services"
	@echo "  make clean          - Remove containers and volumes"
	@echo "  make rebuild        - Force rebuild and restart"

# =============================================================================
# Setup
# =============================================================================

setup:
	@if [ ! -f .env ]; then \
		echo "Creating .env from template..."; \
		cp .env.docker.example .env; \
		echo ""; \
		echo "IMPORTANT: Edit .env with your Supabase credentials!"; \
		echo ""; \
		echo "Required variables:"; \
		echo "  NEXT_PUBLIC_SUPABASE_URL"; \
		echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY"; \
		echo "  SUPABASE_SERVICE_ROLE_KEY"; \
		echo "  DATABASE_URL"; \
		echo ""; \
		echo "Get these from: https://supabase.com/dashboard"; \
	else \
		echo ".env already exists."; \
	fi

# =============================================================================
# Build & Run
# =============================================================================

build:
	@echo "Building Docker images..."
	@echo "Note: NEXT_PUBLIC_* variables are inlined at build time"
	docker compose build

up:
	docker compose up -d
	@echo ""
	@echo "Services starting..."
	@echo "Check status: make health"
	@echo "View logs: make logs"

down:
	docker compose down

restart:
	docker compose restart vete-web

rebuild:
	docker compose down
	docker compose build --no-cache
	docker compose up -d

# =============================================================================
# Logging & Debugging
# =============================================================================

logs:
	docker compose logs -f

logs-web:
	docker compose logs -f vete-web

logs-redis:
	docker compose logs -f redis

shell:
	docker compose exec vete-web sh

status:
	docker compose ps

health:
	@echo "Checking health..."
	@curl -s http://localhost:3000/api/health | head -c 500 || echo "Not responding yet"

# =============================================================================
# Cloudflare Tunnel (Production)
# =============================================================================

tunnel-up:
	@if [ -z "$$CLOUDFLARE_TUNNEL_TOKEN" ] && ! grep -q "CLOUDFLARE_TUNNEL_TOKEN=." .env 2>/dev/null; then \
		echo "ERROR: CLOUDFLARE_TUNNEL_TOKEN not set"; \
		echo ""; \
		echo "Setup tunnel:"; \
		echo "  1. cloudflared tunnel login"; \
		echo "  2. cloudflared tunnel create vete"; \
		echo "  3. cloudflared tunnel token vete"; \
		echo "  4. Add token to .env"; \
		exit 1; \
	fi
	docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d

tunnel-down:
	docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml down

tunnel-logs:
	docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml logs -f cloudflared

tunnel-status:
	docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml ps

# =============================================================================
# Cron Jobs (Manual Trigger)
# =============================================================================

cron-health:
	@echo "Triggering health check cron..."
	@curl -s -X POST http://localhost:3000/api/cron/check-health \
		-H "Authorization: Bearer $$(grep CRON_SECRET .env | cut -d= -f2)"

cron-reminders:
	@echo "Triggering reminders..."
	@curl -s -X POST http://localhost:3000/api/cron/reminders \
		-H "Authorization: Bearer $$(grep CRON_SECRET .env | cut -d= -f2)"

# =============================================================================
# Cleanup
# =============================================================================

clean:
	docker compose down -v --remove-orphans
	docker image prune -f

clean-all:
	docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml down -v --remove-orphans
	docker system prune -af --volumes

# =============================================================================
# Production Deployment
# =============================================================================

deploy:
	@echo "=== Production Deployment ==="
	@echo ""
	@if [ ! -f .env ]; then \
		echo "ERROR: .env not found. Run 'make setup' first."; \
		exit 1; \
	fi
	@echo "1. Building images..."
	docker compose build --no-cache
	@echo ""
	@echo "2. Starting services..."
	docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d
	@echo ""
	@echo "3. Waiting for health check..."
	@sleep 15
	@make health
	@echo ""
	@echo "Deployment complete!"
	@echo "Site: https://vete.ai-whisperers.org"

update:
	@echo "=== Updating Deployment ==="
	git pull
	docker compose build
	docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d vete-web
	@echo "Update complete!"
