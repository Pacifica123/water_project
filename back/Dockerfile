FROM python:3.12-slim
WORKDIR /app
COPY req.txt .
RUN pip install -q --disable-pip-version-check --no-cache-dir psycopg2-binary
RUN pip install -q --disable-pip-version-check --no-cache-dir pandas
RUN pip install -q --disable-pip-version-check --no-cache-dir -r req.txt
ENV OPENBLAS_NUM_THREADS=1
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV DATABASE_URL=postgresql://noir_psql:Noir_Tea@postgres_db:5432/test_practic
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
