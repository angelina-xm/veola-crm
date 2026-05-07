# Render: переменная PORT задаётся платформой
web: sh -c "python manage.py collectstatic --noinput && gunicorn vexora.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4"
