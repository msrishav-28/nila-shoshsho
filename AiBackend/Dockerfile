FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt constraints.txt ./
RUN pip install --no-cache-dir --upgrade pip==26.3 setuptools==84.2.1 && pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home app
COPY app ./app
COPY run.py readiness.py sarvam_check.py ./
ENV FLASK_ENV=production FLASK_DEBUG=0 PORT=5002
USER app
EXPOSE 5002
CMD ["gunicorn", "--bind", "0.0.0.0:5002", "--workers", "2", "--threads", "2", "--timeout", "60", "--access-logfile", "-", "--access-logformat", "%(s)s %(D)s", "run:app"]
