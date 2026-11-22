
from decimal import Decimal

from django.db.models import Q, F
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated,AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError

from cart.models import Cart, CartItem
from products.models import ProductVariant
from coupons.models import Coupon
from coupons.serializers.customer_serializer import (
    CustomerCouponApplySerializer
)


# CUSTOMER COUPON ACCESS

def get_customer_cart(user):

    if user.role != "customer":
        raise PermissionDenied(
            "Only customers can apply coupons."
        )

    cart, created = Cart.objects.get_or_create(
        user=user
    )

    return cart


# 1. AVAILABLE COUPONS

class CustomerAvailableCouponsView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        if request.user.role != "customer":
            raise PermissionDenied(
                "Only customers can view available coupons."
            )

        is_buy_now = request.data.get("buy_now", False)

        if not isinstance(is_buy_now, bool):
            raise ValidationError({
                "buy_now": "Invalid Buy Now value."
            })

        product_amount = Decimal("0.00")

        # BUY NOW CHECKOUT

        if is_buy_now:

            try:
                raw_variant_id = request.data.get("variant_id")
                raw_quantity = request.data.get("quantity")

                if (
                    isinstance(raw_variant_id, bool)
                    or isinstance(raw_quantity, bool)
                ):
                    raise ValueError

                variant_id = int(raw_variant_id)
                quantity = int(raw_quantity)

                if variant_id <= 0 or quantity <= 0:
                    raise ValueError

            except (TypeError, ValueError):
                raise ValidationError({
                    "message": (
                        "Valid variant ID and quantity are required."
                    )
                })

            variant = (
                ProductVariant.objects
                .select_related("product")
                .filter(id=variant_id)
                .first()
            )

            if variant is None or not variant.product.is_active:
                raise ValidationError({
                    "message": "Selected product is unavailable."
                })

            if variant.stock < quantity:
                raise ValidationError({
                    "message": "Insufficient product stock."
                })

            product_amount = variant.price * quantity

        # SELECTED CART ITEMS CHECKOUT

        else:

            raw_ids = request.data.get("selected_cart_item_ids")

            if not isinstance(raw_ids, list) or not raw_ids:
                raise ValidationError({
                    "selected_cart_item_ids": (
                        "Select at least one cart item."
                    )
                })

            try:

                if any(
                    isinstance(item_id, bool)
                    for item_id in raw_ids
                ):
                    raise ValueError

                selected_ids = [
                    int(item_id)
                    for item_id in raw_ids
                ]

                if (
                    any(item_id <= 0 for item_id in selected_ids)
                    or len(selected_ids) != len(set(selected_ids))
                ):
                    raise ValueError

            except (TypeError, ValueError):
                raise ValidationError({
                    "selected_cart_item_ids": (
                        "Invalid cart item IDs."
                    )
                })

            cart = get_customer_cart(request.user)

            cart_items = list(
                CartItem.objects
                .select_related(
                    "variant",
                    "variant__product"
                )
                .filter(
                    cart=cart,
                    id__in=selected_ids
                )
            )

            if len(cart_items) != len(selected_ids):
                raise ValidationError({
                    "message": (
                        "One or more selected cart items are unavailable."
                    )
                })

            for item in cart_items:

                if not item.variant.product.is_active:
                    raise ValidationError({
                        "message": (
                            f"{item.variant.product.name} is unavailable."
                        )
                    })

                if (
                    item.quantity <= 0
                    or item.variant.stock < item.quantity
                ):
                    raise ValidationError({
                        "message": (
                            "Invalid quantity or insufficient stock for "
                            f"{item.variant.product.name}."
                        )
                    })

                product_amount += (
                    item.variant.price * item.quantity
                )

        # FETCH ONLY ELIGIBLE COUPONS

        now = timezone.now()

        coupons = (
            Coupon.objects
            .filter(
                is_active=True,
                starting_date__lte=now,
                expiry_date__gte=now,
                minimum_amount__lte=product_amount
            )
            .filter(
                Q(usage_limit__isnull=True)
                | Q(used_count__lt=F("usage_limit"))
            )
            .exclude(
                usages__user=request.user
            )
            .order_by("expiry_date")
            .distinct()
        )

        data = []

        for coupon in coupons:

            data.append({
                "id": coupon.id,
                "code": coupon.code,
                "description": coupon.description,
                "discount_percentage": str(
                    coupon.discount_percentage
                ),
                "minimum_amount": str(
                    coupon.minimum_amount
                ),
                "maximum_discount": str(
                    coupon.maximum_discount
                ),
                "expiry_date": coupon.expiry_date,
            })

        return Response(
            {
                "message": "Eligible coupons fetched successfully.",
                "product_amount": str(product_amount),
                "coupons": data
            },
            status=status.HTTP_200_OK
        )


# 2. APPLY COUPON

class CustomerCouponApplyView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        cart = get_customer_cart(request.user)

        cart_items = cart.items.select_related(
            "variant",
            "variant__product"
        ).all()

        if not cart_items.exists():
            return Response(
                {
                    "message": "Your cart is empty."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        product_amount = sum(
            (
                item.variant.price * item.quantity
                for item in cart_items
            ),
            Decimal("0.00")
        )

        serializer = CustomerCouponApplySerializer(
            data=request.data,
            context={
                "request": request,
                "product_amount": product_amount
            }
        )

        serializer.is_valid(
            raise_exception=True
        )

        coupon = serializer.validated_data["coupon"]

        discount_amount = serializer.validated_data[
            "discount_amount"
        ]

        if product_amount > Decimal("2000.00"):
            shipping_charge = Decimal("0.00")
        else:
            shipping_charge = Decimal("50.00")

        final_amount = max(
            Decimal("0.00"),
            product_amount + shipping_charge - discount_amount
        )

        return Response(
            {
                "message": "Coupon applied successfully.",
                "coupon": {
                    "id": coupon.id,
                    "code": coupon.code,
                    "discount_percentage": coupon.discount_percentage,
                    "minimum_amount": coupon.minimum_amount,
                    "maximum_discount": coupon.maximum_discount
                },
                "product_amount": product_amount,
                "shipping_charge": shipping_charge,
                "discount_amount": discount_amount,
                "final_amount": final_amount
            },
            status=status.HTTP_200_OK
        )


# 3. HOME PAGE ACTIVE COUPONS

class CustomerActiveCouponsView(APIView):

    permission_classes = [AllowAny]

    def get(self, request):

        now = timezone.now()

        coupons = (
            Coupon.objects
            .filter(
                is_active=True,
                starting_date__lte=now,
                expiry_date__gte=now
            )
            .filter(
                Q(usage_limit__isnull=True)
                | Q(used_count__lt=F("usage_limit"))
            )
            .order_by("expiry_date")
        )

        data = []

        for coupon in coupons:

            data.append({
                "id": coupon.id,
                "code": coupon.code,
                "description": coupon.description,
                "discount_percentage": str(
                    coupon.discount_percentage
                ),
                "minimum_amount": str(
                    coupon.minimum_amount
                ),
                "maximum_discount": str(
                    coupon.maximum_discount
                ),
                "expiry_date": coupon.expiry_date
            })

        return Response(
            {
                "message": "Active coupons fetched successfully.",
                "coupons": data
            },
            status=status.HTTP_200_OK
        )
