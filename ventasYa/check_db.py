import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ventasYa.settings')
import django; django.setup()
from django.conf import settings

engine = settings.DATABASES['default']['ENGINE']
print(f"Engine: {engine}")
print(f"Name: {settings.DATABASES['default'].get('NAME', 'N/A')}")
print(f"Host: {settings.DATABASES['default'].get('HOST', 'N/A')}")

if 'postgresql' in engine:
    print("STATUS: PostgreSQL activo")
else:
    print("STATUS: SQLite activo")
