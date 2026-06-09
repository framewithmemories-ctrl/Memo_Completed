FROM python:3.11-slim

WORKDIR /app

# System deps required by Pillow (image processing) and bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# --extra-index-url is required for the `emergentintegrations` package (AI Gift Finder).
# If you remove the AI feature, you can drop emergentintegrations from requirements.txt
# and the extra index below.
RUN pip install --no-cache-dir \
    --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ \
    -r requirements.txt

COPY . .

EXPOSE 8001

# FastAPI app object is `app` inside server.py
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
