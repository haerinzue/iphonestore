const SUPABASE_URL = 'https://fvxpfpqkdsznvvreicfc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dC4BDvHAExevhXghB6-8rQ_RLtR12zB';

if (!window.supabase) {
    document.addEventListener('DOMContentLoaded', () => {
        const el = document.getElementById('products');
        if (el) {
            el.innerHTML =
                '<div class="empty">Failed to load Supabase. Check your internet connection or ad-blocker, then reload.</div>';
        }
    });
    throw new Error('Supabase JS library not loaded.');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.allPhones = [];
let cart = [];

function esc(s) {
    return String(s ?? '').replace(
        /[&<>"']/g,
        m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            '"': '&quot;', "'": '&#39;'
        }[m])
    );
}

function peso(n) {
    return '₱' + Number(n || 0).toLocaleString('en-PH');
}

async function loadPhones() {
    const productsEl = document.getElementById('products');
    const searchEl = document.getElementById('search');
    const q = (searchEl?.value || '').trim().toLowerCase();

    productsEl.innerHTML = '<div class="empty">Loading iPhones...</div>';

    const { data: phones, error } = await supabase
        .from('phones')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('SELECT ERROR:', error);
        productsEl.innerHTML =
            '<div class="empty">Could not load listings. Please check your Supabase table/RLS settings.</div>';
        return;
    }

    window.allPhones = phones || [];

    const list = window.allPhones.filter(p =>
        [
            p.name, p.storage, p.color, p.condition, p.battery, p.description
        ].filter(Boolean).join(' ').toLowerCase().includes(q)
    );

    productsEl.innerHTML = list.length
        ? list.map(p => `
            <article class="product" onclick="showProduct('${esc(p.id)}')">
                <div class="photo product-img">
                    ${
                        p.images && p.images[0]
                            ? `<img src="${esc(p.images[0])}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:11px;">`
                            : `<div class="mini-phone"></div>`
                    }
                </div>
                <h3>${esc(p.name)}</h3>
                <p>
                    ${esc(p.storage || '')}
                    ${p.color ? ' • ' + esc(p.color) : ''}
                </p>
                <div class="price">${peso(p.price)}</div>
                <button class="add" onclick="event.stopPropagation(); addToCartById('${esc(p.id)}')">Add to cart</button>
            </article>
        `).join('')
        : '<div class="empty">No iPhones found.</div>';
}

function addToCartById(id) {
    const phone = window.allPhones.find(p => String(p.id) === String(id));
    if (!phone) return;
    cart.push(phone);
    updateCart();
    openCart();
}

function updateCart() {
    document.getElementById('cartCount').textContent = cart.length;

    const box = document.getElementById('cartItems');
    box.innerHTML = cart.length
        ? cart.map(p =>
            `<div class="cart-row"><span>${esc(p.name)}</span><strong>${peso(p.price)}</strong></div>`
          ).join('')
        : "<p style='color:#91a0b9'>Your cart is empty.</p>";

    document.getElementById('cartTotal').textContent =
        peso(cart.reduce((sum, p) => sum + Number(p.price || 0), 0));
}

function openCart() {
    document.getElementById('cartModal').classList.add('show');
}

function closeCart() {
    document.getElementById('cartModal').classList.remove('show');
}

function checkout() {
    if (!cart.length) return alert('Your cart is empty.');
    alert('Checkout demo — connect this button to your preferred payment/order system.');
}

function contactSeller() {
    window.open('https://www.facebook.com/armanstephent', '_blank', 'noopener,noreferrer');
}

function showProduct(id) {
    const phone = window.allPhones.find(p => String(p.id) === String(id));
    if (!phone) return;

    let details = document.getElementById('product-details');

    if (!details) {
        details = document.createElement('section');
        details.id = 'product-details';
        document.getElementById('iphones').appendChild(details);
    }

    details.innerHTML = `
        <div class="details-card">
            <button class="close-details" onclick="closeProduct(event)">×</button>
            <div class="details-image">
                ${
                    phone.images && phone.images[0]
                        ? `<img src="${esc(phone.images[0])}" alt="${esc(phone.name)}">`
                        : `<div class="placeholder"></div>`
                }
            </div>

            <div class="details-info">
                <p class="eyebrow">IPHONE DETAILS</p>
                <h2>${esc(phone.name)}</h2>
                <div class="details-price">${peso(phone.price)}</div>

                <div class="details-specs">
                    <p><strong>Storage:</strong> ${esc(phone.storage || 'Not specified')}</p>
                    <p><strong>Color:</strong> ${esc(phone.color || 'Not specified')}</p>
                    <p><strong>Condition:</strong> ${esc(phone.condition || 'Not specified')}</p>
                    <p><strong>Battery Health:</strong> ${esc(phone.battery || 'Not specified')}</p>
                </div>

                ${
                    phone.description
                        ? `<div class="description"><strong>Description</strong><p>${esc(phone.description)}</p></div>`
                        : ''
                }

                <div class="contact-box">
                    <h3>Interested in this iPhone?</h3>
                    <p>Contact us directly to arrange a meet-up.</p>
                    <div class="contact-item">
                        📘 <strong>Facebook:</strong>
                        <a href="https://www.facebook.com/armanstephent" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Visit our Facebook</a>
                    </div>
                    <div class="contact-item">
                        📱 <strong>Mobile:</strong>
                        <a href="tel:09451173532" onclick="event.stopPropagation()">0945 117 3532</a>
                    </div>
                </div>

                <div class="payment-box">
                    <h3>Payment Method</h3>
                    <p>🤝 Meet-up Only</p>
                    <div class="payment-options">
                        <span>💵 Cash</span>
                        <span>📱 GCash</span>
                        <span>🏦 Bank Transfer</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeProduct(event) {
    event.stopPropagation();
    const details = document.getElementById('product-details');
    if (details) details.remove();
}

loadPhones();
updateCart();
