from rest_framework import serializers
from ..models import Room, Category, Product, ProductVariant, ProductImage,ProductReview

# ROOM SERIALIZER
class RoomSerializer(serializers.ModelSerializer):

    class Meta:
        model = Room
        fields = "__all__"
        read_only_fields = ["slug"]
        
# CATEGORY SERIALIZER
class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = "__all__"
        read_only_fields = ["slug", "created_at", "updated_at"]
    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Category name cannot be empty."
            )

        return value

    


# PRODUCT SERIALIZER
class ProductSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ["slug", "created_at", "updated_at"]
        
    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Product name cannot be empty."
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

# PRODUCT VARIANT SERIALIZER
class ProductVariantSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductVariant
        fields = "__all__"

    def validate_sku(self, value):
        value = value.strip().upper()

        if not value:
            raise serializers.ValidationError(
                "SKU cannot be empty."
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


# PRODUCT IMAGE SERIALIZER
class ProductImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductImage
        fields = "__all__"

    def validate_alt_text(self, value):
        return value.strip()

    def validate(self, attrs):
        product = attrs.get(
            "product",
            getattr(self.instance, "product", None)
        )

        variant = attrs.get(
            "variant",
            getattr(self.instance, "variant", None)
        )

        if product and not product.is_active:
            raise serializers.ValidationError({
                "product": "Cannot add an image to an inactive product."
            })

        if variant and product and variant.product_id != product.id:
            raise serializers.ValidationError({
                "variant": "Selected variant does not belong to this product."
            })

        return attrs
# PRODUCT LIST SERIALIZER
class ProductListSerializer(serializers.ModelSerializer):

    category = serializers.StringRelatedField()
    rooms = serializers.StringRelatedField(many=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

    starting_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
        allow_null=True
    )

    # PRODUCT RATING
    average_rating = serializers.FloatField(
        read_only=True,
        allow_null=True
    )

    # TOTAL REVIEWS
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
            "starting_price",
            "average_rating",
            "review_count",
            "variants",
            "images",
        ]
        
# PRODUCT DETAIL SERIALIZER
class ProductDetailSerializer(serializers.ModelSerializer):

    category = serializers.StringRelatedField()
    rooms = serializers.StringRelatedField(many=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

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
            "variants",
            "images",
            "created_at",
        ]    
        
# PRODUCT REVIEW SERIALIZER
class ProductReviewSerializer(serializers.ModelSerializer):

    user_name = serializers.CharField(
        source="user.full_name",
        read_only=True
    )
    is_owner = serializers.SerializerMethodField()
    comment = serializers.CharField(
        max_length=1000,
        trim_whitespace=True
    )
    class Meta:
        model = ProductReview
        fields = [
            "id",
            "product",
            "user",
            "user_name",
            "is_owner",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "product",
            "user",
            "user_name",
            "created_at",
            "updated_at",
        ]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5."
            )

        return value

    def validate_comment(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Review comment cannot be empty."
            )
        if len(value) > 1000:
            raise serializers.ValidationError(
                "Review comment cannot exceed 1000 characters."
            )    

        return value   
    def get_is_owner(self, obj):
        request = self.context.get("request")

        if request and request.user.is_authenticated:
            return obj.user_id == request.user.id

        return False         