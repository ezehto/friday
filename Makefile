.PHONY: preview preview-local preview-local-stop check-frontend check-dist-overlay

preview:
	docker compose up --build -d --wait preview
	@echo "Friday preview: http://127.0.0.1:8742"

preview-local:
	docker compose -f compose.dev.yaml up -d frontend-dev
	@curl -fs -o /dev/null --retry 60 --retry-delay 1 --retry-all-errors http://127.0.0.1:5740
	@echo "Friday local preview (with the git-ignored overlay): http://127.0.0.1:5740"

preview-local-stop:
	docker compose -f compose.dev.yaml down

# Needs the overlay present to mean anything: the production build must not contain its project names.
check-dist-overlay:
	docker compose -f compose.dev.yaml run --rm frontend-dev npm run build
	@! grep -rlE "Lucy|Natsu|Demo v2" frontend/dist || { echo "overlay content found in frontend/dist"; exit 1; }

check-frontend:
	@scripts/check-no-local-mocks.sh
	docker compose config --quiet
	docker compose -f compose.dev.yaml config --quiet
	docker compose -f compose.dev.yaml run --rm frontend-dev npm run check
