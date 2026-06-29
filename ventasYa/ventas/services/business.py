from decimal import Decimal
from django.db import transaction
from django.utils import timezone


class OrderService:
    @staticmethod
    @transaction.atomic
    def create_order(buyer, product, shipping_address, quantity=1):
        from ..models import Order, OrderItem, Message

        if buyer == product.seller:
            raise ValueError("No puedes comprar tu propio producto.")

        if not product.is_active:
            raise ValueError("El producto no está disponible.")

        if product.stock < quantity:
            raise ValueError(f"Stock insuficiente. Disponible: {product.stock}")

        order = Order.objects.create(
            buyer=buyer,
            seller=product.seller,
            shipping_address=shipping_address,
            status=Order.STATUS_PENDING,
        )

        item_price = Decimal(str(product.price)) * quantity
        OrderItem.objects.create(
            order=order,
            product=product,
            product_name=product.name,
            product_price=product.price,
            quantity=quantity,
        )

        product.reduce_stock(quantity)

        order.update_total()

        Message.objects.create(
            order=order,
            sender=buyer,
            receiver=product.seller,
            content=f"Solicitud de producto: {product.name}. Por favor, confirma la entrega cuando envíes el producto.",
        )

        return order

    @staticmethod
    @transaction.atomic
    def create_multi_item_order(buyer, items_data, shipping_address=""):
        from ..models import Order, OrderItem, Message, Product

        products = []
        for item in items_data:
            try:
                product = Product.objects.select_related("seller").get(pk=item["product_id"])
            except Product.DoesNotExist:
                raise ValueError(f"Producto ID {item['product_id']} no existe.")
            if buyer == product.seller:
                raise ValueError(f"No puedes comprar tu propio producto: {product.name}")
            if not product.is_active:
                raise ValueError(f"Producto no disponible: {product.name}")
            quantity = item["quantity"]
            if product.stock < quantity:
                raise ValueError(f"Stock insuficiente para {product.name}. Disponible: {product.stock}")
            products.append((product, quantity))

        sellers = set(p.seller_id for p, _ in products)
        if len(sellers) > 1:
            raise ValueError("Todos los productos deben ser del mismo vendedor.")

        seller = products[0][0].seller
        order = Order.objects.create(
            buyer=buyer,
            seller=seller,
            shipping_address=shipping_address,
            status=Order.STATUS_PENDING,
        )

        product_names = []
        for product, quantity in products:
            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product.name,
                product_price=product.price,
                quantity=quantity,
            )
            product.reduce_stock(quantity)
            product_names.append(product.name)

        order.update_total()

        Message.objects.create(
            order=order,
            sender=buyer,
            receiver=seller,
            content=f"Solicitud de productos: {', '.join(product_names)}. Por favor, confirma la entrega.",
        )

        return order

    @staticmethod
    @transaction.atomic
    def mark_order_delivered(order):
        from ..models import Message

        if order.seller_delivered:
            raise ValueError("El pedido ya fue marcado como entregado.")

        order.mark_delivered()

        Message.objects.create(
            order=order,
            sender=order.seller,
            receiver=order.buyer,
            content="He marcado el producto como entregado. Por favor, confirma el pago.",
        )

        return order

    @staticmethod
    @transaction.atomic
    def complete_order_payment(order, payment_method="efectivo", notes=""):
        from ..models import Message

        if order.buyer_paid:
            raise ValueError("El pago ya fue confirmado.")

        if not order.seller_delivered:
            raise ValueError("El vendedor debe entregar primero el producto.")

        order.complete_payment(payment_method=payment_method, notes=notes)

        Message.objects.create(
            order=order,
            sender=order.buyer,
            receiver=order.seller,
            content="He confirmado el pago. ¡Gracias!",
        )

        return order

    @staticmethod
    @transaction.atomic
    def cancel_order(order, cancelled_by=None):
        from ..models import Message

        if not order.can_be_cancelled:
            raise ValueError("La orden no puede ser cancelada en su estado actual.")

        order.cancel(cancelled_by=cancelled_by)

        receiver = order.seller if cancelled_by == order.buyer else order.buyer
        if receiver:
            Message.objects.create(
                order=order,
                sender=cancelled_by,
                receiver=receiver,
                content="La orden ha sido cancelada.",
            )

        return order


class MessageService:
    @staticmethod
    def send_message(order, sender, receiver, content):
        from ..models import Message

        if sender not in [order.buyer, order.seller]:
            raise ValueError("El remitente no es parte de esta orden.")

        if receiver not in [order.buyer, order.seller]:
            raise ValueError("El receptor no es parte de esta orden.")

        if sender == receiver:
            raise ValueError("No puedes enviarte un mensaje a ti mismo.")

        return Message.objects.create(
            order=order,
            sender=sender,
            receiver=receiver,
            content=content,
        )



