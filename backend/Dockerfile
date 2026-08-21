FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir \
    --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ \
    -r requirements.txt

COPY . .

# Apply any source-level CMS migrations first.
RUN python scripts/wire_cms.py

EXPOSE 8001

# Explicitly import sitecustomize before uvicorn so the CMS routes are registered
# even when the Python runtime does not auto-load sitecustomize.
CMD ["python", "-c", "import sitecustomize; import uvicorn; uvicorn.run('server:app', host='0.0.0.0', port=8001)"]
