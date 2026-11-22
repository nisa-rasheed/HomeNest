
from django.db import models
from django.conf import settings
from django.core.validators import (
    MinValueValidator,
    MaxValueValidator,
)


class Order(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        SHIPPED = "shipped", "Shipped"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for Delivery"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"
        RETURN_REQUESTED = "return_requested", "Return Requested"
        RETURNED = "returned", "Returned"

    class PaymentMethod(models.TextChoices):
        COD = "cod", "Cash on Delivery"
        RAZORPAY = "razorpay", "Razorpay"
        WALLET = "wallet", "Wallet"
        WALLET_RAZORPAY = "wallet_razorpay", "Wallet + Razorpay"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders"
    )

    product_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING
    )

    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING
    )
    
    class RefundStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSED = "processed", "Processed"
        FAILED = "failed", "Failed"
        
    razorpay_order_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        unique=True
    )

    razorpay_payment_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        unique=True
    )

    razorpay_signature = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )
    
    razorpay_payment_created_at = models.DateTimeField(
        null=True,
        blank=True
    )
    
    razorpay_payment_attempts = models.PositiveIntegerField(
        default=0
    )
    
    razorpay_refund_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        unique=True
    )

    razorpay_refund_receipt = models.CharField(
        max_length=40,
        blank=True,
        null=True,
        unique=True
    )

    razorpay_refund_status = models.CharField(
        max_length=20,
        choices=RefundStatus.choices,
        blank=True,
        default=""
    )

    razorpay_refund_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    wallet_amount_used = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )

    # Shipping address snapshot

    shipping_full_name = models.CharField(max_length=150)
    shipping_phone = models.CharField(max_length=15)
    shipping_address_line = models.TextField()
    shipping_city = models.CharField(max_length=100)
    shipping_district = models.CharField(max_length=100)
    shipping_state = models.CharField(max_length=100)
    shipping_pincode = models.CharField(max_length=10)

    shipping_charge = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )

    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )

    final_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )

    coupon = models.ForeignKey(
        "coupons.Coupon",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders"
    )
    
    selected_cart_item_ids = models.JSONField(
        default=list,
        blank=True
    )
    
    delivered_at = models.DateTimeField(
        null=True,
        blank=True
    )
    cod_collected_at = models.DateTimeField(
        null=True,
        blank=True
    )

    cod_collection_reference = models.CharField(
        max_length=100,
        blank=True
    )

    cod_collected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cod_collections"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} - {self.user}"


class OrderItem(models.Model):

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )

    product_variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items"
    )

    # Product details snapshot

    product_name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100)
    size = models.CharField(max_length=100, blank=True)
    color = models.CharField(max_length=100, blank=True)

    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )

    # Unit price at the time of ordering

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )

    tax_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100)
        ]
    )

    tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )

    status = models.CharField(
        max_length=30,
        choices=Order.Status.choices,
        default=Order.Status.PENDING
    )

    def __str__(self):
        return f"Order Item - Order #{self.order_id}"


class OrderTracking(models.Model):

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="tracking_history"
    )

    status = models.CharField(
        max_length=30,
        choices=Order.Status.choices
    )

    description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Order #{self.order_id} - {self.status}"


class RazorpayWebhookEvent(models.Model):

    event_id = models.CharField(
        max_length=255,
        unique=True
    )

    event_type = models.CharField(
        max_length=100
    )

    processed = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    processed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.event_type} - {self.event_id}"

class ReturnRequestGroup(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        COMPLETED = "completed", "Completed"

    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        related_name="return_requests"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="return_request_groups"
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    requested_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Return Request #{self.id} - Order #{self.order_id}"


class ReturnRequest(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        COMPLETED = "completed", "Completed"

    class RefundStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    # Parent return submission

    request_group = models.ForeignKey(
        ReturnRequestGroup,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="return_items"
    )

    # Individual returned product

    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.PROTECT,
        related_name="return_requests"
    )

    # Number of units requested for return

    return_quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="return_requests"
    )

    reason = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    refund_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )

    refund_status = models.CharField(
        max_length=20,
        choices=RefundStatus.choices,
        default=RefundStatus.PENDING
    )

    requested_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Return Request - Order Item #{self.order_item_id}"
