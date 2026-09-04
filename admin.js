js
const SUPABASE_URL = 'https://fvxpfpqkdsznvvreicfc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dC4BDvHAExevhXghB6-8rQ_RLtR12zB';

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

async function refresh() {
    const { data: phones, error } = await db
        .from('phones')
        .select('*')
        .order('created_at', { ascending: false });

    const el = document.getElementById('list');

    if (error) {
        console.error(error);
        el.innerHTML =
            '<p style="color:#ff6b6b">Failed to load listings: ' +
            esc(error.message) +
            '</p>';
        return;
    }

    el.innerHTML = phones.length
        ? phones.map(p => `
            <div class="item">

                <img
                    class="thumb"
                    src="${p.images?.[0] || ''}"
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
        `).join('')
        : '<p style="color:#7f8da7">No listings yet.</p>';
}


document.getElementById('phoneForm').addEventListener(
    'submit',
    async e => {

        e.preventDefault();

        const status = document.getElementById('status');
        const form = e.target;
        const formData = new FormData(form);

        try {

            status.textContent = 'Checking image...';

            const files = form.querySelector(
                'input[name="images"]'
            ).files;

            if (!files.length) {
                throw new Error('No image selected.');
            }

            console.log('Images selected:', files.length);

            const imageUrls = [];

            for (let i = 0; i < files.length; i++) {

                const file = files[i];

                status.textContent =
                    `Uploading image ${i + 1} of ${files.length}...`;

                console.log(
                    'Starting upload:',
                    file.name,
                    file.type,
                    file.size
                );

                if (!file.type.startsWith('image/')) {
                    throw new Error(
                        `${file.name} is not an image.`
                    );
                }

                if (file.size > 10 * 1024 * 1024) {
                    throw new Error(
                        `${file.name} is larger than 10MB.`
                    );
                }

                const fileName =
                    `${crypto.randomUUID()}-${file.name}`;

                console.log(
                    'Uploading to bucket:',
                    'phone-images'
                );

                const { error: uploadError } =
                    await db.storage
                        .from('phone-images')
                        .upload(fileName, file, {
                            contentType: file.type,
                            upsert: false
                        });

                if (uploadError) {
                    console.error(
                        'STORAGE ERROR:',
                        uploadError
                    );

                    throw new Error(
                        'Storage upload failed: ' +
                        uploadError.message
                    );
                }

                console.log(
                    'Upload successful:',
                    fileName
                );

                const { data } =
                    db.storage
                        .from('phone-images')
                        .getPublicUrl(fileName);

                if (!data?.publicUrl) {
                    throw new Error(
                        'Could not create public image URL.'
                    );
                }

                imageUrls.push(data.publicUrl);
            }

            status.textContent =
                'Saving listing...';

            console.log(
                'Saving phone to database...'
            );

            const { error: insertError } =
                await db
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
                    });

            if (insertError) {

                console.error(
                    'DATABASE ERROR:',
                    insertError
                );

                throw new Error(
                    'Database error: ' +
                    insertError.message
                );
            }

            status.textContent =
                'Published successfully!';

            form.reset();

            await refresh();

        } catch (error) {

            console.error(
                'FINAL ERROR:',
                error
            );

            status.textContent =
                error.message || 'Upload failed.';

        }
    }
);


async function removePhone(id) {

    if (!confirm('Delete this listing?')) {
        return;
    }

    const { data: phone, error: findError } =
        await db
            .from('phones')
            .select('images')
            .eq('id', id)
            .single();

    if (findError) {
        alert(findError.message);
        return;
    }

    const { error } =
        await db
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

            await db.storage
                .from('phone-images')
                .remove(paths);

        }
    }

    await refresh();
}


async function deleteAll() {

    if (!confirm('Delete ALL listings.')) {
        return;
    }

    const { data: phones, error: findError } =
        await db
            .from('phones')
            .select('id, images');

    if (findError) {
        alert(findError.message);
        return;
    }

    const { error } =
        await db
            .from('phones')
            .delete()
            .neq('id', 0);

    if (error) {
        alert(error.message);
        return;
    }

    const paths = phones
        .flatMap(p => p.images || [])
        .map(url => url.split('/phone-images/')[1])
        .filter(Boolean);

    if (paths.length) {

        await db.storage
            .from('phone-images')
            .remove(paths);

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

