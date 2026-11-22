from .models import User,EmailOTP,Address
from products.models import Product, Category
from .serializer import (UserRegistrationSerializer,PasswordResetSerializer,
                         UserProfileSerializer,AddressSerializer,EmailChangeSerializer,
                         ChangePasswordSerializer,CustomerListSerializer)
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from django.core.mail import send_mail
from .otp_utils import generate_email_otp
from django.utils import timezone
import hashlib
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated,AllowAny
from rest_framework_simplejwt.exceptions import TokenError
from django.core import signing
from django.core.signing import BadSignature, SignatureExpired
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.shortcuts import get_object_or_404
from rest_framework.pagination import PageNumberPagination
from .permission import IsAdminRole
from django.db.models import Sum, Count,F,Q,ExpressionWrapper, DecimalField
from django.db.models.functions import TruncMonth
from django.utils import timezone
import calendar
from datetime import timedelta
from django.db.models.functions import TruncDate,TruncMonth
from orders.models import Order, OrderItem, ReturnRequestGroup,ReturnRequest
from products.models import ProductVariant
from datetime import datetime



class UserRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()

            try:
                otp = generate_email_otp(user)

                send_mail(
                    subject="HomeNest Email Verification",
                    message=(
                        f"Your verification OTP is {otp}. "
                        "It expires in 5 minutes."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )

            except Exception as e:
                print("OTP EMAIL ERROR:", repr(e))
                return Response(
                    {
                        "message": (
                            "Unable to send verification email. "
                            "Please try again."
                        )
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            return Response(
                {
                    "message": (
                        "Registration successful. "
                        "Please verify your email using the OTP."
                    )
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
class EmailOTPVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        otp = request.data.get("otp")

        if not email or not otp:
            return Response(
                {"message": "Email and OTP are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"message": "Invalid email or OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.is_email_verified:
            return Response(
                {"message": "Email is already verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record = EmailOTP.objects.filter(
            user=user,
            purpose="email_verification",
            verified_at__isnull=True,
        ).order_by("-created_at").first()

        if otp_record is None:
            return Response(
                {"message": "No active OTP found. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if timezone.now() >= otp_record.expires_at:
            return Response(
                {"message": "OTP has expired. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp_record.attempts >= 5:
            return Response(
                {"message": "Too many attempts. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record.attempts += 1
        otp_record.save(update_fields=["attempts"])

        otp_hash = hashlib.sha256(otp.encode()).hexdigest()

        if otp_hash != otp_record.otp_hash:
            return Response(
                {"message": "Invalid OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record.verified_at = timezone.now()
        otp_record.save(update_fields=["verified_at"])

        user.is_email_verified = True
        user.is_active = True
        user.save(update_fields=["is_email_verified", "is_active"])

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Email verified successfully.",
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_200_OK,
        )
class ResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return Response(
                {"message": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"message": "If the account exists, an OTP can be sent."},
                status=status.HTTP_200_OK,
            )

        if user.is_email_verified:
            return Response(
                {"message": "Email is already verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            otp = generate_email_otp(user)

            send_mail(
                subject="HomeNest Email Verification",
                message=(
                    f"Your verification OTP is {otp}. "
                    "It expires in 5 minutes."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            print("RESEND OTP EMAIL ERROR:", repr(e))
            return Response(
                {"message": "Unable to send OTP. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {"message": "If the account is eligible, an OTP has been sent."},
            status=status.HTTP_200_OK,
        )
        
class UserLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"message": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email=email).first()

        if user is None:
            return Response(
                {"message": "Invalid email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if user.role != "customer":
            return Response(
                {"message": "Please use the admin login page."},
                status=status.HTTP_403_FORBIDDEN,
            )    

        if not user.is_email_verified:
            return Response(
                {"message": "Please verify your email before logging in."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.is_active:
            return Response(
                {"message": "Your account is inactive."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = authenticate(
            request,
            email=email,
            password=password,
        )

        if user is None:
            return Response(
                {"message": "Invalid email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Login successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "name": user.full_name,
                    "email": user.email,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )
class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"message": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email=email).first()

        if user is None:
            return Response(
                {"message": "Invalid email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.role != "admin":
            return Response(
                {"message": "Access denied. Admin account required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.is_email_verified:
            return Response(
                {"message": "Please verify your email."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.is_active:
            return Response(
                {"message": "Your account is inactive."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = authenticate(
            request,
            email=email,
            password=password,
        )

        if user is None:
            return Response(
                {"message": "Invalid email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Admin login successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "name": user.full_name,
                    "email": user.email,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )        
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("credential")

        if not token:
            return Response(
                {"message": "Google token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )

        except ValueError:
            return Response(
                {"message": "Invalid Google token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = idinfo.get("email")
        google_id = idinfo.get("sub")
        full_name = idinfo.get("name", "")
        email_verified = idinfo.get("email_verified", False)

        if not email or not google_id:
            return Response(
                {"message": "Google account information is incomplete."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not email_verified:
            return Response(
                {"message": "Google email is not verified."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = User.objects.filter(google_id=google_id).first()

        if user is None:
            user = User.objects.filter(email=email).first()

            if user is not None:
                if user.google_id and user.google_id != google_id:
                    return Response(
                        {
                            "message": (
                                "This email is linked to another Google account."
                            )
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

                user.google_id = google_id
                user.auth_providers = "google"
                user.is_email_verified = True
                user.save()

            else:
                user = User.objects.create_user(
                    email=email,
                    password=None,
                    full_name=full_name,
                    google_id=google_id,
                    auth_providers="google",
                    is_email_verified=True,
                )

        # Only customer accounts can use Google Login.
        if user.role != "customer":
            return Response(
                {"message": "Please use the admin login page."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.is_active:
            return Response(
                {"message": "Your account has been blocked."},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Google login successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "name": user.full_name,
                    "email": user.email,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )
class UserLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"message": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)

            if str(token["user_id"]) != str(request.user.pk):
                return Response(
                    {"message": "Token does not belong to this user."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            token.blacklist()

        except TokenError:
            return Response(
                {"message": "Invalid or expired refresh token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"message": "Logout successful."},
            status=status.HTTP_200_OK,
        )
        
class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return Response(
                {"message": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email=email).first()

        # Same response for existing and non-existing emails.
        if user is None:
            return Response(
                {
                    "message": (
                        "If the account exists, "
                        "a password reset OTP will be sent."
                    )
                },
                status=status.HTTP_200_OK,
            )

        if not user.is_email_verified or not user.is_active:
            return Response(
                {
                    "message": (
                        "If the account exists, "
                        "a password reset OTP will be sent."
                    )
                },
                status=status.HTTP_200_OK,
            )

        try:
            otp = generate_email_otp(
                user,
                purpose="password_reset",
            )

            send_mail(
                subject="HomeNest Password Reset OTP",
                message=(
                    f"Your password reset OTP is {otp}. "
                    "It expires in 5 minutes."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

        except Exception as e:
            print("PASSWORD RESET OTP ERROR:", repr(e))
            return Response(
                {
                    "message": (
                        "Unable to process the request. "
                        "Please try again."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "message": (
                    "If the account exists, "
                    "a password reset OTP will be sent."
                )
            },
            status=status.HTTP_200_OK,
        )

class VerifyResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        otp = request.data.get("otp")

        if not email or not otp:
            return Response(
                {"message": "Email and OTP are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(
            email=email,
            is_email_verified=True,
            is_active=True,
        ).first()

        if user is None:
            return Response(
                {"message": "Invalid email or OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record = EmailOTP.objects.filter(
            user=user,
            purpose="password_reset",
            verified_at__isnull=True,
        ).order_by("-created_at").first()

        if otp_record is None:
            return Response(
                {"message": "Invalid or expired OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if timezone.now() >= otp_record.expires_at:
            return Response(
                {"message": "OTP has expired. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp_record.attempts >= 5:
            return Response(
                {"message": "Too many attempts. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record.attempts += 1
        otp_record.save(update_fields=["attempts"])

        otp_hash = hashlib.sha256(str(otp).encode()).hexdigest()

        if otp_hash != otp_record.otp_hash:
            return Response(
                {"message": "Invalid email or OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record.verified_at = timezone.now()
        otp_record.save(update_fields=["verified_at"])

        reset_token = signing.dumps(
            {"user_id": user.id, "otp_id": otp_record.id},
            salt="password-reset",
        )

        return Response(
            {
                "message": "OTP verified successfully.",
                "reset_token": reset_token,
            },
            status=status.HTTP_200_OK,
        )

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        reset_token = request.data.get("reset_token")

        if not reset_token:
            return Response(
                {"message": "Reset token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token_data = signing.loads(
                reset_token,
                salt="password-reset",
                max_age=600,
            )
        except SignatureExpired:
            return Response(
                {"message": "Reset token expired. Verify OTP again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except BadSignature:
            return Response(
                {"message": "Invalid reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record = EmailOTP.objects.filter(
            id=token_data.get("otp_id"),
            user_id=token_data.get("user_id"),
            purpose="password_reset",
            verified_at__isnull=False,
        ).first()

        if otp_record is None:
            return Response(
                {"message": "Invalid reset request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if timezone.now() >= otp_record.expires_at:
            return Response(
                {"message": "OTP expired. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PasswordResetSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = otp_record.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])

        otp_record.delete()

        return Response(
            {"message": "Password reset successfully."},
            status=status.HTTP_200_OK,
        )
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        user = request.user

        # Remove profile image
        if request.data.get("remove_image") == "true":
            if user.image:
                user.image.delete(save=False)
                user.image = None
                user.save(update_fields=["image"])

            serializer = UserProfileSerializer(user)

            return Response(
                {
                    "message": "Profile image removed successfully.",
                    "user": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        # Update profile details or upload new image
        serializer = UserProfileSerializer(
            user,
            data=request.data,
            partial=True,
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                {
                    "message": "Profile updated successfully.",
                    "user": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
class EmailChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = EmailChangeSerializer(
            data=request.data,
            context={"request": request},
        )

        if serializer.is_valid():
            new_email = serializer.validated_data["new_email"]

            otp = generate_email_otp(
                request.user,
                purpose="email_change",
                email=new_email,
            )

            send_mail(
                "HomeNest Email Change Verification",
                f"Your email verification OTP is {otp}. It is valid for 5 minutes.",
                settings.DEFAULT_FROM_EMAIL,
                [new_email],
                fail_silently=False,
            )

            return Response(
                {"message": "OTP sent to your new email address."},
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
class VerifyEmailChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        otp = request.data.get("otp")

        if not otp:
            return Response(
                {"message": "OTP is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record = EmailOTP.objects.filter(
            user=request.user,
            purpose="email_change",
            verified_at__isnull=True,
        ).order_by("-created_at").first()

        if otp_record is None:
            return Response(
                {"message": "No active OTP found. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if timezone.now() >= otp_record.expires_at:
            return Response(
                {"message": "OTP has expired. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp_record.attempts >= 5:
            return Response(
                {"message": "Too many attempts. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record.attempts += 1
        otp_record.save(update_fields=["attempts"])

        otp_hash = hashlib.sha256(otp.encode()).hexdigest()

        if otp_hash != otp_record.otp_hash:
            return Response(
                {"message": "Invalid OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email__iexact=otp_record.email).exclude(
            id=request.user.id
        ).exists():
            return Response(
                {"message": "This email is already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.email = otp_record.email
        request.user.is_email_verified = True
        request.user.save(
            update_fields=["email", "is_email_verified"]
        )

        otp_record.verified_at = timezone.now()
        otp_record.save(update_fields=["verified_at"])

        return Response(
            {"message": "Email changed and verified successfully."},
            status=status.HTTP_200_OK,
        )        
                
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)

        if serializer.is_valid():
            user = request.user

            if not user.check_password(
                serializer.validated_data["current_password"]
            ):
                return Response(
                    {"current_password": "Current password is incorrect."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user.set_password(
                serializer.validated_data["new_password"]
            )
            user.save(update_fields=["password"])

            return Response(
                {"message": "Password changed successfully."},
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )        
class AddressListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    # Get all addresses of the logged-in user
    def get(self, request):
        addresses = Address.objects.filter(user=request.user)

        serializer = AddressSerializer(
            addresses,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # Create a new address
    def post(self, request):
        serializer = AddressSerializer(data=request.data)

        if serializer.is_valid():

            is_default = serializer.validated_data.get(
                "is_default",
                False,
            )

            # If this address is default, remove default from old address
            if is_default:
                Address.objects.filter(
                    user=request.user,
                ).update(is_default=False)

            # If user has no default address, make this one default
            elif not Address.objects.filter(
                user=request.user,
                is_default=True,
            ).exists():
                is_default = True

            serializer.save(
                user=request.user,
                is_default=is_default,
            )

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
class AddressDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        address = get_object_or_404(
            Address,
            pk=pk,
            user=request.user,
        )

        serializer = AddressSerializer(address)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk):
        address = get_object_or_404(
            Address,
            pk=pk,
            user=request.user,
        )

        serializer = AddressSerializer(
            address,
            data=request.data,
            partial=True,
        )

        if serializer.is_valid():
            is_default = serializer.validated_data.get(
                "is_default",
                address.is_default,
            )

            if is_default:
                Address.objects.filter(
                    user=request.user,
                ).exclude(
                    pk=address.pk,
                ).update(is_default=False)

            elif address.is_default:
                next_address = Address.objects.filter(
                    user=request.user,
                ).exclude(
                    pk=address.pk,
                ).first()

                if next_address:
                    next_address.is_default = True
                    next_address.save(update_fields=["is_default"])
                else:
                    is_default = True

            serializer.save(is_default=is_default)

            return Response(
                serializer.data,
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    def delete(self, request, pk):
        address = get_object_or_404(
            Address,
            pk=pk,
            user=request.user,
        )

        was_default = address.is_default

        address.delete()

        if was_default:
            next_address = Address.objects.filter(
                user=request.user,
            ).first()

            if next_address:
                next_address.is_default = True
                next_address.save(update_fields=["is_default"])

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )
class CustomerPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 10       
class CustomerListView(APIView):
    permission_classes = [IsAdminRole]
    pagination_class = CustomerPagination

    def get(self, request):
        customers = User.objects.filter(role="customer")

        # Search by name, email or phone
        search = request.query_params.get("search")

        if search:
            customers = customers.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search)
            )

        # Filter by account status
        customer_status = request.query_params.get("status")

        if customer_status == "active":
            customers = customers.filter(is_active=True)

        elif customer_status == "blocked":
            customers = customers.filter(is_active=False)

        # Latest customers first
        customers = customers.order_by("-created_at")

        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(
            customers,
            request,
            view=self
        )

        serializer = CustomerListSerializer(
            page,
            many=True
        )

        return paginator.get_paginated_response(
            serializer.data
        )
class CustomerBlockUnblockView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        customer = get_object_or_404(
            User,
            pk=pk,
            role="customer"
        )

        is_blocked = request.data.get("is_blocked")

        if not isinstance(is_blocked, bool):
            return Response(
                {"error": "is_blocked must be true or false."},
                status=status.HTTP_400_BAD_REQUEST
            )

        customer.is_active = not is_blocked
        customer.save(update_fields=["is_active"])

        message = (
            "Customer blocked successfully."
            if is_blocked
            else "Customer unblocked successfully."
        )

        return Response(
            {
                "message": message,
                "customer_id": customer.id,
                "is_active": customer.is_active
            },
            status=status.HTTP_200_OK
        )
class CustomerDetailView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request, pk):
        customer = get_object_or_404(
            User.objects.prefetch_related("addresses"),
            pk=pk,
            role="customer"
        )

        customer_data = CustomerListSerializer(customer).data

        addresses = AddressSerializer(
            customer.addresses.all(),
            many=True
        ).data

        return Response(
            {
                "customer": customer_data,
                "addresses": addresses
            },
            status=status.HTTP_200_OK
        )
         


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):

        # -----------------------------
        # BASIC STATISTICS
        # -----------------------------

        total_products = Product.objects.filter(
            is_active=True
        ).count()

        total_categories = Category.objects.filter(
            is_active=True
        ).count()

        customers = User.objects.filter(role="customer")

        total_customers = customers.count()

        active_customers = customers.filter(
            is_active=True
        ).count()

        blocked_customers = customers.filter(
            is_active=False
        ).count()

        total_orders = Order.objects.count()

        pending_orders = Order.objects.filter(
            status=Order.Status.PENDING
        ).count()

        # -----------------------------
        # REVENUE
        # -----------------------------

        paid_orders = Order.objects.filter(
            payment_status=Order.PaymentStatus.PAID
        ).exclude(
            status__in=[
                Order.Status.CANCELLED,
                Order.Status.RETURNED,
            ]
        )

        total_revenue = paid_orders.aggregate(
            total=Sum("final_amount")
        )["total"] or 0

        # -----------------------------
        # MONTHLY SALES - CURRENT YEAR
        # -----------------------------

        current_year = timezone.now().year

        monthly_data = paid_orders.filter(
            created_at__year=current_year
        ).annotate(
            month_date=TruncMonth("created_at")
        ).values(
            "month_date"
        ).annotate(
            revenue=Sum("final_amount")
        ).order_by(
            "month_date"
        )

        monthly_revenue = {
            item["month_date"].month: float(item["revenue"] or 0)
            for item in monthly_data
        }

        monthly_sales = []

        for month in range(1, 13):
            monthly_sales.append({
                "month": calendar.month_abbr[month],
                "revenue": monthly_revenue.get(month, 0),
            })

        # -----------------------------
        # CUSTOM DATE RANGE REVENUE
        # -----------------------------

        start_date_param = request.query_params.get("start_date")
        end_date_param = request.query_params.get("end_date")

        custom_revenue = None

        if start_date_param or end_date_param:

            if not start_date_param or not end_date_param:
                return Response(
                    {
                        "message": "Both start_date and end_date are required."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                start_date = datetime.strptime(
                    start_date_param, "%Y-%m-%d"
                ).date()

                end_date = datetime.strptime(
                    end_date_param, "%Y-%m-%d"
                ).date()

                if start_date > end_date:
                    return Response(
                        {
                            "message": "Start date cannot be after end date."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                custom_data = paid_orders.filter(
                    created_at__date__range=(start_date, end_date)
                ).aggregate(
                    total_revenue=Sum("final_amount"),
                    total_orders=Count("id")
                )

                custom_revenue = {
                    "start_date": str(start_date),
                    "end_date": str(end_date),
                    "total_revenue": float(
                        custom_data["total_revenue"] or 0
                    ),
                    "total_orders": custom_data["total_orders"],
                }

            except ValueError:
                return Response(
                    {
                        "message": "Invalid date format. Use YYYY-MM-DD."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # -----------------------------
        # WEEKLY / MONTHLY / YEARLY REVENUE
        # -----------------------------

        selected_period = request.query_params.get(
            "period", "monthly"
        ).lower()

        if selected_period not in ["weekly", "monthly", "yearly"]:
            selected_period = "monthly"

        today = timezone.localdate()

        revenue_analytics = []

        if selected_period == "weekly":

            start_date = today - timedelta(days=6)

            daily_data = paid_orders.filter(
                created_at__date__range=(start_date, today)
            ).annotate(
                period_date=TruncDate("created_at")
            ).values(
                "period_date"
            ).annotate(
                revenue=Sum("final_amount")
            )

            revenue_map = {
                item["period_date"]: float(item["revenue"] or 0)
                for item in daily_data
            }

            for day in range(7):
                current_date = start_date + timedelta(days=day)

                revenue_analytics.append({
                    "label": current_date.strftime("%a"),
                    "revenue": revenue_map.get(current_date, 0),
                })

        elif selected_period == "monthly":

            start_date = today.replace(day=1)

            daily_data = paid_orders.filter(
                created_at__date__range=(start_date, today)
            ).annotate(
                period_date=TruncDate("created_at")
            ).values(
                "period_date"
            ).annotate(
                revenue=Sum("final_amount")
            )

            revenue_map = {
                item["period_date"]: float(item["revenue"] or 0)
                for item in daily_data
            }

            for day in range(1, today.day + 1):
                current_date = today.replace(day=day)

                revenue_analytics.append({
                    "label": str(day),
                    "revenue": revenue_map.get(current_date, 0),
                })

        else:

            yearly_data = paid_orders.filter(
                created_at__year=today.year
            ).annotate(
                period_date=TruncMonth("created_at")
            ).values(
                "period_date"
            ).annotate(
                revenue=Sum("final_amount")
            )

            revenue_map = {
                item["period_date"].month: float(item["revenue"] or 0)
                for item in yearly_data
            }

            for month in range(1, 13):
                revenue_analytics.append({
                    "label": calendar.month_abbr[month],
                    "revenue": revenue_map.get(month, 0),
                })

                # -----------------------------
        # ORDER STATUS OVERVIEW - DETAILED ANALYTICS
        # -----------------------------

        orders_overview = []

        for status_value, status_label in Order.Status.choices:

            status_orders = Order.objects.filter(
                status=status_value
            )

            order_data = status_orders.aggregate(
                total_amount=Sum("final_amount"),
                total_orders=Count("id")
            )

            orders_overview.append({
                "status": status_value,
                "label": status_label,
                "count": order_data["total_orders"],
                "total_amount": float(
                    order_data["total_amount"] or 0
                ),
            })
                    # -----------------------------
        # PAYMENT METHOD ANALYTICS
        # -----------------------------

        payment_analytics = []

        for method_value, method_label in Order.PaymentMethod.choices:

            method_orders = Order.objects.filter(
                payment_method=method_value
            )

            payment_data = method_orders.aggregate(
                total_orders=Count("id"),
                paid_orders=Count(
                    "id",
                    filter=Q(payment_status=Order.PaymentStatus.PAID)
                ),
                pending_orders=Count(
                    "id",
                    filter=Q(payment_status=Order.PaymentStatus.PENDING)
                ),
                failed_orders=Count(
                    "id",
                    filter=Q(payment_status=Order.PaymentStatus.FAILED)
                ),
                refunded_orders=Count(
                    "id",
                    filter=Q(payment_status=Order.PaymentStatus.REFUNDED)
                ),
                paid_revenue=Sum(
                    "final_amount",
                    filter=Q(payment_status=Order.PaymentStatus.PAID)
                )
            )

            payment_analytics.append({
                "payment_method": method_value,
                "label": method_label,
                "total_orders": payment_data["total_orders"],
                "paid_orders": payment_data["paid_orders"],
                "pending_orders": payment_data["pending_orders"],
                "failed_orders": payment_data["failed_orders"],
                "refunded_orders": payment_data["refunded_orders"],
                "paid_revenue": float(
                    payment_data["paid_revenue"] or 0
                ),
            })
            
                    # -----------------------------
        # RETURN ANALYTICS
        # -----------------------------

        return_analytics = []

        for status_value, status_label in ReturnRequest.Status.choices:

            status_requests = ReturnRequest.objects.filter(
                status=status_value
            )

            status_data = status_requests.aggregate(
                total_requests=Count("id"),
                total_refund_amount=Sum("refund_amount")
            )

            return_analytics.append({
                "status": status_value,
                "label": status_label,
                "total_requests": status_data["total_requests"],
                "total_refund_amount": float(
                    status_data["total_refund_amount"] or 0
                ),
            })

        total_return_requests = ReturnRequest.objects.count()

        total_refund_amount = ReturnRequest.objects.aggregate(
            total=Sum("refund_amount")
        )["total"] or 0

        completed_refund_amount = ReturnRequest.objects.filter(
            refund_status=ReturnRequest.RefundStatus.COMPLETED
        ).aggregate(
            total=Sum("refund_amount")
        )["total"] or 0

        pending_refund_amount = ReturnRequest.objects.filter(
            refund_status=ReturnRequest.RefundStatus.PENDING
        ).aggregate(
            total=Sum("refund_amount")
        )["total"] or 0

        failed_refund_count = ReturnRequest.objects.filter(
            refund_status=ReturnRequest.RefundStatus.FAILED
        ).count()
        
                # -----------------------------
        # INVENTORY ANALYTICS
        # -----------------------------

        total_variants = ProductVariant.objects.count()

        low_stock_variants = ProductVariant.objects.filter(
            stock__gt=0,
            stock__lte=5
        ).count()

        out_of_stock_variants = ProductVariant.objects.filter(
            stock=0
        ).count()

        total_inventory_stock = ProductVariant.objects.aggregate(
            total=Sum("stock")
        )["total"] or 0

        inventory_stock_value = ProductVariant.objects.aggregate(
            total=Sum(
                ExpressionWrapper(
                    F("price") * F("stock"),
                    output_field=DecimalField(
                        max_digits=15,
                        decimal_places=2
                    )
                )
            )
        )["total"] or 0
        # -----------------------------
        # TOP SELLING PRODUCTS - DETAILED ANALYTICS
        # -----------------------------

        top_selling_products = OrderItem.objects.filter(
            order__payment_status=Order.PaymentStatus.PAID
        ).exclude(
            order__status__in=[
                Order.Status.CANCELLED,
                Order.Status.RETURNED,
            ]
        ).values(
            "product_name"
        ).annotate(
            total_quantity=Sum("quantity"),
            total_revenue=Sum(
                ExpressionWrapper(
                    F("price") * F("quantity"),
                    output_field=DecimalField(
                        max_digits=12,
                        decimal_places=2
                    )
                )
            ),
            total_orders=Count("order", distinct=True)
        ).order_by(
            "-total_quantity"
        )[:5]

        top_products_data = [
            {
                "product_name": item["product_name"],
                "total_quantity": item["total_quantity"],
                "total_revenue": float(item["total_revenue"] or 0),
                "total_orders": item["total_orders"],
            }
            for item in top_selling_products
        ]

        # -----------------------------
        # RECENT ORDERS
        # -----------------------------

        recent_orders = Order.objects.select_related(
            "user"
        ).order_by(
            "-created_at"
        )[:5]

        recent_orders_data = []

        for order in recent_orders:
            recent_orders_data.append({
                "id": order.id,
                "customer_name": order.user.full_name,
                "customer_email": order.user.email,
                "final_amount": float(order.final_amount),
                "status": order.status,
                "payment_status": order.payment_status,
                "created_at": order.created_at,
            })

        # -----------------------------
        # LOW STOCK PRODUCTS
        # -----------------------------

        low_stock_products_queryset = ProductVariant.objects.filter(
            product__is_active=True,
            stock__lte=5
        ).select_related(
            "product"
        ).order_by(
            "stock"
        )[:5]

        low_stock_data = []

        for variant in low_stock_products_queryset:
            low_stock_data.append({
                "product_name": variant.product.name,
                "sku": variant.sku,
                "stock": variant.stock,
            })

        total_low_stock_variants = ProductVariant.objects.filter(
            product__is_active=True,
            stock__lte=5
        ).count()

        # -----------------------------
        # PENDING RETURN REQUESTS
        # -----------------------------

        pending_return_requests = ReturnRequestGroup.objects.filter(
            status=ReturnRequestGroup.Status.PENDING
        ).count()

        # -----------------------------
        # RECENTLY ADDED PRODUCTS
        # -----------------------------

        recent_products = Product.objects.filter(
            is_active=True
        ).select_related(
            "category"
        ).order_by(
            "-created_at"
        )[:5]

        recent_products_data = []

        for product in recent_products:
            recent_products_data.append({
                "id": product.id,
                "name": product.name,
                "category": product.category.name,
                "created_at": product.created_at,
            })

        # -----------------------------
        # FINAL RESPONSE
        # -----------------------------

        return Response({

            "total_products": total_products,
            "total_categories": total_categories,
            "total_customers": total_customers,
            "active_customers": active_customers,
            "blocked_customers": blocked_customers,

            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "total_revenue": float(total_revenue),

            "monthly_sales": monthly_sales,

            "revenue_analytics": {
                "period": selected_period,
                "data": revenue_analytics,
            },

            "custom_revenue": custom_revenue,

            "orders_overview": orders_overview,
            
            "payment_analytics": payment_analytics,
            
            "return_analytics": return_analytics,
            "total_return_requests": total_return_requests,
            "total_refund_amount": float(total_refund_amount),
            "completed_refund_amount": float(completed_refund_amount),
            "pending_refund_amount": float(pending_refund_amount),
            "failed_refund_count": failed_refund_count,
            "total_variants": total_variants,
            "low_stock_variants": low_stock_variants,
            "out_of_stock_variants": out_of_stock_variants,
            "total_inventory_stock": total_inventory_stock,
            "inventory_stock_value": float(inventory_stock_value),

            "top_selling_products": top_products_data,

            "recent_orders": recent_orders_data,

            "low_stock_products": low_stock_data,
            "total_low_stock_variants": total_low_stock_variants,

            "pending_return_requests": pending_return_requests,

            "recent_products": recent_products_data,

        }, status=status.HTTP_200_OK)
