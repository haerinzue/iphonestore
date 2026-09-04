const SUPABASE_URL = 'https://fvxpfpqkdsznvvreicfc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dC4BDvHAExevhXghB6-8rQ_RLtR12zB';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
const loginScreen = $('loginScreen');
const app = $('app');
const loginForm = $('loginForm');
const loginStatus = $('loginStatus');
const phoneForm = $('phoneForm');
const statusEl = $('status');
const listEl = $('list');
let editingId = null;
let phonesCache = [];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

function setLoginStatus(text, error=false) {
  loginStatus.textContent = text || '';
  loginStatus.className = 'status ' + (error ? 'error' : 'success');
}

function setStatus(text, error=false) {
  statusEl.textContent = text || '';
  statusEl.className = 'status ' + (error ? 'error' : 'success');
}

function showApp() {
  loginScreen.hidden = true;
  app.hidden = false;
}

function showLogin() {
  app.hidden = true;
  loginScreen.hidden = false;
}

async function isAdmin() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return false;
  const { data, error } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (error) {
    console.error('Admin check failed:', error);
    return false;
  }
  return !!data;
}

async function boot() {
  if (!window.supabase) {
    setLoginStatus('Supabase failed to load. Reload the page.', true);
    return;
  }

  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    showLogin();
    return;
  }

  if (!(await isAdmin())) {
    await db.auth.signOut();
    showLogin();
    setLoginStatus('This account is not authorized to access the admin panel.', true);
    return;
  }

  showApp();
  await refresh();
}

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  setLoginStatus('Signing in...');
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;

  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    setLoginStatus('Sign in failed. Check your email/password.', true);
    console.error(error);
    return;
  }

  if (!(await isAdmin())) {
    await db.auth.signOut();
    setLoginStatus('This account is not authorized for admin access.', true);
    return;
  }

  loginForm.reset();
  showApp();
  await refresh();
});

$('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  resetForm();
  showLogin();
  setLoginStatus('Signed out.');
});

db.auth.onAuthStateChange(async (event, session) => {
  if (!session) {
    showLogin();
  }
});

async function refresh() {
  listEl.innerHTML = '<p class="muted">Loading listings...</p>';

  const { data, error } = await db
    .from('phones')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    listEl.innerHTML = '<p class="error">Failed to load listings: ' + esc(error.message) + '</p>';
    return;
  }

  phonesCache = data || [];
  if (!phonesCache.length) {
    listEl.innerHTML = '<p class="muted">No listings yet.</p>';
    return;
  }

  listEl.innerHTML = phonesCache.map(p => `
    <div class="item">
      <img class="thumb" src="${esc(p.images?.[0] || '')}" alt="${esc(p.name)}">
      <div class="item-info">
        <strong>${esc(p.name)}</strong>
        <div>₱${Number(p.price || 0).toLocaleString('en-PH')} • ${esc(p.storage || '')} • ${esc(p.color || '')} • ${esc(p.condition || '')}</div>
        <div>Battery: ${esc(p.battery || 'N/A')}</div>
      </div>
      <div class="item-buttons">
        <button class="edit" onclick="editPhone('${esc(p.id)}')">Edit</button>
        <button class="delete" onclick="removePhone('${esc(p.id)}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function resetForm() {
  editingId = null;
  phoneForm.reset();
  $('phoneId').value = '';
  $('formTitle').textContent = 'Add iPhone';
  $('formHint').textContent = 'Publish a new listing to the store.';
  $('submitBtn').textContent = 'Upload & Publish';
  $('cancelEditBtn').hidden = true;
  $('imageHelp').textContent = 'Select one or more photos. New listings require at least one image. When editing, leave empty to keep the current photos.';
  setStatus('');
}

window.editPhone = function(id) {
  const p = phonesCache.find(x => String(x.id) === String(id));
  if (!p) return;

  editingId = p.id;
  $('phoneId').value = p.id;
  phoneForm.elements.name.value = p.name || '';
  phoneForm.elements.price.value = p.price ?? '';
  phoneForm.elements.storage.value = p.storage || '';
  phoneForm.elements.color.value = p.color || '';
  phoneForm.elements.condition.value = p.condition || '';
  phoneForm.elements.battery.value = p.battery || '';
  phoneForm.elements.description.value = p.description || '';
  $('formTitle').textContent = 'Edit iPhone';
  $('formHint').textContent = 'Update the listing and save your changes.';
  $('submitBtn').textContent = 'Save Changes';
  $('cancelEditBtn').hidden = false;
  $('imageHelp').textContent = 'Leave the image field empty to keep the existing photos. Selecting new photos will replace the current photo set.';
  window.scrollTo({top:0, behavior:'smooth'});
};

$('cancelEditBtn').addEventListener('click', resetForm);
$('refreshBtn').addEventListener('click', refresh);

async function uploadImages(files) {
  const urls = [];
  const paths = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`);
    if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10MB.`);

    setStatus(`Uploading image ${i + 1} of ${files.length}...`);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${crypto.randomUUID()}-${safeName}`;

    const { error } = await db.storage.from('phone-images').upload(path, file, {
      contentType: file.type,
      upsert: false
    });
    if (error) throw new Error('Storage upload failed: ' + error.message);

    paths.push(path);
    const { data } = db.storage.from('phone-images').getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('Could not create image URL.');
    urls.push(data.publicUrl);
  }

  return { urls, paths };
}

function pathsFromUrls(urls) {
  return (urls || [])
    .map(url => {
      const marker = '/phone-images/';
      const i = String(url).indexOf(marker);
      return i >= 0 ? decodeURIComponent(String(url).slice(i + marker.length)) : null;
    })
    .filter(Boolean);
}

async function cleanupStorage(urls) {
  const paths = pathsFromUrls(urls);
  if (!paths.length) return;
  const { error } = await db.storage.from('phone-images').remove(paths);
  if (error) console.error('Storage cleanup failed:', error);
}

phoneForm.addEventListener('submit', async e => {
  e.preventDefault();
  const submitBtn = $('submitBtn');
  submitBtn.disabled = true;

  try {
    const fd = new FormData(phoneForm);
    const files = Array.from(phoneForm.elements.images.files || []);
    const payload = {
      name: fd.get('name'),
      price: Number(fd.get('price')),
      storage: fd.get('storage'),
      color: fd.get('color'),
      condition: fd.get('condition'),
      battery: fd.get('battery'),
      description: fd.get('description')
    };

    if (!editingId && !files.length) throw new Error('Please select at least one image.');

    if (editingId) {
      const old = phonesCache.find(p => String(p.id) === String(editingId));
      let newPaths = [];
      if (files.length) {
        const uploaded = await uploadImages(files);
        payload.images = uploaded.urls;
        newPaths = uploaded.paths;
      }

      setStatus('Saving changes...');
      const { error } = await db.from('phones').update(payload).eq('id', editingId);
      if (error) {
        if (newPaths.length) await db.storage.from('phone-images').remove(newPaths);
        throw new Error('Database update failed: ' + error.message);
      }

      if (files.length && old?.images?.length) await cleanupStorage(old.images);
      setStatus('Changes saved.');
    } else {
      const uploaded = await uploadImages(files);
      payload.images = uploaded.urls;

      setStatus('Publishing listing...');
      const { error } = await db.from('phones').insert(payload);
      if (error) {
        await db.storage.from('phone-images').remove(uploaded.paths);
        throw new Error('Database save failed: ' + error.message);
      }
      setStatus('Published.');
    }

    resetForm();
    await refresh();
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Operation failed.', true);
  } finally {
    submitBtn.disabled = false;
  }
});

window.removePhone = async function(id) {
  if (!confirm('Delete this listing?')) return;

  const p = phonesCache.find(x => String(x.id) === String(id));
  const { error } = await db.from('phones').delete().eq('id', id);
  if (error) {
    alert(error.message);
    return;
  }

  if (p?.images?.length) await cleanupStorage(p.images);
  await refresh();
};

$('deleteAllBtn').addEventListener('click', async () => {
  if (!phonesCache.length) return;
  if (!confirm('Delete ALL listings and their stored images? This cannot be undone.')) return;

  const ids = phonesCache.map(p => p.id);
  const allImages = phonesCache.flatMap(p => p.images || []);

  const { error } = await db.from('phones').delete().in('id', ids);
  if (error) {
    alert(error.message);
    return;
  }

  await cleanupStorage(allImages);
  resetForm();
  await refresh();
});

boot();
