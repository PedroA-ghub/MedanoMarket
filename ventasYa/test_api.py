import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ventasYa.settings')
import django
django.setup()

from django.test import Client
from ventas.models import User

c = Client()
u = User.objects.get(username='Pedro Antonio')
print(f'User: {u.username}, is_pro: {u.is_pro}')
c.force_login(u)

resp = c.get('/api/pro/dashboard/')
print(f'Status: {resp.status_code}')
if resp.status_code == 200:
    import json
    print(f'Data: {json.dumps(resp.json(), indent=2)}')
else:
    print(f'Content: {resp.content[:500]}')
