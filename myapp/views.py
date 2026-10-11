from django.shortcuts import render, redirect
from .models import Product
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth import authenticate, login as auth_login
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from .models import Product, CartItem, Address, Order, OrderItem, Payment, OrderTracking
from django.contrib.auth import logout

def index(request):
    return render(request, 'index.html')

def about(request):
    return render(request, 'about.html')

def products(request):
    products = Product.objects.all()
    return render(request, 'products.html', {'products': products})

def cart(request):
    if request.user.is_authenticated:
        items = CartItem.objects.filter(user=request.user)
    else:
        items = []

    return render(request, "cart.html", {"items": items})

def login(request):
    return render(request, 'login.html')

def signup(request):
    if request.method == "POST":
        username = request.POST.get("username")
        email = request.POST.get("email")
        password = request.POST.get("password")

        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already exists")
            return render(request, "signup.html")

        User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        messages.success(request, "Account created successfully")
        return redirect("login")

    return render(request, "signup.html")

@login_required
def checkout(request):

    if request.method == "POST":
        full_name = request.POST.get("full_name")
        phone = request.POST.get("phone")
        address = request.POST.get("address")
        city = request.POST.get("city")
        state = request.POST.get("state")
        pincode = request.POST.get("pincode")

        Address.objects.create(
            user=request.user,
            full_name=full_name,
            phone=phone,
            address=address,
            city=city,
            state=state,
            pincode=pincode
        )

        return redirect("order-summary")

    return render(request, "checkout.html")

def coupon(request):
    return render(request, 'coupon.html')

def gift(request):
    return render(request, 'gift.html')

def offers(request):
    return render(request, 'offers.html')

def newproducts(request):
    return render(request, 'new-products.html')

def sportsaccessories(request):
    return render(request, 'sports-accessories.html')

@login_required
def ordersummary(request):

    cart_items = CartItem.objects.filter(user=request.user)

    if request.method == "POST":

        address = Address.objects.filter(
            user=request.user
        ).last()

        total = 0

        for item in cart_items:
            total += item.product.price * item.quantity

        order = Order.objects.create(
            user=request.user,
            address=address,
            total_amount=total
        )

        for item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=item.product.price
            )
            item.product.stock -= item.quantity
            item.product.save()

            Payment.objects.create(
                order=order,
                amount=total,
                status="Success"
            )
            OrderTracking.objects.create(
                order=order,
                status="Pending",
                message="Your order has been placed"
                )
        cart_items.delete()

        return redirect("orderconfirmed")

    total = 0

    for item in cart_items:
        total += item.product.price * item.quantity

    return render(
        request,
        "order-summary.html",
        {
            "items": cart_items,
            "total": total
        }
    )

def orderconfirmed(request):
    return render(request, 'order-confirmed.html')

def productsdetails(request):
    return render(request, 'products-details.html')

def fitness(request):
    return render(request, 'fitness.html')

def home(request):
    return redirect('index')

def goabout(request):
    return redirect('about')

def goproducts(request):
    return redirect('products')

def gocart(request):
    if request.user.is_authenticated:
        items = CartItem.objects.filter(user=request.user)
    else:
        items = []

    return render(request, "cart.html", {"items": items})

def login(request):
    if request.method == "POST":

        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(
            request,
            username=username,
            password=password
        )

        if user is not None:
            auth_login(request, user)
            messages.success(request, "Login successful!")
            return redirect("index")

        messages.error(request, "Invalid username or password")

    return render(request, "login.html")

def gosignup(request):
    return redirect('signup')

def gocheckout(request):
    return redirect('checkout')

def gooffers(request):
    return redirect('offers')

def gogift(request):
    return redirect('gift')

def gocoupon(request):
    return redirect('coupon')

def gonewproducts(request):
    return redirect('new-products')

def gosports(request):
    return redirect('sports-accessories')

def goordersummary(request):
    return redirect('order-summary')

def goorderconfirmed(request):
    return redirect('order-confirmed')

def goproductdetails(request):
    return redirect('productsdetails')

@login_required
def add_to_cart(request, product_id):
    product = Product.objects.get(id=product_id)

    item, created = CartItem.objects.get_or_create(
        user=request.user,
        product=product
    )

    if not created:
        item.quantity += 1
        item.save()

    return redirect("cart")

@login_required
def order_tracking(request):
    order = Order.objects.filter(user=request.user).last()

    return render(
        request,
        "order-tracking.html",
        {"order": order}
    )

def logout_user(request):
    logout(request)
    return redirect("login")