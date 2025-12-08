#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImVtcGxveWVlNCIsImV4cCI6MTc0NjkxNjgyOH0.3qmbArDM8G0wfh_EfGyjIBV5VEsdcWKBYuCGxWZBC_4"
BASE_URL="http://127.0.0.1:5000"
CONCURRENCY=1
NUM_REQUESTS=1

declare -A ENDPOINTS=(
#   ["records_rates"]="api/records/rates"
#   ["edit_reference_add"]="api/edit_reference"
#   ["edit_reference_delete"]="api/edit_reference"
#   ["send_form_water_consumption_single"]="api/send_form"
#   ["rjson_to_excel"]="api/json_to_excel"
   ["notify"]="api/notify"
)

for key in "${!ENDPOINTS[@]}"; do
  DATA_FILE="post_data/${key}.json"
  URL="${BASE_URL}/${ENDPOINTS[$key]}"
  echo "Тестируем POST $URL с данными из $DATA_FILE"
  ab -n $NUM_REQUESTS -c $CONCURRENCY -p "$DATA_FILE" -T application/json -H "tokenJWTAuthorization: $TOKEN" "$URL"
  echo "---------------------------------------"
done
