import json
import hmac
import hashlib
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from django.conf import settings

from orders.razorpay_service import (create_razorpay_order, verify_razorpay_payment_signature,
                                     get_razorpay_client,fetch_razorpay_order_payments,)

from cart.models import Cart, CartItem
from products.models import ProductVariant
from orders.models import (
    Order,
    OrderItem,
    OrderTracking,
    ReturnRequest,
    RazorpayWebhookEvent,
)

from orders.serializers.customer_serializer import (
    CustomerCheckoutSerializer,
    CustomerOrderSerializer,
    CustomerReturnRequestSerializer,
    CustomerReturnRequestGroupCreateSerializer,
)

from coupons.models import Coupon, CouponUsage
from coupons.serializers.customer_serializer import (
    CustomerCouponApplySerializer,
)

from wallet.models import Wallet, WalletTransaction


# ==========================================
# RAZORPAY WEBHOOK VIEW
# ==========================================



class RazorpayWebhookView(APIView):

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):

        webhook_body = request.body

        webhook_signature = request.headers.get(
            "X-Razorpay-Signature"
        )

        webhook_event_id = request.headers.get(
            "X-Razorpay-Event-Id"
        )

        if not webhook_signature or not webhook_event_id:
            return Response(
                {"message": "Webhook headers are missing."},
                status=status.HTTP_400_BAD_REQUEST
            )

        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET

        if not webhook_secret:
            return Response(
                {"message": "Webhook secret is not configured."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # VERIFY WEBHOOK SIGNATURE

        expected_signature = hmac.new(
            webhook_secret.encode("utf-8"),
            webhook_body,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(
            expected_signature,
            webhook_signature
        ):
            return Response(
                {"message": "Invalid webhook signature."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # PARSE WEBHOOK DATA

        try:
            payload = json.loads(webhook_body)

        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response(
                {"message": "Invalid webhook payload."},
                status=status.HTTP_400_BAD_REQUEST
            )

        event_type = payload.get("event")

        if not event_type:
            return Response(
                {"message": "Webhook event type is missing."},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment_entity = (
            payload.get("payload", {})
            .get("payment", {})
            .get("entity", {})
        )

        razorpay_order_id = None
        razorpay_payment_id = None

        # HANDLE PAYMENT EVENTS

        if event_type in ["payment.captured", "payment.failed"]:

            razorpay_order_id = payment_entity.get("order_id")
            razorpay_payment_id = payment_entity.get("id")

            if not razorpay_order_id or not razorpay_payment_id:
                return Response(
                    {"message": "Payment details are missing."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # PROCESS WEBHOOK EVENT

        with transaction.atomic():

            webhook_event, _ = (
                RazorpayWebhookEvent.objects.get_or_create(
                    event_id=webhook_event_id,
                    defaults={
                        "event_type": event_type
                    }
                )
            )

            webhook_event = (
                RazorpayWebhookEvent.objects
                .select_for_update()
                .get(pk=webhook_event.pk)
            )

            if webhook_event.processed:
                return Response(
                    {"message": "Webhook event already processed."},
                    status=status.HTTP_200_OK
                )

            if webhook_event.event_type != event_type:
                return Response(
                    {"message": "Webhook event ID mismatch."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # ==================================
            # PAYMENT CAPTURED
            # ==================================

            if event_type == "payment.captured":

                allowed_methods = [
                    Order.PaymentMethod.RAZORPAY,
                    Order.PaymentMethod.WALLET_RAZORPAY
                ]

                order = Order.objects.select_for_update().filter(
                    razorpay_order_id=razorpay_order_id,
                    payment_method__in=allowed_methods
                ).first()

                if order is None:
                    return Response(
                        {"message": "Order not found."},
                        status=status.HTTP_404_NOT_FOUND
                    )

                # VERIFY EXPECTED RAZORPAY AMOUNT

                razorpay_amount = (
                    order.final_amount - order.wallet_amount_used
                )

                expected_amount = int(
                    razorpay_amount * 100
                )

                if (
                    payment_entity.get("amount") != expected_amount
                    or payment_entity.get("currency") != "INR"
                    or payment_entity.get("status") != "captured"
                ):
                    return Response(
                        {"message": "Payment details do not match."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # ==================================
                # CANCELLED ORDER - REFUND TO WALLET
                # ==================================

                if order.status == Order.Status.CANCELLED:

                    wallet, _ = Wallet.objects.get_or_create(
                        user=order.user
                    )

                    wallet = Wallet.objects.select_for_update().get(
                        pk=wallet.pk
                    )

                    refund_reference = (
                        f"RAZORPAY-CANCEL-{order.id}"
                    )

                    existing_refund = WalletTransaction.objects.filter(
                        wallet=wallet,
                        reference_id=refund_reference
                    ).first()

                    if existing_refund is not None:

                        if (
                            existing_refund.status
                            != WalletTransaction.Status.SUCCESS
                            or existing_refund.transaction_type
                            != WalletTransaction.TransactionType.CREDIT
                            or existing_refund.amount != razorpay_amount
                        ):
                            return Response(
                                {
                                    "message": (
                                        "Existing refund transaction does "
                                        "not match. Manual verification required."
                                    )
                                },
                                status=status.HTTP_409_CONFLICT
                            )

                    else:

                        wallet.balance += razorpay_amount

                        wallet.save(
                            update_fields=[
                                "balance",
                                "updated_at"
                            ]
                        )

                        WalletTransaction.objects.create(
                            wallet=wallet,
                            order=order,
                            transaction_type=(
                                WalletTransaction.TransactionType.CREDIT
                            ),
                            amount=razorpay_amount,
                            status=WalletTransaction.Status.SUCCESS,
                            reference_id=refund_reference
                        )

                    order.razorpay_payment_id = razorpay_payment_id
                    order.payment_status = Order.PaymentStatus.REFUNDED

                    order.save(
                        update_fields=[
                            "razorpay_payment_id",
                            "payment_status",
                            "updated_at"
                        ]
                    )

                # ==================================
                # NORMAL SUCCESSFUL PAYMENT
                # ==================================

                elif order.payment_status == Order.PaymentStatus.PENDING:

                    order.razorpay_payment_id = razorpay_payment_id
                    order.payment_status = Order.PaymentStatus.PAID
                    order.status = Order.Status.CONFIRMED

                    order.save(
                        update_fields=[
                            "razorpay_payment_id",
                            "payment_status",
                            "status",
                            "updated_at"
                        ]
                    )

                    OrderItem.objects.filter(
                        order=order
                    ).update(
                        status=Order.Status.CONFIRMED
                    )

                    OrderTracking.objects.create(
                        order=order,
                        status=Order.Status.CONFIRMED,
                        description=(
                            "Payment confirmed through Razorpay webhook."
                        )
                    )

                # ==================================
                # ALREADY PAID
                # ==================================

                elif order.payment_status == Order.PaymentStatus.PAID:

                    if order.razorpay_payment_id != razorpay_payment_id:
                        return Response(
                            {
                                "message": (
                                    "Another payment was already recorded. "
                                    "Manual review is required."
                                )
                            },
                            status=status.HTTP_409_CONFLICT
                        )

                else:

                    return Response(
                        {
                            "message": (
                                "This order payment cannot be processed. "
                                "Manual verification is required."
                            )
                        },
                        status=status.HTTP_409_CONFLICT
                    )

                # ==================================
                # REMOVE PURCHASED CART ITEMS
                # ==================================

                if (
                    order.status != Order.Status.CANCELLED
                    and order.payment_status == Order.PaymentStatus.PAID
                    and order.razorpay_payment_id == razorpay_payment_id
                    and order.selected_cart_item_ids
                ):

                    CartItem.objects.filter(
                        cart__user=order.user,
                        id__in=order.selected_cart_item_ids
                    ).delete()

            # ==================================
            # PAYMENT FAILED
            # ==================================

            elif event_type == "payment.failed":

                # Keep the order pending.
                # Customer may retry the payment.

                pass

            # ==================================
            # MARK EVENT AS PROCESSED
            # ==================================

            webhook_event.processed = True
            webhook_event.processed_at = timezone.now()

            webhook_event.save(
                update_fields=[
                    "processed",
                    "processed_at"
                ]
            )

        return Response(
            {"message": "Webhook processed successfully."},
            status=status.HTTP_200_OK
        )


# ==========================================
# CUSTOMER CHECKOUT VIEW
# ==========================================



class CustomerCheckoutView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        if request.user.role != "customer":
            return Response(
                {"message": "Only customers can checkout."},
                status=status.HTTP_403_FORBIDDEN
            )

        checkout_serializer = CustomerCheckoutSerializer(
            data=request.data,
            context={"request": request}
        )

        checkout_serializer.is_valid(raise_exception=True)

        address = checkout_serializer.validated_data["address"]
        payment_method = checkout_serializer.validated_data[
            "payment_method"
        ]

        wallet_amount_requested = checkout_serializer.validated_data.get(
            "wallet_amount",
            Decimal("0.00")
        )

        coupon_code = checkout_serializer.validated_data.get(
            "coupon_code", ""
        ).strip().upper()

        # BUY NOW VALIDATION

        is_buy_now = request.data.get("buy_now", False)

        if not isinstance(is_buy_now, bool):
            raise ValidationError(
                {"buy_now": "Invalid Buy Now value."}
            )

        buy_now_variant_id = None
        buy_now_quantity = None

        if is_buy_now:
            try:
                buy_now_variant_id = int(request.data.get("variant_id"))
                buy_now_quantity = int(request.data.get("quantity"))

                if buy_now_variant_id <= 0 or buy_now_quantity <= 0:
                    raise ValueError

            except (TypeError, ValueError):
                raise ValidationError({
                    "message": (
                        "A valid variant ID and quantity are required."
                    )
                })

        # SELECTED CART ITEM IDS VALIDATION

        selected_cart_item_ids = []

        if not is_buy_now:

            raw_selected_ids = request.data.get(
                "selected_cart_item_ids"
            )

            if (
                not isinstance(raw_selected_ids, list)
                or not raw_selected_ids
            ):
                raise ValidationError({
                    "selected_cart_item_ids": (
                        "Select at least one cart item to checkout."
                    )
                })

            try:
                for item_id in raw_selected_ids:

                    if isinstance(item_id, bool):
                        raise ValueError

                    item_id = int(item_id)

                    if item_id <= 0:
                        raise ValueError

                    selected_cart_item_ids.append(item_id)

            except (TypeError, ValueError):
                raise ValidationError({
                    "selected_cart_item_ids": (
                        "Cart item IDs must be valid positive integers."
                    )
                })

            if len(selected_cart_item_ids) != len(
                set(selected_cart_item_ids)
            ):
                raise ValidationError({
                    "selected_cart_item_ids": (
                        "Duplicate cart item IDs are not allowed."
                    )
                })

        # VALIDATE PAYMENT METHOD

        allowed_methods = [
            Order.PaymentMethod.COD,
            Order.PaymentMethod.RAZORPAY,
            Order.PaymentMethod.WALLET,
            Order.PaymentMethod.WALLET_RAZORPAY
        ]

        if payment_method not in allowed_methods:
            raise ValidationError({
                "payment_method": (
                    "This payment method is not supported."
                )
            })

        with transaction.atomic():

            checkout_items = []
            cart = None

            # ==================================
            # PREPARE CHECKOUT ITEMS
            # ==================================

            if is_buy_now:

                variant = (
                    ProductVariant.objects
                    .select_for_update()
                    .select_related("product")
                    .filter(id=buy_now_variant_id)
                    .first()
                )

                if variant is None:
                    raise ValidationError({
                        "message": "Selected product variant not found."
                    })

                checkout_items.append({
                    "variant": variant,
                    "quantity": buy_now_quantity
                })

            else:

                # LOCK CUSTOMER CART

                cart = Cart.objects.select_for_update().filter(
                    user=request.user
                ).first()

                if cart is None:
                    raise ValidationError({
                        "message": "Your cart is empty."
                    })

                # FETCH ONLY SELECTED CART ITEMS

                cart_items = list(
                    CartItem.objects.select_for_update().filter(
                        cart=cart,
                        id__in=selected_cart_item_ids
                    )
                )

                # ENSURE ALL REQUESTED ITEMS BELONG TO THIS CART

                if len(cart_items) != len(selected_cart_item_ids):
                    raise ValidationError({
                        "selected_cart_item_ids": (
                            "One or more selected cart items are "
                            "unavailable. Please refresh your cart."
                        )
                    })

                variant_ids = [
                    item.variant_id for item in cart_items
                ]

                variants = (
                    ProductVariant.objects
                    .select_for_update()
                    .select_related("product")
                    .filter(id__in=variant_ids)
                )

                variant_map = {
                    variant.id: variant for variant in variants
                }

                for item in cart_items:

                    variant = variant_map.get(item.variant_id)

                    if variant is None:
                        raise ValidationError({
                            "message": (
                                "A selected product in your cart "
                                "is unavailable."
                            )
                        })

                    checkout_items.append({
                        "variant": variant,
                        "quantity": item.quantity
                    })

            # ==================================
            # VALIDATE PRODUCTS AND STOCK
            # ==================================

            product_amount = Decimal("0.00")

            for checkout_item in checkout_items:

                variant = checkout_item["variant"]
                quantity = checkout_item["quantity"]

                if not variant.product.is_active:
                    raise ValidationError({
                        "message": (
                            f"{variant.product.name} is unavailable."
                        )
                    })

                if quantity <= 0:
                    raise ValidationError({
                        "message": "Invalid product quantity."
                    })

                if variant.stock < quantity:
                    raise ValidationError({
                        "message": (
                            f"Insufficient stock for "
                            f"{variant.product.name}."
                        )
                    })

                product_amount += variant.price * quantity

            if product_amount <= Decimal("0.00"):
                raise ValidationError({
                    "message": "Invalid order amount."
                })

            # ==================================
            # SHIPPING CHARGE
            # ==================================

            if product_amount > Decimal("2000.00"):
                shipping_charge = Decimal("0.00")
            else:
                shipping_charge = Decimal("50.00")

            # ==================================
            # COUPON VALIDATION
            # ==================================

            coupon = None
            discount_amount = Decimal("0.00")

            if coupon_code:

                locked_coupon = Coupon.objects.select_for_update().filter(
                    code=coupon_code
                ).first()

                if locked_coupon is None:
                    raise ValidationError({
                        "coupon_code": "Invalid coupon code."
                    })

                coupon_serializer = CustomerCouponApplySerializer(
                    data={"code": coupon_code},
                    context={
                        "request": request,
                        "product_amount": product_amount
                    }
                )

                coupon_serializer.is_valid(raise_exception=True)

                coupon = coupon_serializer.validated_data["coupon"]

                discount_amount = coupon_serializer.validated_data[
                    "discount_amount"
                ]

            # ==================================
            # GST AND DISCOUNT ALLOCATION
            # ==================================

            tax_amount = Decimal("0.00")
            item_tax_map = {}
            item_discount_map = {}

            allocated_discount = Decimal("0.00")

            for index, checkout_item in enumerate(checkout_items):

                variant = checkout_item["variant"]
                quantity = checkout_item["quantity"]

                item_amount = variant.price * quantity

                if index == len(checkout_items) - 1:

                    item_discount = (
                        discount_amount - allocated_discount
                    )

                else:

                    item_discount = (
                        item_amount * discount_amount / product_amount
                    ).quantize(
                        Decimal("0.01"),
                        rounding=ROUND_HALF_UP
                    )

                    allocated_discount += item_discount

                item_discount_map[index] = item_discount

                taxable_amount = item_amount - item_discount

                item_tax = (
                    taxable_amount
                    * variant.product.tax_percentage
                    / Decimal("100")
                ).quantize(
                    Decimal("0.01"),
                    rounding=ROUND_HALF_UP
                )

                item_tax_map[index] = item_tax
                tax_amount += item_tax

            # ==================================
            # FINAL AMOUNT
            # ==================================

            final_amount = (
                product_amount
                + tax_amount
                + shipping_charge
                - discount_amount
            ).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP
            )

            if final_amount <= Decimal("0.00"):
                raise ValidationError({
                    "message": "Invalid final order amount."
                })

            # ==================================
            # WALLET VALIDATION
            # ==================================

            wallet = None
            wallet_amount_used = Decimal("0.00")

            if payment_method in [
                Order.PaymentMethod.WALLET,
                Order.PaymentMethod.WALLET_RAZORPAY
            ]:

                wallet, _ = Wallet.objects.get_or_create(
                    user=request.user
                )

                wallet = Wallet.objects.select_for_update().get(
                    pk=wallet.pk
                )

                if payment_method == Order.PaymentMethod.WALLET:

                    if wallet.balance < final_amount:
                        raise ValidationError({
                            "message": "Insufficient wallet balance.",
                            "wallet_balance": str(wallet.balance),
                            "required_amount": str(final_amount)
                        })

                    wallet_amount_used = final_amount

                elif payment_method == Order.PaymentMethod.WALLET_RAZORPAY:

                    if wallet_amount_requested <= Decimal("0.00"):
                        raise ValidationError({
                            "wallet_amount": (
                                "Enter a valid wallet amount."
                            )
                        })

                    if wallet_amount_requested >= final_amount:
                        raise ValidationError({
                            "wallet_amount": (
                                "Wallet amount must be less than the order total. "
                                "Use Wallet payment if your balance covers the full amount."
                            )
                        })

                    if wallet_amount_requested > wallet.balance:
                        raise ValidationError({
                            "message": "Insufficient wallet balance.",
                            "wallet_balance": str(wallet.balance),
                            "requested_amount": str(wallet_amount_requested)
                        })

                    wallet_amount_used = wallet_amount_requested

            elif wallet_amount_requested > Decimal("0.00"):

                raise ValidationError({
                    "wallet_amount": (
                        "Wallet amount is not applicable for this payment method."
                    )
                })

            # ==================================
            # ORDER STATUS
            # ==================================

            if payment_method == Order.PaymentMethod.WALLET:

                order_status = Order.Status.CONFIRMED
                payment_status = Order.PaymentStatus.PAID

            else:

                order_status = Order.Status.PENDING
                payment_status = Order.PaymentStatus.PENDING

            # ==================================
            # CREATE ORDER
            # ==================================

            order = Order.objects.create(
                user=request.user,
                product_amount=product_amount,
                tax_amount=tax_amount,
                status=order_status,
                payment_method=payment_method,
                payment_status=payment_status,
                wallet_amount_used=wallet_amount_used,

                shipping_full_name=address.full_name,
                shipping_phone=address.phone,
                shipping_address_line=address.address_line,
                shipping_city=address.city,
                shipping_district=address.district,
                shipping_state=address.state,
                shipping_pincode=address.pincode,

                shipping_charge=shipping_charge,
                discount_amount=discount_amount,
                final_amount=final_amount,
                coupon=coupon,

                # SAVE SELECTED CART ITEM IDS
                # BUY NOW ORDERS STORE AN EMPTY LIST
                selected_cart_item_ids=(
                    selected_cart_item_ids if not is_buy_now else []
                )
            )

            # ==================================
            # CREATE RAZORPAY PAYMENT ORDER
            # ==================================

            
            if payment_method in [
                Order.PaymentMethod.RAZORPAY,
                Order.PaymentMethod.WALLET_RAZORPAY
            ]:

                razorpay_amount = (
                    final_amount - wallet_amount_used
                )

                razorpay_order = create_razorpay_order(
                    amount=razorpay_amount,
                    receipt=f"HOMENEST-{order.id}"
                )

                order.razorpay_order_id = razorpay_order["id"]
                order.razorpay_payment_created_at = timezone.now()

                order.save(
                    update_fields=[
                        "razorpay_order_id",
                        "razorpay_payment_created_at",
                        "updated_at"
                    ]
                )
            # ==================================
            # CREATE ORDER ITEMS AND DEDUCT STOCK
            # ==================================

            for index, checkout_item in enumerate(checkout_items):

                variant = checkout_item["variant"]
                quantity = checkout_item["quantity"]

                OrderItem.objects.create(
                    order=order,
                    product_variant=variant,
                    product_name=variant.product.name,
                    sku=variant.sku,
                    size=variant.size,
                    color=variant.color,
                    quantity=quantity,
                    price=variant.price,
                    tax_percentage=variant.product.tax_percentage,
                    tax_amount=item_tax_map[index],
                    discount_amount=item_discount_map[index],
                    status=order_status
                )

                variant.stock -= quantity

                variant.save(
                    update_fields=["stock"]
                )

            
            # ==================================
            # WALLET DEBIT
            # ==================================

            if payment_method in [
                Order.PaymentMethod.WALLET,
                Order.PaymentMethod.WALLET_RAZORPAY
            ]:

                wallet.balance -= wallet_amount_used

                wallet.save(
                    update_fields=["balance", "updated_at"]
                )

                WalletTransaction.objects.create(
                    wallet=wallet,
                    order=order,
                    transaction_type=(
                        WalletTransaction.TransactionType.DEBIT
                    ),
                    amount=wallet_amount_used,
                    status=WalletTransaction.Status.SUCCESS,
                    reference_id=f"ORDER-{order.id}"
                )

            # ==================================
            # COUPON USAGE
            # ==================================

            if coupon:

                CouponUsage.objects.create(
                    coupon=coupon,
                    user=request.user,
                    order=order
                )

                coupon.used_count += 1

                coupon.save(
                    update_fields=["used_count"]
                )

            # ==================================
            # ORDER TRACKING
            # ==================================

            OrderTracking.objects.create(
                order=order,
                status=order_status,
                description="Order placed successfully."
            )

            # ==================================
            # CLEAR SELECTED CART ITEMS
            # COD AND WALLET ONLY
            # ==================================

            
            if (
                not is_buy_now
                and payment_method in [
                    Order.PaymentMethod.COD,
                    Order.PaymentMethod.WALLET
                ]
            ):


                CartItem.objects.filter(
                    cart=cart,
                    id__in=selected_cart_item_ids
                ).delete()

            # Razorpay: Do not clear cart here.
            # Selected IDs are saved in the Order.
            # They will be removed after successful payment.

            # ==================================
            # RESPONSE
            # ==================================

            response_serializer = CustomerOrderSerializer(order)

            response_data = {
                "message": "Order placed successfully.",
                "order": response_serializer.data
            }

            
            if payment_method in [
                Order.PaymentMethod.RAZORPAY,
                Order.PaymentMethod.WALLET_RAZORPAY
            ]:

                razorpay_amount = (
                    final_amount - wallet_amount_used
                )

                response_data["razorpay"] = {
                    "key_id": settings.RAZORPAY_KEY_ID,
                    "razorpay_order_id": order.razorpay_order_id,
                    "amount": int(razorpay_amount * 100),
                    "currency": "INR"
                }

                response_data["wallet_amount_used"] = str(
                    wallet_amount_used
                )

                response_data["razorpay_amount_due"] = str(
                    razorpay_amount
                )

            return Response(
                response_data,
                status=status.HTTP_201_CREATED
            )
# ==========================================
# CUSTOMER RAZORPAY PAYMENT RETRY VIEW
# ==========================================


class CustomerRazorpayPaymentRetryView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):

        if request.user.role != "customer":
            return Response(
                {"message": "Only customers can retry payments."},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():

            order = Order.objects.select_for_update().filter(
                    id=pk,
                    user=request.user,
                    payment_method__in=[
                        Order.PaymentMethod.RAZORPAY,
                        Order.PaymentMethod.WALLET_RAZORPAY
                    ]
                ).first()

            if order is None:
                return Response(
                    {"message": "Razorpay order not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            if order.status == Order.Status.CANCELLED:
                return Response(
                    {"message": "Cancelled orders cannot be paid."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if order.payment_status == Order.PaymentStatus.PAID:
                return Response(
                    {"message": "This order has already been paid."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if order.payment_status != Order.PaymentStatus.PENDING:
                return Response(
                    {"message": "Payment retry is not available."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not order.razorpay_order_id:
                return Response(
                    {"message": "Razorpay order ID is missing."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # CHECK EXISTING RAZORPAY PAYMENTS

            try:
                payment_data = fetch_razorpay_order_payments(
                    order.razorpay_order_id
                )

            except Exception:
                return Response(
                    {
                        "message": (
                            "Unable to check payment status. "
                            "Please try again later."
                        )
                    },
                    status=status.HTTP_502_BAD_GATEWAY
                )

            payments = payment_data.get("items", [])

            captured_payment = any(
                payment.get("status") == "captured"
                for payment in payments
            )

            if captured_payment:
                return Response(
                    {
                        "message": (
                            "Payment has already been received. "
                            "Please refresh your orders."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # COUNT RETRY REQUEST

            order.razorpay_payment_attempts += 1

            order.save(
                update_fields=[
                    "razorpay_payment_attempts",
                    "updated_at"
                ]
            )
            razorpay_amount = order.final_amount - order.wallet_amount_used
            return Response(
                {
                    "message": "Payment retry is ready.",
                    "order_id": order.id,
                    "razorpay": {
                        "key_id": settings.RAZORPAY_KEY_ID,
                        "razorpay_order_id": order.razorpay_order_id,
                        "amount": int(razorpay_amount * 100),
                        "currency": "INR"
                    }
                },
                status=status.HTTP_200_OK
            )

# ==========================================
# CUSTOMER RAZORPAY PAYMENT VERIFICATION
# ==========================================




class CustomerRazorpayPaymentVerifyView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        if request.user.role != "customer":
            return Response(
                {"message": "Only customers can verify payments."},
                status=status.HTTP_403_FORBIDDEN
            )

        razorpay_order_id = request.data.get("razorpay_order_id")
        razorpay_payment_id = request.data.get("razorpay_payment_id")
        razorpay_signature = request.data.get("razorpay_signature")

        if not all([
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        ]):
            return Response(
                {"message": "All Razorpay payment details are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        allowed_methods = [
            Order.PaymentMethod.RAZORPAY,
            Order.PaymentMethod.WALLET_RAZORPAY
        ]

        order = Order.objects.filter(
            user=request.user,
            razorpay_order_id=razorpay_order_id,
            payment_method__in=allowed_methods
        ).first()

        if order is None:
            return Response(
                {"message": "Payment order not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if order.status == Order.Status.CANCELLED:
            return Response(
                {"message": "This order has been cancelled."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # VERIFY SIGNATURE

        is_valid = verify_razorpay_payment_signature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        )

        if not is_valid:
            return Response(
                {"message": "Invalid payment signature."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # FETCH PAYMENT DETAILS

        try:
            client = get_razorpay_client()

            payment = client.payment.fetch(
                razorpay_payment_id
            )

        except Exception:
            return Response(
                {
                    "message": (
                        "Unable to retrieve payment details "
                        "from Razorpay. Please try again."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY
            )

        # VERIFY EXPECTED AMOUNT

        expected_amount = int(
            (order.final_amount - order.wallet_amount_used) * 100
        )

        if (
            payment.get("order_id") != razorpay_order_id
            or payment.get("amount") != expected_amount
            or payment.get("currency") != "INR"
            or payment.get("status") != "captured"
        ):
            return Response(
                {
                    "message": (
                        "Payment details do not match "
                        "the order or payment is not captured."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # UPDATE ORDER SAFELY

        with transaction.atomic():

            order = Order.objects.select_for_update().filter(
                user=request.user,
                razorpay_order_id=razorpay_order_id,
                payment_method__in=allowed_methods
            ).first()

            if order is None:
                return Response(
                    {"message": "Payment order not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            if order.status == Order.Status.CANCELLED:
                return Response(
                    {
                        "message": (
                            "This order has been cancelled. "
                            "Please contact support if payment was captured."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # HANDLE DUPLICATE REQUEST

            if order.payment_status == Order.PaymentStatus.PAID:

                if order.razorpay_payment_id == razorpay_payment_id:

                    if order.selected_cart_item_ids:
                        CartItem.objects.filter(
                            cart__user=order.user,
                            id__in=order.selected_cart_item_ids
                        ).delete()

                    return Response(
                        {"message": "Payment already verified."},
                        status=status.HTTP_200_OK
                    )

                return Response(
                    {"message": "This order has already been paid."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if order.payment_status != Order.PaymentStatus.PENDING:
                return Response(
                    {"message": "This payment cannot be verified."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # CONFIRM ORDER

            order.razorpay_payment_id = razorpay_payment_id
            order.razorpay_signature = razorpay_signature
            order.payment_status = Order.PaymentStatus.PAID
            order.status = Order.Status.CONFIRMED

            order.save(
                update_fields=[
                    "razorpay_payment_id",
                    "razorpay_signature",
                    "payment_status",
                    "status",
                    "updated_at"
                ]
            )

            # UPDATE ORDER ITEMS

            OrderItem.objects.filter(
                order=order
            ).update(
                status=Order.Status.CONFIRMED
            )

            # CREATE TRACKING

            OrderTracking.objects.create(
                order=order,
                status=Order.Status.CONFIRMED,
                description=(
                    "Razorpay payment verified successfully."
                )
            )

            # REMOVE ONLY PURCHASED CART ITEMS

            if order.selected_cart_item_ids:
                CartItem.objects.filter(
                    cart__user=order.user,
                    id__in=order.selected_cart_item_ids
                ).delete()

        return Response(
            {
                "message": "Payment verified successfully.",
                "payment_status": order.payment_status,
                "order": CustomerOrderSerializer(order).data
            },
            status=status.HTTP_200_OK
        )

# ==========================================
# CUSTOMER MY ORDERS VIEW
# ==========================================

class CustomerOrderListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        if request.user.role != "customer":
            return Response(
                {"message": "Only customers can view orders."},
                status=status.HTTP_403_FORBIDDEN
            )

        orders = Order.objects.filter(
            user=request.user
        ).prefetch_related(
            "items",
            "tracking_history"
        ).select_related(
            "coupon"
        ).order_by("-created_at")

        serializer = CustomerOrderSerializer(
            orders,
            many=True
        )

        return Response(
            {
                "message": "Orders retrieved successfully.",
                "total_orders": len(serializer.data),
                "orders": serializer.data
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# CUSTOMER ORDER DETAILS VIEW
# ==========================================

class CustomerOrderDetailView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):

        if request.user.role != "customer":
            return Response(
                {
                    "message": (
                        "Only customers can view order details."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        order = Order.objects.filter(
            id=pk,
            user=request.user
        ).select_related(
            "coupon"
        ).prefetch_related(
            "items",
            "tracking_history"
        ).first()

        if order is None:
            return Response(
                {"message": "Order not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = CustomerOrderSerializer(order)

        return Response(
            {
                "message": "Order details retrieved successfully.",
                "order": serializer.data
            },
            status=status.HTTP_200_OK
        )




# ==========================================
# CUSTOMER CANCEL ORDER VIEW
# ==========================================



class CustomerCancelOrderView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):

        if request.user.role != "customer":
            return Response(
                {"message": "Only customers can cancel orders."},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():

            # LOCK ORDER

            order = Order.objects.select_for_update().filter(
                id=pk,
                user=request.user
            ).first()

            if order is None:
                return Response(
                    {"message": "Order not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # CHECK CANCELLATION ELIGIBILITY

            if order.status not in [
                Order.Status.PENDING,
                Order.Status.CONFIRMED
            ]:
                return Response(
                    {
                        "message": (
                            "This order cannot be cancelled "
                            "at its current status."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            razorpay_methods = [
                Order.PaymentMethod.RAZORPAY,
                Order.PaymentMethod.WALLET_RAZORPAY
            ]

            razorpay_payment_captured = False

            # ==================================
            # CHECK PENDING RAZORPAY PAYMENT
            # ==================================

            if (
                order.payment_method in razorpay_methods
                and order.payment_status == Order.PaymentStatus.PENDING
            ):

                if not order.razorpay_order_id:
                    return Response(
                        {"message": "Razorpay order ID is missing."},
                        status=status.HTTP_409_CONFLICT
                    )

                try:
                    payment_response = fetch_razorpay_order_payments(
                        order.razorpay_order_id
                    )

                except Exception:
                    return Response(
                        {
                            "message": (
                                "Unable to verify Razorpay payment status. "
                                "Please try again."
                            )
                        },
                        status=status.HTTP_502_BAD_GATEWAY
                    )

                payments = payment_response.get("items", [])

                captured_payments = [
                    payment for payment in payments
                    if (
                        payment.get("order_id") == order.razorpay_order_id
                        and payment.get("status") == "captured"
                    )
                ]

                if len(captured_payments) > 1:
                    return Response(
                        {
                            "message": (
                                "Multiple captured payments were found. "
                                "Please contact support."
                            )
                        },
                        status=status.HTTP_409_CONFLICT
                    )

                if captured_payments:

                    captured_payment = captured_payments[0]

                    expected_razorpay_amount = int(
                        (
                            order.final_amount
                            - order.wallet_amount_used
                        ) * 100
                    )

                    if (
                        captured_payment.get("amount")
                        != expected_razorpay_amount
                        or captured_payment.get("currency") != "INR"
                        or not captured_payment.get("id")
                    ):
                        return Response(
                            {
                                "message": (
                                    "Captured payment details do not "
                                    "match this order. Please contact support."
                                )
                            },
                            status=status.HTTP_409_CONFLICT
                        )

                    order.razorpay_payment_id = captured_payment.get("id")
                    order.payment_status = Order.PaymentStatus.PAID

                    razorpay_payment_captured = True

            # ==================================
            # CHECK ALREADY PAID RAZORPAY ORDERS
            # ==================================

            elif (
                order.payment_method in razorpay_methods
                and order.payment_status == Order.PaymentStatus.PAID
            ):

                if not order.razorpay_payment_id:
                    return Response(
                        {
                            "message": (
                                "Payment ID is missing. "
                                "Please contact support."
                            )
                        },
                        status=status.HTTP_409_CONFLICT
                    )

                razorpay_payment_captured = True

            # ==================================
            # RESTORE PRODUCT STOCK
            # ==================================

            order_items = list(
                OrderItem.objects.select_for_update().filter(
                    order=order
                )
            )

            variant_ids = [
                item.product_variant_id
                for item in order_items
                if item.product_variant_id is not None
            ]

            variants = ProductVariant.objects.select_for_update().filter(
                id__in=variant_ids
            )

            variant_map = {
                variant.id: variant for variant in variants
            }

            for item in order_items:

                variant = variant_map.get(item.product_variant_id)

                if variant is not None:
                    variant.stock += item.quantity

                    variant.save(
                        update_fields=["stock"]
                    )

                item.status = Order.Status.CANCELLED

                item.save(
                    update_fields=["status"]
                )

            # ==================================
            # REFUND TO WALLET
            # ==================================

            total_wallet_refund = Decimal("0.00")

            wallet_refunds = []

            # Refund wallet amount used during checkout.
            # This applies to WALLET and WALLET_RAZORPAY.

            if order.wallet_amount_used > Decimal("0.00"):

                wallet_refunds.append({
                    "amount": order.wallet_amount_used,
                    "reference": f"WALLET-CANCEL-{order.id}"
                })

            # Refund Razorpay amount only if payment was captured.

            if razorpay_payment_captured:

                razorpay_refund_amount = (
                    order.final_amount - order.wallet_amount_used
                )

                if razorpay_refund_amount > Decimal("0.00"):

                    wallet_refunds.append({
                        "amount": razorpay_refund_amount,
                        "reference": f"RAZORPAY-CANCEL-{order.id}"
                    })

            # CREATE REFUND TRANSACTIONS SAFELY

            if wallet_refunds:

                wallet, _ = Wallet.objects.get_or_create(
                    user=request.user
                )

                wallet = Wallet.objects.select_for_update().get(
                    pk=wallet.pk
                )

                for refund in wallet_refunds:

                    refund_amount = refund["amount"]
                    refund_reference = refund["reference"]

                    existing_transaction = (
                        WalletTransaction.objects.filter(
                            wallet=wallet,
                            reference_id=refund_reference
                        ).first()
                    )

                    if existing_transaction is not None:

                        if (
                            existing_transaction.status
                            != WalletTransaction.Status.SUCCESS
                            or existing_transaction.amount != refund_amount
                            or existing_transaction.transaction_type
                            != WalletTransaction.TransactionType.CREDIT
                        ):
                            raise ValidationError({
                                "message": (
                                    "An existing refund transaction "
                                    "requires manual verification."
                                )
                            })

                    else:

                        wallet.balance += refund_amount

                        WalletTransaction.objects.create(
                            wallet=wallet,
                            order=order,
                            transaction_type=(
                                WalletTransaction.TransactionType.CREDIT
                            ),
                            amount=refund_amount,
                            status=WalletTransaction.Status.SUCCESS,
                            reference_id=refund_reference
                        )

                    total_wallet_refund += refund_amount

                wallet.save(
                    update_fields=["balance", "updated_at"]
                )

            # ==================================
            # RELEASE COUPON USAGE
            # ==================================

            if order.coupon_id:

                coupon = Coupon.objects.select_for_update().filter(
                    pk=order.coupon_id
                ).first()

                if coupon is not None:

                    deleted_count, _ = CouponUsage.objects.filter(
                        coupon=coupon,
                        user=request.user,
                        order=order
                    ).delete()

                    if deleted_count > 0:

                        coupon.used_count = max(
                            0,
                            coupon.used_count - 1
                        )

                        coupon.save(
                            update_fields=["used_count"]
                        )

            # ==================================
            # UPDATE ORDER
            # ==================================

            order.status = Order.Status.CANCELLED

            if total_wallet_refund > Decimal("0.00"):
                order.payment_status = Order.PaymentStatus.REFUNDED

            elif (
                order.payment_status == Order.PaymentStatus.PENDING
                and order.payment_method in razorpay_methods
            ):
                order.payment_status = Order.PaymentStatus.FAILED

            order.save(
                update_fields=[
                    "status",
                    "payment_status",
                    "razorpay_payment_id",
                    "updated_at"
                ]
            )

            # ==================================
            # CREATE TRACKING
            # ==================================

            OrderTracking.objects.create(
                order=order,
                status=Order.Status.CANCELLED,
                description="Order cancelled by customer."
            )

            # ==================================
            # RESPONSE
            # ==================================

            serializer = CustomerOrderSerializer(order)

            response_data = {
                "message": "Order cancelled successfully.",
                "order": serializer.data
            }

            if total_wallet_refund > Decimal("0.00"):

                response_data["wallet_refund"] = {
                    "amount": str(total_wallet_refund),
                    "message": (
                        "Refund credited to your HomeNest Wallet."
                    )
                }

            return Response(
                response_data,
                status=status.HTTP_200_OK
            )

# CUSTOMER SINGLE RETURN REQUEST VIEW

class CustomerReturnRequestView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        if request.user.role != "customer":
            return Response(
                {"message": "Only customers can request returns."},
                status=status.HTTP_403_FORBIDDEN
            )

        order_item_id = request.data.get("order_item")

        try:
            order_item_id = int(order_item_id)

            if order_item_id <= 0:
                raise ValueError

        except (TypeError, ValueError):
            return Response(
                {"order_item": "A valid order item ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():

            # First get the order ID without locking the item.
            order_item = OrderItem.objects.filter(
                id=order_item_id,
                order__user=request.user
            ).only("id", "order_id").first()

            if order_item is None:
                return Response(
                    {"message": "Order item not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Lock the order first.
            order = Order.objects.select_for_update().filter(
                id=order_item.order_id,
                user=request.user
            ).first()

            if order is None:
                return Response(
                    {"message": "Order not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Then lock the order item.
            locked_order_item = OrderItem.objects.select_for_update().filter(
                id=order_item_id,
                order=order
            ).first()

            if locked_order_item is None:
                return Response(
                    {"message": "Order item not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = CustomerReturnRequestSerializer(
                data=request.data,
                context={"request": request}
            )

            serializer.is_valid(raise_exception=True)

            return_request = serializer.save()

            response_serializer = CustomerReturnRequestSerializer(
                return_request
            )

        return Response(
            {
                "message": "Return request submitted successfully.",
                "return_group_id": return_request.request_group_id,
                "return_request": response_serializer.data
            },
            status=status.HTTP_201_CREATED
        )            

# ==========================================
# CUSTOMER MULTIPLE RETURN REQUEST VIEW
# ==========================================

class CustomerReturnRequestGroupView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        if request.user.role != "customer":
            return Response(
                {
                    "message": (
                        "Only customers can submit return requests."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        order_id = request.data.get("order_id")

        if not order_id:
            return Response(
                {"order_id": "This field is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order_id = int(order_id)

            if order_id <= 0:
                raise ValueError

        except (TypeError, ValueError):
            return Response(
                {"order_id": "A valid order ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():

            # FIRST LOCK THE ORDER

            try:
                order = Order.objects.select_for_update().get(
                    id=order_id,
                    user=request.user
                )

            except Order.DoesNotExist:
                return Response(
                    {"message": "Order not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # THEN LOCK ALL ITEMS IN THIS ORDER
            # This prevents concurrent return submissions
            # from exceeding the purchased quantity.

            list(
                OrderItem.objects.select_for_update().filter(
                    order=order
                )
            )

            serializer = CustomerReturnRequestGroupCreateSerializer(
                data=request.data,
                context={
                    "request": request,
                    "locked_order": order
                }
            )

            serializer.is_valid(raise_exception=True)

            return_group = serializer.save()

            total_items = return_group.return_items.count()

        return Response(
            {
                "message": "Return request submitted successfully.",
                "return_group_id": return_group.id,
                "order_id": return_group.order_id,
                "total_items": total_items
            },
            status=status.HTTP_201_CREATED
        )


# ==========================================
# CUSTOMER RETURN REQUEST LIST VIEW
# ==========================================

class CustomerReturnRequestListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        if request.user.role != "customer":
            return Response(
                {
                    "message": (
                        "Only customers can view return requests."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        return_requests = ReturnRequest.objects.filter(
            user=request.user
        ).select_related(
            "order_item",
            "order_item__order",
            "request_group"
        ).order_by("-requested_at")

        serializer = CustomerReturnRequestSerializer(
            return_requests,
            many=True
        )

        return Response(
            {
                "message": "Return requests retrieved successfully.",
                "total_requests": len(serializer.data),
                "return_requests": serializer.data
            },
            status=status.HTTP_200_OK
        )
