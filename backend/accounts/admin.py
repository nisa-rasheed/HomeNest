
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User

    list_display = (
        "email",
        "full_name",
        "phone",
        "role",
        "is_active",
        "date_joined",
    )

    list_display_links = ("email",)

    search_fields = ("email", "full_name", "phone")

    list_filter = ("role", "is_active", "is_email_verified")

    ordering = ("-date_joined",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {
            "fields": ("full_name", "phone", "image")
        }),
        ("Account Status", {
            "fields": (
                "role",
                "is_email_verified",
                "auth_providers",
                "google_id",
            )
        }),
        ("Permissions", {
            "fields": (
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            )
        }),
        ("Important Dates", {
            "fields": ("last_login", "date_joined", "created_at", "updated_at")
        }),
    )

    readonly_fields = ("date_joined", "created_at", "updated_at")
