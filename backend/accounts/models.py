
from django.db import models
from django.contrib.auth.models import (
    AbstractUser,
    BaseUserManager,
)


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", "admin")
        extra_fields.setdefault("is_email_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None

    full_name = models.CharField(max_length=150)

    email = models.EmailField(unique=True)

    phone = models.CharField(
        max_length=15,
        unique=True,
        null=True,
        blank=True,
    )

    image = models.ImageField(
        upload_to="profiles/",
        null=True,
        blank=True,
    )

    role = models.CharField(
        max_length=10,
        choices=[
            ("customer", "Customer"),
            ("admin", "Admin"),
        ],
        default="customer",
    )

    is_email_verified = models.BooleanField(default=False)

    auth_providers = models.CharField(
        max_length=20,
        choices=[
            ("email", "email OTP"),
            ("google", "Google"),
        ],
        default="email",
    )

    google_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    def __str__(self):
        return self.email




class EmailOTP(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="email_otps",
    )
    otp_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    phone = models.CharField(max_length=15, null=True, blank=True)
    email = models.EmailField()
    verified_at = models.DateTimeField(null=True, blank=True)
    purpose = models.CharField(max_length=30)

    def __str__(self):
        return f"{self.purpose} - {self.email}"
class Address(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="addresses",
    )
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=15)
    address_line = models.TextField()
    city = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.full_name} - {self.city}"