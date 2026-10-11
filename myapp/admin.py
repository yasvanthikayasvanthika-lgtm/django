from django.contrib import admin
from .models import (
    Product,
    CartItem,
    Address,
    Order,
    OrderItem,
    Payment,
    OrderTracking
)

admin.site.register(Product)
admin.site.register(CartItem)
admin.site.register(Address)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(Payment)
admin.site.register(OrderTracking)