from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Wishlist, WishlistItem
from .serializer import WishlistItemSerializer


class WishlistListCreateView(generics.ListCreateAPIView):

    serializer_class = WishlistItemSerializer
    permission_classes = [IsAuthenticated]

    def get_wishlist(self):
        wishlist, created = Wishlist.objects.get_or_create(
            user=self.request.user
        )
        return wishlist

    def get_queryset(self):
        return WishlistItem.objects.filter(
            wishlist=self.get_wishlist()
        ).select_related("product", "wishlist")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["wishlist"] = self.get_wishlist()
        return context

    def perform_create(self, serializer):
        serializer.save(wishlist=self.get_wishlist())


class WishlistRemoveView(generics.DestroyAPIView):

    serializer_class = WishlistItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WishlistItem.objects.filter(
            wishlist__user=self.request.user
        )

