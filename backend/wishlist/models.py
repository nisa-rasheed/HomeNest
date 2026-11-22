
from django.db import models
from django.conf import settings
from products.models import Product


class Wishlist(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "wishlist"

    def __str__(self):
        return f"{self.user.email}'s Wishlist"


class WishlistItem(models.Model):
    wishlist = models.ForeignKey(
        Wishlist,
        on_delete=models.CASCADE,
        related_name="items"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="wishlist_items"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "wishlist_item"
        unique_together = ("wishlist", "product")

    def __str__(self):
        return f"{self.product} - {self.wishlist}"

