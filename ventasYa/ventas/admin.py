from django.contrib import admin, messages
from django.utils.safestring import mark_safe
from django.urls import reverse
from django.shortcuts import redirect
from .models import (
    User, Product, ProductImage, Order, OrderItem, PaymentLog,
    Message, Wishlist, Cart, ExchangeRate, ProductView,
    ProPaymentProof, UserReport,
)
from .services.bcv import update_exchange_rate_from_bcv, BCVScraperError


# ─── Inlines ───────────────────────────────────────────────────────────

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    readonly_fields = ["id", "image_preview"]
    fields = ["image", "image_preview", "order"]

    def image_preview(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image.url}" width="100" height="100" style="object-fit:cover;border-radius:8px" />')
        return "-"
    image_preview.short_description = "Vista previa"


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["subtotal"]
    fields = ["product", "product_name", "product_price", "quantity", "subtotal"]


class PaymentLogInline(admin.TabularInline):
    model = PaymentLog
    extra = 0
    readonly_fields = ["id"]
    fields = ["payment_amount", "payment_method", "is_confirmed", "payment_date", "notes"]


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ["sent_at"]
    fields = ["sender", "receiver", "content", "is_read", "sent_at"]
    can_delete = False


# ─── Actions ────────────────────────────────────────────────────────────

def activate_products(modeladmin, request, queryset):
    updated = queryset.update(is_active=True)
    messages.success(request, f"{updated} producto(s) activado(s).")
activate_products.short_description = "Activar productos seleccionados"

def deactivate_products(modeladmin, request, queryset):
    updated = queryset.update(is_active=True)
    messages.success(request, f"{updated} producto(s) desactivado(s).")
deactivate_products.short_description = "Desactivar productos seleccionados"

def mark_orders_delivered(modeladmin, request, queryset):
    for order in queryset:
        try:
            order.mark_delivered()
        except ValueError as e:
            messages.error(request, f"Orden {order.id}: {e}")
    messages.success(request, f"{queryset.count()} orden(es) marcada(s) como entregada(s).")
mark_orders_delivered.short_description = "Marcar ordenes como entregadas"

def mark_orders_completed(modeladmin, request, queryset):
    updated = queryset.exclude(status__in=["completed", "cancelled"]).update(
        buyer_paid=True, seller_delivered=True, status="completed"
    )
    messages.success(request, f"{updated} orden(es) marcada(s) como completada(s).")
mark_orders_completed.short_description = "Marcar ordenes como completadas"

def approve_pro(modeladmin, request, queryset):
    for proof in queryset:
        user = proof.user
        user.is_pro = True
        user.pro_pending = False
        user.save()
    messages.success(request, f"{queryset.count()} solicitude(es) PRO aprobada(s).")
approve_pro.short_description = "Aprobar solicitudes PRO seleccionadas"

def reject_pro(modeladmin, request, queryset):
    for proof in queryset:
        user = proof.user
        user.pro_pending = False
        user.save()
        proof.delete()
    messages.success(request, f"{queryset.count()} solicitude(es) PRO rechazada(s).")
reject_pro.short_description = "Rechazar solicitudes PRO seleccionadas"


# ─── ModelAdmins ────────────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = [
        "email", "username", "display_pro_status", "is_verified",
        "is_active", "needs_onboarding", "date_joined",
    ]
    list_filter = ["is_verified", "is_pro", "pro_pending", "is_active", "needs_onboarding"]
    search_fields = ["email", "username", "identity_card"]
    readonly_fields = ["id", "created_at", "updated_at", "profile_picture_preview", "last_login", "date_joined"]
    fieldsets = [
        ("Credenciales", {"fields": ["email", "username", "password"]}),
        ("Información personal", {"fields": ["profile_picture", "profile_picture_preview", "age", "identity_card"]}),
        ("Estado", {"fields": ["is_verified", "is_active", "is_pro", "pro_pending", "needs_onboarding"]}),
        ("Fechas", {"fields": ["date_joined", "last_login", "created_at", "updated_at"]}),
        ("Permisos", {"fields": ["is_staff", "is_superuser", "groups", "user_permissions"]}),
    ]
    actions = ["verify_users", "approve_pro_manual", "remove_pro"]

    def display_pro_status(self, obj):
        if obj.is_pro:
            return mark_safe('<span style="color:#f59e0b;font-weight:bold">PRO</span>')
        if obj.pro_pending:
            return mark_safe('<span style="color:#f97316">Pendiente</span>')
        return "—"
    display_pro_status.short_description = "PRO"

    def profile_picture_preview(self, obj):
        if obj.profile_picture:
            return mark_safe(f'<img src="{obj.profile_picture.url}" width="80" height="80" style="object-fit:cover;border-radius:50%" />')
        return "-"
    profile_picture_preview.short_description = "Vista previa"

    def verify_users(self, request, queryset):
        updated = queryset.update(is_verified=True)
        messages.success(request, f"{updated} usuario(s) verificado(s).")
    verify_users.short_description = "Verificar usuarios seleccionados"

    def approve_pro_manual(self, request, queryset):
        updated = queryset.update(is_pro=True, pro_pending=False)
        messages.success(request, f"{updated} usuario(s) ahora son PRO.")
    approve_pro_manual.short_description = "Activar PRO manualmente"

    def remove_pro(self, request, queryset):
        updated = queryset.update(is_pro=False, pro_pending=False)
        messages.success(request, f"PRO removido de {updated} usuario(s).")
    remove_pro.short_description = "Remover PRO"


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        "name", "seller_email", "price", "price_bs_display",
        "stock", "featured", "is_active", "created_at",
    ]
    list_filter = ["is_active", "featured", "seller"]
    search_fields = ["name", "description", "seller__email"]
    readonly_fields = ["price_bs", "created_at", "updated_at"]
    inlines = [ProductImageInline]
    actions = [activate_products, deactivate_products]

    def seller_email(self, obj):
        return obj.seller.email
    seller_email.short_description = "Vendedor"
    seller_email.admin_order_field = "seller__email"

    def price_bs_display(self, obj):
        if obj.price_bs:
            return f"{obj.price_bs:.2f} Bs"
        return "—"
    price_bs_display.short_description = "Precio Bs"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "short_id", "buyer_email", "seller_email",
        "status_colored", "total_amount", "created_at",
    ]
    list_filter = ["status", "created_at"]
    search_fields = ["buyer__email", "seller__email", "id"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [OrderItemInline, PaymentLogInline, MessageInline]
    actions = [mark_orders_delivered, mark_orders_completed]
    fieldsets = [
        ("Información", {"fields": ["id", "buyer", "seller", "status", "total_amount"]}),
        ("Envío", {"fields": ["shipping_freight", "shipping_address"]}),
        ("Estado de entrega", {"fields": ["seller_delivered", "buyer_paid"]}),
        ("Fechas", {"fields": ["created_at", "updated_at"]}),
    ]

    def short_id(self, obj):
        return str(obj.id)[:8] + "…"
    short_id.short_description = "ID"
    short_id.admin_order_field = "id"

    def buyer_email(self, obj):
        return obj.buyer.email if obj.buyer else "—"
    buyer_email.short_description = "Comprador"

    def seller_email(self, obj):
        return obj.seller.email if obj.seller else "—"
    seller_email.short_description = "Vendedor"

    def status_colored(self, obj):
        colors = {
            "pending": "#f59e0b",
            "confirmed": "#3b82f6",
            "delivered": "#8b5cf6",
            "completed": "#22c55e",
            "cancelled": "#ef4444",
        }
        color = colors.get(obj.status, "#666")
        return mark_safe(f'<span style="color:{color};font-weight:bold">{obj.get_status_display()}</span>')
    status_colored.short_description = "Estado"


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ["product_name", "product_price", "quantity", "subtotal", "order_link"]
    search_fields = ["product_name", "order__id"]

    def order_link(self, obj):
        url = reverse("admin:ventas_order_change", args=[obj.order.id])
        return mark_safe(f'<a href="{url}">{str(obj.order.id)[:8]}…</a>')
    order_link.short_description = "Orden"


@admin.register(PaymentLog)
class PaymentLogAdmin(admin.ModelAdmin):
    list_display = ["order_link", "user_email", "payment_amount", "payment_method", "is_confirmed", "payment_date"]
    list_filter = ["payment_method", "is_confirmed", "payment_date"]
    search_fields = ["order__id", "user__email"]
    readonly_fields = ["id"]

    def order_link(self, obj):
        url = reverse("admin:ventas_order_change", args=[obj.order.id])
        return mark_safe(f'<a href="{url}">{str(obj.order.id)[:8]}…</a>')
    order_link.short_description = "Orden"

    def user_email(self, obj):
        return obj.user.email if obj.user else "—"
    user_email.short_description = "Usuario"


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["sender_email", "receiver_email", "order_link", "truncated_content", "is_read", "sent_at"]
    list_filter = ["is_read", "sent_at"]
    search_fields = ["sender__email", "receiver__email", "content"]
    readonly_fields = ["sent_at", "received_at"]

    def sender_email(self, obj):
        return obj.sender.email
    sender_email.short_description = "Remitente"

    def receiver_email(self, obj):
        return obj.receiver.email
    receiver_email.short_description = "Destinatario"

    def order_link(self, obj):
        if obj.order:
            url = reverse("admin:ventas_order_change", args=[obj.order.id])
            return mark_safe(f'<a href="{url}">{str(obj.order.id)[:8]}…</a>')
        return "—"
    order_link.short_description = "Orden"

    def truncated_content(self, obj):
        return obj.content[:60] + "…" if len(obj.content) > 60 else obj.content
    truncated_content.short_description = "Contenido"


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ["user_email", "product_name", "added_at"]
    search_fields = ["user__email", "product__name"]

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = "Usuario"

    def product_name(self, obj):
        return obj.product.name
    product_name.short_description = "Producto"


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["user_email", "product_name", "quantity", "subtotal_display", "added_at"]
    search_fields = ["user__email", "product__name"]

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = "Usuario"

    def product_name(self, obj):
        return obj.product.name
    product_name.short_description = "Producto"

    def subtotal_display(self, obj):
        return f"${obj.subtotal:.2f}"
    subtotal_display.short_description = "Subtotal"


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ["rate", "updated_at", "is_active"]
    list_filter = ["is_active"]
    readonly_fields = ["updated_at"]
    actions = ["sync_from_bcv"]

    def sync_from_bcv(self, request, queryset):
        try:
            result = update_exchange_rate_from_bcv()
            messages.success(request, f"Tasa BCV actualizada: 1 USD = {result['rate']} Bs")
        except BCVScraperError as e:
            messages.error(request, f"Error al obtener tasa del BCV: {e}")
        except Exception as e:
            messages.error(request, f"Error inesperado: {e}")
    sync_from_bcv.short_description = "Sincronizar tasa desde el BCV"

    def changelist_view(self, request, extra_context=None):
        if request.GET.get("sync_bcv"):
            return redirect("admin:ventas_exchangerate_changelist")
        return super().changelist_view(request, extra_context)


@admin.register(ProductView)
class ProductViewAdmin(admin.ModelAdmin):
    list_display = ["product_name", "user_email", "ip_address", "viewed_at"]
    list_filter = ["viewed_at"]
    search_fields = ["product__name", "user__email", "ip_address"]
    readonly_fields = ["viewed_at"]

    def product_name(self, obj):
        return obj.product.name
    product_name.short_description = "Producto"

    def user_email(self, obj):
        return obj.user.email if obj.user else "—"
    user_email.short_description = "Usuario"


@admin.register(ProPaymentProof)
class ProPaymentProofAdmin(admin.ModelAdmin):
    list_display = ["user_email", "image_preview", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__email"]
    readonly_fields = ["id", "created_at", "image_preview"]
    fieldsets = [
        ("Solicitud", {"fields": ["user", "image", "image_preview"]}),
        ("Fecha", {"fields": ["created_at"]}),
    ]
    actions = [approve_pro, reject_pro]

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = "Usuario"

    def image_preview(self, obj):
        if obj.image:
            return mark_safe(
                f'<a href="{obj.image.url}" target="_blank">'
                f'<img src="{obj.image.url}" width="200" style="object-fit:cover;border-radius:8px;border:1px solid #444" /></a>'
            )
        return "-"
    image_preview.short_description = "Comprobante"


@admin.register(UserReport)
class UserReportAdmin(admin.ModelAdmin):
    list_display = ["reporter_email", "reported_email", "reason_colored", "status_colored", "related", "created_at"]
    list_filter = ["status", "reason", "created_at"]
    search_fields = ["reporter__email", "reported_user__email", "description"]
    readonly_fields = ["id", "reporter", "reported_user", "reason", "description", "related_product", "related_order", "created_at", "updated_at"]
    fieldsets = [
        ("Denuncia", {"fields": ["reporter", "reported_user", "reason", "description"]}),
        ("Contexto", {"fields": ["related_product", "related_order"]}),
        ("Estado", {"fields": ["status", "admin_notes"]}),
        ("Fechas", {"fields": ["created_at", "updated_at"]}),
    ]
    actions = ["mark_as_reviewed", "mark_as_action_taken", "mark_as_dismissed"]

    def reporter_email(self, obj):
        return obj.reporter.email
    reporter_email.short_description = "Denunciante"

    def reported_email(self, obj):
        return obj.reported_user.email
    reported_email.short_description = "Denunciado"

    def reason_colored(self, obj):
        return mark_safe(f'<span style="color:#f59e0b">{obj.get_reason_display()}</span>')
    reason_colored.short_description = "Motivo"

    def status_colored(self, obj):
        colors = {
            "pending": "#f59e0b",
            "reviewed": "#3b82f6",
            "dismissed": "#6b7280",
            "action_taken": "#22c55e",
        }
        color = colors.get(obj.status, "#666")
        return mark_safe(f'<span style="color:{color};font-weight:bold">{obj.get_status_display()}</span>')
    status_colored.short_description = "Estado"

    def related(self, obj):
        links = []
        if obj.related_product:
            links.append(f'Producto: {obj.related_product.name}')
        if obj.related_order:
            links.append(f'Orden: {str(obj.related_order.id)[:8]}…')
        return ", ".join(links) if links else "—"
    related.short_description = "Relacionado"

    def mark_as_reviewed(self, request, queryset):
        updated = queryset.update(status=UserReport.STATUS_REVIEWED)
        messages.success(request, f"{updated} denuncia(s) marcada(s) como revisada(s).")
    mark_as_reviewed.short_description = "Marcar como revisado"

    def mark_as_action_taken(self, request, queryset):
        updated = queryset.update(status=UserReport.STATUS_ACTION_TAKEN)
        messages.success(request, f"{updated} denuncia(s) marcada(s) como medidas tomadas.")
    mark_as_action_taken.short_description = "Marcar como medidas tomadas"

    def mark_as_dismissed(self, request, queryset):
        updated = queryset.update(status=UserReport.STATUS_DISMISSED)
        messages.success(request, f"{updated} denuncia(s) desestimada(s).")
    mark_as_dismissed.short_description = "Desestimar denuncias"
