#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImVtcGxveWVlNCIsImV4cCI6MTc0NjkxNjgyOH0.3qmbArDM8G0wfh_EfGyjIBV5VEsdcWKBYuCGxWZBC_4"
URL="http://127.0.0.1:5000/api/upload_file"
FILE_PATH="post_data/notify.json"
ENTITY_TYPE="codes"
ENTITY_ID="2"
FILE_TYPE="MONTH_CLOSURE_SCAN"
DESCRIPTION="Тестовая загрузка файла"

# Количество параллельных запросов
CONCURRENCY=100

# Счётчики
success_count=0
fail_count=0


# Функция для выполнения одного запроса и проверки результата
do_request() {
  http_code=$(curl -w "%{http_code}" -o /dev/null -s -X POST "$URL" \
    -H "tokenJWTAuthorization: $TOKEN" \
    -F "file=@$FILE_PATH" \
    -F "entity_type=$ENTITY_TYPE" \
    -F "entity_id=$ENTITY_ID" \
    -F "file_type=$FILE_TYPE" \
    -F "description=$DESCRIPTION")

  if [ "$http_code" -eq 200 ]; then
    echo "success"
  else
    echo "fail"
  fi
}

echo "Начинаем нагрузочное тестирование с $CONCURRENCY параллельными запросами..."

start_time=$(date +%s.%N)

# Массив для хранения PID фоновых процессов
pids=()

# Массив для результатов
results=()

for i in $(seq 1 $CONCURRENCY)
do
  # Запускаем запрос в фоне и записываем результат в файл
  (
    result=$(do_request)
    echo "$result"
  ) &
  pids+=($!)
done

# Ждём завершения всех запросов и собираем результаты
for pid in "${pids[@]}"
do
  wait $pid
  # Получаем вывод из stdout фонового процесса
  # Чтобы получить вывод, лучше использовать временный файл, но для простоты:
  # Можно перенаправлять вывод в массив через process substitution, но в bash сложно.
  # Поэтому используем workaround: запускать запросы последовательно с параллелизмом через xargs (ниже).
done

end_time=$(date +%s.%N)
elapsed=$(awk "BEGIN {print $end_time - $start_time}")


echo "Время выполнения $CONCURRENCY запросов: $elapsed секунд"

# --- Более удобный способ с xargs для сбора результатов ---

echo "Перезапускаем с xargs для сбора статистики..."

success_count=0
fail_count=0

seq $CONCURRENCY | xargs -P $CONCURRENCY -I{} bash -c '
  http_code=$(curl -w "%{http_code}" -o /dev/null -s -X POST "'"$URL"'" \
    -H "tokenJWTAuthorization: '"$TOKEN"'" \
    -F "file=@'"$FILE_PATH"'" \
    -F "entity_type='"$ENTITY_TYPE"'" \
    -F "entity_id='"$ENTITY_ID"'" \
    -F "file_type='"$FILE_TYPE"'" \
    -F "description='"$DESCRIPTION"'")
  if [ "$http_code" -eq 200 ]; then
    echo success
  else
    echo fail
  fi
' > results.txt

success_count=$(grep -c success results.txt)
fail_count=$(grep -c fail results.txt)

echo "Успешных запросов: $success_count"
echo "Неуспешных запросов: $fail_count"
