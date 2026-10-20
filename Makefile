.PHONY: help install setup dev build test typecheck docker-build docker-up docker-down docker-logs

help:
	@echo "AICTE Workflow (SIH 26262) — available targets:"
	@echo "  make install       Install server + client dependencies"
	@echo "  make setup         Create schema + seed demo data (local SQLite)"
	@echo "  make dev           Run server (:4000) and client (:5173)"
	@echo "  make build         Production build of the client"
	@echo "  make test          Run backend test suite"
	@echo "  make typecheck     Type-check server and client"
	@echo "  make docker-build  Build Docker images"
	@echo "  make docker-up     Start the full stack via docker compose (:8080)"
	@echo "  make docker-down   Stop the stack"
	@echo "  make docker-logs   Tail stack logs"

install:
	npm run install:all

setup:
	npm run db:setup

dev:
	npm run dev

build:
	npm run build

test:
	npm --prefix server test

typecheck:
	npm run typecheck

docker-build:
	docker compose build

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f
