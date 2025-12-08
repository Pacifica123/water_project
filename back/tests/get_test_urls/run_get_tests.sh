#!/bin/bash

URL_DIR="get_test_urls"
NUM_REQUESTS=100
CONCURRENCY=10
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImVtcGxveWVlNCIsImV4cCI6MTc0Njg5MDY5NX0.OJutYnqfMYkpDrDzbIQ7qZq7HLIB19ym1t9iqQSA3Lk"  # Вставь сюда свой токен

for url_file in "$URL_DIR"/*.txt; do
  echo "Тестируем GET роутер с URL из файла: $url_file"
  url=$(head -n 1 "$url_file")
  echo "URL: $url"

  ab -n $NUM_REQUESTS -c $CONCURRENCY -H "tokenJWTAuthorization: $TOKEN" "$url"

  echo "----------------------------------------"
done

