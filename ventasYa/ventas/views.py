from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.urls import reverse
from django.db import transaction
from django.core.exceptions import ValidationError
from .models import Product, Order, OrderItem, Message
from .forms import MessageForm
from django.contrib.auth import login, logout
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm


def product_list(request):
    products = Product.objects.filter(is_active=True).select_related("seller")
    return render(request, "ventas/product_list.html", {"products": products})


def product_detail(request, pk):
    product = get_object_or_404(Product, pk=pk, is_active=True)
    return render(request, "ventas/product_detail.html", {"product": product})


def user_login(request):
    if request.user.is_authenticated:
        return redirect("ventas:product_list")

    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            login(request, form.get_user())
            messages.success(request, "Has iniciado sesión correctamente.")
            next_url = request.GET.get("next", "ventas:product_list")
            return redirect(next_url)
    else:
        form = AuthenticationForm()
    return render(request, "ventas/login.html", {"form": form})


def user_logout(request):
    logout(request)
    messages.success(request, "Has cerrado sesión.")
    return redirect("ventas:product_list")


def register(request):
    if request.user.is_authenticated:
        return redirect("ventas:product_list")

    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.email = form.cleaned_data.get("username", "")
            user.save()
            login(request, user)
            messages.success(request, "Registro exitoso. ¡Bienvenido!")
            return redirect("ventas:product_list")
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{error}")
    else:
        form = UserCreationForm()
    return render(request, "ventas/register.html", {"form": form})


@login_required
def request_product(request, product_id):
    product = get_object_or_404(Product, pk=product_id)

    if not product.is_active:
        messages.error(request, "Este producto no está disponible.")
        return redirect("ventas:product_detail", pk=product_id)

    if request.user == product.seller:
        messages.error(request, "No puedes comprar tu propio producto.")
        return redirect("ventas:product_detail", pk=product_id)

    if not product.is_available:
        messages.error(request, "Este producto no tiene stock disponible.")
        return redirect("ventas:product_detail", pk=product_id)

    if request.method == "POST":
        shipping_address = request.POST.get("shipping_address", "").strip()
        if not shipping_address:
            messages.error(request, "Debes proporcionar una dirección de envío.")
            return render(request, "ventas/request_product.html", {"product": product})

        try:
            with transaction.atomic():
                order = Order.objects.create(
                    buyer=request.user,
                    seller=product.seller,
                    total_amount=product.price,
                    shipping_address=shipping_address,
                    status=Order.STATUS_PENDING,
                )

                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    product_price=product.price,
                    quantity=1,
                )

                product.reduce_stock(1)

                order.update_total()

                Message.objects.create(
                    order=order,
                    sender=request.user,
                    receiver=product.seller,
                    content=f"Solicitud de producto: {product.name}. Por favor, confirma la entrega cuando envíes el producto.",
                )

            messages.success(request, "Solicitud realizada. Ahora puedes chatear con el vendedor.")
            return redirect("ventas:order_chat", order_id=order.id)

        except ValueError as e:
            messages.error(request, str(e))
        except Exception as e:
            messages.error(request, f"Error al procesar la solicitud: {str(e)}")

    return render(request, "ventas/request_product.html", {"product": product})


@login_required
def order_chat(request, order_id):
    order = get_object_or_404(Order, id=order_id)

    if request.user not in [order.buyer, order.seller]:
        messages.error(request, "No tienes permiso para ver este chat.")
        return redirect("ventas:product_list")

    messages_list = order.messages.select_related("sender", "receiver").order_by("sent_at")

    unread_messages = messages_list.filter(receiver=request.user, is_read=False)
    for msg in unread_messages:
        msg.mark_as_read()

    if request.method == "POST":
        form = MessageForm(request.POST)
        if form.is_valid():
            receiver = order.seller if request.user == order.buyer else order.buyer
            Message.objects.create(
                order=order,
                sender=request.user,
                receiver=receiver,
                content=form.cleaned_data["content"],
            )
            return redirect("ventas:order_chat", order_id=order.id)
    else:
        form = MessageForm()

    context = {
        "order": order,
        "messages": messages_list,
        "form": form,
        "user_is_buyer": request.user == order.buyer,
        "user_is_seller": request.user == order.seller,
    }
    return render(request, "ventas/order_chat.html", context)


@login_required
def mark_delivered(request, order_id):
    order = get_object_or_404(Order, id=order_id)

    if request.user != order.seller:
        messages.error(request, "No tienes permiso para realizar esta acción.")
        return redirect("ventas:order_chat", order_id=order.id)

    if order.seller_delivered:
        messages.warning(request, "Ya marcaste este producto como entregado.")
        return redirect("ventas:order_chat", order_id=order.id)

    if order.is_completed or order.is_cancelled:
        messages.error(request, "No se puede marcar como entregado una orden completada o cancelada.")
        return redirect("ventas:order_chat", order_id=order.id)

    try:
        with transaction.atomic():
            order.mark_delivered()
            Message.objects.create(
                order=order,
                sender=order.seller,
                receiver=order.buyer,
                content="He marcado el producto como entregado. Por favor, confirma el pago.",
            )
        messages.success(request, "Has marcado el producto como entregado. El comprador podrá ahora confirmar el pago.")
    except ValueError as e:
        messages.error(request, str(e))
    except Exception as e:
        messages.error(request, f"Error al marcar como entregado: {str(e)}")

    return redirect("ventas:order_chat", order_id=order.id)


@login_required
def verify_payment(request, order_id):
    order = get_object_or_404(Order, id=order_id)

    if request.user != order.buyer:
        messages.error(request, "No tienes permiso para realizar esta acción.")
        return redirect("ventas:order_chat", order_id=order.id)

    if order.buyer_paid:
        messages.warning(request, "Ya confirmaste el pago para esta orden.")
        return redirect("ventas:order_chat", order_id=order.id)

    if not order.seller_delivered:
        messages.error(request, "El vendedor aún no ha marcado el producto como entregado.")
        return redirect("ventas:order_chat", order_id=order.id)

    if order.is_completed or order.is_cancelled:
        messages.error(request, "No se puede confirmar el pago de una orden completada o cancelada.")
        return redirect("ventas:order_chat", order_id=order.id)

    if request.method == "POST":
        payment_method = request.POST.get("payment_method", "efectivo")
        notes = request.POST.get("notes", "").strip()

        try:
            with transaction.atomic():
                order.complete_payment(payment_method=payment_method, notes=notes)
                Message.objects.create(
                    order=order,
                    sender=order.buyer,
                    receiver=order.seller,
                    content="He confirmado el pago. ¡Gracias!",
                )
            messages.success(request, "Pago confirmado. La orden se ha completado.")
            return redirect("ventas:order_chat", order_id=order.id)
        except ValueError as e:
            messages.error(request, str(e))
        except Exception as e:
            messages.error(request, f"Error al confirmar el pago: {str(e)}")

    return render(request, "ventas/verify_payment.html", {"order": order})


@login_required
def cancel_order(request, order_id):
    order = get_object_or_404(Order, id=order_id)

    if request.user not in [order.buyer, order.seller]:
        messages.error(request, "No tienes permiso para cancelar esta orden.")
        return redirect("ventas:product_list")

    if not order.can_be_cancelled:
        messages.error(request, "La orden no puede ser cancelada en su estado actual.")
        return redirect("ventas:order_chat", order_id=order.id)

    if request.method == "POST":
        try:
            with transaction.atomic():
                order.cancel(cancelled_by=request.user)
                Message.objects.create(
                    order=order,
                    sender=request.user,
                    receiver=order.seller if request.user == order.buyer else order.buyer,
                    content="La orden ha sido cancelada.",
                )
            messages.success(request, "La orden ha sido cancelada y el stock ha sido restaurado.")
        except ValueError as e:
            messages.error(request, str(e))
        except Exception as e:
            messages.error(request, f"Error al cancelar la orden: {str(e)}")

    return redirect("ventas:product_list")
