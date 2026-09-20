FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgles2 libegl1 libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD gunicorn config.wsgi:application --bind 0.0.0.0: --workers 1 --timeout 120
