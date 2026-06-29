import os
from django.core.management.base import BaseCommand
from ventas.models import User

class Command(BaseCommand):
    help = "Creates a superuser from ADMIN_EMAIL and ADMIN_PASSWORD env vars if none exists"

    def handle(self, *args, **options):
        email = os.environ.get("ADMIN_EMAIL", "")
        password = os.environ.get("ADMIN_PASSWORD", "")

        if not email or not password:
            self.stdout.write("ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping")
            return

        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write("Superuser already exists — skipping")
            return

        User.objects.create_superuser(
            username=email.split("@")[0],
            email=email,
            password=password,
        )
        self.stdout.write(self.style.SUCCESS(f"Superuser created: {email}"))
