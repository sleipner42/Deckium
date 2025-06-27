.PHONY: start-docker backend-dev frontend-dev

start-docker:
	docker compose up --build -d

backend-dev:
	uv run uvicorn app.main:app --host 0.0.0.0 --port 8123 --reload

frontend-dev:
	cd admin-frontend && VITE_API_URL=http://127.0.0.1:8123 npm run dev
