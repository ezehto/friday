.PHONY: preview preview-local check-frontend

preview:
	docker compose up --build -d --wait preview
	@echo "Friday preview: http://127.0.0.1:8742"

preview-local:
	docker compose -f compose.dev.yaml up -d frontend-dev
	@curl -fs -o /dev/null --retry 60 --retry-delay 1 --retry-all-errors http://127.0.0.1:5740
	@echo "Friday local preview (with the git-ignored overlay): http://127.0.0.1:5740"

check-frontend:
	@test -z "$$(git ls-files frontend/src/mocks/local)" || { echo "frontend/src/mocks/local must never be tracked"; exit 1; }
	docker compose config --quiet
	docker compose -f compose.dev.yaml config --quiet
	docker compose -f compose.dev.yaml run --rm frontend-dev npm run check
