from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api import ProductViewSet, OrderViewSet, AuthViewSet, WishlistViewSet, CartViewSet, ExchangeRateViewSet, ProViewSet, ReportViewSet, health_check, seller_profile

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"auth", AuthViewSet, basename="auth")
router.register(r"wishlist", WishlistViewSet, basename="wishlist")
router.register(r"cart", CartViewSet, basename="cart")
router.register(r"exchange-rate", ExchangeRateViewSet, basename="exchange_rate")
router.register(r"pro", ProViewSet, basename="pro")
router.register(r"reports", ReportViewSet, basename="report")

urlpatterns = [
    path("", include(router.urls)),
    path("health/", health_check, name="health_check"),
    path("sellers/<uuid:user_id>/", seller_profile, name="seller_profile"),
]
