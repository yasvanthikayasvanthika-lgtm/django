from django.urls import path
from myapp import views

urlpatterns = [

    path('', views.index, name='index'),

    path('about/', views.about, name='about'),

    path('cart/', views.cart, name='cart'),
    
    path('add-to-cart/<int:product_id>/', views.add_to_cart, name='add-to-cart'),

    path('checkout/', views.checkout, name='checkout'),
    
    path('coupon/', views.coupon, name='coupon'),
    

    path('gift/', views.gift, name='gift'),
    

    path('login/', views.login, name='login'),
   

    path('signup/', views.signup, name='signup'),
    

    path('products/', views.products, name='products'),
    

    path('products_details/', views.productsdetails, name='productsdetails'),
    

    path('sports-accessories/', views.sportsaccessories, name='sports-accessories'),

    path('new-products/', views.newproducts, name='new-products'),
    

    path('offers/', views.offers, name='offers'),
    

    path('order-summary/', views.ordersummary, name='ordersummary'),
    
    path('order-confirmed/', views.orderconfirmed, name='orderconfirmed'),

    path('fitness/', views.fitness, name='fitness'),

    path('order-tracking/', views.order_tracking, name='order-tracking'),

    path('logout/', views.logout_user, name='logout'),

]