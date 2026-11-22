from django.urls import path

# CUSTOMER VIEWS
from .views.customer_views import (
    ProductListView,
    ProductDetailView,
    CategoryListView,
    RoomListView,
    ProductReviewListCreateView,
    ProductReviewDetailView,
)

# ADMIN VIEWS
from .views.admin_views import (
    AdminProductListCreateView,
    AdminProductDetailView,
    AdminProductStatusView,
    AdminProductVariantCreateView,
    AdminProductVariantDetailView,
    AdminProductImageCreateView,
    AdminProductImageDetailView,
    AdminCategoryListCreateView,
    AdminCategoryDetailView,
    AdminCategoryStatusView,
    AdminProductReviewListView,
    AdminInventoryListView,
    AdminInventoryStockUpdateView,
)


urlpatterns = [

    # CUSTOMER PRODUCT APIs
    path("", ProductListView.as_view(), name="product-list"),

    path("<int:pk>/", ProductDetailView.as_view(), name="product-detail"),

    path("rooms/", RoomListView.as_view(), name="room-list"),

    path("categories/", CategoryListView.as_view(), name="category-list"),

    # CUSTOMER REVIEW APIs
    path(
        "<int:product_id>/reviews/",
        ProductReviewListCreateView.as_view(),
        name="product-reviews"
    ),

    path(
        "reviews/<int:review_id>/",
        ProductReviewDetailView.as_view(),
        name="product-review-detail"
    ),

    # ADMIN PRODUCT APIs
    path(
        "admin/",
        AdminProductListCreateView.as_view(),
        name="admin-product-list-create"
    ),

    path(
        "admin/<int:pk>/",
        AdminProductDetailView.as_view(),
        name="admin-product-detail"
    ),

    path(
        "admin/<int:pk>/status/",
        AdminProductStatusView.as_view(),
        name="admin-product-status"
    ),

    # ADMIN VARIANT APIs
    path(
        "admin/variants/",
        AdminProductVariantCreateView.as_view(),
        name="admin-product-variant-create"
    ),

    path(
        "admin/variants/<int:pk>/",
        AdminProductVariantDetailView.as_view(),
        name="admin-product-variant-detail"
    ),

    # ADMIN IMAGE APIs
    path(
        "admin/images/",
        AdminProductImageCreateView.as_view(),
        name="admin-product-image-create"
    ),

    path(
        "admin/images/<int:pk>/",
        AdminProductImageDetailView.as_view(),
        name="admin-product-image-detail"
    ),
        # ADMIN CATEGORY APIs
    path(
        "admin/categories/",
        AdminCategoryListCreateView.as_view(),
        name="admin-category-list-create"
    ),

    path(
        "admin/categories/<int:pk>/",
        AdminCategoryDetailView.as_view(),
        name="admin-category-detail"
    ),

    path(
        "admin/categories/<int:pk>/status/",
        AdminCategoryStatusView.as_view(),
        name="admin-category-status"
    ),
    # ADMIN REVIEW API
    path(
        "admin/reviews/",
        AdminProductReviewListView.as_view(),
        name="admin-product-reviews"
    ),

    path(
        "admin/reviews/<int:review_id>/",
        AdminProductReviewListView.as_view(),
        name="admin-product-review-delete"
    ),
    
    path(
    "admin/inventory/",
    AdminInventoryListView.as_view(),
    name="admin-inventory-list"
    ),

    path(
    "admin/inventory/<int:pk>/stock/",
    AdminInventoryStockUpdateView.as_view(),
    name="admin-inventory-stock-update"
    ),

    ]