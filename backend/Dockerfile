FROM python:3.11-slim

# Install system dependencies including Tesseract OCR and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libtesseract-dev \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY . .

ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production
ENV PORT=5001

EXPOSE 5001

CMD ["sh", "-c", "gunicorn app:create_app() --bind 0.0.0.0:${PORT:-5001} --workers 2 --timeout 120"]
