import pytest
from decimal import Decimal
from django.test import TestCase
from django.db import transaction
from django.core.exceptions import ValidationError
from ventas.models import User, Product, Order, OrderItem, Message, PaymentLog


@pytest.fixture
def seller(db):
    return User.objects.create_user(
        username="vendedor",
        email="vendedor@test.com",
        password="testpass123",
    )


@pytest.fixture
def buyer(db):
    return User.objects.create_user(
        username="comprador",
        email="comprador@test.com",
        password="testpass123",
    )


@pytest.fixture
def product(db, seller):
    return Product.objects.create(
        seller=seller,
        name="Producto Test",
        description="Descripción del producto",
        price=Decimal("99.99"),
        stock=10,
        is_active=True
    )


@pytest.fixture
def order(db, buyer, seller, product):
    order = Order.objects.create(
        buyer=buyer,
        seller=seller,
        status=Order.STATUS_PENDING,
        total_amount=product.price,
    )
    OrderItem.objects.create(
        order=order,
        product=product,
        product_name=product.name,
        product_price=product.price,
        quantity=1,
    )
    return order


class TestProductModel:
    def test_product_creation(self, product, seller):
        assert product.name == "Producto Test"
        assert product.seller == seller
        assert product.stock == 10
        assert product.is_active is True
        assert product.is_available is True

    def test_product_str(self, product):
        assert str(product) == "Producto Test"

    def test_reduce_stock_success(self, product):
        initial_stock = product.stock
        new_stock = product.reduce_stock(3)
        assert new_stock == initial_stock - 3

    def test_reduce_stock_insufficient(self, product):
        with pytest.raises(ValueError, match="Stock insuficiente"):
            product.reduce_stock(100)

    def test_reduce_stock_inactive_product(self, product):
        product.is_active = False
        product.save()
        with pytest.raises(ValueError, match="no está activo"):
            product.reduce_stock(1)

    def test_restore_stock(self, product):
        initial_stock = product.stock
        new_stock = product.restore_stock(5)
        assert new_stock == initial_stock + 5

    def test_is_available_false_when_no_stock(self, product):
        product.stock = 0
        product.save()
        assert product.is_available is False


class TestOrderModel:
    def test_order_creation(self, order, buyer, seller):
        assert order.buyer == buyer
        assert order.seller == seller
        assert order.status == Order.STATUS_PENDING
        assert order.is_pending is True
        assert order.is_completed is False

    def test_order_str(self, order):
        assert f"Order {order.id}" == str(order)

    def test_calculate_total(self, order, product):
        total = order.calculate_total()
        assert total == product.price

    def test_order_clean_same_buyer_seller(self, buyer):
        with pytest.raises(ValidationError):
            Order.objects.create(
                buyer=buyer,
                seller=buyer,
                status=Order.STATUS_PENDING,
            )

    def test_mark_delivered(self, order):
        order.mark_delivered()
        order.refresh_from_db()
        assert order.seller_delivered is True
        assert order.status == Order.STATUS_DELIVERED

    def test_complete_payment_success(self, order):
        order.mark_delivered()
        order.complete_payment(payment_method="efectivo")
        order.refresh_from_db()
        assert order.buyer_paid is True
        assert order.status == Order.STATUS_COMPLETED
        assert order.payments.exists()

    def test_complete_payment_before_delivery(self, order):
        with pytest.raises(ValueError, match="entregar primero"):
            order.complete_payment()

    def test_cancel_order_restores_stock(self, order, product):
        initial_stock = product.stock
        order.cancel()
        product.refresh_from_db()
        assert product.stock == initial_stock + 1
        assert order.status == Order.STATUS_CANCELLED

    def test_cannot_cancel_completed_order(self, order):
        order.mark_delivered()
        order.complete_payment()
        with pytest.raises(ValueError, match="no puede ser cancelada"):
            order.cancel()


class TestOrderItemModel:
    def test_order_item_creation(self, order, product):
        item = order.items.first()
        assert item.product == product
        assert item.product_name == product.name
        assert item.product_price == product.price
        assert item.quantity == 1

    def test_order_item_subtotal(self, order, product):
        item = order.items.first()
        assert item.subtotal == product.price


class TestMessageModel:
    def test_message_creation(self, order, buyer, seller):
        msg = Message.objects.create(
            order=order,
            sender=buyer,
            receiver=seller,
            content="Hola vendedor"
        )
        assert msg.content == "Hola vendedor"
        assert msg.is_read is False

    def test_mark_as_read(self, order, buyer, seller):
        msg = Message.objects.create(
            order=order,
            sender=buyer,
            receiver=seller,
            content="Test message"
        )
        msg.mark_as_read()
        msg.refresh_from_db()
        assert msg.is_read is True
        assert msg.received_at is not None


class TestPaymentLogModel:
    def test_payment_log_creation(self, order, buyer):
        from django.utils import timezone
        log = PaymentLog.objects.create(
            order=order,
            user=buyer,
            payment_amount=order.total_amount,
            payment_method=PaymentLog.PAYMENT_METHOD_CASH,
            payment_date=timezone.now(),
        )
        assert log.payment_amount == order.total_amount
        assert log.payment_method == "efectivo"


class TestOrderServiceIntegration:
    def test_full_order_flow(self, buyer, seller, product):
        from ventas.services.business import OrderService

        order = OrderService.create_order(
            buyer=buyer,
            product=product,
            shipping_address="Dirección de prueba 123",
        )

        assert order.status == Order.STATUS_PENDING
        assert order.items.count() == 1

        product.refresh_from_db()
        assert product.stock == 9

        OrderService.mark_order_delivered(order)
        order.refresh_from_db()
        assert order.seller_delivered is True

        OrderService.complete_order_payment(order)
        order.refresh_from_db()
        assert order.status == Order.STATUS_COMPLETED
        assert order.buyer_paid is True

    def test_cancel_order_flow(self, buyer, product):
        from ventas.services.business import OrderService

        order = OrderService.create_order(
            buyer=buyer,
            product=product,
            shipping_address="Dirección de prueba",
        )

        product.refresh_from_db()
        assert product.stock == 9

        OrderService.cancel_order(order, cancelled_by=buyer)

        product.refresh_from_db()
        assert product.stock == 10



class TestMessageService:
    def test_send_message_between_users(self, order, buyer, seller):
        from ventas.services.business import MessageService

        msg = MessageService.send_message(
            order=order,
            sender=buyer,
            receiver=seller,
            content="Mensaje de prueba",
        )

        assert msg.content == "Mensaje de prueba"
        assert msg.sender == buyer
        assert msg.receiver == seller

    def test_send_message_invalid_sender(self, order, seller):
        from ventas.services.business import MessageService
        from ventas.models import User

        other_user = User.objects.create_user(
            username="otro",
            email="otro@test.com",
            password="pass123",
        )

        with pytest.raises(ValueError, match="no es parte"):
            MessageService.send_message(
                order=order,
                sender=other_user,
                receiver=seller,
                content="Mensaje inválido",
            )
