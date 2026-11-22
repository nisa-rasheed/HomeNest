
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from accounts.models import Address
from rest_framework import serializers
from decimal import Decimal
from orders.models import (
    Order,
    OrderItem,
    OrderTracking,
    ReturnRequest,
    ReturnRequestGroup,
)


# ==========================================
# COMMON RETURN VALIDATION HELPERS
# ==========================================

ACTIVE_RETURN_STATUSES = [
    ReturnRequest.Status.PENDING,
    ReturnRequest.Status.APPROVED,
    ReturnRequest.Status.COMPLETED,
]


def validate_returnable_order(order):

    if order.status != Order.Status.DELIVERED:
        raise serializers.ValidationError(
            "Only delivered orders can be returned."
        )

    # ONLY PAID ORDERS CAN BE RETURNED

    if order.payment_status != Order.PaymentStatus.PAID:
        raise serializers.ValidationError(
            "Only paid orders can be returned."
        )

    if not order.delivered_at:
        raise serializers.ValidationError(
            "Delivery date is not available."
        )

    return_deadline = order.delivered_at + timedelta(days=7)

    if timezone.now() > return_deadline:
        raise serializers.ValidationError(
            "Return period has expired. "
            "Returns are allowed within 7 days of delivery."
        )

def validate_returnable_item(order_item):

    if order_item.status != Order.Status.DELIVERED:
        raise serializers.ValidationError(
            f"{order_item.product_name} is not delivered."
        )

    validate_returnable_order(order_item.order)


def get_already_requested_quantity(order_item):

    return sum(
        ReturnRequest.objects.filter(
            order_item=order_item,
            status__in=ACTIVE_RETURN_STATUSES
        ).values_list("return_quantity", flat=True)
    )


def validate_available_return_quantity(order_item, requested_quantity):

    already_requested = get_already_requested_quantity(order_item)

    remaining_quantity = order_item.quantity - already_requested

    if requested_quantity > remaining_quantity:
        raise serializers.ValidationError(
            f"Only {remaining_quantity} quantity available "
            f"for {order_item.product_name} return."
        )

    return remaining_quantity


# ==========================================
# CUSTOMER ORDER ITEM SERIALIZER
# ==========================================

class CustomerOrderItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = OrderItem

        fields = [
            "id",
            "product_variant",
            "product_name",
            "sku",
            "size",
            "color",
            "quantity",
            "price",
            "tax_percentage",
            "tax_amount",
            "status",
        ]

        read_only_fields = fields


# ==========================================
# CUSTOMER ORDER TRACKING SERIALIZER
# ==========================================

class CustomerOrderTrackingSerializer(serializers.ModelSerializer):

    class Meta:
        model = OrderTracking

        fields = [
            "id",
            "status",
            "description",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields


# ==========================================
# CUSTOMER ORDER SERIALIZER
# ==========================================

class CustomerOrderSerializer(serializers.ModelSerializer):

    items = CustomerOrderItemSerializer(
        many=True,
        read_only=True
    )

    tracking_history = CustomerOrderTrackingSerializer(
        many=True,
        read_only=True
    )

    coupon_code = serializers.CharField(
        source="coupon.code",
        read_only=True
    )

    class Meta:
        model = Order

        fields = [
            "id",
            "product_amount",
            "tax_amount",
            "status",
            "payment_method",
            "payment_status",
            "wallet_amount_used",
            "shipping_full_name",
            "shipping_phone",
            "shipping_address_line",
            "shipping_city",
            "shipping_district",
            "shipping_state",
            "shipping_pincode",
            "shipping_charge",
            "discount_amount",
            "final_amount",
            "coupon",
            "coupon_code",
            "delivered_at",
            "items",
            "tracking_history",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields


# ==========================================
# CUSTOMER RETURN REQUEST SERIALIZER
# SINGLE PRODUCT RETURN
# ==========================================

class CustomerReturnRequestSerializer(serializers.ModelSerializer):

    order_id = serializers.IntegerField(
        source="order_item.order_id",
        read_only=True
    )

    product_name = serializers.CharField(
        source="order_item.product_name",
        read_only=True
    )

    class Meta:
        model = ReturnRequest

        fields = [
            "id",
            "request_group",
            "order_item",
            "order_id",
            "product_name",
            "return_quantity",
            "reason",
            "description",
            "status",
            "refund_amount",
            "refund_status",
            "requested_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "request_group",
            "order_id",
            "product_name",
            "status",
            "refund_amount",
            "refund_status",
            "requested_at",
            "updated_at",
        ]

    return_quantity = serializers.IntegerField(
        min_value=1,
        default=1
    )

    # --------------------------------------
    # REASON VALIDATION
    # --------------------------------------

    def validate_reason(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Return reason is required."
            )

        return value

    # --------------------------------------
    # DESCRIPTION VALIDATION
    # --------------------------------------

    def validate_description(self, value):

        value = value.strip()

        if len(value) > 1000:
            raise serializers.ValidationError(
                "Description cannot exceed 1000 characters."
            )

        return value

    # --------------------------------------
    # ORDER ITEM VALIDATION
    # --------------------------------------

    def validate_order_item(self, order_item):

        request = self.context.get("request")

        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Authenticated customer is required."
            )

        if order_item.order.user_id != request.user.id:
            raise serializers.ValidationError(
                "You cannot return another customer's product."
            )

        try:
            validate_returnable_item(order_item)
        except serializers.ValidationError as error:
            raise serializers.ValidationError(error.detail)

        return order_item

    # --------------------------------------
    # QUANTITY + ORDER VALIDATION
    # --------------------------------------

    def validate(self, attrs):

        order_item = attrs["order_item"]
        return_quantity = attrs.get("return_quantity", 1)

        validate_available_return_quantity(
            order_item,
            return_quantity
        )

        return attrs

    # --------------------------------------
    # CREATE SINGLE RETURN
    # --------------------------------------

    
    def create(self, validated_data):

        request = self.context["request"]

        order_item = validated_data.pop("order_item")

        return_quantity = validated_data.pop(
            "return_quantity",
            1
        )

        with transaction.atomic():

            # LOCK ORDER FIRST
            order = Order.objects.select_for_update().get(
                id=order_item.order_id
            )

            # LOCK ORDER ITEM
            order_item = OrderItem.objects.select_for_update().get(
                id=order_item.id,
                order=order
            )

            # RECHECK RETURN ELIGIBILITY
            validate_returnable_item(order_item)

            # RECHECK AVAILABLE QUANTITY
            validate_available_return_quantity(
                order_item,
                return_quantity
            )

            # CREATE RETURN GROUP
            return_group = ReturnRequestGroup.objects.create(
                order=order,
                user=request.user,
                status=ReturnRequestGroup.Status.PENDING
            )

            # CREATE RETURN REQUEST
            return_request = ReturnRequest.objects.create(
                request_group=return_group,
                order_item=order_item,
                user=request.user,
                return_quantity=return_quantity,
                **validated_data
            )

        return return_request

# ==========================================
# MULTIPLE RETURN ITEM INPUT SERIALIZER
# ==========================================

class CustomerReturnItemInputSerializer(serializers.Serializer):

    order_item = serializers.PrimaryKeyRelatedField(
        queryset=OrderItem.objects.all()
    )

    return_quantity = serializers.IntegerField(
        min_value=1
    )

    reason = serializers.CharField(
        max_length=200,
        trim_whitespace=True
    )

    description = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
        trim_whitespace=True
    )


# ==========================================
# MULTIPLE RETURN REQUEST GROUP SERIALIZER
# ==========================================

class CustomerReturnRequestGroupCreateSerializer(serializers.Serializer):

    order_id = serializers.PrimaryKeyRelatedField(
        queryset=Order.objects.all(),
        source="order"
    )

    items = CustomerReturnItemInputSerializer(
        many=True,
        allow_empty=False
    )

    # --------------------------------------
    # VALIDATE COMPLETE RETURN SUBMISSION
    # --------------------------------------

    def validate(self, attrs):

        request = self.context.get("request")

        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Authentication is required."
            )

        order = attrs["order"]
        items = attrs["items"]

        if order.user_id != request.user.id:
            raise serializers.ValidationError({
                "order_id": "This order does not belong to you."
            })

        try:
            validate_returnable_order(order)
        except serializers.ValidationError as error:
            raise serializers.ValidationError({
                "order_id": error.detail
            })

        selected_item_ids = set()

        for item in items:

            order_item = item["order_item"]
            return_quantity = item["return_quantity"]

            # Product must belong to selected order

            if order_item.order_id != order.id:
                raise serializers.ValidationError({
                    "items": (
                        f"{order_item.product_name} "
                        "does not belong to this order."
                    )
                })

            # Prevent duplicate products in one submission

            if order_item.id in selected_item_ids:
                raise serializers.ValidationError({
                    "items": (
                        "The same product cannot be added twice "
                        "in one return submission."
                    )
                })

            selected_item_ids.add(order_item.id)

            # Product must be delivered

            try:
                validate_returnable_item(order_item)
            except serializers.ValidationError as error:
                raise serializers.ValidationError({
                    "items": error.detail
                })

            # Validate remaining quantity

            try:
                validate_available_return_quantity(
                    order_item,
                    return_quantity
                )
            except serializers.ValidationError as error:
                raise serializers.ValidationError({
                    "items": error.detail
                })

        return attrs

    # --------------------------------------
    # CREATE MULTIPLE RETURN GROUP
    # --------------------------------------

    def create(self, validated_data):

        order = validated_data["order"]
        items = validated_data["items"]

        user = self.context["request"].user

        with transaction.atomic():

            # LOCK ORDER FIRST
            order = Order.objects.select_for_update().get(
                id=order.id,
                user=user
            )

            # RECHECK ORDER ELIGIBILITY
            validate_returnable_order(order)

            locked_items = []

            # LOCK AND VALIDATE ALL ORDER ITEMS
            for item in items:

                order_item = OrderItem.objects.select_for_update().get(
                    id=item["order_item"].id,
                    order=order
                )

                validate_returnable_item(order_item)

                validate_available_return_quantity(
                    order_item,
                    item["return_quantity"]
                )

                locked_items.append((item, order_item))

            # CREATE RETURN GROUP
            return_group = ReturnRequestGroup.objects.create(
                order=order,
                user=user,
                status=ReturnRequestGroup.Status.PENDING
            )

            # CREATE RETURN REQUESTS
            for item, order_item in locked_items:

                ReturnRequest.objects.create(
                    request_group=return_group,
                    order_item=order_item,
                    user=user,
                    return_quantity=item["return_quantity"],
                    reason=item["reason"],
                    description=item.get("description", ""),
                    status=ReturnRequest.Status.PENDING
                )

        return return_group
# ==========================================
# CUSTOMER CHECKOUT SERIALIZER
# ==========================================

class CustomerCheckoutSerializer(serializers.Serializer):

    address_id = serializers.PrimaryKeyRelatedField(
        queryset=Address.objects.all(),
        source="address"
    )

    payment_method = serializers.ChoiceField(
        choices=Order.PaymentMethod.choices
    )

    coupon_code = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True
    )
    
    wallet_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        min_value=Decimal("0.00")
    )

    # --------------------------------------
    # ADDRESS VALIDATION
    # --------------------------------------

    def validate_address_id(self, address):

        request = self.context.get("request")

        if request is None or address.user_id != request.user.id:
            raise serializers.ValidationError(
                "You cannot use another customer's address."
            )

        return address

    # --------------------------------------
    # COUPON CODE VALIDATION
    # --------------------------------------

    def validate_coupon_code(self, value):

        return value.strip().upper()

    # --------------------------------------
    # CHECKOUT VALIDATION
    # --------------------------------------

    def validate(self, attrs):

        request = self.context.get("request")

        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Authentication is required."
            )

        if request.user.role != "customer":
            raise serializers.ValidationError(
                "Only customers can place orders."
            )

        return attrs
