from django.urls import path
from . import views

app_name = "ventas"

urlpatterns = [
    path("", views.product_list, name="product_list"),
    path("product/<int:pk>/", views.product_detail, name="product_detail"),
    path("login/", views.user_login, name="login"),
    path("logout/", views.user_logout, name="logout"),
    path("register/", views.register, name="register"),
    path("product/<int:product_id>/request/", views.request_product, name="request_product"),
    path("order/<uuid:order_id>/chat/", views.order_chat, name="order_chat"),
    path("order/<uuid:order_id>/deliver/", views.mark_delivered, name="mark_delivered"),
    path("order/<uuid:order_id>/pay/", views.verify_payment, name="verify_payment"),
    path("order/<uuid:order_id>/cancel/", views.cancel_order, name="cancel_order"),
]
