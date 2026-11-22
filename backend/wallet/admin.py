from django.contrib import admin
from .models import Wallet, WalletTransaction


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "balance", "created_at", "updated_at")
    search_fields = ("user__email", "user__full_name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "wallet",
        "transaction_type",
        "amount",
        "status",
        "order",
        "created_at",
    )
    list_filter = ("transaction_type", "status")
    search_fields = ("wallet__user__email", "reference_id")
    readonly_fields = ("created_at",)
