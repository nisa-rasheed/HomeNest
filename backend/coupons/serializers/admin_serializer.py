
from rest_framework import serializers

from django.utils import timezone

from coupons.models import Coupon


class AdminCouponSerializer(serializers.ModelSerializer):

    class Meta:
        model = Coupon

        fields = [
            "id",
            "code",
            "description",
            "discount_percentage",
            "minimum_amount",
            "maximum_discount",
            "usage_limit",
            "used_count",
            "starting_date",
            "expiry_date",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "used_count",
            "created_at",
            "updated_at",
        ]

    def validate_code(self, value):

        value = value.strip().upper()

        if not value:
            raise serializers.ValidationError(
                "Coupon code cannot be empty."
            )

        queryset = Coupon.objects.filter(code=value)

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A coupon with this code already exists."
            )

        return value

    def validate_discount_percentage(self, value):

        if value <= 0 or value > 100:
            raise serializers.ValidationError(
                "Discount percentage must be between 0.01 and 100."
            )

        return value

    def validate_minimum_amount(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Minimum purchase amount must be greater than zero."
            )

        return value

    def validate_maximum_discount(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Maximum discount must be greater than zero."
            )

        return value

    def validate_usage_limit(self, value):

        if value is not None and value <= 0:
            raise serializers.ValidationError(
                "Usage limit must be greater than zero."
            )

        if (
            self.instance
            and value is not None
            and value < self.instance.used_count
        ):
            raise serializers.ValidationError(
                "Usage limit cannot be less than the number of times "
                "this coupon has already been used."
            )

        return value

    def validate(self, attrs):

        starting_date = attrs.get(
            "starting_date",
            getattr(self.instance, "starting_date", None)
        )

        expiry_date = attrs.get(
            "expiry_date",
            getattr(self.instance, "expiry_date", None)
        )

        is_active = attrs.get(
            "is_active",
            getattr(self.instance, "is_active", True)
        )

        if starting_date and expiry_date:

            if expiry_date <= starting_date:
                raise serializers.ValidationError({
                    "expiry_date": (
                        "Expiry date must be after the starting date."
                    )
                })

        if (
            self.instance is None
            and starting_date
            and starting_date < timezone.now()
        ):
            raise serializers.ValidationError({
                "starting_date": (
                    "Coupon starting date cannot be in the past."
                )
            })

        if (
            is_active
            and self.instance
            and starting_date
            and expiry_date
        ):
            if expiry_date <= timezone.now():
                raise serializers.ValidationError({
                    "is_active": (
                        "An expired coupon cannot be activated."
                    )
                })

        return attrs
