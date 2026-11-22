
from django.urls import path

from coupons.views.customer_view import (
    CustomerCouponApplyView,
    CustomerAvailableCouponsView,
    CustomerActiveCouponsView
)

from coupons.views.admin_view import (
    AdminCouponListCreateView,
    AdminCouponDetailView,
    AdminCouponUsageView
)


urlpatterns = [

    # CUSTOMER COUPON URLS

    path(
        "available/",
        CustomerAvailableCouponsView.as_view(),
        name="customer-available-coupons"
    ),

    path(
        "apply/",
        CustomerCouponApplyView.as_view(),
        name="customer-coupon-apply"
    ),

    path(
        "active/",
        CustomerActiveCouponsView.as_view(),
        name="customer-active-coupons"
    ),


    # ADMIN COUPON URLS

    path(
        "admin/",
        AdminCouponListCreateView.as_view(),
        name="admin-coupon-list-create"
    ),

    path(
        "admin/<int:pk>/",
        AdminCouponDetailView.as_view(),
        name="admin-coupon-detail"
    ),

    path(
        "admin/<int:pk>/usages/",
        AdminCouponUsageView.as_view(),
        name="admin-coupon-usages"
    ),

]
