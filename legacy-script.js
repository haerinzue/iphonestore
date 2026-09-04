const products=[
 {name:"iPhone 17 Pro Max",desc:"256GB • Brand New",price:69990},
 {name:"iPhone 17 Pro",desc:"256GB • Brand New",price:62990},
 {name:"iPhone 16 Pro Max",desc:"256GB • Excellent",price:55990},
 {name:"iPhone 16",desc:"128GB • Brand New",price:42990},
 {name:"iPhone 15 Pro Max",desc:"256GB • Excellent",price:44990},
 {name:"iPhone 15",desc:"128GB • Brand New",price:33990},
 {name:"iPhone 14 Pro",desc:"128GB • Excellent",price:29990},
 {name:"iPhone 13",desc:"128GB • Good Condition",price:23990}
];
let cart=[];

function peso(n){return "₱"+n.toLocaleString("en-PH")}
function renderProducts(){
 const q=document.getElementById("search").value.toLowerCase();
 const list=products.filter(p=>p.name.toLowerCase().includes(q));
 document.getElementById("products").innerHTML=list.map((p,i)=>`
 <article class="product">
   <div class="product-img"><div class="mini-phone"></div></div>
   <h3>${p.name}</h3><p>${p.desc}</p>
   <div class="price">${peso(p.price)}</div>
   <button class="add" onclick="addToCart(${products.indexOf(p)})">Add to cart</button>
 </article>`).join("");
}
function addToCart(i){cart.push(products[i]);updateCart();openCart()}
function updateCart(){
 document.getElementById("cartCount").textContent=cart.length;
 const box=document.getElementById("cartItems");
 box.innerHTML=cart.length?cart.map((p,i)=>`<div class="cart-row"><span>${p.name}</span><strong>${peso(p.price)}</strong></div>`).join(""):"<p style='color:#91a0b9'>Your cart is empty.</p>";
 document.getElementById("cartTotal").textContent=peso(cart.reduce((s,p)=>s+p.price,0));
}
function openCart(){document.getElementById("cartModal").classList.add("show")}
function closeCart(){document.getElementById("cartModal").classList.remove("show")}
function checkout(){
 if(!cart.length)return alert("Your cart is empty.");
 alert("Checkout demo — connect this button to your preferred payment/order system.");
}
function contactSeller(){alert("Add your Messenger, Facebook page, phone number, or email here.")}
renderProducts();updateCart();
