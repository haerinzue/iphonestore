const SUPABASE_URL = 'https://fvxpfpqkdsznvvreicfc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dC4BDvHAExevhXghB6-8rQ_RLtR12zB';

// Guard: if the Supabase library failed to load (blocked script, bad
// CDN path, offline, etc.), window.supabase won't exist. Without this
// check, everything below silently fails to run, the submit listener
// never attaches, and the <form> falls back to a native GET submit
// (which is why you'd see form fields show up in the URL bar).
if (!window.supabase) {
    document.addEventListener('DOMContentLoaded', () => {
        const status = document.getElementById('status');
        const list = document.getElementById('list');
        const msg = 'Failed to load required library (Supabase JS). ' +
            'Check your internet connection or ad-blocker, then reload the page.';
        if (status) status.textContent = msg;
        if (list) list.innerHTML =
            '<p style="color:#ff6b6b">' + msg + '</p>';
        // Still stop the form from doing a native GET submit.
        const form = document.getElementById('phoneForm');
        if (form) {
            form.addEventListener('submit', e => {
                e.preventDefault();
                if (status) status.textContent = msg;
            });
        }
    });
    throw new Error('Supabase JS library not loaded — aborting admin.js setup.');
}

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

async function refresh() {
    const el = document.getElementById('list');
    el.innerHTML = '<p style="color:#7f8da7">Loading...</p>';

    const { data: phones, error } = await supabase
        .from('phones')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('SELECT ERROR:', error);
        el.innerHTML =
            '<p style="color:#ff6b6b">Failed to load listings: ' +
            esc(error.message) +
            '</p>';
        return;
    }

    console.log('Fetched phones:', phones);

    if (!phones || phones.length === 0) {
        el.innerHTML =
            '<p style="color:#7f8da7">No listings yet. ' +
            '(If you just added one and it\'s not showing, check ' +
            'your Supabase RLS SELECT policy on the "phones" table.)</p>';
        return;
    }

    el.innerHTML = phones.map(p => `
        <div class="item">
            <img
                class="thumb"
                src="${esc(p.images?.[0] || '')}"
                alt="${esc(p.name)}"
            >
            <div class="item-info">
                <strong>${esc(p.name)}</strong>
                <div>
                    ₱${Number(p.price || 0).toLocaleString('en-PH')}
                    • ${esc(p.storage || '')}
                    • ${esc(p.color || '')}
                    • ${esc(p.condition || '')}
                </div>
                <div>
                    Battery: ${esc(p.battery || 'N/A')}
                </div>
            </div>
            <button
                class="delete"
                onclick="removePhone('${p.id}')"
            >
                Delete
            </button>
        </div>
    `).join('');
}

document.getElementById('phoneForm').addEventListener(
    'submit',
    async e => {
        e.preventDefault();

        const status = document.getElementById('status');
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);

        if (submitBtn) submitBtn.disabled = true;

        try {
            status.textContent = 'Checking image...';

            const files = form.querySelector('input[name="images"]').files;

            if (!files.length) {
                throw new Error('Please select at least one image.');
            }

            const imageUrls = [];
            const uploadedPaths = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                status.textContent =
                    `Uploading image ${i + 1} of ${files.length}...`;

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
                    console.error('STORAGE ERROR:', uploadError);
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

            status.textContent = 'Saving listing...';

            const { data: inserted, error: insertError } = await supabase
                .from('phones')
                .insert({
                    name: formData.get('name'),
                    price: Number(formData.get('price')),
                    storage: formData.get('storage'),
                    color: formData.get('color'),
                    condition: formData.get('condition'),
                    battery: formData.get('battery'),
                    description: formData.get('description'),
                    images: imageUrls
                })
                .select();

            if (insertError) {
                console.error('DATABASE ERROR:', insertError);

                if (uploadedPaths.length) {
                    await supabase.storage.from('phone-images').remove(uploadedPaths);
                }

                throw new Error('Database error: ' + insertError.message);
            }

            if (!inserted || inserted.length === 0) {
                status.textContent =
                    'Saved, but could not confirm it back (check RLS SELECT policy).';
            } else {
                status.textContent = 'Published!';
            }

            form.reset();
            await refresh();

        } catch (error) {
            console.error('FINAL ERROR:', error);
            status.textContent = error.message || 'Upload failed.';
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }
);

async function removePhone(id) {
    if (!confirm('Delete this listing?')) {
        return;
    }

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

            if (removeError) {
                console.error('STORAGE CLEANUP ERROR:', removeError);
            }
        }
    }

    await refresh();
}

async function deleteAll() {
    if (!confirm('Delete ALL listings?')) {
        return;
    }

    const { data: phones, error: findError } = await supabase
        .from('phones')
        .select('id, images');

    if (findError) {
        alert(findError.message);
        return;
    }

    if (!phones || phones.length === 0) {
        await refresh();
        return;
    }

    // Fixed: `.neq('id', 0)` assumed an integer id column. Supabase
    // ids here are uuids, so delete by the actual id list instead.
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

        if (removeError) {
            console.error('STORAGE CLEANUP ERROR:', removeError);
        }
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
