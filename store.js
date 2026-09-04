const SUPABASE_URL = 'https://fvxpfpqkdsznvvreicfc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dC4BDvHAExevhXghB6-8rQ_RLtR12zB';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let allPhones = [];

document.addEventListener('DOMContentLoaded', () => {
    const search = document.getElementById('search');
    if (search) search.addEventListener('input', renderProducts);
    loadPhones();
});

async function loadPhones() {
    const products = document.getElementById('products');
    products.innerHTML = '<div class="empty">Loading iPhones...</div>';

    const { data, error } = await supabaseClient
        .from('phones')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('STORE LOAD ERROR:', error);
        products.innerHTML = '<div class="empty">Unable to load iPhones. Please refresh the page.</div>';
        return;
    }

    allPhones = data || [];
    renderProducts();
}

function renderProducts() {
    const products = document.getElementById('products');
    const search = (document.getElementById('search')?.value || '').toLowerCase().trim();

    const filtered = allPhones.filter(p => {
        const text = [
            p.name, p.storage, p.color, p.condition,
            p.battery, p.description
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes(search);
    });

    if (!filtered.length) {
        products.innerHTML = '<div class="empty">No iPhones listed yet.</div>';
        return;
    }

    products.innerHTML = filtered.map(p => {
        const image = Array.isArray(p.images) ? p.images[0] : null;

        return `
        <article class="product" onclick="showProduct('${p.id}')">
            <div class="photo">
                ${image
                    ? `<img src="${esc(image)}" alt="${esc(p.name)}" loading="lazy">`
                    : '<div class="placeholder"></div>'}
            </div>
            <h3>${esc(p.name)}</h3>
            <div class="meta">
                ${esc(p.storage || '')}${p.color ? ' • ' + esc(p.color) : ''}
                <br>Condition: ${esc(p.condition || 'Not specified')}
                <br>Battery Health: ${esc(p.battery || 'Not specified')}
            </div>
            <div class="price">₱${Number(p.price || 0).toLocaleString('en-PH')}</div>
            <div class="view-details">View Details →</div>
        </article>`;
    }).join('');
}

function showProduct(id) {
    const phone = allPhones.find(p => String(p.id) === String(id));
    if (!phone) return;

    let details = document.getElementById('product-details');
    if (!details) {
        details = document.createElement('section');
        details.id = 'product-details';
        document.getElementById('iphones').appendChild(details);
    }

    const image = Array.isArray(phone.images) ? phone.images[0] : null;

    details.innerHTML = `
    <div class="details-card">
        <button class="close-details" onclick="closeProduct(event)">×</button>
        <div class="details-image">
            ${image ? `<img src="${esc(image)}" alt="${esc(phone.name)}">` : '<div class="placeholder"></div>'}
        </div>
        <div class="details-info">
            <p class="eyebrow">IPHONE DETAILS</p>
            <h2>${esc(phone.name)}</h2>
            <div class="details-price">₱${Number(phone.price || 0).toLocaleString('en-PH')}</div>

            <div class="details-specs">
                <p><strong>Storage:</strong> ${esc(phone.storage || 'Not specified')}</p>
                <p><strong>Color:</strong> ${esc(phone.color || 'Not specified')}</p>
                <p><strong>Condition:</strong> ${esc(phone.condition || 'Not specified')}</p>
                <p><strong>Battery Health:</strong> ${esc(phone.battery || 'Not specified')}</p>
            </div>

            ${phone.description ? `
            <div class="description">
                <strong>Description</strong>
                <p>${esc(phone.description)}</p>
            </div>` : ''}

            <div class="contact-box">
                <h3>Interested in this iPhone?</h3>
                <p>Contact us to arrange a meetup.</p>
                <p>📘 <strong>Facebook:</strong>
                    <a href="https://www.facebook.com/armanstephent" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Visit our Facebook</a>
                </p>
                <p>📱 <strong>Mobile:</strong>
                    <a href="tel:09451173532" onclick="event.stopPropagation()">0945 117 3532</a>
                </p>
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
    </div>`;

    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeProduct(event) {
    if (event) event.stopPropagation();
    document.getElementById('product-details')?.remove();
}

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[char]));
}
