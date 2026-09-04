const SUPABASE_URL = 'https://fvxpfpqkdsznvvreicfc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dC4BDvHAExevhXghB6-8rQ_RLtR12zB';

if (!window.supabase) {
    document.addEventListener('DOMContentLoaded', () => {
        const status = document.getElementById('status');
        const list = document.getElementById('list');
        const msg = 'Failed to load required library (Supabase JS). Check your internet connection or ad-blocker, then reload the page.';
        if (status) status.textContent = msg;
        if (list) list.innerHTML = '<p style="color:#ff6b6b">' + msg + '</p>';
        const form = document.getElementById('phoneForm');
        if (form) form.addEventListener('submit', e => e.preventDefault());
    });
    throw new Error('Supabase JS library not loaded — aborting admin.js setup.');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let editingId = null;
let currentPhones = [];

async function refresh() {
    const el = document.getElementById('list');
    el.innerHTML = '<p style="color:#7f8da7">Loading...</p>';

    const { data: phones, error } = await supabase
        .from('phones')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('SELECT ERROR:', error);
        el.innerHTML = '<p style="color:#ff6b6b">Failed to load listings: ' + esc(error.message) + '</p>';
        return;
    }

    currentPhones = phones || [];

    if (!currentPhones.length) {
        el.innerHTML = '<p style="color:#7f8da7">No listings yet.</p>';
        return;
    }

    el.innerHTML = currentPhones.map(p => `
        <div class="item">
            <img class="thumb" src="${esc(p.images?.[0] || '')}" alt="${esc(p.name)}">
            <div class="item-info">
                <strong>${esc(p.name)}</strong>
                <div>
                    ₱${Number(p.price || 0).toLocaleString('en-PH')}
                    • ${esc(p.storage || '')}
                    • ${esc(p.color || '')}
                    • ${esc(p.condition || '')}
                </div>
                <div>Battery: ${esc(p.battery || 'N/A')}</div>
            </div>
            <button class="btn" type="button" onclick="editPhone('${p.id}')">Edit</button>
            <button class="delete" type="button" onclick="removePhone('${p.id}')">Delete</button>
        </div>
    `).join('');
}

function editPhone(id) {
    const phone = currentPhones.find(p => String(p.id) === String(id));
    if (!phone) return;

    editingId = phone.id;

    const form = document.getElementById('phoneForm');
    form.elements.name.value = phone.name || '';
    form.elements.price.value = phone.price ?? '';
    form.elements.storage.value = phone.storage || '';
    form.elements.color.value = phone.color || '';
    form.elements.condition.value = phone.condition || '';
    form.elements.battery.value = phone.battery || '';
    form.elements.description.value = phone.description || '';
    form.elements.images.value = '';

    document.getElementById('formTitle').textContent = 'Edit iPhone';
    document.getElementById('submitBtn').textContent = 'Save Changes';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
    document.getElementById('imageHelp').textContent =
        'Optional: select new photos to replace the current photos. Leave empty to keep the current photos.';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('status').textContent = `Editing ${phone.name || 'listing'}`;
}

function cancelEdit() {
    editingId = null;
    const form = document.getElementById('phoneForm');
    form.reset();

    document.getElementById('formTitle').textContent = 'Add iPhone';
    document.getElementById('submitBtn').textContent = 'Upload & Publish';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('imageHelp').textContent =
        'Select photos when adding a listing. When editing, leave empty to keep the current photos.';
    document.getElementById('status').textContent = '';
}

document.getElementById('phoneForm').addEventListener('submit', async e => {
    e.preventDefault();

    const status = document.getElementById('status');
    const form = e.target;
    const submitBtn = document.getElementById('submitBtn');
    const formData = new FormData(form);
    const files = form.querySelector('input[name="images"]').files;

    if (submitBtn) submitBtn.disabled = true;

    try {
        let oldImages = [];
        let imageUrls = null;
        const uploadedPaths = [];

        if (editingId) {
            const existing = currentPhones.find(p => String(p.id) === String(editingId));
            oldImages = existing?.images || [];
        }

        // New listings require an image. Edits may keep the existing image.
        if (!editingId && !files.length) {
            throw new Error('Please select at least one image.');
        }

        if (files.length) {
            imageUrls = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                status.textContent = `Uploading image ${i + 1} of ${files.length}...`;

                if (!file.type.startsWith('image/')) {
                    throw new Error(`${file.name} is not an image.`);
                }

                if (file.size > 10 * 1024 * 1024) {
                    throw new Error(`${file.name} is larger than 10MB.`);
                }

                const fileName = `${crypto.randomUUID()}-${file.name}`;

                const { error: uploadError } = await supabase.storage
                    .from('phone-images')
                    .upload(fileName, file, {
                        contentType: file.type,
                        upsert: false
                    });

                if (uploadError) {
                    throw new Error('Storage upload failed: ' + uploadError.message);
                }

                uploadedPaths.push(fileName);

                const { data } = supabase.storage
                    .from('phone-images')
                    .getPublicUrl(fileName);

                if (!data?.publicUrl) {
                    throw new Error('Could not create public image URL.');
                }

                imageUrls.push(data.publicUrl);
            }
        }

        const payload = {
            name: formData.get('name'),
            price: Number(formData.get('price')),
            storage: formData.get('storage'),
            color: formData.get('color'),
            condition: formData.get('condition'),
            battery: formData.get('battery'),
            description: formData.get('description')
        };

        let result;

        if (editingId) {
            if (imageUrls) payload.images = imageUrls;

            status.textContent = 'Saving changes...';

            result = await supabase
                .from('phones')
                .update(payload)
                .eq('id', editingId)
                .select();

            if (result.error) {
                if (uploadedPaths.length) {
                    await supabase.storage.from('phone-images').remove(uploadedPaths);
                }
                throw new Error('Update failed: ' + result.error.message);
            }

            // Only delete old storage files after the database update succeeds.
            if (imageUrls && oldImages.length) {
                const oldPaths = oldImages
                    .map(url => url.split('/phone-images/')[1])
                    .filter(Boolean);

                if (oldPaths.length) {
                    const { error: cleanupError } = await supabase.storage
                        .from('phone-images')
                        .remove(oldPaths);

                    if (cleanupError) console.error('OLD IMAGE CLEANUP ERROR:', cleanupError);
                }
            }

            status.textContent = 'Changes saved and synced to the store!';
        } else {
            payload.images = imageUrls;

            status.textContent = 'Saving listing...';

            result = await supabase
                .from('phones')
                .insert(payload)
                .select();

            if (result.error) {
                if (uploadedPaths.length) {
                    await supabase.storage.from('phone-images').remove(uploadedPaths);
                }
                throw new Error('Database error: ' + result.error.message);
            }

            status.textContent = 'Published!';
        }

        const wasEditing = !!editingId;
        cancelEdit();
        status.textContent = wasEditing
            ? 'Changes saved and synced to the store!'
            : 'Published!';
        await refresh();

    } catch (error) {
        console.error('FINAL ERROR:', error);
        status.textContent = error.message || 'Operation failed.';
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
});

async function removePhone(id) {
    if (!confirm('Delete this listing?')) return;

    const { data: phone, error: findError } = await supabase
        .from('phones')
        .select('images')
        .eq('id', id)
        .single();

    if (findError) {
        alert(findError.message);
        return;
    }

    const { error } = await supabase
        .from('phones')
        .delete()
        .eq('id', id);

    if (error) {
        alert(error.message);
        return;
    }

    if (phone.images?.length) {
        const paths = phone.images
            .map(url => url.split('/phone-images/')[1])
            .filter(Boolean);

        if (paths.length) {
            const { error: removeError } = await supabase.storage
                .from('phone-images')
                .remove(paths);

            if (removeError) console.error('STORAGE CLEANUP ERROR:', removeError);
        }
    }

    await refresh();
}

async function deleteAll() {
    if (!confirm('Delete ALL listings?')) return;

    const { data: phones, error: findError } = await supabase
        .from('phones')
        .select('id, images');

    if (findError) {
        alert(findError.message);
        return;
    }

    if (!phones?.length) {
        await refresh();
        return;
    }

    const ids = phones.map(p => p.id);

    const { error } = await supabase
        .from('phones')
        .delete()
        .in('id', ids);

    if (error) {
        alert(error.message);
        return;
    }

    const paths = phones
        .flatMap(p => p.images || [])
        .map(url => url.split('/phone-images/')[1])
        .filter(Boolean);

    if (paths.length) {
        const { error: removeError } = await supabase.storage
            .from('phone-images')
            .remove(paths);

        if (removeError) console.error('STORAGE CLEANUP ERROR:', removeError);
    }

    await refresh();
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

refresh();
