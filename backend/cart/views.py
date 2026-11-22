from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .models import Cart, CartItem
from .serializer import CartSerializer, AddToCartSerializer


# CUSTOMER CART ACCESS
def get_customer_cart(user):
    if user.role != "customer":
        raise PermissionDenied("Only customers can access the cart.")

    cart, created = Cart.objects.get_or_create(user=user)
    return cart


# 1. VIEW CART
class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = get_customer_cart(request.user)

        serializer = CartSerializer(cart)

        return Response(serializer.data, status=status.HTTP_200_OK)


# 2. ADD PRODUCT TO CART
class AddToCartView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        cart = get_customer_cart(request.user)

        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        variant = serializer.validated_data["variant"]
        quantity = serializer.validated_data["quantity"]

        cart_item = CartItem.objects.filter(
            cart=cart,
            variant=variant
        ).first()

        # Check combined quantity when item already exists
        new_quantity = quantity

        if cart_item:
            new_quantity += cart_item.quantity

        if new_quantity > variant.stock:
            return Response(
                {
                    "message": f"Only {variant.stock} items are available."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if cart_item:
            cart_item.quantity = new_quantity
            cart_item.save()
            message = "Cart quantity updated successfully."
        else:
            CartItem.objects.create(
                cart=cart,
                variant=variant,
                quantity=quantity
            )
            message = "Product added to cart successfully."

        cart.save()

        return Response(
            {
                "message": message,
                "cart": CartSerializer(cart).data
            },
            status=status.HTTP_200_OK
        )


# 3. UPDATE CART ITEM QUANTITY
class CartItemUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, item_id):
        cart = get_customer_cart(request.user)

        item = get_object_or_404(
            CartItem,
            id=item_id,
            cart=cart
        )

        quantity = serializers.IntegerField(min_value=1).run_validation(
            request.data.get("quantity")
        )

        if quantity > item.variant.stock:
            return Response(
                {
                    "message": f"Only {item.variant.stock} items are available."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        item.quantity = quantity
        item.save()

        cart.save()

        return Response(
            {
                "message": "Cart quantity updated successfully.",
                "cart": CartSerializer(cart).data
            },
            status=status.HTTP_200_OK
        )


# 4. REMOVE CART ITEM
class CartItemRemoveView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, item_id):
        cart = get_customer_cart(request.user)

        item = get_object_or_404(
            CartItem,
            id=item_id,
            cart=cart
        )

        item.delete()
        cart.save()

        return Response(
            {"message": "Product removed from cart successfully."},
            status=status.HTTP_200_OK
        )
