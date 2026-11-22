
from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers

from coupons.models import Coupon, CouponUsage


class CustomerCouponApplySerializer(serializers.Serializer):

    code = serializers.CharField(
        max_length=50,
        trim_whitespace=True
    )

    def validate(self, attrs):

        code = attrs["code"].strip().upper()

        # 1. Check whether coupon exists
        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            raise serializers.ValidationError({
                "code": "Invalid coupon code."
            })

        # 2. Check coupon active status, dates and usage limit
        if not coupon.is_valid:
            raise serializers.ValidationError({
                "code": "This coupon is not currently available."
            })

        # 3. Check authenticated customer
        request = self.context.get("request")

        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Authentication is required."
            )
        if request.user.role != "customer":
            raise serializers.ValidationError(
             "Only customers can apply coupons."
            )    

        # 4. Check whether customer already used this coupon
        already_used = CouponUsage.objects.filter(
            coupon=coupon,
            user=request.user
        ).exists()

        if already_used:
            raise serializers.ValidationError({
                "code": "You have already used this coupon."
            })

        # 5. Get actual cart amount from backend context
        product_amount = self.context.get("product_amount")

        if product_amount is None:
            raise serializers.ValidationError(
                "Cart amount is required."
            )

        product_amount = Decimal(str(product_amount))

        # 6. Check minimum purchase amount
        if product_amount < coupon.minimum_amount:
            raise serializers.ValidationError({
                "code": (
                    f"Minimum purchase amount is "
                    f"₹{coupon.minimum_amount} to apply this coupon."
                )
            })

        # 7. Calculate discount using coupon settings
        discount_amount = (
            product_amount * coupon.discount_percentage
        ) / Decimal("100")

        # 8. Apply maximum discount limit
        discount_amount = min(
            discount_amount,
            coupon.maximum_discount
        )
        discount_amount = discount_amount.quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP

        )
        attrs["code"] = code
        attrs["coupon"] = coupon
        attrs["product_amount"] = product_amount
        attrs["discount_amount"] = discount_amount

        return attrs
