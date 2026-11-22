
from rest_framework import serializers

from orders.models import (
    Order,
    OrderItem,
    OrderTracking,
    ReturnRequest,
)


# ==========================================
# ADMIN ORDER ITEM SERIALIZER
# ==========================================

class AdminOrderItemSerializer(serializers.ModelSerializer):

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
# ADMIN ORDER TRACKING SERIALIZER
# ==========================================

class AdminOrderTrackingSerializer(serializers.ModelSerializer):

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
# ADMIN ORDER LIST SERIALIZER
# ==========================================

class AdminOrderListSerializer(serializers.ModelSerializer):

    customer_email = serializers.EmailField(
        source="user.email",
        read_only=True
    )

    customer_name = serializers.CharField(
        source="user.full_name",
        read_only=True
    )

    coupon_code = serializers.CharField(
        source="coupon.code",
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = Order

        fields = [
            "id",
            "customer_name",
            "customer_email",
            "product_amount",
            "tax_amount",
            "shipping_charge",
            "discount_amount",
            "final_amount",
            "coupon",
            "coupon_code",
            "status",
            "payment_method",
            "payment_status",
            "wallet_amount_used",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields


# ==========================================
# ADMIN ORDER DETAIL SERIALIZER
# ==========================================

class AdminOrderDetailSerializer(serializers.ModelSerializer):

    customer_email = serializers.EmailField(
        source="user.email",
        read_only=True
    )

    customer_name = serializers.CharField(
        source="user.full_name",
        read_only=True
    )

    coupon_code = serializers.CharField(
        source="coupon.code",
        read_only=True,
        allow_null=True
    )

    items = AdminOrderItemSerializer(
        many=True,
        read_only=True
    )

    tracking_history = AdminOrderTrackingSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Order

        fields = [
            "id",
            "customer_name",
            "customer_email",
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
            "cod_collected_at",
            "cod_collection_reference",
            "cod_collected_by",
            "items",
            "tracking_history",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields
        

# ==========================================
# ADMIN RETURN REQUEST LIST SERIALIZER
# ==========================================

class AdminReturnRequestListSerializer(serializers.ModelSerializer):

    customer_name = serializers.CharField(
        source="user.full_name",
        read_only=True
    )

    customer_email = serializers.EmailField(
        source="user.email",
        read_only=True
    )

    order_id = serializers.IntegerField(
        source="order_item.order_id",
        read_only=True
    )

    product_name = serializers.CharField(
        source="order_item.product_name",
        read_only=True
    )

    product_price = serializers.DecimalField(
        source="order_item.price",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    order_payment_method = serializers.CharField(
        source="order_item.order.payment_method",
        read_only=True
    )

    order_payment_status = serializers.CharField(
        source="order_item.order.payment_status",
        read_only=True
    )

    class Meta:
        model = ReturnRequest

        fields = [
            "id",
            "request_group",
            "order_id",
            "customer_name",
            "customer_email",
            "order_item",
            "product_name",
            "product_price",
            "return_quantity",
            "reason",
            "description",
            "status",
            "refund_amount",
            "refund_status",
            "order_payment_method",
            "order_payment_status",
            "requested_at",
            "updated_at",
        ]

        read_only_fields = fields


# ==========================================
# ADMIN RETURN REQUEST DETAIL SERIALIZER
# ==========================================

class AdminReturnRequestDetailSerializer(
    AdminReturnRequestListSerializer
):

    order_status = serializers.CharField(
        source="order_item.order.status",
        read_only=True
    )

    order_delivered_at = serializers.DateTimeField(
        source="order_item.order.delivered_at",
        read_only=True
    )

    class Meta(AdminReturnRequestListSerializer.Meta):

        fields = AdminReturnRequestListSerializer.Meta.fields + [
            "order_status",
            "order_delivered_at",
        ]

        read_only_fields = fields
        

class AdminReturnApproveSerializer(serializers.ModelSerializer):

    class Meta:
        model = ReturnRequest
        fields = []

    def validate(self, attrs):

        return_request = self.instance

        if return_request.status != ReturnRequest.Status.PENDING:
            raise serializers.ValidationError(
                "Only pending return requests can be approved."
            )

        order = return_request.order_item.order

        if order.status != Order.Status.DELIVERED:
            raise serializers.ValidationError(
                "Only delivered orders can be returned."
            )

        if order.payment_status not in [
            Order.PaymentStatus.PAID,
            Order.PaymentStatus.REFUNDED,
        ]:
            raise serializers.ValidationError(
                "Return cannot be approved because payment is not completed."
            )

        return attrs

class AdminReturnRejectSerializer(serializers.ModelSerializer):

    class Meta:
        model = ReturnRequest
        fields = []

    def validate(self, attrs):
        return_request = self.instance

        if return_request.status != ReturnRequest.Status.PENDING:
            raise serializers.ValidationError(
                "Only pending return requests can be rejected."
            )

        return attrs    