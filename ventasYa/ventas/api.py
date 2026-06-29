import imghdr
from decimal import Decimal
from rest_framework import viewsets, status, permissions, parsers, throttling
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Sum, Q, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from django.middleware.csrf import get_token
from django.contrib.auth import login, logout, authenticate
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_image_file_extension

from .models import Product, Order, Message, User, Wishlist, Cart, ExchangeRate, ProductImage, ProductView, ProPaymentProof, UserReport
from .serializers import (
    ProductSerializer, OrderSerializer, MessageSerializer, 
    OrderCreateSerializer, MultiItemOrderCreateSerializer, LoginSerializer, RegisterSerializer,
    MessageCreateSerializer, UserSerializer, ProductCreateSerializer,
    WishlistSerializer, CartSerializer, CartItemCreateSerializer,
    ProductUpdateSerializer, ExchangeRateSerializer, ProductImageSerializer,
    ProPaymentProofSerializer, ReportCreateSerializer, ReportSerializer
)
from django.shortcuts import get_object_or_404
from .services.business import OrderService, MessageService

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
MAX_IMAGE_SIZE_MB = 5


class ReportViewSet(viewsets.ModelViewSet):
    queryset = UserReport.objects.all()

    def get_serializer_class(self):
        if self.action == "create":
            return ReportCreateSerializer
        return ReportSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return UserReport.objects.all()
        return UserReport.objects.filter(reporter=user)

    def perform_create(self, serializer):
        reported_user = User.objects.get(pk=serializer.validated_data["reported_user_id"])
        report = UserReport.objects.create(
            reporter=self.request.user,
            reported_user=reported_user,
            reason=serializer.validated_data["reason"],
            description=serializer.validated_data["description"],
            related_product_id=serializer.validated_data.get("related_product_id"),
            related_order_id=serializer.validated_data.get("related_order_id"),
        )
        try:
            from django.core.mail import EmailMessage
            from django.conf import settings
            email = EmailMessage(
                subject=f"Nueva denuncia: {report.get_reason_display()}",
                body=(
                    f"Denunciante: {self.request.user.email} ({self.request.user.username})\n"
                    f"Denunciado: {reported_user.email} ({reported_user.username})\n"
                    f"Motivo: {report.get_reason_display()}\n"
                    f"Descripción: {report.description}\n\n"
                    f"Admin: http://localhost:8000/admin/ventas/userreport/{report.id}/change/"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=["pedrocarpiobussines@gmail.com"],
            )
            email.send(fail_silently=True)
        except Exception:
            pass


def validate_image_file(uploaded_file):
    if uploaded_file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise ValidationError(f"La imagen no puede superar los {MAX_IMAGE_SIZE_MB}MB.")
    
    ext = uploaded_file.name.rsplit(".", 1)[-1].lower() if "." in uploaded_file.name else ""
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError(f"Formato de imagen no permitido: .{ext}. Usa: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}.")
    
    try:
        validate_image_file_extension(uploaded_file)
    except DjangoValidationError:
        raise ValidationError("El archivo no es una imagen válida.")
    
    uploaded_file.seek(0)


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    parser_classes = [parsers.MultiPartParser, parsers.JSONParser]
    
    def get_queryset(self):
        if self.action in ["list", "search"]:
            return Product.objects.filter(is_active=True).select_related("seller").prefetch_related("images")
        return Product.objects.select_related("seller").prefetch_related("images")
    
    def get_serializer_class(self):
        if self.action == "create":
            return ProductCreateSerializer
        if self.action in ["update", "partial_update"]:
            return ProductUpdateSerializer
        return ProductSerializer
    
    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]
    
    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)
    
    def perform_update(self, serializer):
        product = self.get_object()
        if product.seller != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("No tienes permiso para editar este producto.")
        serializer.save()
    
    def perform_destroy(self, instance):
        if instance.seller != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("No tienes permiso para eliminar este producto.")
        instance.deactivate()
    
    def retrieve(self, request, *args, **kwargs):
        product = self.get_object()
        ip = request.META.get("REMOTE_ADDR")
        ProductView.objects.create(
            product=product,
            user=request.user if request.user.is_authenticated else None,
            ip_address=ip,
        )
        serializer = self.get_serializer(product)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def seller(self, request, pk=None):
        product = self.get_object()
        serializer = UserSerializer(product.seller)
        return Response(serializer.data)
    
    @action(detail=False, methods=["get"])
    def search(self, request):
        queryset = Product.objects.filter(is_active=True).select_related("seller").prefetch_related("images")
        
        search_query = request.query_params.get("q", "")
        if search_query:
            queryset = queryset.filter(
                models.Q(name__icontains=search_query) | 
                models.Q(description__icontains=search_query)
            )
        
        min_price = request.query_params.get("min_price")
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        
        max_price = request.query_params.get("max_price")
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        location = request.query_params.get("location")
        if location:
            queryset = queryset.filter(location__icontains=location)
        
        in_stock = request.query_params.get("in_stock")
        if in_stock == "true":
            queryset = queryset.filter(stock__gt=0)
        
        ordering = request.query_params.get("ordering", "-created_at")
        queryset = queryset.order_by(ordering)
        
        serializer = ProductSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)
    
    @action(detail=True, methods=["post"], parser_classes=[parsers.MultiPartParser])
    def add_image(self, request, pk=None):
        product = self.get_object()
        if product.seller != request.user and not request.user.is_staff:
            raise PermissionDenied("No tienes permiso para agregar imágenes a este producto.")
        
        current_count = product.images.count()
        if current_count >= 3:
            return Response({"error": "Máximo 3 imágenes permitidas."}, status=status.HTTP_400_BAD_REQUEST)
        
        image = request.FILES.get("image")
        if not image:
            return Response({"error": "Imagen requerida."}, status=status.HTTP_400_BAD_REQUEST)
        validate_image_file(image)
        
        product_image = ProductImage.objects.create(
            product=product, image=image, order=current_count
        )
        return Response(ProductImageSerializer(product_image, context={"request": request}).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=["delete"])
    def delete_image(self, request, pk=None):
        product = self.get_object()
        if product.seller != request.user and not request.user.is_staff:
            raise PermissionDenied("No tienes permiso para eliminar imágenes de este producto.")
        
        image_id = request.query_params.get("image_id")
        if not image_id:
            return Response({"error": "image_id requerido."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            product_image = product.images.get(id=image_id)
            product_image.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProductImage.DoesNotExist:
            return Response({"error": "Imagen no encontrada."}, status=status.HTTP_404_NOT_FOUND)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(
            buyer=self.request.user
        ) | Order.objects.filter(
            seller=self.request.user
        )
    
    def create(self, request):
        if "items" in request.data:
            serializer = MultiItemOrderCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            try:
                order = OrderService.create_multi_item_order(
                    buyer=request.user,
                    items_data=serializer.validated_data["items"],
                    shipping_address=serializer.validated_data.get("shipping_address", ""),
                )
                return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
            except ValueError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except DjangoValidationError as e:
                return Response({"error": e.messages[0] if hasattr(e, 'messages') else str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({"error": f"Error interno: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            serializer = OrderCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            try:
                product = Product.objects.get(pk=serializer.validated_data["product_id"])
            except Product.DoesNotExist:
                return Response({"error": "El producto no existe."}, status=status.HTTP_404_NOT_FOUND)
            
            try:
                order = OrderService.create_order(
                    buyer=request.user,
                    product=product,
                    shipping_address=serializer.validated_data["shipping_address"],
                    quantity=serializer.validated_data.get("quantity", 1)
                )
                return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
            except ValueError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except DjangoValidationError as e:
                return Response({"error": e.messages[0] if hasattr(e, 'messages') else str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({"error": f"Error interno: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=["post"])
    def deliver(self, request, pk=None):
        order = self.get_object()
        if request.user != order.seller:
            return Response({"error": "Solo el vendedor puede marcar como entregado."}, status=status.HTTP_403_FORBIDDEN)
        try:
            order = OrderService.mark_order_delivered(order)
            return Response(OrderSerializer(order).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        order = self.get_object()
        if request.user != order.buyer:
            return Response({"error": "Solo el comprador puede confirmar el pago."}, status=status.HTTP_403_FORBIDDEN)
        payment_method = request.data.get("payment_method", "efectivo")
        notes = request.data.get("notes", "")
        
        try:
            order = OrderService.complete_order_payment(order, payment_method, notes)
            return Response(OrderSerializer(order).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if request.user not in [order.buyer, order.seller]:
            return Response({"error": "No tienes permiso para cancelar esta orden."}, status=status.HTTP_403_FORBIDDEN)
        try:
            order = OrderService.cancel_order(order, cancelled_by=request.user)
            return Response(OrderSerializer(order).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        order = self.get_object()
        
        if request.method == "GET":
            messages = order.messages.all().order_by("sent_at")
            serializer = MessageSerializer(messages, many=True)
            return Response(serializer.data)
        
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        receiver = order.seller if request.user == order.buyer else order.buyer
        
        try:
            message = MessageService.send_message(
                order=order,
                sender=request.user,
                receiver=receiver,
                content=serializer.validated_data["content"]
            )
            return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    throttle_classes = []
    
    @action(detail=False, methods=["get"])
    def csrf(self, request):
        return Response({"csrfToken": get_token(request)})
    
    @action(detail=False, methods=["post"], throttle_classes=[throttling.AnonRateThrottle])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data["email"].lower()
        password = serializer.validated_data["password"]
        
        try:
            user_obj = User.objects.get(email=email)
            if not user_obj.is_verified:
                return Response(
                    {"error": "Debes verificar tu correo antes de iniciar sesión", "needs_verification": True},
                    status=status.HTTP_403_FORBIDDEN
                )
            user = authenticate(request, username=email, password=password)
        except User.DoesNotExist:
            user = None
        
        if user:
            login(request, user)
            return Response(UserSerializer(user, context={"request": request}).data)
        
        return Response({"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=False, methods=["post"], parser_classes=[parsers.MultiPartParser, parsers.JSONParser], throttle_classes=[throttling.AnonRateThrottle])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data["email"]
        username = serializer.validated_data.get("username") or email.split("@")[0]
        
        if User.objects.filter(username=username).exists():
            username = f"{username}_{User.objects.count()}"
        
        user = User.objects.create_user(
            username=username,
            password=serializer.validated_data["password1"],
            email=email,
            profile_picture=serializer.validated_data.get("profile_picture"),
            age=serializer.validated_data.get("age"),
            identity_card=serializer.validated_data.get("identity_card"),
        )
        
        token = user.generate_verification_token()
        from django.conf import settings
        
        if settings.DEBUG:
            user.is_verified = True
            user.verification_token = None
            user.save(update_fields=["is_verified", "verification_token"])
        else:
            from django.core.mail import send_mail
            try:
                send_mail(
                    subject="Verifica tu cuenta en MedanoMarket",
                    message=f"Hola {user.username},\n\nGracias por registrarte. Para verificar tu cuenta, haz clic en el siguiente enlace:\n\n{settings.ALLOWED_HOSTS[0]}/api/auth/verify/{token}/\n\nSi no solicitaste este registro, ignora este mensaje.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=True,
                )
            except Exception:
                pass
        
        return Response({
            "message": "Usuario creado. Revisa tu correo para verificar tu cuenta.",
            "email": email,
            "verification_token": token if settings.DEBUG else None
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=["post"])
    def verify(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"error": "Token requerido"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(verification_token=token)
            user.verify_email(token)
            return Response({"message": "Correo verificado exitosamente"})
        except User.DoesNotExist:
            return Response({"error": "Token inválido o expirado"}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=["post"])
    def resend_verification(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email requerido"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email.lower())
            if user.is_verified:
                return Response({"message": "Este correo ya está verificado"})
            
            token = user.generate_verification_token()
            
            from django.core.mail import send_mail
            from django.conf import settings
            try:
                send_mail(
                    subject="Verifica tu cuenta en MedanoMarket",
                    message=f"Hola {user.username},\n\nSolicitaste reenviar el enlace de verificación. Haz clic aquí:\n\n{settings.ALLOWED_HOSTS[0]}/api/auth/verify/{token}/\n\nEl enlace expira en 24 horas.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=True,
                )
            except Exception:
                pass
            
            return Response({"message": "Correo de verificación enviado"})
        except User.DoesNotExist:
            return Response({"message": "Si el correo existe, recibirás un enlace de verificación"})
    
    @action(detail=False, methods=["post"])
    def logout(self, request):
        logout(request)
        return Response({"message": "Sesión cerrada"})
    
    @action(detail=False, methods=["get"])
    def me(self, request):
        if request.user.is_authenticated:
            return Response(UserSerializer(request.user, context={"request": request}).data)
        return Response({"error": "No autenticado"}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=["put", "patch"], parser_classes=[parsers.MultiPartParser, parsers.JSONParser])
    def update_profile(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"error": "No autenticado"}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data
        if "username" in data:
            user.username = data["username"]
        if "email" in data:
            if User.objects.filter(email=data["email"]).exclude(id=user.id).exists():
                return Response({"email": ["Este email ya está registrado."]}, status=status.HTTP_400_BAD_REQUEST)
            user.email = data["email"]
        if "age" in data:
            user.age = int(data["age"]) if data["age"] else None
        if "identity_card" in data:
            if User.objects.filter(identity_card=data["identity_card"]).exclude(id=user.id).exists():
                return Response({"identity_card": ["Esta cédula ya está registrada."]}, status=status.HTTP_400_BAD_REQUEST)
            user.identity_card = data["identity_card"]
        
        profile_picture = request.FILES.get("profile_picture")
        if profile_picture:
            validate_image_file(profile_picture)
            user.profile_picture = profile_picture

        if data.get("onboarding_complete") == "true" and user.needs_onboarding:
            if user.username and user.age:
                user.needs_onboarding = False

        user.save()
        return Response(UserSerializer(user, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health_check(request):
    return Response({"status": "ok"})


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related("product", "product__seller")
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=["post"])
    def add(self, request):
        product_id = request.data.get("product_id")
        try:
            product = Product.objects.get(pk=product_id, is_active=True)
            wishlist_item, created = Wishlist.objects.get_or_create(
                user=request.user,
                product=product
            )
            return Response(
                WishlistSerializer(wishlist_item).data, 
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
        except Product.DoesNotExist:
            return Response({"error": "Producto no encontrado"}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=["delete"])
    def remove(self, request):
        product_id = request.query_params.get("product_id")
        if not product_id:
            return Response({"error": "product_id requerido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            wishlist_item = Wishlist.objects.get(user=request.user, product_id=product_id)
            wishlist_item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Wishlist.DoesNotExist:
            return Response({"error": "Item no encontrado"}, status=status.HTTP_404_NOT_FOUND)


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user).select_related("product", "product__seller")
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=["post"])
    def add(self, request):
        serializer = CartItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        product_id = serializer.validated_data["product_id"]
        quantity = serializer.validated_data.get("quantity", 1)
        
        try:
            product = Product.objects.get(pk=product_id, is_active=True)
            if not product.is_available:
                return Response({"error": "Producto no disponible"}, status=status.HTTP_400_BAD_REQUEST)
            
            cart_item, created = Cart.objects.get_or_create(
                user=request.user,
                product=product,
                defaults={"quantity": quantity}
            )
            if not created:
                cart_item.quantity += quantity
                cart_item.save()
            
            return Response(CartSerializer(cart_item).data)
        except Product.DoesNotExist:
            return Response({"error": "Producto no encontrado"}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=["delete"])
    def remove(self, request):
        product_id = request.query_params.get("product_id")
        if not product_id:
            return Response({"error": "product_id requerido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            cart_item = Cart.objects.get(user=request.user, product_id=product_id)
            cart_item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Cart.DoesNotExist:
            return Response({"error": "Item no encontrado"}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=["put"])
    def update_quantity(self, request):
        product_id = request.data.get("product_id")
        quantity = request.data.get("quantity")
        
        if not product_id or quantity is None:
            return Response({"error": "product_id y quantity requeridos"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            cart_item = Cart.objects.get(user=request.user, product_id=product_id)
            if quantity <= 0:
                cart_item.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            cart_item.quantity = quantity
            cart_item.save()
            return Response(CartSerializer(cart_item).data)
        except Cart.DoesNotExist:
            return Response({"error": "Item no encontrado"}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=["delete"])
    def clear(self, request):
        Cart.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExchangeRateViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=["get"])
    def current(self, request):
        rate = ExchangeRate.get_current_rate()
        if rate is None:
            return Response({"rate": None, "message": "No hay tasa de cambio configurada"})
        return Response({"rate": str(rate)})
    
    @action(detail=False, methods=["post"])
    def sync_from_bcv(self, request):
        from .services.bcv import update_exchange_rate_from_bcv, BCVScraperError
        try:
            result = update_exchange_rate_from_bcv()
            return Response({
                "message": "Tasa actualizada desde el BCV",
                "rate": result["rate"],
                "date": result["date"],
                "source": result["source"],
            })
        except BCVScraperError as e:
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            return Response({"error": f"Error inesperado: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=["post"])
    def set_rate(self, request):
        rate = request.data.get("rate")
        if not rate:
            return Response({"error": "Tasa requerida"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            rate = float(rate)
            if rate <= 0:
                return Response({"error": "La tasa debe ser mayor a 0"}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"error": "Tasa inválida"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            exchange_rate = ExchangeRate.set_rate(rate)
            return Response(ExchangeRateSerializer(exchange_rate).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=["post"])
    def calculate_bs(self, request):
        rate = ExchangeRate.get_current_rate()
        usd_amount = request.data.get("usd_amount")
        if not usd_amount or rate is None:
            return Response({"error": "Monto en USD y tasa son requeridos"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            bs_amount = float(usd_amount) * float(rate)
            return Response({
                "usd_amount": usd_amount,
                "rate": str(rate),
                "bs_amount": str(round(bs_amount, 2))
            })
        except ValueError:
            return Response({"error": "Monto inválido"}, status=status.HTTP_400_BAD_REQUEST)


class ProViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        user = request.user
        if not user.is_pro:
            return Response({"error": "Se requiere cuenta PRO"}, status=status.HTTP_403_FORBIDDEN)

        products = Product.objects.filter(seller=user, is_active=True)

        total_views = ProductView.objects.filter(product__seller=user).count()
        total_favorites = Wishlist.objects.filter(product__seller=user).count()
        total_orders = Order.objects.filter(seller=user).count()
        total_revenue = (
            Order.objects.filter(seller=user, status=Order.STATUS_COMPLETED)
            .aggregate(total=Sum("total_amount"))["total"]
            or Decimal("0.00")
        )

        today = timezone.now()
        thirty_days_ago = today - timedelta(days=30)

        views_last_30 = (
            ProductView.objects.filter(product__seller=user, viewed_at__gte=thirty_days_ago)
            .annotate(date=TruncDate("viewed_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )
        orders_last_30 = (
            Order.objects.filter(seller=user, created_at__gte=thirty_days_ago)
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )
        revenue_last_30 = (
            Order.objects.filter(
                seller=user, status=Order.STATUS_COMPLETED, created_at__gte=thirty_days_ago
            )
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(total=Sum("total_amount"))
            .order_by("date")
        )

        labels_30 = [(today - timedelta(days=i)).strftime("%d/%m") for i in range(29, -1, -1)]
        views_by_day = {v["date"].strftime("%Y-%m-%d"): v["count"] for v in views_last_30}
        orders_by_day = {o["date"].strftime("%Y-%m-%d"): o["count"] for o in orders_last_30}
        revenue_by_day = {r["date"].strftime("%Y-%m-%d"): float(r["total"]) for r in revenue_last_30}

        products_data = []
        for p in products:
            view_count = ProductView.objects.filter(product=p).count()
            fav_count = Wishlist.objects.filter(product=p).count()
            order_count = Order.objects.filter(
                Q(items__product=p) | Q(seller=user),
                items__product=p,
            ).distinct().count()
            revenue = (
                Order.objects.filter(
                    Q(items__product=p) & Q(status=Order.STATUS_COMPLETED),
                )
                .aggregate(total=Sum("total_amount"))["total"]
                or Decimal("0.00")
            )
            products_data.append({
                "id": p.id,
                "name": p.name,
                "price": str(p.price),
                "stock": p.stock,
                "featured": p.featured,
                "view_count": view_count,
                "favorite_count": fav_count,
                "order_count": order_count,
                "revenue": str(revenue),
            })

        return Response({
            "total_views": total_views,
            "total_favorites": total_favorites,
            "total_orders": total_orders,
            "total_revenue": str(total_revenue),
            "products": products_data,
            "trend": {
                "labels": labels_30,
                "views": [views_by_day.get((today - timedelta(days=i)).strftime("%Y-%m-%d"), 0) for i in range(29, -1, -1)],
                "orders": [orders_by_day.get((today - timedelta(days=i)).strftime("%Y-%m-%d"), 0) for i in range(29, -1, -1)],
                "revenue": [revenue_by_day.get((today - timedelta(days=i)).strftime("%Y-%m-%d"), 0) for i in range(29, -1, -1)],
            },
        })

    @action(detail=False, methods=["post"])
    def upgrade(self, request):
        user = request.user
        if user.is_pro:
            return Response({"message": "Ya eres usuario PRO", "is_pro": True})
        user.is_pro = True
        user.save(update_fields=["is_pro"])
        return Response({"message": "¡Felicidades! Ahora eres usuario PRO", "is_pro": True})

    @action(detail=False, methods=["post"], parser_classes=[parsers.MultiPartParser])
    def send_proof(self, request):
        user = request.user
        if user.is_pro or user.pro_pending:
            return Response({"error": "Ya eres PRO o tu solicitud está pendiente"}, status=status.HTTP_400_BAD_REQUEST)

        image = request.FILES.get("image")
        if not image:
            return Response({"error": "Imagen requerida"}, status=status.HTTP_400_BAD_REQUEST)
        validate_image_file(image)

        proof = ProPaymentProof.objects.create(user=user, image=image)
        user.pro_pending = True
        user.save(update_fields=["pro_pending"])

        from django.core.mail import EmailMessage
        from django.conf import settings
        try:
            email = EmailMessage(
                subject=f"Nueva solicitud PRO de {user.email}",
                body=(
                    f"El usuario {user.username} ({user.email}) ha solicitado la "
                    f"activación de su cuenta PRO.\n\n"
                    f"Datos del usuario:\n"
                    f"  Usuario: {user.username}\n"
                    f"  Email: {user.email}\n"
                    f"  Cédula: {user.identity_card or 'No registrada'}\n\n"
                    f"Adjunto se encuentra el comprobante de pago."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=["pedrocarpiobussines@gmail.com"],
            )
            email.attach_file(proof.image.path)
            email.send(fail_silently=True)
        except Exception:
            pass

        return Response({
            "message": "Comprobante enviado. Espera la verificación del administrador.",
            "pro_pending": True,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def toggle_featured(self, request, pk=None):
        user = request.user
        if not user.is_pro:
            return Response({"error": "Se requiere cuenta PRO"}, status=status.HTTP_403_FORBIDDEN)

        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({"error": "Producto no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if product.seller != user and not user.is_staff:
            return Response({"error": "No tienes permiso para modificar este producto"}, status=status.HTTP_403_FORBIDDEN)

        product.featured = not product.featured
        product.save(update_fields=["featured"])
        return Response({
            "message": f"Producto {'destacado' if product.featured else 'no destacado'}",
            "featured": product.featured,
        })


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def seller_profile(request, user_id):
    user = get_object_or_404(User, id=user_id)
    serializer = UserSerializer(user)
    products = Product.objects.filter(seller=user, is_active=True).select_related("seller").prefetch_related("images")
    from .serializers import ProductSerializer
    products_data = ProductSerializer(products, many=True, context={"request": request}).data
    return Response({
        "seller": serializer.data,
        "products": products_data,
        "product_count": products.count(),
    })
