
from rest_framework import serializers

from wallet.models import Wallet, WalletTransaction


# ==========================================
# CUSTOMER WALLET SERIALIZER
# ==========================================

class CustomerWalletSerializer(serializers.ModelSerializer):

    class Meta:
        model = Wallet

        fields = [
            "id",
            "balance",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields

    def validate(self, attrs):

        if self.instance is None:
            raise serializers.ValidationError(
                "Customers cannot create a wallet directly."
            )

        return attrs


# ==========================================
# CUSTOMER WALLET TRANSACTION SERIALIZER
# ==========================================

class CustomerWalletTransactionSerializer(serializers.ModelSerializer):

    order_id = serializers.IntegerField(
        source="order.id",
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = WalletTransaction

        fields = [
            "id",
            "transaction_type",
            "amount",
            "status",
            "order_id",
            "reference_id",
            "created_at",
        ]

        read_only_fields = fields

    def validate(self, attrs):

        if self.instance is None:
            raise serializers.ValidationError(
                "Customers cannot create wallet transactions directly."
            )

        return attrs


# ==========================================
# ADMIN WALLET SERIALIZERS
# ==========================================

class AdminWalletSerializer(serializers.ModelSerializer):

    customer_name = serializers.CharField(
        source="user.full_name",
        read_only=True
    )

    customer_email = serializers.EmailField(
        source="user.email",
        read_only=True
    )

    class Meta:
        model = Wallet

        fields = [
            "id",
            "customer_name",
            "customer_email",
            "balance",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields


class AdminWalletTransactionSerializer(serializers.ModelSerializer):

    customer_name = serializers.CharField(
        source="wallet.user.full_name",
        read_only=True
    )

    customer_email = serializers.EmailField(
        source="wallet.user.email",
        read_only=True
    )

    order_id = serializers.IntegerField(
        source="order.id",
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = WalletTransaction

        fields = [
            "id",
            "customer_name",
            "customer_email",
            "transaction_type",
            "amount",
            "status",
            "order_id",
            "reference_id",
            "created_at",
        ]

        read_only_fields = fields
