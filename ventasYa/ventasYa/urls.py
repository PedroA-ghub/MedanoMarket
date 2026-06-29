from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve
from ventasYa.socialauth_adapter import google_login_success
from ventasYa.google_oauth_views import google_login, google_callback
from ventasYa.dashboard_views import dashboard

urlpatterns = [
    path("dashboard/", dashboard, name="dashboard"),
    path("admin/", admin.site.urls),
    path("api/", include("ventas.api_urls")),
    path("accounts/", include("allauth.urls")),
    path("accounts/google/login-custom/", google_login, name="google_login_custom"),
    path("accounts/google/login-callback/", google_callback, name="google_callback"),
    path("accounts/google/login-success/", google_login_success, name="google_login_success"),
]

if settings.DEBUG:
    urlpatterns += [
        path("", include("ventas.urls")),
    ]

# Serve media files in both dev and production
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Serve the React SPA in production
if not settings.DEBUG and settings.FRONTEND_DIR.is_dir():
    # Serve frontend static assets (JS, CSS, images from Vite build)
    urlpatterns += [
        re_path(r'^(?P<path>.*\.[a-zA-Z0-9]+)$', serve, {'document_root': settings.FRONTEND_DIR}),
    ]
    # Catch-all: serve index.html for SPA routing
    urlpatterns += [
        re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
    ]
