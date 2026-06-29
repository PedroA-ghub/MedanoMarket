import django, os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ventasYa.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.test import RequestFactory
from rest_framework.test import APIRequestFactory, force_authenticate
from ventas.api import ProViewSet
from ventas.models import User

factory = APIRequestFactory()
user = User.objects.get(username='Pedro Antonio')
request = factory.get('/pro/dashboard/')
force_authenticate(request, user=user)

view = ProViewSet.as_view({'get': 'dashboard'})
response = view(request)
print('Status:', response.status_code)
print('Data:', response.data)
