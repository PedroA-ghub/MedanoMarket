#!/usr/bin/env bash
# Exit on error
set -o errexit

# ---- Frontend ----
echo "--- Building frontend ---"
cd frontend
npm install
npm run build
cd ..

# ---- Backend ----
echo "--- Installing Python dependencies ---"
cd ventasYa
pip install -r requirements.txt

echo "--- Running migrations ---"
python manage.py migrate

echo "--- Collecting static files ---"
python manage.py collectstatic --no-input

echo "--- Creating admin user if configured ---"
python manage.py ensure_admin

cd ..
