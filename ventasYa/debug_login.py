import os, django
os.environ["DJANGO_SETTINGS_MODULE"] = "ventasYa.settings"
django.setup()

from ventas.models import User
from django.contrib.auth import authenticate

u = User.objects.get(email="pedrocarpiobussines@gmail.com")
print(f"is_verified: {u.is_verified}")
print(f"is_active: {u.is_active}")
print(f"Username: '{u.username}'")

user = authenticate(username=u.username, password="admin123")
print(f"authenticate() returned: {user}")
if user is None:
    # Try with email as username
    user2 = authenticate(username=u.email, password="admin123")
    print(f"authenticate with email returned: {user2}")
