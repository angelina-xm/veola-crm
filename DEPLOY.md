# Деплой backend на Render + связка с Vercel (Next.js)

## Обзор

- **Backend:** Django + DRF на [Render](https://render.com) (Gunicorn, `vexora.wsgi:application`).
- **Frontend:** Next.js на Vercel; API-база задаётся через `NEXT_PUBLIC_API_URL` (без статических JWT в env — только URL сервера).

WSGI-модуль проекта: **`vexora.wsgi:application`** (не `config.wsgi`).

---

## 1. Репозиторий

Подключи GitHub-репозиторий к Render как **Web Service**.

- **Root directory:** корень репозитория (или папка с `manage.py`, если монорепо — укажи подкаталог).
- **Runtime:** Python (версию можно зафиксировать файлом `runtime.txt`).

---

## 2. Команды на Render

**Build Command:**

```bash
pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
```

**Start Command** (если не берётся из `Procfile` автоматически):

```bash
gunicorn vexora.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4
```

`Procfile` в репозитории уже содержит эквивалентную команду для `web`.

---

## 3. Переменные окружения (обязательные в production)

| Переменная | Описание |
|------------|----------|
| `DEBUG` | Оставь пустым или `false`. Для локальной разработки можно `true`. |
| `SECRET_KEY` | Случайная длинная строка (`django.core.management.utils.get_random_secret_key()`). **Обязательна**, если `DEBUG` не включён. |
| `ALLOWED_HOSTS` | Хосты через запятую, без схемы: `myapp.onrender.com`. Render добавляет `RENDER_EXTERNAL_HOSTNAME` в коде автоматически, но лучше явно указать свой хост. |
| `CORS_ALLOWED_ORIGINS` | Origin фронта через запятую, **со схемой**, без path: `https://my-app.vercel.app`. Для нескольких preview — перечисли все нужные URL. |
| `CSRF_TRUSTED_ORIGINS` | Обычно те же что и CORS (для админки и cookie): `https://my-app.vercel.app` |

### Опционально

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | Если подключён **PostgreSQL** на Render, вставь **Internal** URL из панели БД. Без неё используется SQLite (на диске инстанса; для продакшена лучше Postgres). |
| `RENDER` | На Render часто выставляется автоматически; используется для хоста. |

**Не нужно** класть в env access/refresh JWT — выдаёт только `/api/token/` и `/api/token/refresh/`.

---

## 4. JWT endpoints

После деплоя проверь (подставь свой URL):

- `POST https://<render-host>/api/token/` — тело `{ "username": "...", "password": "..." }`, ответ `{ "access", "refresh" }`.
- `POST https://<render-host>/api/token/refresh/` — тело `{ "refresh": "..." }`, ответ с новым `access`.

---

## 5. Frontend (Vercel)

В **Environment Variables** проекта Vercel:

```text
NEXT_PUBLIC_API_URL=https://<render-host>/api
```

Важно: значение должно указывать на **корень API** с суффиксом `/api` (как в локальной разработке), без лишнего слэша в конце перед путями вида `/token/` в клиенте.

После изменения переменных — **пересобрать** деплой.

---

## 6. Статика

`STATIC_ROOT` + `collectstatic` + WhiteNoise — статика для **admin** и `STATIC_URL`. API JSON от этого не зависит.

---

## 7. Чеклист после деплоя

1. Health: открыть `https://<render-host>/admin/` (редирект на логин — нормально).
2. CORS: с Vercel открыть приложение и выполнить логин / запрос к API — в консоли браузера не должно быть CORS-ошибок.
3. Миграции: убедиться, что build выполнил `migrate` без ошибок.

---

## 8. Локальная разработка

- `DEBUG=true` (или не задавать `DEBUG` и использовать дефолтное поведение для dev в коде — см. `settings.py`).
- `SECRET_KEY` можно не задавать при `DEBUG=true` (используется dev-ключ из настроек).
- `CORS_ALLOWED_ORIGINS` можно не задавать — при `DEBUG=true` включён `CORS_ALLOW_ALL_ORIGINS`.

Пример см. в файле `.env.example` в корне backend.
