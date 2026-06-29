import uuid
import os
from decimal import Decimal
from django.db import models, transaction
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.core.exceptions import ValidationError


def _uuid_filename(instance, filename):
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    return f"{uuid.uuid4().hex[:16]}.{ext}"


def profile_picture_path(instance, filename):
    return f"profile_pictures/{_uuid_filename(instance, filename)}"


def product_image_path(instance, filename):
    return f"products/{_uuid_filename(instance, filename)}"

def proof_image_path(instance, filename):
    return f"proofs/{_uuid_filename(instance, filename)}"


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, blank=False, null=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    
    is_verified = models.BooleanField(default=False)
    is_pro = models.BooleanField(default=False)
    pro_pending = models.BooleanField(default=False)
    needs_onboarding = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=64, blank=True, null=True)
    verification_sent_at = models.DateTimeField(null=True, blank=True)
    
    profile_picture = models.ImageField(upload_to=profile_picture_path, blank=True, null=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    identity_card = models.CharField(max_length=50, blank=True, null=True, unique=True)
    bio = models.TextField(blank=True, default="")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.email

    @property
    def display_name(self):
        return self.username or self.email
    
    def generate_verification_token(self):
        import secrets
        self.verification_token = secrets.token_urlsafe(32)
        self.verification_sent_at = timezone.now()
        self.save(update_fields=['verification_token', 'verification_sent_at'])
        return self.verification_token
    
    def verify_email(self, token):
        if self.verification_token == token:
            self.is_verified = True
            self.verification_token = None
            self.save(update_fields=['is_verified', 'verification_token'])
            return True
        return False


class Product(models.Model):
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name="products")
    name = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    price_bs = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField(default=1)
    image = models.ImageField(upload_to=product_image_path, blank=True, null=True)
    location = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)

    class Meta:
        db_table = "products"
        ordering = ["-featured", "-created_at"]

    def __str__(self):
        return self.name

    def clean(self):
        if self.price <= 0:
            raise ValidationError({"price": "El precio debe ser mayor a 0."})
        if self.stock < 0:
            raise ValidationError({"stock": "El stock no puede ser negativo."})

    def save(self, *args, **kwargs):
        if self.price:
            from .models import ExchangeRate
            rate = ExchangeRate.get_current_rate()
            if rate:
                self.price_bs = (self.price * rate).quantize(Decimal("0.01"))
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_available(self):
        return self.is_active and self.stock > 0

    def reduce_stock(self, quantity=1):
        if quantity <= 0:
            raise ValueError("La cantidad debe ser mayor a 0.")
        if self.stock < quantity:
            raise ValueError(f"Stock insuficiente. Disponible: {self.stock}, Solicitado: {quantity}")
        if not self.is_active:
            raise ValueError("El producto no está activo.")
        self.stock -= quantity
        self.save(update_fields=["stock", "updated_at"])
        return self.stock

    def restore_stock(self, quantity=1):
        if quantity <= 0:
            raise ValueError("La cantidad debe ser mayor a 0.")
        self.stock += quantity
        self.save(update_fields=["stock", "updated_at"])
        return self.stock

    def deactivate(self):
        self.is_active = False
        self.save(update_fields=["is_active", "updated_at"])


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to=product_image_path)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "product_images"
        ordering = ["order"]

    def __str__(self):
        return f"Image {self.order} for {self.product.name}"


class Order(models.Model):
    STATUS_PENDING = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_DELIVERED = "delivered"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pendiente"),
        (STATUS_CONFIRMED, "Confirmado"),
        (STATUS_DELIVERED, "Entregado"),
        (STATUS_COMPLETED, "Completado"),
        (STATUS_CANCELLED, "Cancelado"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="orders_as_buyer"
    )
    seller = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="orders_as_seller"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_freight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    shipping_address = models.TextField(blank=True, null=True)
    seller_delivered = models.BooleanField(default=False)
    buyer_paid = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]
        verbose_name = "Orden"
        verbose_name_plural = "Órdenes"

    def __str__(self):
        return f"Order {self.id}"

    def clean(self):
        if self.buyer_id and self.seller_id and self.buyer_id == self.seller_id:
            raise ValidationError("El comprador y vendedor no pueden ser la misma persona.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_pending(self):
        return self.status == self.STATUS_PENDING

    @property
    def is_completed(self):
        return self.status == self.STATUS_COMPLETED

    @property
    def is_cancelled(self):
        return self.status == self.STATUS_CANCELLED

    @property
    def can_be_cancelled(self):
        return self.status in [self.STATUS_PENDING, self.STATUS_CONFIRMED]

    def calculate_total(self):
        total = sum(Decimal(str(item.product_price)) * item.quantity for item in self.items.all())
        if self.shipping_freight:
            total += Decimal(str(self.shipping_freight))
        return total

    def update_total(self):
        self.total_amount = self.calculate_total()
        self.save(update_fields=["total_amount", "updated_at"])
        return self.total_amount

    @transaction.atomic
    def confirm_order(self):
        if not self.is_pending:
            raise ValueError("Solo se pueden confirmar órdenes pendientes.")
        self.status = self.STATUS_CONFIRMED
        self.save(update_fields=["status", "updated_at"])
        return self

    @transaction.atomic
    def mark_delivered(self):
        if self.status not in [self.STATUS_CONFIRMED, self.STATUS_PENDING]:
            raise ValueError("No se puede marcar como entregado en el estado actual.")
        self.seller_delivered = True
        self.status = self.STATUS_DELIVERED
        self.save(update_fields=["seller_delivered", "status", "updated_at"])
        return self

    @transaction.atomic
    def complete_payment(self, payment_method="efectivo", notes=""):
        if not self.seller_delivered:
            raise ValueError("El vendedor debe entregar primero el producto.")
        if self.buyer_paid:
            raise ValueError("El pago ya fue confirmado.")

        from .models import PaymentLog

        PaymentLog.objects.create(
            order=self,
            user=self.buyer,
            payment_amount=self.total_amount,
            payment_method=payment_method,
            notes=notes,
            is_confirmed=True,
            payment_date=timezone.now(),
        )
        self.buyer_paid = True
        self.status = self.STATUS_COMPLETED
        self.save(update_fields=["buyer_paid", "status", "updated_at"])
        return self

    @transaction.atomic
    def cancel(self, cancelled_by=None):
        if not self.can_be_cancelled:
            raise ValueError("La orden no puede ser cancelada en su estado actual.")

        for item in self.items.all():
            if item.product:
                item.product.restore_stock(item.quantity)

        self.status = self.STATUS_CANCELLED
        self.save(update_fields=["status", "updated_at"])
        return self


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    product_name = models.CharField(max_length=200)
    product_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "order_items"
        ordering = ["id"]

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"

    @property
    def subtotal(self):
        return Decimal(str(self.product_price)) * self.quantity


class PaymentLog(models.Model):
    PAYMENT_METHOD_CASH = "efectivo"
    PAYMENT_METHOD_TRANSFER = "transferencia"
    PAYMENT_METHOD_CARD = "tarjeta"
    PAYMENT_METHOD_OTHER = "otro"

    PAYMENT_METHOD_CHOICES = [
        (PAYMENT_METHOD_CASH, "Efectivo"),
        (PAYMENT_METHOD_TRANSFER, "Transferencia"),
        (PAYMENT_METHOD_CARD, "Tarjeta"),
        (PAYMENT_METHOD_OTHER, "Otro"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    payment_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHOD_CHOICES, blank=True, null=True)
    payment_date = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True, null=True)
    is_confirmed = models.BooleanField(default=False)

    class Meta:
        db_table = "payments_log"
        ordering = ["-payment_date"]
        verbose_name = "Registro de Pago"
        verbose_name_plural = "Registros de Pago"

    def __str__(self):
        return f"Payment for {self.order}"


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="messages", null=True, blank=True
    )
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_messages"
    )
    receiver = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="received_messages"
    )
    content = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    received_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        db_table = "messages"
        ordering = ["sent_at"]

    def __str__(self):
        return f"Message from {self.sender} to {self.receiver}"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.received_at = timezone.now()
            self.save(update_fields=["is_read", "received_at"])


class Wishlist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="wishlist")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="wishlist_items")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "wishlist"
        unique_together = ["user", "product"]
        ordering = ["-added_at"]

    def __str__(self):
        return f"{self.user.email} - {self.product.name}"


class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="cart_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cart"
        unique_together = ["user", "product"]
        ordering = ["-added_at"]

    def __str__(self):
        return f"{self.user.email} - {self.product.name} x{self.quantity}"

    @property
    def subtotal(self):
        return self.product.price * self.quantity


class ExchangeRate(models.Model):
    rate = models.DecimalField(max_digits=10, decimal_places=4)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "exchange_rates"
        ordering = ["-updated_at"]
        verbose_name = "Tasa de Cambio"
        verbose_name_plural = "Tasas de Cambio"

    def __str__(self):
        return f"1 USD = {self.rate} Bs"

    @classmethod
    def get_current_rate(cls):
        active = cls.objects.filter(is_active=True).first()
        return active.rate if active else None

    @classmethod
    def set_rate(cls, rate):
        if rate <= 0:
            raise ValueError("La tasa debe ser mayor a 0.")
        cls.objects.filter(is_active=True).update(is_active=False)
        return cls.objects.create(rate=rate)


class ProPaymentProof(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="pro_proofs")
    image = models.ImageField(upload_to=proof_image_path)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pro_payment_proofs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"PRO proof from {self.user.email} at {self.created_at}"


class ProductView(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="views")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "product_views"
        ordering = ["-viewed_at"]


class UserReport(models.Model):
    REASON_PRODUCTO_FALSO = "producto_falso"
    REASON_ESTAFA = "estafa"
    REASON_ROBO = "robo"
    REASON_ACOSO = "acoso"
    REASON_SPAM = "spam"
    REASON_PRECIO_ABUSIVO = "precio_abusivo"
    REASON_SUPLANTACION = "suplantacion"
    REASON_INAPROPIADO = "inapropiado"
    REASON_OTRO = "otro"

    REASON_CHOICES = [
        (REASON_PRODUCTO_FALSO, "Producto Falso"),
        (REASON_ESTAFA, "Estafa / Fraude"),
        (REASON_ROBO, "Robo de contenido / fotos"),
        (REASON_ACOSO, "Acoso / Maltrato"),
        (REASON_SPAM, "Spam / Publicidad no deseada"),
        (REASON_PRECIO_ABUSIVO, "Precio abusivo o engañoso"),
        (REASON_SUPLANTACION, "Suplantación de identidad"),
        (REASON_INAPROPIADO, "Contenido inapropiado"),
        (REASON_OTRO, "Otro"),
    ]

    STATUS_PENDING = "pending"
    STATUS_REVIEWED = "reviewed"
    STATUS_DISMISSED = "dismissed"
    STATUS_ACTION_TAKEN = "action_taken"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pendiente"),
        (STATUS_REVIEWED, "Revisado"),
        (STATUS_DISMISSED, "Desestimado"),
        (STATUS_ACTION_TAKEN, "Medidas tomadas"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reports_made")
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reports_received")
    reason = models.CharField(max_length=50, choices=REASON_CHOICES)
    description = models.TextField()
    related_product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    related_order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    admin_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_reports"
        ordering = ["-created_at"]
        verbose_name = "Denuncia"
        verbose_name_plural = "Denuncias"

    def __str__(self):
        return f"Denuncia de {self.reporter.email} contra {self.reported_user.email}"


def _delete_file_if_orphaned(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    for field_name in ("profile_picture", "image"):
        old_file = getattr(old, field_name, None)
        new_file = getattr(instance, field_name, None)
        if old_file and old_file != new_file and os.path.isfile(old_file.path):
            os.remove(old_file.path)


def _delete_file_on_instance_delete(sender, instance, **kwargs):
    for field_name in ("profile_picture", "image"):
        file = getattr(instance, field_name, None)
        if file and os.path.isfile(file.path):
            os.remove(file.path)


models.signals.pre_save.connect(_delete_file_if_orphaned, sender=User)
models.signals.pre_save.connect(_delete_file_if_orphaned, sender=Product)
models.signals.pre_save.connect(_delete_file_if_orphaned, sender=ProductImage)
models.signals.pre_delete.connect(_delete_file_on_instance_delete, sender=User)
models.signals.pre_delete.connect(_delete_file_on_instance_delete, sender=Product)
models.signals.pre_delete.connect(_delete_file_on_instance_delete, sender=ProductImage)
