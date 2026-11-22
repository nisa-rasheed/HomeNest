
from rest_framework import serializers
from ..models import (
    Category,
    Product,
    ProductVariant,
    ProductImage,
    ProductReview,
)


# ADMIN CATEGORY SERIALIZER
class AdminCategorySerializer(serializers.ModelSerializer):

    MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "image",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "slug",
            "created_at",
            "updated_at",
        ]

    # CATEGORY NAME VALIDATION
    def validate_name(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Category name cannot be empty."
            )

        if len(value) > 100:
            raise serializers.ValidationError(
                "Category name cannot exceed 100 characters."
            )

        queryset = Category.objects.filter(
            name__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A category with this name already exists."
            )

        return value

    # DESCRIPTION VALIDATION
    def validate_description(self, value):

        return value.strip()

    # IMAGE VALIDATION
    def validate_image(self, value):

        if not value:
            return value

        if value.size > self.MAX_IMAGE_SIZE:
            raise serializers.ValidationError(
                "Image size cannot exceed 5 MB."
            )

        return value

# ADMIN PRODUCT SERIALIZER
class AdminProductSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category",
            "rooms",
            "material",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "slug",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Product name cannot be empty."
            )

        queryset = Product.objects.filter(
            name__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A product with this name already exists."
            )

        return value

    def validate_category(self, value):
        if not value.is_active:
            raise serializers.ValidationError(
                "Cannot assign an inactive category."
            )

        return value

    def validate_rooms(self, value):
        for room in value:
            if not room.is_active:
                raise serializers.ValidationError(
                    "Cannot assign an inactive room."
                )

        return value



# ADMIN PRODUCT VARIANT SERIALIZER
class AdminProductVariantSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "product",
            "sku",
            "size",
            "color",
            "color_code",
            "price",
            "stock",
        ]

        read_only_fields = ["id"]

    def validate_sku(self, value):
        value = value.strip().upper()

        if not value:
            raise serializers.ValidationError(
                "SKU cannot be empty."
            )

        queryset = ProductVariant.objects.filter(
            sku__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "This SKU already exists."
            )

        return value

    def validate_color_code(self, value):
        value = value.strip().upper()

        import re

        if not re.fullmatch(r"#[0-9A-F]{6}", value):
            raise serializers.ValidationError(
                "Enter a valid HEX colour code (example: #9CAF88)."
            )

        return value

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Price must be greater than zero."
            )

        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Stock cannot be negative."
            )

        return value

    def validate_product(self, value):
        if not value.is_active:
            raise serializers.ValidationError(
                "Cannot add a variant to an inactive product."
            )

        return value

# ADMIN PRODUCT IMAGE SERIALIZER
class AdminProductImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductImage
        fields = [
            "id",
            "product",
            "variant",
            "image",
            "alt_text",
        ]

        read_only_fields = ["id"]

    def validate_alt_text(self, value):
        return value.strip()

    def validate(self, attrs):

        product = attrs.get(
            "product",
            self.instance.product if self.instance else None
        )

        variant = attrs.get(
            "variant",
            self.instance.variant if self.instance else None
        )

        if product and not product.is_active:
            raise serializers.ValidationError({
                "product": "Cannot add an image to an inactive product."
            })

        if variant and not variant.product.is_active:
            raise serializers.ValidationError({
                "variant": "Cannot add an image to an inactive product variant."
            })

        if product and variant and variant.product_id != product.id:
            raise serializers.ValidationError({
                "variant": "Selected variant does not belong to this product."
            })

        return attrs


# ADMIN PRODUCT LIST SERIALIZER
class AdminProductListSerializer(serializers.ModelSerializer):

    category = serializers.StringRelatedField()
    rooms = serializers.StringRelatedField(many=True)

    variants = AdminProductVariantSerializer(
        many=True,
        read_only=True
    )

    images = AdminProductImageSerializer(
        many=True,
        read_only=True
    )

    starting_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
        allow_null=True
    )

    total_stock = serializers.IntegerField(
        read_only=True
    )

    average_rating = serializers.FloatField(
        read_only=True,
        allow_null=True
    )

    review_count = serializers.IntegerField(
        read_only=True
    )

    class Meta:
        model = Product

        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category",
            "rooms",
            "material",
            "is_active",
            "starting_price",
            "total_stock",
            "average_rating",
            "review_count",
            "variants",
            "images",
            "created_at",
            "updated_at",
        ]


# ADMIN PRODUCT DETAIL SERIALIZER
class AdminProductDetailSerializer(serializers.ModelSerializer):

    category = serializers.StringRelatedField()
    rooms = serializers.StringRelatedField(many=True)

    variants = AdminProductVariantSerializer(
        many=True,
        read_only=True
    )

    images = AdminProductImageSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Product

        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category",
            "rooms",
            "material",
            "is_active",
            "variants",
            "images",
            "created_at",
            "updated_at",
        ]

# ADMIN PRODUCT REVIEW SERIALIZER
class AdminProductReviewSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(
        source="product.name",
        read_only=True
    )

    customer_name = serializers.CharField(
        source="user.full_name",
        read_only=True
    )

    customer_email = serializers.EmailField(
        source="user.email",
        read_only=True
    )

    class Meta:
        model = ProductReview

        fields = [
            "id",
            "product",
            "product_name",
            "user",
            "customer_name",
            "customer_email",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields