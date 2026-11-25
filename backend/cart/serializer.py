
from rest_framework import serializers
from .models import Cart, CartItem
from products.models import ProductVariant


# CART ITEM RESPONSE

# CART ITEM RESPONSE
class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="variant.product.name",
        read_only=True
    )

    price = serializers.DecimalField(
        source="variant.price",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    size = serializers.CharField(
        source="variant.size",
        read_only=True
    )

    color = serializers.CharField(
        source="variant.color",
        read_only=True
    )

    product_image = serializers.SerializerMethodField()

    total_price = serializers.ReadOnlyField()

    def get_product_image(self, obj):
        image = obj.variant.images.first()

        if not image:
            image = obj.variant.product.images.filter(
            variant__isnull=True
            ).first()

        if image and image.image:
            return image.image.url

        return None

    class Meta:
        model = CartItem
        fields = [
            "id",
            "variant",
            "product_name",
            "product_image",
            "size",
            "color",
            "price",
            "quantity",
            "total_price",
        ]

# ADD TO CART VALIDATION
class AddToCartSerializer(serializers.Serializer):
    variant = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.select_related(
            "product__category"
        )
    )
    quantity = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        variant = attrs["variant"]
        quantity = attrs["quantity"]

        if not variant.product.is_active:
            raise serializers.ValidationError(
                "This product is not available."
            )

        if not variant.product.category.is_active:
            raise serializers.ValidationError(
                "This product category is not available."
            )

        if variant.stock <= 0:
            raise serializers.ValidationError(
                "This product is out of stock."
            )

        if quantity > variant.stock:
            raise serializers.ValidationError(
                f"Only {variant.stock} items are available."
            )

        return attrs


# CART RESPONSE
class CartSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    def get_items(self, obj):
        cart_items = obj.items.all().order_by("added_at", "id")
        return CartItemSerializer(
            cart_items,
            many=True,
            context=self.context
        ).data

    class Meta:
        model = Cart
        fields = [
            "id",
            "shipping_charge",
            "items",
            "created_at",
            "updated_at",
        ]
