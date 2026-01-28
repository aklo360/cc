# ccwtf Docker Management
# Everything runs in containers!

.PHONY: help build up down logs shell dev brain stream web clean

# Default compose file
COMPOSE_FILE = docker-compose.full.yml

help:
	@echo "ccwtf Docker Commands"
	@echo "====================="
	@echo ""
	@echo "Setup:"
	@echo "  make build          Build all images"
	@echo "  make build-base     Build base image only"
	@echo ""
	@echo "Production:"
	@echo "  make up             Start all production services"
	@echo "  make down           Stop all services"
	@echo "  make restart        Restart all services"
	@echo "  make logs           View all logs"
	@echo ""
	@echo "Development:"
	@echo "  make dev            Start development container (interactive)"
	@echo "  make dev-shell      Shell into running dev container"
	@echo "  make web-dev        Start Next.js dev server"
	@echo ""
	@echo "Individual Services:"
	@echo "  make brain          Start brain-1 only"
	@echo "  make brain-logs     View brain-1 logs"
	@echo "  make brain-shell    Shell into brain-1"
	@echo "  make stream         Start stream service"
	@echo "  make web            Start web service"
	@echo ""
	@echo "Multi-Agent:"
	@echo "  make brain-2        Start second brain agent"
	@echo "  make brain-3        Start third brain agent"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean          Remove all containers and images"
	@echo "  make prune          Remove unused Docker resources"
	@echo "  make wallet-info    Show wallet info for all agents"

# ===========================================
# BUILD
# ===========================================
build-base:
	docker build -t ccwtf-base:latest -f docker/Dockerfile.base .

build: build-base
	docker compose -f $(COMPOSE_FILE) build

# ===========================================
# PRODUCTION
# ===========================================
up:
	docker compose -f $(COMPOSE_FILE) up -d brain-1 web stream cloudflared

down:
	docker compose -f $(COMPOSE_FILE) down

restart:
	docker compose -f $(COMPOSE_FILE) restart

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

# ===========================================
# DEVELOPMENT
# ===========================================
dev:
	docker compose -f $(COMPOSE_FILE) --profile dev run --rm -it dev

dev-shell:
	docker exec -it ccwtf-dev /bin/bash

web-dev:
	docker compose -f $(COMPOSE_FILE) --profile dev up web-dev

# ===========================================
# INDIVIDUAL SERVICES
# ===========================================
brain:
	docker compose -f $(COMPOSE_FILE) up -d brain-1

brain-logs:
	docker compose -f $(COMPOSE_FILE) logs -f brain-1

brain-shell:
	docker exec -it ccwtf-brain-1 /bin/bash

brain-status:
	curl -s http://localhost:3001/status | jq .

stream:
	docker compose -f $(COMPOSE_FILE) up -d stream

stream-logs:
	docker compose -f $(COMPOSE_FILE) logs -f stream

web:
	docker compose -f $(COMPOSE_FILE) up -d web

# ===========================================
# MULTI-AGENT
# ===========================================
brain-2:
	docker compose -f $(COMPOSE_FILE) up -d brain-2

brain-3:
	docker compose -f $(COMPOSE_FILE) up -d brain-3

all-brains:
	docker compose -f $(COMPOSE_FILE) up -d brain-1 brain-2 brain-3

# ===========================================
# WALLET MANAGEMENT
# ===========================================
wallet-info:
	@echo "=== Brain Agent Wallets ==="
	@for i in 1 2 3; do \
		echo "\n--- brain-$$i ---"; \
		docker exec ccwtf-brain-$$i solana address 2>/dev/null || echo "Not running"; \
		docker exec ccwtf-brain-$$i solana balance 2>/dev/null || true; \
	done

wallet-create:
	@echo "Creating new wallet in brain-1..."
	docker exec ccwtf-brain-1 solana-keygen new --outfile /data/wallet/keypair.json --no-bip39-passphrase --force

wallet-airdrop:
	@echo "Airdropping to brain-1..."
	docker exec ccwtf-brain-1 solana airdrop 2

# ===========================================
# MAINTENANCE
# ===========================================
clean:
	docker compose -f $(COMPOSE_FILE) down -v --rmi all

prune:
	docker system prune -af
	docker volume prune -f

# ===========================================
# DEPLOY (from inside dev container)
# ===========================================
deploy-web:
	docker exec ccwtf-dev bash -c "cd /home/claude/ccwtf && npm run build && npx wrangler pages deploy out --project-name=ccwtf"

deploy-program:
	docker exec ccwtf-dev bash -c "cd /home/claude/ccwtf/programs/cc-casino && anchor build && anchor deploy --provider.cluster devnet"
