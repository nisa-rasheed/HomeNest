
from django.urls import path
from .views import (UserRegistrationView,EmailOTPVerificationView,
                    ResendOTPView,UserLoginView,UserLogoutView,ForgotPasswordView,
                    VerifyResetOTPView,ResetPasswordView)
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (GoogleLoginView,UserProfileView,AddressListCreateView, 
                    AddressDetailView,ChangePasswordView,EmailChangeView,VerifyEmailChangeView,CustomerListView,
                    CustomerBlockUnblockView,CustomerDetailView,AdminLoginView,AdminDashboardStatsView,)
from .pdf_reports import AdminSalesReportPDFView


urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    path('verify-otp/', EmailOTPVerificationView.as_view(), name='verify-email-otp'),
    path('resend-otp/',ResendOTPView.as_view(),name='resend-otp'),
    path('login/',UserLoginView.as_view(),name='login'),     
    path('logout/', UserLogoutView.as_view(), name='logout'),
    path('token/refresh/',TokenRefreshView.as_view(), name='token_refresh'),
    path('forgot/',ForgotPasswordView.as_view(),name="forgot_password"),
    path('verify-reset-otp/',VerifyResetOTPView.as_view(),name='verify-reset-otp'),
    path('reset-password/',ResetPasswordView.as_view(),name='reset-password'),
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path("addresses/",AddressListCreateView.as_view(),name="address-list-create"),
    path("addresses/<int:pk>/",AddressDetailView.as_view(),name="address-detail"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("change-email/", EmailChangeView.as_view(), name="change-email"),
    path("verify-email-change/", VerifyEmailChangeView.as_view(), name="verify-email-change"),
    path("api/admin/customers/", CustomerListView.as_view(), name="customer-list"),
    path("api/admin/customers/<int:pk>/status/", CustomerBlockUnblockView.as_view(), name="customer-status"),
    path("api/admin/customers/<int:pk>/", CustomerDetailView.as_view(), name="customer-detail"),
    path('api/admin/login/', AdminLoginView.as_view(), name='admin-login'),
    path("api/admin/dashboard-stats/",AdminDashboardStatsView.as_view(),name="admin-dashboard-stats"),
    path("api/admin/sales-report/pdf/",AdminSalesReportPDFView.as_view(),name="admin-sales-report-pdf"),
]

