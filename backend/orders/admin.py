from django.contrib import admin
from .models import Order, OrderItem, OrderTracking, ReturnRequest


admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(OrderTracking)
admin.site.register(ReturnRequest)
