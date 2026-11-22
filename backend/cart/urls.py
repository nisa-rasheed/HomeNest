from django.urls import path
from .views import (
    CartView,
    AddToCartView,
    CartItemUpdateView,
    CartItemRemoveView,
)

urlpatterns = [
    path("", CartView.as_view(), name="cart"),
    path("add/", AddToCartView.as_view(), name="add-to-cart"),
    path(
        "update/<int:item_id>/",
        CartItemUpdateView.as_view(),
        name="update-cart-item"
    ),
    path(
        "remove/<int:item_id>/",
        CartItemRemoveView.as_view(),
        name="remove-cart-item"
    ),
]