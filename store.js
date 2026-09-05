const SUPABASE_URL = 'https://fvxpfpqkdsznvvreicfc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dC4BDvHAExevhXghB6-8rQ_RLtR12zB';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let allPhones = [];
let activePhone = null;
let galleryIndex = 0;

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
const imagesOf = phone => Array.isArray(phone?.images) ? phone.images.filter(Boolean) : [];
const money = value => `₱${Number(value || 0).toLocaleString('en-PH')}`;

async function loadPhones(){
  const products = $('products');
  if (!products) return;
  const {data, error} = await db.from('phones').select('*').order('created_at',{ascending:false});
  if(error){ console.error(error); products.innerHTML='<div class="empty">Could not load listings. Please refresh the page.</div>'; return; }
  allPhones = data || [];
  renderProducts();
}

function renderProducts(){
  const products = $('products');
  const q = ($('search')?.value || '').trim().toLowerCase();
  const list = allPhones.filter(p => `${p.name||''} ${p.storage||''} ${p.color||''} ${p.condition||''} ${p.battery||''}`.toLowerCase().includes(q));
  if(!list.length){ products.innerHTML='<div class="empty">No iPhones found.</div>'; return; }
  products.innerHTML = list.map(p => {
    const imgs = imagesOf(p); const img = imgs[0];
    return `<article class="product" data-id="${esc(p.id)}">
      <div class="photo">${img ? `<img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">` : '<div class="empty">No image</div>'}</div>
      <h3>${esc(p.name)}</h3>
      <div class="meta">${esc(p.storage || 'Storage not specified')}${p.color ? ` • ${esc(p.color)}`:''}<br>Condition: ${esc(p.condition || 'Not specified')}<br>Battery Health: ${esc(p.battery || 'Not specified')}</div>
      <div class="price">${money(p.price)}</div><div class="view-details">View Details →</div>
    </article>`;
  }).join('');
  products.querySelectorAll('.product').forEach(card => card.addEventListener('click', () => showProduct(card.dataset.id)));
}

function showProduct(id){
  activePhone = allPhones.find(p => String(p.id) === String(id));
  if(!activePhone) return;
  galleryIndex = 0;
  const imgs = imagesOf(activePhone);
  const modal = $('detailsModal');
  modal.innerHTML = `<div class="details-card">
    <button class="close-btn" type="button" onclick="closeProduct()">×</button>
    <div class="detail-layout">
      <div>
        <div class="gallery-main">
          ${imgs.length ? `<img id="galleryImage" src="${esc(imgs[0])}" alt="${esc(activePhone.name)}">` : '<div class="empty">No images uploaded</div>'}
          ${imgs.length > 1 ? `<button class="gallery-arrow gallery-prev" type="button" onclick="changeGallery(-1)">‹</button><button class="gallery-arrow gallery-next" type="button" onclick="changeGallery(1)">›</button><div id="galleryCounter" class="gallery-counter">1 / ${imgs.length}</div>` : ''}
        </div>
        ${imgs.length > 1 ? `<div id="galleryThumbs" class="thumbs">${imgs.map((src,i)=>`<button class="thumb ${i===0?'active':''}" type="button" onclick="selectGalleryImage(${i})"><img src="${esc(src)}" alt="Photo ${i+1}"></button>`).join('')}</div>` : ''}
      </div>
      <div class="detail-info">
        <p class="eyebrow">IPHONE LISTING</p><h2>${esc(activePhone.name)}</h2><div class="detail-price">${money(activePhone.price)}</div>
        ${row('Storage',activePhone.storage)}${row('Color',activePhone.color)}${row('Condition',activePhone.condition)}${row('Battery Health',activePhone.battery)}
        ${activePhone.description ? `<div class="description">${esc(activePhone.description)}</div>` : ''}
        <button class="primary-btn" type="button" onclick="contactSeller()">Contact Seller</button>
        <div class="description"><span class="status-dot"></span>Meetup only • Cash, GCash, or Bank Transfer</div>
      </div>
    </div>
  </div>`;
  modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open');
}
function row(label,value){return `<div class="detail-row"><span>${esc(label)}</span><strong>${esc(value || 'Not specified')}</strong></div>`;}
function closeProduct(){const m=$('detailsModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');activePhone=null; if(!$('contactModal')?.classList.contains('open')) document.body.classList.remove('modal-open');}
function updateGallery(){
  if(!activePhone) return; const imgs=imagesOf(activePhone); if(!imgs.length) return;
  const image=$('galleryImage'); if(image) image.src=imgs[galleryIndex];
  const counter=$('galleryCounter'); if(counter) counter.textContent=`${galleryIndex+1} / ${imgs.length}`;
  document.querySelectorAll('#galleryThumbs .thumb').forEach((b,i)=>b.classList.toggle('active',i===galleryIndex));
}
function changeGallery(delta){const imgs=imagesOf(activePhone); if(!imgs.length)return; galleryIndex=(galleryIndex+delta+imgs.length)%imgs.length;updateGallery();}
function selectGalleryImage(i){galleryIndex=i;updateGallery();}
function contactSeller(){ $('contactModal').classList.add('open'); $('contactModal').setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); }
function closeContact(){ $('contactModal').classList.remove('open'); $('contactModal').setAttribute('aria-hidden','true'); if(!$('detailsModal')?.classList.contains('open')) document.body.classList.remove('modal-open'); }

$('search')?.addEventListener('input', renderProducts);
$('detailsModal')?.addEventListener('click', e => { if(e.target.id === 'detailsModal') closeProduct(); });
$('contactModal')?.addEventListener('click', e => { if(e.target.id === 'contactModal') closeContact(); });
document.addEventListener('keydown', e => { if(e.key==='Escape'){closeProduct();closeContact();} if(e.key==='ArrowLeft' && activePhone) changeGallery(-1); if(e.key==='ArrowRight' && activePhone) changeGallery(1); });

loadPhones();

db.channel('mgh-phones-live-final')
  .on('postgres_changes',{event:'*',schema:'public',table:'phones'},()=>loadPhones())
  .subscribe();
