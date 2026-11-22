
from rest_framework import serializers
from .models import Wishlist, WishlistItem
from products.models import Product
from products.serializers.customer_serializers import ProductListSerializer


class WishlistItemSerializer(serializers.ModelSerializer):

    product = ProductListSerializer(read_only=True)

    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source="product",
        write_only=True
    )

    class Meta:
        model = WishlistItem
        fields = [
            "id",
            "product",
            "product_id",
            "created_at",
        ]

    def validate(self, attrs):
        wishlist = self.context.get("wishlist")
        product = attrs.get("product")

        if wishlist and WishlistItem.objects.filter(
            wishlist=wishlist,
            product=product
        ).exists():
            raise serializers.ValidationError(
                {"product_id": "This product is already in your wishlist."}
            )

        return attrs


class WishlistSerializer(serializers.ModelSerializer):

    items = WishlistItemSerializer(many=True, read_only=True)

    class Meta:
        model = Wishlist
        fields = [
            "id",
            "user",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
