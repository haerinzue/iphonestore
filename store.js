const SUPABASE_URL = 'https://fvxpfpqkdsznvvreicfc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dC4BDvHAExevhXghB6-8rQ_RLtR12zB';

// Guard: if the Supabase library failed to load, show a visible error
// instead of failing silently with a blank product list.
if (!window.supabase) {
    document.addEventListener('DOMContentLoaded', () => {
        const el = document.getElementById('products');
        if (el) {
            el.innerHTML =
                '<div class="empty">Failed to load required library. ' +
                'Check your internet connection or ad-blocker, then reload.</div>';
        }
    });
    throw new Error('Supabase JS library not loaded — aborting store.js setup.');
}

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

async function loadPhones() {
    const q = (document.getElementById('search').value || '').toLowerCase();
    const productsEl = document.getElementById('products');

    const { data: phones, error } = await supabase
        .from('phones')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('SELECT ERROR:', error);
        productsEl.innerHTML =
            '<div class="empty">Could not load listings. Please try again later.</div>';
        return;
    }

    window.allPhones = phones || [];

    const list = window.allPhones.filter(p =>
        (p.name + ' ' + p.storage + ' ' + p.color + ' ' + p.condition)
            .toLowerCase()
            .includes(q)
    );

    productsEl.innerHTML = list.length
        ? list.map(p => `
            <article class="product" onclick="showProduct('${p.id}')">

                <div class="photo">
                    ${
                        p.images && p.images[0]
                            ? `<img src="${esc(p.images[0])}" alt="${esc(p.name)}">`
                            : `<div class="placeholder"></div>`
                    }
                </div>

                <h3>${esc(p.name)}</h3>

                <div class="meta">
                    ${esc(p.storage || '')}
                    ${p.color ? ' • ' + esc(p.color) : ''}
                    <br>
                    Condition: ${esc(p.condition || 'Not specified')}
                    <br>
                    Battery Health: ${esc(p.battery || 'Not specified')}
                </div>

                <div class="price">
                    ₱${Number(p.price || 0).toLocaleString('en-PH')}
                </div>

                <div class="view-details">
                    View Details →
                </div>

            </article>
        `).join('')
        : '<div class="empty">No iPhones found.</div>';
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

            <button class="close-details" onclick="closeProduct(event)">
                ×
            </button>

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

                <div class="details-price">
                    ₱${Number(phone.price || 0).toLocaleString('en-PH')}
                </div>

                <div class="details-specs">

                    <p>
                        <strong>Storage:</strong>
                        ${esc(phone.storage || 'Not specified')}
                    </p>

                    <p>
                        <strong>Color:</strong>
                        ${esc(phone.color || 'Not specified')}
                    </p>

                    <p>
                        <strong>Condition:</strong>
                        ${esc(phone.condition || 'Not specified')}
                    </p>

                    <p>
                        <strong>Battery Health:</strong>
                        ${esc(phone.battery || 'Not specified')}
                    </p>

                </div>

                ${
                    phone.description
                        ? `
                            <div class="description">
                                <strong>Description</strong>
                                <p>${esc(phone.description)}</p>
                            </div>
                        `
                        : ''
                }

                <div class="contact-box">

                    <h3>Interested in this iPhone?</h3>

                    <p>Contact us directly to arrange a meet-up.</p>

                    <div class="contact-item">
                        📘
                        <strong>Facebook:</strong>
                        <a
                            href="https://www.facebook.com/armanstephent"
                            target="_blank"
                            onclick="event.stopPropagation()"
                        >
                            Visit our Facebook
                        </a>
                    </div>

                    <div class="contact-item">
                        📱
                        <strong>Mobile:</strong>
                        <a href="tel:09451173532"
                           onclick="event.stopPropagation()">
                            YOUR MOBILE NUMBER
                        </a>
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

    details.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}


function closeProduct(event) {

    event.stopPropagation();

    const details = document.getElementById('product-details');

    if (details) {
        details.remove();
    }
}


function esc(s) {
    return String(s ?? '').replace(
        /[&<>"']/g,
        m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m])
    );
}


loadPhones();
