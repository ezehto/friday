.PHONY: preview check-frontend

preview:
	docker compose up --build -d --wait preview
	@echo "Friday preview: http://127.0.0.1:8742"

check-frontend:
	docker compose config --quiet
	docker compose -f compose.dev.yaml config --quiet
	docker compose -f compose.dev.yaml run --rm frontend-dev npm run check
