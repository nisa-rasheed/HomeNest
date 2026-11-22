from django.urls import path

from .views import (
    CustomerCheckoutView,
    CustomerOrderListView,
    CustomerOrderDetailView,
    CustomerCancelOrderView,
    CustomerReturnRequestView,
    CustomerReturnRequestGroupView,
    CustomerReturnRequestListView,
    AdminOrderListView,
    AdminOrderDetailView,
    AdminOrderStatusUpdateView,
    AdminReturnRequestListView,
    AdminReturnRequestDetailView,
    AdminReturnRequestApproveView,
    AdminReturnRequestRejectView,
    AdminCODPaymentCollectionView,
    CustomerRazorpayPaymentVerifyView,
    RazorpayWebhookView,
    CustomerRazorpayPaymentRetryView,
    
    )


urlpatterns = [

    # CUSTOMER CHECKOUT
    path(
        "checkout/",
        CustomerCheckoutView.as_view(),
        name="customer-checkout"
    ),

    # CUSTOMER MY ORDERS
    path(
        "my-orders/",
        CustomerOrderListView.as_view(),
        name="customer-my-orders"
    ),

    # CUSTOMER ORDER DETAILS
    path(
        "<int:pk>/",
        CustomerOrderDetailView.as_view(),
        name="customer-order-detail"
    ),

    # CUSTOMER CANCEL ORDER
    path(
        "<int:pk>/cancel/",
        CustomerCancelOrderView.as_view(),
        name="customer-cancel-order"
    ),

    # CUSTOMER SINGLE RETURN REQUEST
    path(
        "return-request/",
        CustomerReturnRequestView.as_view(),
        name="customer-return-request"
    ),

    # CUSTOMER MULTIPLE RETURN REQUEST
    path(
        "return-requests/create/",
        CustomerReturnRequestGroupView.as_view(),
        name="customer-return-group-create"
    ),

    # CUSTOMER RETURN REQUEST HISTORY
    path(
        "return-requests/",
        CustomerReturnRequestListView.as_view(),
        name="customer-return-request-list"
    ),
    
    # ADMIN ORDER MANAGEMENT
    path(
        "admin/",
        AdminOrderListView.as_view(),
        name="admin-order-list"
    ),
    path(
        "admin/<int:pk>/",
        AdminOrderDetailView.as_view(),
        name="admin-order-detail"
    ),
    path(
        "admin/<int:pk>/status/",
        AdminOrderStatusUpdateView.as_view(),
        name="admin-order-status-update"
    ),

    # ADMIN RETURN REQUEST LIST
    path(
        "admin/returns/",
        AdminReturnRequestListView.as_view(),
        name="admin-return-list"
    ),

    # ADMIN RETURN REQUEST DETAIL
    path(
        "admin/returns/<int:pk>/",
        AdminReturnRequestDetailView.as_view(),
        name="admin-return-detail"
    ),

    path(
        "admin/returns/<int:pk>/approve/",
        AdminReturnRequestApproveView.as_view(),
        name="admin-return-approve",
    ),

    path(
        "admin/returns/<int:pk>/reject/",
        AdminReturnRequestRejectView.as_view(),
        name="admin-return-reject",
    ),
    # ADMIN COD PAYMENT COLLECTION
    path(
        "admin/<int:pk>/cod-payment/",
        AdminCODPaymentCollectionView.as_view(),
        name="admin-cod-payment-collection"
    ),

        # CUSTOMER RAZORPAY PAYMENT VERIFICATION
    path(
        "razorpay/verify/",
        CustomerRazorpayPaymentVerifyView.as_view(),
        name="customer-razorpay-payment-verify"
    ),
        # RAZORPAY WEBHOOK
    path(
        "razorpay/webhook/",
        RazorpayWebhookView.as_view(),
        name="razorpay-webhook"
    ),
    
        # CUSTOMER RAZORPAY PAYMENT RETRY
    path(
        "<int:pk>/razorpay/retry/",
        CustomerRazorpayPaymentRetryView.as_view(),
        name="customer-razorpay-payment-retry"
    ),
]