const SUPABASE_URL = 'https://fvxpfpqkdsznvvreicfc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dC4BDvHAExevhXghB6-8rQ_RLtR12zB';

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('phoneForm');
    const status = document.getElementById('status');
    const list = document.getElementById('list');

    if (!form || !status || !list) return;

    // Always block native form navigation / query-string submission.
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault();
    });

    if (!window.supabase) {
        status.textContent = 'Supabase failed to load. Disable any blocker and reload.';
        list.innerHTML = '<p style="color:#ff6b6b">Supabase JS could not be loaded.</p>';
        return;
    }

    const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.adminSupabase = db;

    await refresh();

    async function handleSubmit(e) {
        e.preventDefault();
        e.stopPropagation();

        const btn = form.querySelector('button[type="submit"]');
        const files = form.querySelector('input[name="images"]').files;

        if (btn) btn.disabled = true;

        try {
            status.textContent = 'Checking image...';

            if (!files.length) throw new Error('Please select at least one image.');

            const imageUrls = [];
            const uploadedPaths = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                if (!file.type.startsWith('image/')) {
                    throw new Error(`${file.name} is not an image.`);
                }
                if (file.size > 10 * 1024 * 1024) {
                    throw new Error(`${file.name} is larger than 10MB.`);
                }

                status.textContent = `Uploading image ${i + 1} of ${files.length}...`;

                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const fileName = `${crypto.randomUUID()}-${safeName}`;

                const { error: uploadError } = await db.storage
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

                const { data: publicData } = db.storage
                    .from('phone-images')
                    .getPublicUrl(fileName);

                if (!publicData?.publicUrl) {
                    throw new Error('Could not create public image URL.');
                }

                imageUrls.push(publicData.publicUrl);
            }

            const price = Number(form.elements.price.value);
            if (!Number.isFinite(price)) throw new Error('Please enter a valid price.');

            status.textContent = 'Saving listing...';

            const { error: insertError } = await db.from('phones').insert({
                name: form.elements.name.value.trim(),
                price,
                storage: form.elements.storage.value.trim(),
                color: form.elements.color.value.trim(),
                condition: form.elements.condition.value.trim(),
                battery: form.elements.battery.value.trim(),
                description: form.elements.description.value.trim(),
                images: imageUrls
            });

            if (insertError) {
                console.error('DATABASE ERROR:', insertError);
                if (uploadedPaths.length) {
                    await db.storage.from('phone-images').remove(uploadedPaths);
                }
                throw new Error('Database error: ' + insertError.message);
            }

            status.textContent = 'Published successfully!';
            form.reset();
            await refresh();

        } catch (err) {
            console.error('PUBLISH ERROR:', err);
            status.textContent = err?.message || 'Upload failed.';
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function refresh() {
        list.innerHTML = '<p style="color:#7f8da7">Loading...</p>';

        const { data: phones, error } = await db
            .from('phones')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('SELECT ERROR:', error);
            list.innerHTML = '<p style="color:#ff6b6b">Failed to load listings: ' + esc(error.message) + '</p>';
            return;
        }

        if (!phones?.length) {
            list.innerHTML = '<p style="color:#7f8da7">No listings yet.</p>';
            return;
        }

        list.innerHTML = phones.map(p => `
            <div class="item">
                <img class="thumb" src="${esc(p.images?.[0] || '')}" alt="${esc(p.name)}">
                <div class="item-info">
                    <strong>${esc(p.name)}</strong>
                    <div>₱${Number(p.price || 0).toLocaleString('en-PH')} • ${esc(p.storage || '')} • ${esc(p.color || '')}</div>
                    <div>${esc(p.condition || '')} • Battery: ${esc(p.battery || 'N/A')}</div>
                </div>
                <button class="delete" onclick="removePhone('${p.id}')">Delete</button>
            </div>
        `).join('');
    }

    window.removePhone = async function(id) {
        if (!confirm('Delete this listing?')) return;

        const { data: phone, error: findError } = await db
            .from('phones').select('images').eq('id', id).single();

        if (findError) {
            alert(findError.message);
            return;
        }

        const { error } = await db.from('phones').delete().eq('id', id);
        if (error) {
            alert(error.message);
            return;
        }

        const paths = (phone.images || [])
            .map(url => url.split('/phone-images/')[1])
            .filter(Boolean);

        if (paths.length) await db.storage.from('phone-images').remove(paths);
        await refresh();
    };

    window.deleteAll = async function() {
        if (!confirm('Delete ALL listings?')) return;

        const { data: phones, error } = await db.from('phones').select('id, images');
        if (error) {
            alert(error.message);
            return;
        }

        if (!phones?.length) {
            await refresh();
            return;
        }

        const ids = phones.map(p => p.id);
        const { error: deleteError } = await db.from('phones').delete().in('id', ids);

        if (deleteError) {
            alert(deleteError.message);
            return;
        }

        const paths = phones.flatMap(p => p.images || [])
            .map(url => url.split('/phone-images/')[1])
            .filter(Boolean);

        if (paths.length) await db.storage.from('phone-images').remove(paths);
        await refresh();
    };

    function esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, m => ({
            '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
        }[m]));
    }
});
