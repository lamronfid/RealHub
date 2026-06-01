# Base image includes Python, Playwright, Chromium, and all system deps.
# Pin to the same Playwright version used in requirements.txt.
FROM mcr.microsoft.com/playwright/python:v1.58.0-jammy

WORKDIR /app

# Install Python deps first so Docker layer cache is reused on code-only changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code.
COPY . .

# Single sync worker: scraping is blocking + async-inside-sync via asyncio.run().
# 300 s timeout covers the slowest Mersan + detail-page path.
# 4 threads allow concurrent health checks / rate requests while a search runs.
EXPOSE 8080
CMD ["gunicorn", \
     "--bind", "0.0.0.0:8080", \
     "--workers", "1", \
     "--threads", "4", \
     "--timeout", "300", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "app:app"]
