from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Wallet, WalletTransaction
from .serializer import (
    CustomerWalletSerializer,
    CustomerWalletTransactionSerializer,
    AdminWalletSerializer,
    AdminWalletTransactionSerializer,
)
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

# ==========================================
# CUSTOMER WALLET
# ==========================================

class CustomerWalletView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        if request.user.role != "customer":
            return Response(
                {"message": "Only customers can view wallet."},
                status=status.HTTP_403_FORBIDDEN
            )

        wallet, _ = Wallet.objects.get_or_create(
            user=request.user
        )

        serializer = CustomerWalletSerializer(wallet)

        return Response(
            {
                "message": "Wallet retrieved successfully.",
                "wallet": serializer.data
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# CUSTOMER WALLET TRANSACTIONS
# ==========================================

class CustomerWalletTransactionListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        if request.user.role != "customer":
            return Response(
                {"message": "Only customers can view wallet transactions."},
                status=status.HTTP_403_FORBIDDEN
            )

        wallet, created = Wallet.objects.get_or_create(
            user=request.user
        )

        transactions = WalletTransaction.objects.filter(
            wallet=wallet
        ).select_related(
            "order"
        ).order_by("-created_at")

        serializer = CustomerWalletTransactionSerializer(
            transactions,
            many=True
        )

        return Response(
            {
                "message": "Wallet transactions retrieved successfully.",
                "total_transactions": transactions.count(),
                "transactions": serializer.data
            },
            status=status.HTTP_200_OK
        )



# ==========================================
# ADMIN WALLET LIST
# ==========================================

class AdminWalletListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        if request.user.role != "admin":
            return Response(
                {"message": "Only admins can view customer wallets."},
                status=status.HTTP_403_FORBIDDEN
            )

        wallets = Wallet.objects.select_related(
            "user"
        ).order_by("-updated_at")

        serializer = AdminWalletSerializer(
            wallets,
            many=True
        )

        return Response(
            {
                "message": "Customer wallets retrieved successfully.",
                "total_wallets": wallets.count(),
                "wallets": serializer.data
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# ADMIN WALLET REFUND TRANSACTIONS
# ==========================================

class AdminWalletTransactionListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        if request.user.role != "admin":
            return Response(
                {"message": "Only admins can view wallet transactions."},
                status=status.HTTP_403_FORBIDDEN
            )

        transactions = WalletTransaction.objects.filter(
            transaction_type=WalletTransaction.TransactionType.CREDIT,
            status=WalletTransaction.Status.SUCCESS
        ).select_related(
            "wallet__user",
            "order"
        ).order_by("-created_at")

        serializer = AdminWalletTransactionSerializer(
            transactions,
            many=True
        )

        return Response(
            {
                "message": "Wallet refund transactions retrieved successfully.",
                "total_refunds": transactions.count(),
                "transactions": serializer.data
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# ADMIN INDIVIDUAL CUSTOMER WALLET
# ==========================================

class AdminCustomerWalletView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, customer_id):

        if request.user.role != "admin":
            return Response(
                {"message": "Only admins can view customer wallets."},
                status=status.HTTP_403_FORBIDDEN
            )

        User = get_user_model()

        customer = get_object_or_404(
            User.objects.filter(role="customer"),
            pk=customer_id
        )

        wallet, _ = Wallet.objects.get_or_create(
            user=customer
        )

        transactions = WalletTransaction.objects.filter(
            wallet=wallet
        ).select_related(
            "order"
        ).order_by("-created_at")

        successful_refunds = transactions.filter(
            transaction_type=WalletTransaction.TransactionType.CREDIT,
            status=WalletTransaction.Status.SUCCESS
        )

        from django.db.models import Sum
        from decimal import Decimal

        total_refunds = successful_refunds.aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0.00")

        wallet_serializer = AdminWalletSerializer(wallet)

        transaction_serializer = AdminWalletTransactionSerializer(
            transactions,
            many=True
        )

        return Response(
            {
                "message": "Customer wallet retrieved successfully.",
                "customer": {
                    "id": customer.id,
                    "full_name": customer.full_name,
                    "email": customer.email,
                },
                "wallet": wallet_serializer.data,
                "total_refunds": total_refunds,
                "total_transactions": transactions.count(),
                "transactions": transaction_serializer.data,
            },
            status=status.HTTP_200_OK
        )
