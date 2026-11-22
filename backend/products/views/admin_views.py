from decimal import Decimal, InvalidOperation

from django.db.models import (
    Min,
    Avg,
    Count,
    Sum,
    Q,
    OuterRef,
    Subquery,
    Value,
    IntegerField,
    F,
)
from django.db import transaction
from django.db.models import ProtectedError
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from accounts.permission import IsAdminRole
from ..models import Product, ProductVariant, ProductImage,Category,ProductReview
from ..serializers.admin_serializers import (
    AdminProductSerializer,
    AdminProductListSerializer,
    AdminProductDetailSerializer,
    AdminProductVariantSerializer,
    AdminProductImageSerializer,
    AdminCategorySerializer,
    AdminProductReviewSerializer,
)


# LOW STOCK LIMIT
LOW_STOCK_THRESHOLD = 5


# ADMIN PRODUCT PAGINATION
class AdminProductPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 10


# COMMON PRODUCT QUERYSET
def get_admin_products():

    stock_subquery = (
        ProductVariant.objects.filter(
            product=OuterRef("pk")
        )
        .values("product")
        .annotate(
            stock_total=Sum("stock")
        )
        .values("stock_total")[:1]
    )

    return Product.objects.annotate(
        starting_price=Min("variants__price"),
        average_rating=Avg("reviews__rating"),
        review_count=Count("reviews", distinct=True),

        total_stock=Coalesce(
            Subquery(stock_subquery),
            Value(0),
            output_field=IntegerField()
        )
    )


# ADMIN PRODUCT LIST AND CREATE API
class AdminProductListCreateView(APIView):

    permission_classes = [IsAdminRole]

    def get(self, request):

        products = get_admin_products()

        # SEARCH
        search = request.query_params.get("search", "").strip()

        if search:
            products = products.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(category__name__icontains=search) |
                Q(rooms__name__icontains=search) |
                Q(variants__sku__icontains=search)
            ).distinct()

        # ACTIVE / INACTIVE FILTER
        product_status = request.query_params.get("status")

        if product_status == "active":
            products = products.filter(is_active=True)

        elif product_status == "inactive":
            products = products.filter(is_active=False)

        # CATEGORY FILTER
        category = request.query_params.get("category")

        if category:
            products = products.filter(
                category__slug=category
            )

        # ROOM FILTER
        room = request.query_params.get("room")

        if room:
            products = products.filter(
                rooms__slug=room
            )

                # MINIMUM PRICE FILTER
        min_price = request.query_params.get("min_price")

        if min_price not in (None, ""):
            try:
                min_price = Decimal(min_price)

                if not min_price.is_finite() or min_price < 0:
                    raise InvalidOperation

                products = products.filter(
                    starting_price__gte=min_price
                )

            except (InvalidOperation, ValueError):
                return Response(
                    {"message": "Please enter a valid minimum price."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
                # MAXIMUM PRICE FILTER
        max_price = request.query_params.get("max_price")

        if max_price not in (None, ""):
            try:
                max_price = Decimal(max_price)

                if not max_price.is_finite() or max_price < 0:
                    raise InvalidOperation

                products = products.filter(
                    starting_price__lte=max_price
                )

            except (InvalidOperation, ValueError):
                return Response(
                    {"message": "Please enter a valid maximum price."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        # PRICE RANGE VALIDATION
        if (
            min_price not in (None, "") and
            max_price not in (None, "") and
            min_price > max_price
        ):
            return Response(
                {"message": "Minimum price cannot exceed maximum price."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # STOCK FILTER
        stock_status = request.query_params.get("stock")

        if stock_status == "in_stock":
            products = products.filter(
                total_stock__gt=0
            )

        elif stock_status == "out_of_stock":
            products = products.filter(
                total_stock=0
            )

        elif stock_status == "low_stock":
            products = products.filter(
                total_stock__gt=0,
                total_stock__lte=LOW_STOCK_THRESHOLD
            )

        # SORTING
        sort = request.query_params.get("sort")

        if sort == "price_low":
            products = products.order_by("starting_price", "id")

        elif sort == "price_high":
            products = products.order_by("-starting_price", "id")

        elif sort == "newest":
            products = products.order_by("-created_at")

        elif sort == "oldest":
            products = products.order_by("created_at")

        elif sort == "rating_high":
            products = products.order_by(
                F("average_rating").desc(nulls_last=True),
                "id"
            )

        elif sort == "stock_low":
            products = products.order_by("total_stock", "id")

        else:
            products = products.order_by("-created_at")

        # PAGINATION
        paginator = AdminProductPagination()

        paginated_products = paginator.paginate_queryset(
            products,
            request
        )

        serializer = AdminProductListSerializer(
            paginated_products,
            many=True
        )

        return paginator.get_paginated_response(
            serializer.data
        )

    # CREATE PRODUCT
    def post(self, request):

        serializer = AdminProductSerializer(
            data=request.data
        )

        if serializer.is_valid():

            product = serializer.save()

            return Response(
                {
                    "message": "Product created successfully.",
                    "product": AdminProductDetailSerializer(product).data
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# ADMIN PRODUCT DETAIL, UPDATE AND DEACTIVATE API
class AdminProductDetailView(APIView):

    permission_classes = [IsAdminRole]

    def get_product(self, pk):

        return get_object_or_404(
            Product,
            pk=pk
        )

    # GET PRODUCT DETAILS
    def get(self, request, pk):

        product = self.get_product(pk)

        product = get_admin_products().get(pk=product.pk)

        serializer = AdminProductDetailSerializer(product)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    # UPDATE PRODUCT
    def put(self, request, pk):

        product = self.get_product(pk)

        serializer = AdminProductSerializer(
            product,
            data=request.data
        )

        if serializer.is_valid():

            product = serializer.save()

            return Response(
                {
                    "message": "Product updated successfully.",
                    "product": AdminProductDetailSerializer(product).data
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # PARTIAL UPDATE PRODUCT
    def patch(self, request, pk):

        product = self.get_product(pk)

        serializer = AdminProductSerializer(
            product,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            product = serializer.save()

            return Response(
                {
                    "message": "Product updated successfully.",
                    "product": AdminProductDetailSerializer(product).data
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # SAFE DELETE - DEACTIVATE PRODUCT
    def delete(self, request, pk):

        product = self.get_product(pk)

        if not product.is_active:
            return Response(
                {"message": "Product is already inactive."},
                status=status.HTTP_400_BAD_REQUEST
            )

        product.is_active = False
        product.save(update_fields=["is_active", "updated_at"])

        return Response(
            {
                "message": "Product deactivated successfully. "
                           "Product history has been preserved."
            },
            status=status.HTTP_200_OK
        )


# ADMIN ACTIVATE / DEACTIVATE PRODUCT API
class AdminProductStatusView(APIView):

    permission_classes = [IsAdminRole]

    def patch(self, request, pk):

        product = get_object_or_404(
            Product,
            pk=pk
        )

        is_active = request.data.get("is_active")

        if not isinstance(is_active, bool):
            return Response(
                {"message": "is_active must be true or false."},
                status=status.HTTP_400_BAD_REQUEST
            )

        product.is_active = is_active
        product.save(update_fields=["is_active", "updated_at"])

        return Response(
            {
                "message": (
                    "Product activated successfully."
                    if is_active
                    else "Product deactivated successfully."
                ),
                "is_active": product.is_active
            },
            status=status.HTTP_200_OK
        )


# ADMIN CREATE PRODUCT VARIANT API
class AdminProductVariantCreateView(APIView):

    permission_classes = [IsAdminRole]

    def post(self, request):

        serializer = AdminProductVariantSerializer(
            data=request.data
        )

        if serializer.is_valid():

            variant = serializer.save()

            return Response(
                {
                    "message": "Product variant created successfully.",
                    "variant": serializer.data
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# ADMIN UPDATE / DELETE PRODUCT VARIANT API
class AdminProductVariantDetailView(APIView):

    permission_classes = [IsAdminRole]

    def get_variant(self, pk):

        return get_object_or_404(
            ProductVariant,
            pk=pk
        )

    # UPDATE VARIANT
    def put(self, request, pk):

        variant = self.get_variant(pk)

        serializer = AdminProductVariantSerializer(
            variant,
            data=request.data
        )

        if serializer.is_valid():

            serializer.save()

            return Response(
                {
                    "message": "Product variant updated successfully.",
                    "variant": serializer.data
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # PARTIAL UPDATE VARIANT
    def patch(self, request, pk):

        variant = self.get_variant(pk)

        serializer = AdminProductVariantSerializer(
            variant,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return Response(
                {
                    "message": "Product variant updated successfully.",
                    "variant": serializer.data
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):

        variant = self.get_variant(pk)

        # Check whether variant exists in any cart
        if variant.cart_items.exists():
            return Response(
                {
                    "message": (
                        "This variant cannot be deleted because "
                        "it is already added to customer carts."
                    )
                },
                 status=status.HTTP_400_BAD_REQUEST
            )

        variant.delete()

        return Response(
            {
                "message": "Product variant deleted successfully."
            },
            status=status.HTTP_200_OK
        )


# ADMIN UPLOAD PRODUCT IMAGE API
class AdminProductImageCreateView(APIView):

    permission_classes = [IsAdminRole]

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):

        serializer = AdminProductImageSerializer(
            data=request.data
        )

        if serializer.is_valid():

            image = serializer.save()

            return Response(
                {
                    "message": "Product image uploaded successfully.",
                    "image": AdminProductImageSerializer(image).data
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# ADMIN DELETE PRODUCT IMAGE API
class AdminProductImageDetailView(APIView):

    permission_classes = [IsAdminRole]

    def delete(self, request, pk):

        image = get_object_or_404(
            ProductImage,
            pk=pk
        )

        image.delete()

        return Response(
            {"message": "Product image deleted successfully."},
            status=status.HTTP_200_OK
        )
        
  


# ADMIN CATEGORY LIST AND CREATE API
class AdminCategoryListCreateView(APIView):

    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser]

    # LIST CATEGORIES
    def get(self, request):

        categories = Category.objects.all().order_by("-created_at")

        search = request.query_params.get("search", "").strip()

        if search:
            categories = categories.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )

        category_status = request.query_params.get("status")

        if category_status == "active":
            categories = categories.filter(is_active=True)

        elif category_status == "inactive":
            categories = categories.filter(is_active=False)

        serializer = AdminCategorySerializer(
            categories,
            many=True
        )

        return Response(
            {
                "count": categories.count(),
                "categories": serializer.data
            },
            status=status.HTTP_200_OK
        )

    # CREATE CATEGORY
    def post(self, request):

        serializer = AdminCategorySerializer(
            data=request.data
        )

        if serializer.is_valid():

            category = serializer.save()

            return Response(
                {
                    "message": "Category created successfully.",
                    "category": AdminCategorySerializer(category).data
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# ADMIN CATEGORY DETAIL, UPDATE AND DELETE API
class AdminCategoryDetailView(APIView):

    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser]

    def get_category(self, pk):

        return get_object_or_404(
            Category,
            pk=pk
        )

    # GET CATEGORY DETAILS
    def get(self, request, pk):

        category = self.get_category(pk)

        serializer = AdminCategorySerializer(category)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    # UPDATE CATEGORY
    def put(self, request, pk):

        category = self.get_category(pk)

        serializer = AdminCategorySerializer(
            category,
            data=request.data
        )

        if serializer.is_valid():

            category = serializer.save()

            return Response(
                {
                    "message": "Category updated successfully.",
                    "category": AdminCategorySerializer(category).data
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # PARTIAL UPDATE CATEGORY
    def patch(self, request, pk):

        category = self.get_category(pk)

        serializer = AdminCategorySerializer(
            category,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            category = serializer.save()

            return Response(
                {
                    "message": "Category updated successfully.",
                    "category": AdminCategorySerializer(category).data
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # DELETE CATEGORY
    def delete(self, request, pk):

        category = self.get_category(pk)

        if category.products.exists():
            return Response(
                {
                    "message": (
                        "This category cannot be deleted because "
                        "products are assigned to it. "
                        "Deactivate the category instead."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        category.delete()

        return Response(
            {
                "message": "Category deleted successfully."
            },
            status=status.HTTP_200_OK
        )


# ADMIN CATEGORY ACTIVATE / DEACTIVATE API
class AdminCategoryStatusView(APIView):

    permission_classes = [IsAdminRole]

    def patch(self, request, pk):

        category = get_object_or_404(
            Category,
            pk=pk
        )

        is_active = request.data.get("is_active")

        if not isinstance(is_active, bool):
            return Response(
                {
                    "message": "is_active must be true or false."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if category.is_active == is_active:
            return Response(
                {
                    "message": (
                        "Category is already active."
                        if is_active
                        else "Category is already inactive."
                    ),
                    "is_active": category.is_active
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        category.is_active = is_active
        category.save(update_fields=["is_active", "updated_at"])

        return Response(
            {
                "message": (
                    "Category activated successfully."
                    if is_active
                    else "Category deactivated successfully."
                ),
                "is_active": category.is_active
            },
            status=status.HTTP_200_OK
        )
  
# ADMIN PRODUCT REVIEW LIST AND DELETE API
class AdminProductReviewListView(APIView):

    permission_classes = [IsAdminRole]
    pagination_class = AdminProductPagination

    # LIST ALL PRODUCT REVIEWS
    def get(self, request):

        reviews = ProductReview.objects.select_related(
            "product",
            "user"
        ).all()

        # SEARCH
        search = request.query_params.get("search", "").strip()

        if search:
            reviews = reviews.filter(
                Q(product__name__icontains=search) |
                Q(user__full_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(comment__icontains=search)
            )

        # PRODUCT FILTER
        product_id = request.query_params.get("product")

        if product_id:
            reviews = reviews.filter(product_id=product_id)

        # RATING FILTER
        rating = request.query_params.get("rating")

        if rating:
            if rating not in ["1", "2", "3", "4", "5"]:
                return Response(
                    {"message": "Rating must be between 1 and 5."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            reviews = reviews.filter(rating=int(rating))

        # PAGINATION
        paginator = self.pagination_class()

        paginated_reviews = paginator.paginate_queryset(
            reviews,
            request
        )

        serializer = AdminProductReviewSerializer(
            paginated_reviews,
            many=True
        )

        return paginator.get_paginated_response(
            serializer.data
        )

    # DELETE REVIEW
    def delete(self, request, review_id):

        review = get_object_or_404(
            ProductReview,
            pk=review_id
        )

        review.delete()

        return Response(
            {"message": "Review deleted successfully."},
            status=status.HTTP_200_OK
        )        
        

# ==========================================
# ADMIN INVENTORY MANAGEMENT
# ==========================================

class AdminInventoryListView(APIView):

    permission_classes = [IsAdminRole]

    def get(self, request):

        variants = ProductVariant.objects.select_related(
            "product",
            "product__category"
        ).order_by("stock", "id")

        # SEARCH
        search = request.query_params.get("search", "").strip()

        if search:
            variants = variants.filter(
                Q(product__name__icontains=search) |
                Q(sku__icontains=search) |
                Q(product__category__name__icontains=search)
            )

        # STOCK FILTER
        stock_status = request.query_params.get("stock")

        if stock_status == "in_stock":
            variants = variants.filter(stock__gt=0)

        elif stock_status == "out_of_stock":
            variants = variants.filter(stock=0)

        elif stock_status == "low_stock":
            variants = variants.filter(
                stock__gt=0,
                stock__lte=LOW_STOCK_THRESHOLD
            )

        elif stock_status not in (None, ""):
            return Response(
                {"message": "Invalid stock filter."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # PAGINATION
        paginator = AdminProductPagination()

        paginated_variants = paginator.paginate_queryset(
            variants,
            request
        )

        inventory = []

        for variant in paginated_variants:

            inventory.append({
                "variant_id": variant.id,
                "product_id": variant.product_id,
                "product_name": variant.product.name,
                "category": variant.product.category.name,
                "sku": variant.sku,
                "size": variant.size,
                "color": variant.color,
                "price": str(variant.price),
                "stock": variant.stock,
                "stock_status": (
                    "out_of_stock" if variant.stock == 0
                    else "low_stock" if variant.stock <= LOW_STOCK_THRESHOLD
                    else "in_stock"
                )
            })

        return paginator.get_paginated_response(inventory)


# ==========================================
# ADMIN INVENTORY STOCK UPDATE
# ==========================================

class AdminInventoryStockUpdateView(APIView):

    permission_classes = [IsAdminRole]

    def patch(self, request, pk):

        new_stock = request.data.get("stock")

        if (
            isinstance(new_stock, bool) or
            not isinstance(new_stock, int) or
            new_stock < 0
        ):
            return Response(
                {
                    "message": "Stock must be a non-negative integer."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():

            variant = ProductVariant.objects.select_for_update().filter(
                pk=pk
            ).first()

            if variant is None:
                return Response(
                    {"message": "Product variant not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            previous_stock = variant.stock

            variant.stock = new_stock

            variant.save(
                update_fields=["stock"]
            )

        return Response(
            {
                "message": "Inventory stock updated successfully.",
                "variant_id": variant.id,
                "product_name": variant.product.name,
                "sku": variant.sku,
                "previous_stock": previous_stock,
                "stock": variant.stock
            },
            status=status.HTTP_200_OK
        )
        