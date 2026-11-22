
from django.contrib import admin
from .models import (
    Room,
    Category,
    Product,
    ProductVariant,
    ProductImage,
    ProductReview,
)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    search_fields = ("name",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    search_fields = ("name",)
    list_filter = ("is_active",)


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category","tax_percentage", "is_active", "created_at")
    search_fields = ("name", "category__name")
    list_filter = ("category", "rooms", "is_active")
    filter_horizontal = ("rooms",)
    inlines = [ProductVariantInline, ProductImageInline]


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "rating", "created_at")
    search_fields = ("product__name",)
