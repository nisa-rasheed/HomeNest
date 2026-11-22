
from django.urls import path
from .views import (
    WishlistListCreateView,
    WishlistRemoveView,
)

urlpatterns = [
    path("", WishlistListCreateView.as_view(), name="wishlist"),
    path(
        "<int:pk>/",
        WishlistRemoveView.as_view(),
        name="wishlist-remove"
    ),
]
