from .customer_views import (
    CustomerCheckoutView,
    CustomerOrderListView,
    CustomerOrderDetailView,
    CustomerCancelOrderView,
    CustomerReturnRequestView,
    CustomerReturnRequestGroupView,
    CustomerReturnRequestListView,
    CustomerRazorpayPaymentVerifyView,
    RazorpayWebhookView,
    CustomerRazorpayPaymentRetryView,
)

from .admin_views import (
    AdminOrderListView,
    AdminOrderDetailView,
    AdminOrderStatusUpdateView,
    AdminReturnRequestListView,
    AdminReturnRequestDetailView,
    AdminReturnRequestApproveView,
    AdminReturnRequestRejectView,
    AdminCODPaymentCollectionView,
)