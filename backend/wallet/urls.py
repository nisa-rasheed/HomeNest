
from django.urls import path

from .views import (
    CustomerWalletView,
    CustomerWalletTransactionListView,
    AdminWalletListView,
    AdminWalletTransactionListView,
    AdminCustomerWalletView,
)


urlpatterns = [

    # Customer Wallet
    path(
        "",
        CustomerWalletView.as_view(),
        name="customer-wallet"
    ),

    path(
        "transactions/",
        CustomerWalletTransactionListView.as_view(),
        name="customer-wallet-transactions"
    ),

    # Admin Wallet
    path(
        "admin/",
        AdminWalletListView.as_view(),
        name="admin-wallet-list"
    ),

    path(
        "admin/transactions/",
        AdminWalletTransactionListView.as_view(),
        name="admin-wallet-transactions"
    ),
    
    path(
        "admin/customers/<int:customer_id>/",
        AdminCustomerWalletView.as_view(),
        name="admin-customer-wallet"
    ),

]
