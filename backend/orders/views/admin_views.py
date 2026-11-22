
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.core.paginator import Paginator, EmptyPage
from django.utils.dateparse import parse_date
from wallet.models import Wallet, WalletTransaction
from products.models import ProductVariant

from orders.models import (
    Order,
    OrderItem,
    OrderTracking,
    ReturnRequest,
    ReturnRequestGroup,
)

from orders.serializers.admin_serializer import (
    AdminOrderListSerializer,
    AdminOrderDetailSerializer,
    AdminReturnRequestListSerializer,
    AdminReturnRequestDetailSerializer,
    AdminReturnApproveSerializer,
    AdminReturnRejectSerializer,
)


# ==========================================
# ADMIN ACCESS CHECK
# ==========================================

class AdminOnlyAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def check_admin_access(self, request):

        if request.user.role != "admin":
            return Response(
                {"message": "Only admins can access this resource."},
                status=status.HTTP_403_FORBIDDEN
            )

        return None



# ==========================================
# ADMIN ORDER LIST VIEW
# ==========================================

class AdminOrderListView(AdminOnlyAPIView):

    def get(self, request):

        access_error = self.check_admin_access(request)

        if access_error:
            return access_error

        # BASE QUERYSET - NEWEST FIRST

        orders = Order.objects.select_related(
            "user",
            "coupon"
        ).prefetch_related(
            "items"
        ).order_by("-created_at")

        # ======================================
        # 1. SEARCH
        # ======================================

        search_query = request.query_params.get(
            "search", ""
        ).strip()

        if search_query:

            search_filter = (
                Q(user__full_name__icontains=search_query)
                | Q(user__email__icontains=search_query)
            )

            if search_query.isdigit():
                search_filter |= Q(id=int(search_query))

            orders = orders.filter(search_filter)

        # ======================================
        # 2. STATUS FILTER
        # ======================================

        order_status = request.query_params.get("status")

        if order_status:

            valid_statuses = [
                choice[0]
                for choice in Order.Status.choices
            ]

            if order_status not in valid_statuses:
                return Response(
                    {"message": "Invalid order status."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            orders = orders.filter(status=order_status)

        # ======================================
        # 3. PAYMENT METHOD FILTER
        # ======================================

        payment_method = request.query_params.get(
            "payment_method"
        )

        if payment_method:

            valid_methods = [
                choice[0]
                for choice in Order.PaymentMethod.choices
            ]

            if payment_method not in valid_methods:
                return Response(
                    {"message": "Invalid payment method."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            orders = orders.filter(
                payment_method=payment_method
            )

        # ======================================
        # 4. PAYMENT STATUS FILTER
        # ======================================

        payment_status = request.query_params.get(
            "payment_status"
        )

        if payment_status:

            valid_payment_statuses = [
                choice[0]
                for choice in Order.PaymentStatus.choices
            ]

            if payment_status not in valid_payment_statuses:
                return Response(
                    {"message": "Invalid payment status."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            orders = orders.filter(
                payment_status=payment_status
            )

        # ======================================
        # 5. DATE RANGE FILTER
        # ======================================

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        if date_from:

            parsed_date_from = parse_date(date_from)

            if parsed_date_from is None:
                return Response(
                    {"message": "Invalid date_from format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            orders = orders.filter(
                created_at__date__gte=parsed_date_from
            )

        if date_to:

            parsed_date_to = parse_date(date_to)

            if parsed_date_to is None:
                return Response(
                    {"message": "Invalid date_to format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            orders = orders.filter(
                created_at__date__lte=parsed_date_to
            )

        if date_from and date_to:

            if parsed_date_from > parsed_date_to:
                return Response(
                    {"message": "date_from cannot be after date_to."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # ======================================
        # 6. SORTING
        # ======================================

        sort_option = request.query_params.get(
            "sort", "newest"
        )

        sort_options = {
            "newest": "-created_at",
            "oldest": "created_at",
            "amount_high": "-final_amount",
            "amount_low": "final_amount",
        }

        if sort_option not in sort_options:
            return Response(
                {
                    "message": (
                        "Invalid sort option. Use newest, oldest, "
                        "amount_high or amount_low."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        orders = orders.order_by(
            sort_options[sort_option],
            "-id"
        )

        # ======================================
        # 7. PAGINATION
        # ======================================

        page_number = request.query_params.get("page", "1")
        page_size = request.query_params.get("page_size", "10")

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

        if page_size not in [6]:
            return Response(
                {"message": "page_size must be 6."},
                status=status.HTTP_400_BAD_REQUEST
            )

        paginator = Paginator(orders, page_size)

        try:
            page_obj = paginator.page(page_number)

        except EmptyPage:
            return Response(
                {"message": "Invalid page number."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ======================================
        # 8. SERIALIZATION
        # ======================================

        serializer = AdminOrderListSerializer(
            page_obj.object_list,
            many=True
        )

        return Response(
            {
                "message": "Orders retrieved successfully.",
                "total_orders": paginator.count,
                "total_pages": paginator.num_pages,
                "current_page": page_obj.number,
                "page_size": page_size,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "next_page": (
                    page_obj.next_page_number()
                    if page_obj.has_next()
                    else None
                ),
                "previous_page": (
                    page_obj.previous_page_number()
                    if page_obj.has_previous()
                    else None
                ),
                "orders": serializer.data
            },
            status=status.HTTP_200_OK
        )




# ==========================================
# ADMIN ORDER DETAIL VIEW
# ==========================================

class AdminOrderDetailView(AdminOnlyAPIView):

    def get(self, request, pk):

        access_error = self.check_admin_access(request)

        if access_error:
            return access_error

        order = Order.objects.select_related(
            "user",
            "coupon"
        ).prefetch_related(
            "items",
            "tracking_history"
        ).filter(
            id=pk
        ).first()

        if order is None:
            return Response(
                {"message": "Order not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AdminOrderDetailSerializer(order)

        return Response(
            {
                "message": "Order details retrieved successfully.",
                "order": serializer.data
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# ADMIN ORDER STATUS UPDATE VIEW
# ==========================================

class AdminOrderStatusUpdateView(AdminOnlyAPIView):

    ALLOWED_TRANSITIONS = {
        Order.Status.PENDING: [
            Order.Status.CONFIRMED,
        ],
        Order.Status.CONFIRMED: [
            Order.Status.SHIPPED,
        ],
        Order.Status.SHIPPED: [
            Order.Status.OUT_FOR_DELIVERY,
        ],
        Order.Status.OUT_FOR_DELIVERY: [
            Order.Status.DELIVERED,
        ],
    }

    STATUS_DESCRIPTIONS = {
        Order.Status.CONFIRMED: "Order confirmed by admin.",
        Order.Status.SHIPPED: "Order shipped.",
        Order.Status.OUT_FOR_DELIVERY: "Order is out for delivery.",
        Order.Status.DELIVERED: "Order delivered successfully.",
    }

    def patch(self, request, pk):

        access_error = self.check_admin_access(request)

        if access_error:
            return access_error

        new_status = request.data.get("status")

        if not new_status:
            return Response(
                {"message": "Status field is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_statuses = [
            choice[0]
            for choice in Order.Status.choices
        ]

        if new_status not in valid_statuses:
            return Response(
                {"message": "Invalid order status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        description = request.data.get(
            "description",
            self.STATUS_DESCRIPTIONS.get(new_status, "")
        )

        if not isinstance(description, str):
            return Response(
                {"message": "Description must be text."},
                status=status.HTTP_400_BAD_REQUEST
            )

        description = description.strip()

        if not description:
            return Response(
                {"message": "Description cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():

            order = Order.objects.select_for_update().filter(
                id=pk
            ).first()

            if order is None:
                return Response(
                    {"message": "Order not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
            # PREVENT CONFIRMING UNPAID ORDERS

            if (
                new_status == Order.Status.CONFIRMED
                and order.payment_method != Order.PaymentMethod.COD
                and order.payment_status != Order.PaymentStatus.PAID
            ):
                return Response(
                    {
                        "message": "Only paid orders can be confirmed."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            allowed_statuses = self.ALLOWED_TRANSITIONS.get(
                    order.status,
                        []
                )

            if new_status not in allowed_statuses:
                return Response(
                    {
                        "message": (
                            f"Cannot change order status from "
                            f"{order.status} to {new_status}."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            order_items = list(
                OrderItem.objects.select_for_update().filter(
                    order=order
                )
            )

            if not order_items:
                return Response(
                    {"message": "This order has no items."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # UPDATE ORDER STATUS

            order.status = new_status

            update_fields = [
                "status",
                "updated_at"
            ]

            if new_status == Order.Status.DELIVERED:
                order.delivered_at = timezone.now()
                update_fields.append("delivered_at")

            order.save(update_fields=update_fields)

            # UPDATE ORDER ITEMS

            for item in order_items:

                item.status = new_status

                item.save(
                    update_fields=["status"]
                )

            # CREATE TRACKING HISTORY

            OrderTracking.objects.create(
                order=order,
                status=new_status,
                description=description
            )

            serializer = AdminOrderDetailSerializer(order)

        return Response(
            {
                "message": "Order status updated successfully.",
                "order": serializer.data
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# ADMIN RETURN REQUEST LIST VIEW
# ==========================================


class AdminReturnRequestListView(AdminOnlyAPIView):

    def get(self, request):

        access_error = self.check_admin_access(request)

        if access_error:
            return access_error

        return_requests = ReturnRequest.objects.select_related(
            "user",
            "order_item",
            "order_item__order",
            "request_group"
        ).order_by("-requested_at")

        return_status = request.query_params.get("status")

        if return_status:

            valid_statuses = [
                choice[0]
                for choice in ReturnRequest.Status.choices
            ]

            if return_status not in valid_statuses:
                return Response(
                    {"message": "Invalid return status."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            return_requests = return_requests.filter(
                status=return_status
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

        paginator = Paginator(return_requests, page_size)

        try:
            page_obj = paginator.page(page_number)

        except EmptyPage:
            return Response(
                {"message": "Invalid page number."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AdminReturnRequestListSerializer(
            page_obj.object_list,
            many=True
        )

        return Response(
            {
                "message": "Return requests retrieved successfully.",
                "total_returns": paginator.count,
                "total_pages": paginator.num_pages,
                "current_page": page_obj.number,
                "page_size": page_size,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "next_page": (
                    page_obj.next_page_number()
                    if page_obj.has_next()
                    else None
                ),
                "previous_page": (
                    page_obj.previous_page_number()
                    if page_obj.has_previous()
                    else None
                ),
                "returns": serializer.data
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# ADMIN RETURN REQUEST DETAIL VIEW
# ==========================================

class AdminReturnRequestDetailView(AdminOnlyAPIView):

    def get(self, request, pk):

        access_error = self.check_admin_access(request)

        if access_error:
            return access_error

        return_request = ReturnRequest.objects.select_related(
            "user",
            "order_item",
            "order_item__order",
            "order_item__product_variant",
            "request_group"
        ).filter(
            id=pk
        ).first()

        if return_request is None:
            return Response(
                {"message": "Return request not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AdminReturnRequestDetailSerializer(
            return_request
        )

        return Response(
            {
                "message": "Return request details retrieved successfully.",
                "return_request": serializer.data
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# COMMON RETURN GROUP STATUS UPDATE
# ==========================================

def update_return_group_status(group):

    group_requests = list(
        ReturnRequest.objects.filter(
            request_group=group
        ).values_list(
            "status",
            flat=True
        )
    )

    terminal_statuses = [
        ReturnRequest.Status.COMPLETED,
        ReturnRequest.Status.REJECTED
    ]

    if all(
        item_status in terminal_statuses
        for item_status in group_requests
    ):

        if all(
            item_status == ReturnRequest.Status.REJECTED
            for item_status in group_requests
        ):
            group.status = ReturnRequestGroup.Status.REJECTED

        else:
            group.status = ReturnRequestGroup.Status.COMPLETED

    elif any(
        item_status in [
            ReturnRequest.Status.APPROVED,
            ReturnRequest.Status.COMPLETED
        ]
        for item_status in group_requests
    ):
        group.status = ReturnRequestGroup.Status.APPROVED

    else:
        group.status = ReturnRequestGroup.Status.PENDING

    group.save(
        update_fields=["status", "updated_at"]
    )


# ==========================================
# ADMIN RETURN REQUEST APPROVE VIEW
# ==========================================


class AdminReturnRequestApproveView(AdminOnlyAPIView):

    def patch(self, request, pk):

        access_error = self.check_admin_access(request)

        if access_error:
            return access_error

        with transaction.atomic():

            # LOCK RETURN REQUEST

            return_request = ReturnRequest.objects.select_for_update().filter(
                id=pk
            ).first()

            if return_request is None:
                return Response(
                    {"message": "Return request not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # LOCK ORDER FIRST

            order = Order.objects.select_for_update().get(
                id=return_request.order_item.order_id
            )

            # VALIDATE RETURN REQUEST AND PAYMENT

            serializer = AdminReturnApproveSerializer(
                instance=return_request,
                data={},
                partial=True
            )

            serializer.is_valid(raise_exception=True)

            # LOCK ORDER ITEM

            order_item = OrderItem.objects.select_for_update().get(
                id=return_request.order_item_id
            )

            # CHECK TOTAL ACTIVE RETURN QUANTITY

            active_return_statuses = [
                ReturnRequest.Status.PENDING,
                ReturnRequest.Status.APPROVED,
                ReturnRequest.Status.COMPLETED
            ]

            active_returns = ReturnRequest.objects.filter(
                order_item=order_item,
                status__in=active_return_statuses
            )

            total_return_quantity = sum(
                active_returns.values_list(
                    "return_quantity",
                    flat=True
                )
            )

            if total_return_quantity > order_item.quantity:
                return Response(
                    {
                        "message": (
                            "Total return quantity exceeds "
                            "the purchased quantity."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # CHECK ORDER ITEM QUANTITY

            if order_item.quantity <= 0:
                return Response(
                    {"message": "Invalid purchased quantity."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # CUMULATIVE REFUND CALCULATION

            quantity = return_request.return_quantity

            # Calculate total refundable amount for the full item

            total_item_amount = (
                order_item.price * order_item.quantity
            )

            total_item_refund = (
                total_item_amount
                - order_item.discount_amount
                + order_item.tax_amount
            ).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP
            )

            # Get previously completed returns

            completed_returns = ReturnRequest.objects.filter(
                order_item=order_item,
                status=ReturnRequest.Status.COMPLETED
            ).exclude(
                id=return_request.id
            )

            previous_returned_quantity = sum(
                completed_returns.values_list(
                    "return_quantity",
                    flat=True
                )
            )

            previous_refunded_amount = sum(
                (
                    refund or Decimal("0.00")
                    for refund in completed_returns.values_list(
                        "refund_amount",
                        flat=True
                    )
                ),
                Decimal("0.00")
            )

            # Calculate cumulative quantity after this return

            cumulative_quantity = (
                previous_returned_quantity + quantity
            )

            if cumulative_quantity > order_item.quantity:
                return Response(
                    {
                        "message": (
                            "Returned quantity exceeds "
                            "the purchased quantity."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Calculate cumulative refund target

            cumulative_refund_target = (
                total_item_refund
                * cumulative_quantity
                / order_item.quantity
            ).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP
            )

            # Current refund = cumulative target - previous refunds

            refund_amount = (
                cumulative_refund_target
                - previous_refunded_amount
            ).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP
            )

            if refund_amount <= Decimal("0.00"):
                return Response(
                    {"message": "Invalid refund amount."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # GET AND LOCK CUSTOMER WALLET

            wallet, _ = Wallet.objects.get_or_create(
                user=return_request.user
            )

            wallet = Wallet.objects.select_for_update().get(
                id=wallet.id
            )

            # CHECK DUPLICATE REFUND

            reference_id = f"RETURN-{return_request.id}"

            existing_transaction = WalletTransaction.objects.filter(
                wallet=wallet,
                reference_id=reference_id
            ).exists()

            if existing_transaction:
                return Response(
                    {
                        "message": "Refund transaction already exists."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # CREDIT REFUND TO WALLET

            wallet.balance += refund_amount

            wallet.save(
                update_fields=["balance", "updated_at"]
            )

            WalletTransaction.objects.create(
                wallet=wallet,
                order=order,
                transaction_type=(
                    WalletTransaction.TransactionType.CREDIT
                ),
                amount=refund_amount,
                status=WalletTransaction.Status.SUCCESS,
                reference_id=reference_id
            )

            # RESTORE PRODUCT STOCK

            if order_item.product_variant_id:

                variant = ProductVariant.objects.select_for_update().get(
                    id=order_item.product_variant_id
                )

                variant.stock += quantity

                variant.save(
                    update_fields=["stock"]
                )

            # UPDATE RETURN REQUEST

            return_request.status = ReturnRequest.Status.COMPLETED

            return_request.refund_status = (
                ReturnRequest.RefundStatus.COMPLETED
            )

            return_request.refund_amount = refund_amount

            return_request.save(
                update_fields=[
                    "status",
                    "refund_status",
                    "refund_amount",
                    "updated_at"
                ]
            )

            # UPDATE RETURN GROUP STATUS

            if return_request.request_group_id:

                group = ReturnRequestGroup.objects.select_for_update().get(
                    id=return_request.request_group_id
                )

                update_return_group_status(group)

            # REFRESH RETURN REQUEST

            return_request.refresh_from_db()

            response_serializer = AdminReturnRequestDetailSerializer(
                return_request
            )

        return Response(
            {
                "message": (
                    "Return approved and refund credited "
                    "to customer wallet successfully."
                ),
                "refund_amount": str(refund_amount),
                "wallet_balance": str(wallet.balance),
                "return_request": response_serializer.data
            },
            status=status.HTTP_200_OK
        )

# ==========================================
# ADMIN RETURN REQUEST REJECT VIEW
# ==========================================

class AdminReturnRequestRejectView(AdminOnlyAPIView):

    def patch(self, request, pk):

        access_error = self.check_admin_access(request)

        if access_error:
            return access_error

        with transaction.atomic():

            # LOCK RETURN REQUEST

            return_request = ReturnRequest.objects.select_for_update().filter(
                id=pk
            ).first()

            if return_request is None:
                return Response(
                    {"message": "Return request not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # VALIDATE RETURN REQUEST

            serializer = AdminReturnRejectSerializer(
                instance=return_request,
                data={},
                partial=True
            )

            serializer.is_valid(raise_exception=True)

            # UPDATE RETURN STATUS

            return_request.status = ReturnRequest.Status.REJECTED

            return_request.save(
                update_fields=[
                    "status",
                    "updated_at"
                ]
            )

            # UPDATE RETURN GROUP STATUS

            if return_request.request_group_id:

                group = ReturnRequestGroup.objects.select_for_update().get(
                    id=return_request.request_group_id
                )

                update_return_group_status(group)

        return Response(
            {
                "message": "Return request rejected successfully.",
                "return_request_id": return_request.id,
                "status": return_request.status
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# ADMIN COD PAYMENT COLLECTION
# ==========================================

class AdminCODPaymentCollectionView(AdminOnlyAPIView):

    def patch(self, request, pk):

        access_error = self.check_admin_access(request)

        if access_error:
            return access_error

        reference = request.data.get(
            "cod_collection_reference"
        )

        if not isinstance(reference, str) or not reference.strip():
            return Response(
                {
                    "message": "COD collection reference is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        reference = reference.strip()

        if len(reference) > 100:
            return Response(
                {
                    "message": "Reference cannot exceed 100 characters."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():

            order = Order.objects.select_for_update().filter(
                id=pk
            ).first()

            if order is None:
                return Response(
                    {"message": "Order not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # COD ONLY

            if order.payment_method != Order.PaymentMethod.COD:
                return Response(
                    {
                        "message": "This order is not a COD order."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # DELIVERED ONLY

            if order.status != Order.Status.DELIVERED:
                return Response(
                    {
                        "message": "Only delivered COD orders can be collected."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # PREVENT DUPLICATE COLLECTION

            if order.payment_status == Order.PaymentStatus.PAID:
                return Response(
                    {
                        "message": "COD payment has already been collected."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if order.payment_status != Order.PaymentStatus.PENDING:
                return Response(
                    {
                        "message": "This COD payment cannot be collected."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if order.cod_collected_at is not None:
                return Response(
                    {
                        "message": "COD collection has already been recorded."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # RECORD COLLECTION

            order.payment_status = Order.PaymentStatus.PAID
            order.cod_collected_at = timezone.now()
            order.cod_collection_reference = reference
            order.cod_collected_by = request.user

            order.save(
                update_fields=[
                    "payment_status",
                    "cod_collected_at",
                    "cod_collection_reference",
                    "cod_collected_by",
                    "updated_at"
                ]
            )

        return Response(
            {
                "message": "COD payment collection recorded successfully.",
                "order_id": order.id,
                "payment_method": order.payment_method,
                "payment_status": order.payment_status,
                "amount": str(order.final_amount),
                "cod_collected_at": order.cod_collected_at,
                "cod_collection_reference": order.cod_collection_reference,
                "cod_collected_by": request.user.id
            },
            status=status.HTTP_200_OK
        )
