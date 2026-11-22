
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.core.paginator import Paginator, EmptyPage
from coupons.models import Coupon, CouponUsage
from coupons.serializers.admin_serializer import (
    AdminCouponSerializer
)


# ADMIN ACCESS CHECK

def check_admin_access(user):

    if not user.is_authenticated or user.role != "admin":
        raise PermissionDenied(
            "Only admins can manage coupons."
        )


# 1. ADMIN COUPON LIST AND CREATE

class AdminCouponListCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        check_admin_access(request.user)

        coupons = (
            Coupon.objects
            .annotate(
                actual_used_count=Count(
                    "usages",
                    distinct=True
                )
            )
            .order_by("-created_at")
        )

        # SEARCH
        search = request.query_params.get("search")

        if search:
            coupons = coupons.filter(
                Q(code__icontains=search)
                | Q(description__icontains=search)
            )

        # FILTER BY ACTIVE STATUS
        is_active = request.query_params.get("is_active")

        if is_active is not None:

            if is_active.lower() not in ["true", "false"]:
                return Response(
                    {"message": "Invalid active status."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            coupons = coupons.filter(
                is_active=is_active.lower() == "true"
            )

        # PAGINATION
        page_number = request.query_params.get("page", "1")
        page_size = request.query_params.get("page_size", "6")

        try:
            page_number = int(page_number)
            page_size = int(page_size)
        except (ValueError, TypeError):
            return Response(
                {"message": "Page and page_size must be integers."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if page_number < 1:
            return Response(
                {"message": "Page must be greater than 0."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if page_size != 6:
            return Response(
                {"message": "page_size must be 6."},
                status=status.HTTP_400_BAD_REQUEST
            )

        paginator = Paginator(coupons, page_size)

        try:
            page_obj = paginator.page(page_number)
        except EmptyPage:
            return Response(
                {"message": "Invalid page number."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AdminCouponSerializer(
            page_obj.object_list,
            many=True
        )

        data = []

        for coupon, coupon_data in zip(
            page_obj.object_list,
            serializer.data
        ):
            item = dict(coupon_data)
            item["actual_used_count"] = coupon.actual_used_count
            data.append(item)

        return Response(
            {
                "message": "Coupons fetched successfully.",
                "total_coupons": paginator.count,
                "total_pages": paginator.num_pages,
                "current_page": page_obj.number,
                "page_size": page_size,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "coupons": data
            },
            status=status.HTTP_200_OK
        )
    def post(self, request):

        check_admin_access(request.user)

        serializer = AdminCouponSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        coupon = serializer.save()

        return Response(
            {
                "message": "Coupon created successfully.",
                "coupon": AdminCouponSerializer(coupon).data
            },
            status=status.HTTP_201_CREATED
        )


# 2. ADMIN COUPON DETAIL, UPDATE AND DELETE

class AdminCouponDetailView(APIView):

    permission_classes = [IsAuthenticated]

    def get_coupon(self, pk):

        return get_object_or_404(
            Coupon.objects.annotate(
                actual_used_count=Count(
                    "usages",
                    distinct=True
                )
            ),
            pk=pk
        )

    def get(self, request, pk):

        check_admin_access(request.user)

        coupon = self.get_coupon(pk)

        data = AdminCouponSerializer(coupon).data

        data["actual_used_count"] = (
            coupon.actual_used_count
        )

        return Response(
            {
                "message": "Coupon details fetched successfully.",
                "coupon": data
            },
            status=status.HTTP_200_OK
        )

    def put(self, request, pk):

        check_admin_access(request.user)

        coupon = self.get_coupon(pk)

        serializer = AdminCouponSerializer(
            coupon,
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        coupon = serializer.save()

        return Response(
            {
                "message": "Coupon updated successfully.",
                "coupon": AdminCouponSerializer(coupon).data
            },
            status=status.HTTP_200_OK
        )

    def patch(self, request, pk):

        check_admin_access(request.user)

        coupon = self.get_coupon(pk)

        serializer = AdminCouponSerializer(
            coupon,
            data=request.data,
            partial=True
        )

        serializer.is_valid(
            raise_exception=True
        )

        coupon = serializer.save()

        return Response(
            {
                "message": "Coupon updated successfully.",
                "coupon": AdminCouponSerializer(coupon).data
            },
            status=status.HTTP_200_OK
        )

    def delete(self, request, pk):

        check_admin_access(request.user)

        coupon = self.get_coupon(pk)

        if (
            coupon.used_count > 0
            or coupon.usages.exists()
        ):
            return Response(
                {
                    "message": (
                        "This coupon has already been used. "
                        "It cannot be deleted. Deactivate it instead."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        coupon.delete()

        return Response(
            {
                "message": "Coupon deleted successfully."
            },
            status=status.HTTP_200_OK
        )


# 3. ADMIN COUPON USAGE HISTORY

class AdminCouponUsageView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):

        check_admin_access(request.user)

        coupon = get_object_or_404(
            Coupon,
            pk=pk
        )

        usages = (
            CouponUsage.objects
            .filter(coupon=coupon)
            .select_related("user", "order")
            .order_by("-used_at")
        )

        data = []

        for usage in usages:

            data.append({
                "id": usage.id,
                "customer_id": usage.user.id,
                "customer_name": getattr(
                    usage.user,
                    "full_name",
                    ""
                ),
                "customer_email": usage.user.email,
                "order_id": (
                    usage.order_id
                    if usage.order_id
                    else None
                ),
                "used_at": usage.used_at
            })

        return Response(
            {
                "message": "Coupon usage history fetched successfully.",
                "coupon": {
                    "id": coupon.id,
                    "code": coupon.code,
                    "usage_limit": coupon.usage_limit,
                    "used_count": coupon.used_count,
                    "actual_used_count": len(data)
                },
                "total_customers": len(data),
                "usages": data
            },
            status=status.HTTP_200_OK
        )
