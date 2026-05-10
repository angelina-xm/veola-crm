# Render: переменная PORT задаётся платформой
# Статика собирается на этапе build (см. DEPLOY.md и render.yaml), не при каждом старте контейнера.
web: gunicorn vexora.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4
