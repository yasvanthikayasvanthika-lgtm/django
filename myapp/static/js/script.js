function addToCart(name, price){

let cart = JSON.parse(localStorage.getItem("cart")) || [];

cart.push({
    name:name,
    price:price
});

localStorage.setItem("cart", JSON.stringify(cart));

alert(name + " Added To Cart");
}

output += `
<tr>
    <td>${item.name}</td>
    <td>₹${item.price}</td>
    <td>
        <button class="btn btn-danger btn-sm"
                onclick="deleteItem(${index})">
            Delete
        </button>
    </td>
</tr>
`;
