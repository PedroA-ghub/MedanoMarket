from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate, TruncDay
from django.utils import timezone
from datetime import timedelta

from ventas.models import User, Product, Order, ProductView, PaymentLog, ExchangeRate, UserReport


@staff_member_required
def dashboard(request):
    today = timezone.now()
    thirty_days_ago = today - timedelta(days=30)

    users_last_30 = (
        User.objects.filter(date_joined__gte=thirty_days_ago)
        .annotate(date=TruncDate("date_joined"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )

    orders_last_30 = (
        Order.objects.filter(created_at__gte=thirty_days_ago)
        .annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )

    views_last_30 = (
        ProductView.objects.filter(viewed_at__gte=thirty_days_ago)
        .annotate(date=TruncDate("viewed_at"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )

    revenue_last_30 = (
        PaymentLog.objects.filter(
            payment_date__gte=thirty_days_ago, is_confirmed=True
        )
        .annotate(date=TruncDate("payment_date"))
        .values("date")
        .annotate(total=Sum("payment_amount"))
        .order_by("date")
    )

    orders_by_status = Order.objects.values("status").annotate(count=Count("id"))

    top_products = (
        ProductView.objects.filter(viewed_at__gte=thirty_days_ago)
        .values("product__name")
        .annotate(count=Count("id"))
        .order_by("-count")[:10]
    )

    labels_30 = [(today - timedelta(days=i)).strftime("%d/%m") for i in range(29, -1, -1)]
    users_by_day = {u["date"].strftime("%Y-%m-%d"): u["count"] for u in users_last_30}
    orders_by_day = {o["date"].strftime("%Y-%m-%d"): o["count"] for o in orders_last_30}
    views_by_day = {v["date"].strftime("%Y-%m-%d"): v["count"] for v in views_last_30}
    revenue_by_day = {r["date"].strftime("%Y-%m-%d"): float(r["total"]) for r in revenue_last_30}

    ctx = {
        "total_users": User.objects.count(),
        "total_products": Product.objects.count(),
        "total_orders": Order.objects.count(),
        "total_views": ProductView.objects.count(),
        "pending_orders": Order.objects.filter(status="pending").count(),
        "pending_reports": UserReport.objects.filter(status="pending").count(),
        "labels_30": labels_30,
        "users_series": [users_by_day.get((today - timedelta(days=i)).strftime("%Y-%m-%d"), 0) for i in range(29, -1, -1)],
        "orders_series": [orders_by_day.get((today - timedelta(days=i)).strftime("%Y-%m-%d"), 0) for i in range(29, -1, -1)],
        "views_series": [views_by_day.get((today - timedelta(days=i)).strftime("%Y-%m-%d"), 0) for i in range(29, -1, -1)],
        "revenue_series": [revenue_by_day.get((today - timedelta(days=i)).strftime("%Y-%m-%d"), 0) for i in range(29, -1, -1)],
        "orders_by_status": {s["status"]: s["count"] for s in orders_by_status},
        "top_products": [(p["product__name"], p["count"]) for p in top_products if p["product__name"]],
        "rate": ExchangeRate.get_current_rate(),
    }
    return render(request, "admin/dashboard.html", ctx)
