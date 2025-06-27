.PHONY: start-docker backend-dev frontend-dev

start-docker:
	docker compose up --build -d

backend-dev:
	uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

frontend-dev:
	cd admin-frontend && npm run dev
