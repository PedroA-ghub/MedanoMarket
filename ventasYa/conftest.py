import os
import pytest
import django
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ventasYa.settings")


def pytest_configure():
    settings.DATABASES["default"] = {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
