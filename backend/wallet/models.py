
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db.models import Q


class Wallet(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="wallet"
    )
    balance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} - ₹{self.balance}"


class WalletTransaction(models.Model):

    class TransactionType(models.TextChoices):
        CREDIT = "credit", "Credit"
        DEBIT = "debit", "Debit"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.PROTECT,
        related_name="transactions"
    )
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wallet_transactions"
    )
    transaction_type = models.CharField(
        max_length=10,
        choices=TransactionType.choices
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reference_id = models.CharField(
        max_length=150,
        blank=True,
        default=""
    )

    def __str__(self):
        return f"{self.wallet.user} - {self.transaction_type} - ₹{self.amount}"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["wallet", "reference_id"],
                condition=~Q(reference_id=""),
                name="unique_wallet_transaction_reference"
            )
        ]