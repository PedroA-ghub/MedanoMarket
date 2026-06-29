from rest_framework import serializers
from .models import User, Product, Order, OrderItem, Message, PaymentLog, Wishlist, Cart, ExchangeRate, ProductImage, ProPaymentProof, UserReport


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    profile_picture_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ["id", "email", "username", "display_name", "created_at", "profile_picture_url", "age", "identity_card", "is_verified", "is_pro", "pro_pending", "needs_onboarding", "bio"]
        read_only_fields = ["id", "created_at", "is_verified", "pro_pending", "needs_onboarding"]

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            return obj.profile_picture.url
        return None


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ["id", "image", "image_url", "order", "created_at"]
        read_only_fields = ["id", "created_at"]
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None


class ProductSerializer(serializers.ModelSerializer):
    seller = UserSerializer(read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    image_url = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    price_bs = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            "id", "seller", "name", "description", "price", "price_bs",
            "stock", "is_active", "is_available", "image", "image_url", "images",
            "location", "created_at", "featured"
        ]
        read_only_fields = ["id", "seller", "created_at"]
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None
    
    def get_price_bs(self, obj):
        if obj.price_bs:
            return str(obj.price_bs)
        from .models import ExchangeRate
        rate = ExchangeRate.get_current_rate()
        if rate:
            return str(obj.price * rate)
        return None


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "product_price", "quantity", "subtotal"]


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    
    class Meta:
        model = Message
        fields = ["id", "order", "sender", "receiver", "content", "sent_at", "is_read"]
        read_only_fields = ["id", "sender", "receiver", "sent_at"]


class PaymentLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = PaymentLog
        fields = ["id", "order", "user", "payment_amount", "payment_method", "payment_date", "notes", "is_confirmed"]


class OrderSerializer(serializers.ModelSerializer):
    buyer = UserSerializer(read_only=True)
    seller = UserSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            "id", "buyer", "seller", "status", "total_amount", 
            "shipping_freight", "shipping_address", "seller_delivered", 
            "buyer_paid", "items", "messages", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "buyer", "seller", "created_at", "updated_at"]


class OrderCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    shipping_address = serializers.CharField(max_length=500)
    quantity = serializers.IntegerField(default=1, min_value=1)


class MultiItemOrderCreateSerializer(serializers.Serializer):
    items = serializers.ListField(min_length=1)
    shipping_address = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_items(self, value):
        validated = []
        errors = []
        for i, item in enumerate(value):
            if not isinstance(item, dict):
                errors.append(f"Item {i}: debe ser un objeto")
                continue
            product_id = item.get("product_id")
            quantity = item.get("quantity", 1)
            if not product_id:
                errors.append(f"Item {i}: product_id requerido")
                continue
            if not isinstance(quantity, int) or quantity < 1:
                errors.append(f"Item {i}: quantity debe ser un entero >= 1")
                continue
            validated.append({"product_id": product_id, "quantity": quantity})
        if errors:
            raise serializers.ValidationError(errors)
        return validated


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField(min_length=3, required=False)
    password1 = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    age = serializers.IntegerField(required=False, min_value=18, allow_null=True)
    identity_card = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)

    def validate_email(self, value):
        from .models import User
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email ya está registrado.")
        return value.lower()

    def validate_identity_card(self, value):
        from .models import User
        if value and User.objects.filter(identity_card=value).exists():
            raise serializers.ValidationError("Esta cédula de identidad ya está registrada.")
        return value

    def validate(self, data):
        if data["password1"] != data["password2"]:
            raise serializers.ValidationError({"password2": "Las contraseñas no coinciden."})
        return data


class MessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=2000)


class ProductCreateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        write_only=True,
        max_length=3
    )
    
    class Meta:
        model = Product
        fields = ["name", "description", "price", "stock", "image", "images", "location"]
    
    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor a 0.")
        return value
    
    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("El stock no puede ser negativo.")
        return value
    
    def validate_images(self, value):
        if len(value) > 3:
            raise serializers.ValidationError("Máximo 3 imágenes permitidas.")
        return value
    
    def create(self, validated_data):
        images_data = validated_data.pop("images", [])
        product = super().create(validated_data)
        for idx, image in enumerate(images_data):
            ProductImage.objects.create(product=product, image=image, order=idx)
        return product


class ProductUpdateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        write_only=True,
        max_length=3
    )
    remove_images = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = Product
        fields = ["name", "description", "price", "stock", "images", "remove_images", "location"]
        extra_kwargs = {}
    
    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor a 0.")
        return value
    
    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("El stock no puede ser negativo.")
        return value
    
    def validate_images(self, value):
        if len(value) > 3:
            raise serializers.ValidationError("Máximo 3 imágenes permitidas.")
        return value
    
    def update(self, instance, validated_data):
        images_data = validated_data.pop("images", [])
        remove_images_ids = validated_data.pop("remove_images", [])
        
        if remove_images_ids:
            ProductImage.objects.filter(
                product=instance, id__in=remove_images_ids
            ).delete()
        
        if images_data:
            current_count = ProductImage.objects.filter(product=instance).count()
            for idx, image in enumerate(images_data):
                if current_count + len(images_data) <= 3:
                    ProductImage.objects.create(
                        product=instance, image=image, order=current_count + idx
                    )
        
        return super().update(instance, validated_data)


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    added_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = Wishlist
        fields = ["id", "product", "added_at"]


class CartSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    added_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = Cart
        fields = ["id", "product", "quantity", "subtotal", "added_at"]


class CartItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(default=1, min_value=1)


class ProPaymentProofSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProPaymentProof
        fields = ["id", "user", "image", "created_at"]
        read_only_fields = ["id", "user", "created_at"]


class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = ["rate", "updated_at"]
        read_only_fields = ["updated_at"]


class ReportCreateSerializer(serializers.Serializer):
    reported_user_id = serializers.UUIDField()
    reason = serializers.ChoiceField(choices=UserReport.REASON_CHOICES)
    description = serializers.CharField(max_length=2000)
    related_product_id = serializers.IntegerField(required=False, allow_null=True)
    related_order_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_reported_user_id(self, value):
        if value == self.context["request"].user.id:
            raise serializers.ValidationError("No puedes denunciarte a ti mismo.")
        try:
            User.objects.get(pk=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("El usuario denunciado no existe.")
        return value

    def validate_related_product_id(self, value):
        if value:
            try:
                Product.objects.get(pk=value)
            except Product.DoesNotExist:
                raise serializers.ValidationError("El producto relacionado no existe.")
        return value

    def validate_related_order_id(self, value):
        if value:
            try:
                Order.objects.get(pk=value)
            except Order.DoesNotExist:
                raise serializers.ValidationError("La orden relacionada no existe.")
        return value


class ReportSerializer(serializers.ModelSerializer):
    reporter = UserSerializer(read_only=True)
    reported_user = UserSerializer(read_only=True)
    reason_display = serializers.CharField(source="get_reason_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = UserReport
        fields = [
            "id", "reporter", "reported_user", "reason", "reason_display",
            "description", "related_product", "related_order",
            "status", "status_display", "admin_notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "reporter", "created_at", "updated_at", "status", "admin_notes"]
