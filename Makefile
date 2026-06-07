# edu-staff-web — task runner (wraps bun scripts). Run `make` for the menu.
# Bun is the package manager/runtime; see .claude/CLAUDE.md for conventions.

BUN ?= bun

.DEFAULT_GOAL := help
.PHONY: help install dev build start lint lint-fix format typecheck \
        test test-watch storybook build-storybook check ci clean reinstall

help: ## Show this help
	@echo "edu-staff-web — make targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies (bun install)
	$(BUN) install

dev: ## Start the Next.js dev server (Turbopack)
	$(BUN) dev

build: ## Production build (next build)
	$(BUN) run build

start: ## Run the production server (after build)
	$(BUN) start

lint: ## Biome check (no writes)
	$(BUN) lint

lint-fix: ## Biome check + autofix
	$(BUN) lint:fix

format: ## Biome format (writes)
	$(BUN) format

typecheck: ## TypeScript check, no emit
	$(BUN)x tsc --noEmit

test: ## Run the test suite once (vitest run)
	$(BUN) vitest run

test-watch: ## Run tests in watch mode
	$(BUN) vitest

storybook: ## Start Storybook on :6006
	$(BUN) storybook

build-storybook: ## Static Storybook build
	$(BUN) build-storybook

check: lint typecheck test ## Fast local gate: lint + typecheck + test

ci: lint typecheck test build ## Full gate (mirrors pre-push): + production build

clean: ## Remove build artifacts and caches
	rm -rf .next storybook-static node_modules/.cache

reinstall: clean ## Clean then reinstall dependencies
	rm -rf node_modules
	$(BUN) install
