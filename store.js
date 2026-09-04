const SUPABASE_URL = 'https://fvxpfpqkdsznvvreicfc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dC4BDvHAExevhXghB6-8rQ_RLtR12zB';

if (!window.supabase) {
    document.addEventListener('DOMContentLoaded', () => {
        const el = document.getElementById('products');
        if (el) {
            el.innerHTML =
                '<div class="empty">Could not load the store database. Please refresh the page.</div>';
        }
    });
    throw new Error('Supabase JS library not loaded.');
}

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

window.allPhones = [];

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

async function loadPhones() {
    const productsEl = document.getElementById('products');
    const searchEl = document.getElementById('search');

    if (!productsEl) return;

    const q = (searchEl?.value || '').toLowerCase().trim();

    const { data: phones, error } = await supabase
        .from('phones')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('STORE SELECT ERROR:', error);
        productsEl.innerHTML =
            '<div class="empty">Could not load listings. Please refresh.</div>';
        return;
    }

    window.allPhones = phones || [];

    const list = window.allPhones.filter(p =>
        [
            p.name,
            p.storage,
            p.color,
            p.condition,
            p.battery,
            p.description
        ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );

    productsEl.innerHTML = list.length
        ? list.map(p => {
            const images = Array.isArray(p.images)
                ? p.images.filter(Boolean)
                : [];

            return `
                <article class="product" onclick="showProduct('${esc(p.id)}')">

                    <div class="photo">
                        ${
                            images[0]
                                ? `<img src="${esc(images[0])}" alt="${esc(p.name)}">`
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
                        ${images.length > 1
                            ? `View ${images.length} Photos →`
                            : 'View Details →'}
                    </div>

                </article>
            `;
        }).join('')
        : '<div class="empty">No iPhones found.</div>';
}

let currentGalleryIndex = 0;
let currentGalleryImages = [];

function showProduct(id) {
    const phone = window.allPhones.find(
        p => String(p.id) === String(id)
    );

    if (!phone) return;

    currentGalleryImages = Array.isArray(phone.images)
        ? phone.images.filter(Boolean)
        : [];

    currentGalleryIndex = 0;

    let details = document.getElementById('product-details');

    if (!details) {
        details = document.createElement('section');
        details.id = 'product-details';

        const section = document.getElementById('iphones');
        if (section) section.appendChild(details);
    }

    const gallery = currentGalleryImages.length
        ? `
            <div class="details-gallery">

                <div class="gallery-main">

                    <button
                        class="gallery-arrow gallery-prev"
                        type="button"
                        onclick="changeGallery(-1, event)"
                        aria-label="Previous image"
                        ${currentGalleryImages.length <= 1 ? 'hidden' : ''}
                    >‹</button>

                    <img
                        id="galleryMainImage"
                        src="${esc(currentGalleryImages[0])}"
                        alt="${esc(phone.name)}"
                    >

                    <button
                        class="gallery-arrow gallery-next"
                        type="button"
                        onclick="changeGallery(1, event)"
                        aria-label="Next image"
                        ${currentGalleryImages.length <= 1 ? 'hidden' : ''}
                    >›</button>

                </div>

                ${
                    currentGalleryImages.length > 1
                        ? `
                            <div class="gallery-counter">
                                <span id="galleryCounter">1</span>
                                /
                                ${currentGalleryImages.length}
                            </div>

                            <div class="gallery-thumbs">
                                ${currentGalleryImages.map((url, index) => `
                                    <button
                                        class="gallery-thumb ${index === 0 ? 'active' : ''}"
                                        type="button"
                                        onclick="selectGalleryImage(${index}, event)"
                                        aria-label="View image ${index + 1}"
                                    >
                                        <img
                                            src="${esc(url)}"
                                            alt="${esc(phone.name)} image ${index + 1}"
                                        >
                                    </button>
                                `).join('')}
                            </div>
                        `
                        : ''
                }

            </div>
        `
        : `<div class="details-image"><div class="placeholder"></div></div>`;

    details.innerHTML = `
        <div class="details-card">

            <button
                class="close-details"
                type="button"
                onclick="closeProduct(event)"
                aria-label="Close"
            >
                ×
            </button>

            ${gallery}

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

                    <p>
                        Contact us directly to arrange a meet-up.
                    </p>

                    <div class="contact-item">
                        📘
                        <strong>Facebook:</strong>
                        <a
                            href="https://www.facebook.com/armanstephent"
                            target="_blank"
                            rel="noopener noreferrer"
                            onclick="event.stopPropagation()"
                        >
                            Visit our Facebook
                        </a>
                    </div>

                    <div class="contact-item">
                        📱
                        <strong>Mobile:</strong>
                        <a
                            href="tel:09451173532"
                            onclick="event.stopPropagation()"
                        >
                            0945 117 3532
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

function changeGallery(direction, event) {
    if (event) event.stopPropagation();

    if (currentGalleryImages.length <= 1) return;

    currentGalleryIndex =
        (currentGalleryIndex + direction + currentGalleryImages.length)
        % currentGalleryImages.length;

    updateGallery();
}

function selectGalleryImage(index, event) {
    if (event) event.stopPropagation();

    if (
        index < 0 ||
        index >= currentGalleryImages.length
    ) return;

    currentGalleryIndex = index;
    updateGallery();
}

function updateGallery() {
    const image = document.getElementById('galleryMainImage');
    const counter = document.getElementById('galleryCounter');

    if (image) {
        image.src = currentGalleryImages[currentGalleryIndex];
    }

    if (counter) {
        counter.textContent =
            String(currentGalleryIndex + 1);
    }

    document.querySelectorAll('.gallery-thumb')
        .forEach((thumb, index) => {
            thumb.classList.toggle(
                'active',
                index === currentGalleryIndex
            );
        });
}

function closeProduct(event) {
    if (event) event.stopPropagation();

    const details = document.getElementById('product-details');

    if (details) {
        details.remove();
    }

    currentGalleryImages = [];
    currentGalleryIndex = 0;
}

function renderProducts() {
    loadPhones();
}

function contactSeller() {
    const modal = document.getElementById('contactModal');

    if (modal) {
        modal.hidden = false;
    }
}

function openContactModal() {
    contactSeller();
}

function closeContactModal() {
    const modal = document.getElementById('contactModal');

    if (modal) {
        modal.hidden = true;
    }
}

/* Live synchronization with Admin/Supabase */
supabase
    .channel('mgh-phones-live')
    .on(
        'postgres_changes',
        {
            event: '*',
            schema: 'public',
            table: 'phones'
        },
        () => loadPhones()
    )
    .subscribe();

document.addEventListener('click', event => {
    const modal = document.getElementById('contactModal');

    if (
        modal &&
        event.target === modal
    ) {
        modal.hidden = true;
    }
});

loadPhones();
