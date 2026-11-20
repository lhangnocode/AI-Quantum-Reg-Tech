# Stage 1 – generate data/generated/*.json from the workbook (same scripts as `npm run data`).
# Hosts that build from Git (Render) have no data/generated/ (gitignored), so it is built here.
FROM node:22-slim AS data
WORKDIR /src
RUN npm init -y >/dev/null && npm install --no-audit --no-fund exceljs@4.4.0
COPY scripts/build-financial-engine-data.mjs scripts/build-data.mjs /src/scripts/
COPY data/QuantumRegTech_Input_Data_final.xlsx /src/data/
RUN node scripts/build-financial-engine-data.mjs && node scripts/build-data.mjs

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt \
    && useradd --create-home --uid 10001 appuser

# Build context is the repository root (see /.dockerignore). JSON is generated in stage 1 – no local `npm run data` needed:
#   docker build -f backend/Dockerfile -t quantumregtech-api .
#   docker run --env-file backend/.env -p 8000:8000 quantumregtech-api
# Secrets come from the host's env/secret manager at runtime (variables: backend/.env.example) – never COPY a .env file.
COPY backend/app /app/backend/app
COPY --from=data /src/data/generated /app/data/generated
COPY data/market_prices_monthly.csv /app/data/market_prices_monthly.csv
RUN mkdir -p /app/backend \
    && chown -R appuser:appuser /app/backend /app/data

USER appuser
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8000}"]
