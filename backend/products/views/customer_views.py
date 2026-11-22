from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny,IsAuthenticated
from rest_framework import status
from django.db.models import Min, Q, Avg, Count,F
from rest_framework.pagination import PageNumberPagination
from ..models import Product,Category,Room,ProductReview
from ..serializers.customer_serializers import (
    ProductListSerializer,
    ProductDetailSerializer,
    CategorySerializer,
    RoomSerializer,
    ProductReviewSerializer,
)
from decimal import Decimal, InvalidOperation




# PRODUCT PAGINATION
class ProductPagination(PageNumberPagination):
    page_size = 6
    page_size_query_param = "page_size"
    max_page_size = 20
    

# PRODUCT LIST API
class ProductListView(APIView):

    permission_classes = [AllowAny]

    def get(self, request):

        products = Product.objects.filter(
                is_active=True,
                category__is_active=True
            )

        # SEARCH
        search = request.query_params.get("search", "").strip()

        if search:
            products = products.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(category__name__icontains=search) |
                Q(rooms__name__icontains=search)
            ).distinct()

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
            ).distinct()

        # STARTING PRICE AND PRODUCT REVIEWS
        products = products.annotate(
            starting_price=Min("variants__price"),
            average_rating=Avg("reviews__rating"),
            review_count=Count("reviews", distinct=True)
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

            except InvalidOperation:
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

            except InvalidOperation:
                return Response(
                    {"message": "Please enter a valid maximum price."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # PRICE RANGE VALIDATION
        if (
            min_price not in (None, "")
            and max_price not in (None, "")
            and min_price > max_price
        ):
            return Response(
                {"message": "Minimum price cannot exceed maximum price."},
                status=status.HTTP_400_BAD_REQUEST
            )

        
        # SORTING
        sort = request.query_params.get("sort")

        if sort == "price_low":
            products = products.order_by("starting_price")

        elif sort == "price_high":
            products = products.order_by("-starting_price")

        elif sort == "highest_rated":
            products = products.order_by(
                F("average_rating").desc(nulls_last=True),
                F("review_count").desc(nulls_last=True),
                "-created_at"
            )

        elif sort == "newest":
            products = products.order_by("-created_at")


        # PAGINATION
        paginator = ProductPagination()

        paginated_products = paginator.paginate_queryset(
            products,
            request
        )

        # SERIALIZER
        serializer = ProductListSerializer(
            paginated_products,
            many=True
        )

        return paginator.get_paginated_response(serializer.data)

# PRODUCT DETAIL API
class ProductDetailView(APIView):

    permission_classes = [AllowAny]

    def get(self, request, pk):

        try:
            product = Product.objects.get(
                    id=pk,
                    is_active=True,
                    category__is_active=True
                )

        except Product.DoesNotExist:
            return Response(
                {"message": "Product not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProductDetailSerializer(product)

        return Response(
            {
                "message": "Product details fetched successfully.",
                "product": serializer.data
            },
            status=status.HTTP_200_OK
        ) 
# CATEGORY LIST API
class CategoryListView(APIView):

    permission_classes = [AllowAny]

    def get(self, request):

        categories = Category.objects.filter(is_active=True)

        serializer = CategorySerializer(
            categories,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


# ROOM LIST API
class RoomListView(APIView):

    permission_classes = [AllowAny]

    def get(self, request):

        rooms = Room.objects.filter(is_active=True)

        serializer = RoomSerializer(
            rooms,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
# PRODUCT REVIEW LIST AND CREATE API
class ProductReviewListCreateView(APIView):

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request, product_id):

        reviews = ProductReview.objects.filter(
            product_id=product_id,
            product__is_active=True
        ).select_related("user")

        serializer = ProductReviewSerializer(
            reviews,
            many=True,
            context={"request": request}
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    def post(self, request, product_id):

        if request.user.role != "customer":
            return Response(
                {"message": "Only customers can submit reviews."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            product = Product.objects.get(
                id=product_id,
                is_active=True,
                category__is_active=True
            )
        except Product.DoesNotExist:
            return Response(
                {"message": "Product not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if ProductReview.objects.filter(
            product=product,
            user=request.user
        ).exists():
            return Response(
                {"message": "You have already reviewed this product."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ProductReviewSerializer(
            data=request.data,
            context={"request": request}
        )

        if serializer.is_valid():
            serializer.save(
                product=product,
                user=request.user
            )

            return Response(
                {
                    "message": "Review submitted successfully.",
                    "review": serializer.data
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )                   
        
# PRODUCT REVIEW DETAIL, UPDATE AND DELETE API
class ProductReviewDetailView(APIView):

    permission_classes = [IsAuthenticated]

    def get_review(self, review_id):
        try:
            return ProductReview.objects.get(
                id=review_id,
                user=self.request.user
            )
        except ProductReview.DoesNotExist:
            return None

    def patch(self, request, review_id):

        if request.user.role != "customer":
            return Response(
                {"message": "Only customers can edit reviews."},
                status=status.HTTP_403_FORBIDDEN
            )

        review = self.get_review(review_id)

        if not review:
            return Response(
                {"message": "Review not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProductReviewSerializer(
            review,
            data=request.data,
            partial=True,
            context={"request": request}
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                {
                    "message": "Review updated successfully.",
                    "review": serializer.data
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, review_id):

        if request.user.role != "customer":
            return Response(
                {"message": "Only customers can delete reviews."},
                status=status.HTTP_403_FORBIDDEN
            )

        review = self.get_review(review_id)

        if not review:
            return Response(
                {"message": "Review not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        review.delete()

        return Response(
            {"message": "Review deleted successfully."},
            status=status.HTTP_200_OK
        )  
        
