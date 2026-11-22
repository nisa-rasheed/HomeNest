
from django.db import models
from django.conf import settings
from django.core.validators import (
    MinValueValidator,
    MaxValueValidator
)
from django.utils import timezone


class Coupon(models.Model):

    code = models.CharField(
        max_length=50,
        unique=True
    )

    description = models.TextField(
        blank=True
    )

    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(0.01),
            MaxValueValidator(100)
        ]
    )

    minimum_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(0.01)
        ]
    )

    maximum_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(0.01)
        ]
    )

    usage_limit = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    used_count = models.PositiveIntegerField(
        default=0
    )

    starting_date = models.DateTimeField()

    expiry_date = models.DateTimeField()

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    @property
    def is_valid(self):
        now = timezone.now()

        return (
            self.is_active
            and self.starting_date <= now
            and self.expiry_date >= now
            and (
                self.usage_limit is None
                or self.used_count < self.usage_limit
            )
        )

    def __str__(self):
        return self.code


class CouponUsage(models.Model):

    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.PROTECT,
        related_name="usages"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="coupon_usages"
    )

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="coupon_usages"
    )

    used_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["coupon", "user"],
                name="unique_coupon_per_customer"
            )
        ]

    def __str__(self):
        return f"{self.user} - {self.coupon.code}"
