

from django.contrib import admin
from .models import Coupon, CouponUsage


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):

    list_display = (
        "code",
        "discount_percentage",
        "minimum_amount",
        "maximum_discount",
        "starting_date",
        "expiry_date",
        "is_active",
        "used_count",
    )

    list_filter = (
        "is_active",
        "starting_date",
        "expiry_date",
    )

    search_fields = (
        "code",
    )


@admin.register(CouponUsage)
class CouponUsageAdmin(admin.ModelAdmin):

    list_display = (
        "coupon",
        "user",
        "order",
        "used_at",
    )

    search_fields = (
        "coupon__code",
        "user__email",
    )
