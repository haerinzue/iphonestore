const SUPABASE_URL = 'https://fvxpfpqkdsznvvreicfc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dC4BDvHAExevhXghB6-8rQ_RLtR12zB';

let db;

document.addEventListener('DOMContentLoaded', () => {
if (!window.supabase) {
console.error('Supabase library was not loaded.');
return;
}


db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

setupForm();
refresh();


});

async function refresh() {
const el = document.getElementById('list');


if (!el || !db) return;

el.innerHTML = '<p style="color:#7f8da7">Loading listings...</p>';

const { data: phones, error } = await db
    .from('phones')
    .select('*')
    .order('created_at', { ascending: false });

if (error) {
    console.error('LOAD ERROR:', error);

    el.innerHTML =
        '<p style="color:#ff6b6b">Failed to load listings: ' +
        esc(error.message) +
        '</p>';

    return;
}

if (!phones || phones.length === 0) {
    el.innerHTML =
        '<p style="color:#7f8da7">No listings yet.</p>';
    return;
}

el.innerHTML = phones.map(phone => `
    <div class="item">

        <img
            class="thumb"
            src="${esc(phone.images?.[0] || '')}"
            alt="${esc(phone.name)}"
        >

        <div class="item-info">
            <strong>${esc(phone.name)}</strong>

            <div>
                ₱${Number(phone.price || 0).toLocaleString('en-PH')}
                • ${esc(phone.storage || '')}
                • ${esc(phone.color || '')}
                • ${esc(phone.condition || '')}
            </div>

            <div>
                Battery: ${esc(phone.battery || 'N/A')}
            </div>
        </div>

        <button
            class="delete"
            onclick="removePhone('${esc(phone.id)}')"
        >
            Delete
        </button>

    </div>
`).join('');


}

function setupForm() {
const form = document.getElementById('phoneForm');


if (!form) {
    console.error('phoneForm was not found.');
    return;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const status = document.getElementById('status');
    const fileInput = form.querySelector('input[name="images"]');

    try {
        status.textContent = 'Checking images...';

        if (!fileInput || !fileInput.files.length) {
            throw new Error('Please select at least one image.');
        }

        const files = Array.from(fileInput.files);

        console.log('Images selected:', files.length);

        const imageUrls = [];

        // Upload every image
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            status.textContent =
                `Uploading image ${i + 1} of ${files.length}...`;

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

            const safeName = file.name
                .replace(/[^a-zA-Z0-9._-]/g, '_');

            const fileName =
                `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

            console.log('Uploading:', fileName);

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
                    'Image upload failed: ' +
                    uploadError.message
                );
            }

            const { data: publicData } =
                db.storage
                    .from('phone-images')
                    .getPublicUrl(fileName);

            if (!publicData || !publicData.publicUrl) {
                throw new Error(
                    'Could not create image URL.'
                );
            }

            imageUrls.push(publicData.publicUrl);

            console.log(
                'Image uploaded:',
                publicData.publicUrl
            );
        }

        // Save phone
        status.textContent = 'Saving phone listing...';

        const formData = new FormData(form);

        const phone = {
            name: String(formData.get('name') || '').trim(),
            price: Number(formData.get('price') || 0),
            storage: String(formData.get('storage') || '').trim(),
            color: String(formData.get('color') || '').trim(),
            condition: String(formData.get('condition') || '').trim(),
            battery: String(formData.get('battery') || '').trim(),
            description: String(
                formData.get('description') || ''
            ).trim(),
            images: imageUrls
        };

        if (!phone.name) {
            throw new Error('Phone name is required.');
        }

        if (!phone.price || phone.price < 0) {
            throw new Error('Please enter a valid price.');
        }

        console.log('Saving phone:', phone);

        const { data, error: insertError } =
            await db
                .from('phones')
                .insert(phone)
                .select()
                .single();

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

        console.log(
            'Phone successfully saved:',
            data
        );

        status.textContent =
            'Published successfully!';

        form.reset();

        await refresh();

    } catch (error) {
        console.error(
            'UPLOAD/PUBLISH ERROR:',
            error
        );

        status.textContent =
            error.message || 'Upload failed.';
    }
});


}

// Delete one phone
window.removePhone = async function (id) {
if (!db) return;


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
    alert(
        'Could not find listing: ' +
        findError.message
    );
    return;
}

const { error: deleteError } =
    await db
        .from('phones')
        .delete()
        .eq('id', id);

if (deleteError) {
    alert(
        'Could not delete listing: ' +
        deleteError.message
    );
    return;
}

// Delete associated images
if (phone?.images?.length) {
    const paths = phone.images
        .map(url => {
            const marker = '/phone-images/';
            const index = url.indexOf(marker);

            if (index === -1) return null;

            return decodeURIComponent(
                url.substring(index + marker.length)
            );
        })
        .filter(Boolean);

    if (paths.length) {
        const { error: storageError } =
            await db.storage
                .from('phone-images')
                .remove(paths);

        if (storageError) {
            console.warn(
                'Could not delete images:',
                storageError
            );
        }
    }
}

await refresh();


};

// Delete all phones
window.deleteAll = async function () {
if (!db) return;


if (!confirm('Delete ALL listings?')) {
    return;
}

const { data: phones, error: findError } =
    await db
        .from('phones')
        .select('id, images');

if (findError) {
    alert(
        'Could not load listings: ' +
        findError.message
    );
    return;
}

const { error: deleteError } =
    await db
        .from('phones')
        .delete()
        .neq('id', 0);

if (deleteError) {
    alert(
        'Could not delete listings: ' +
        deleteError.message
    );
    return;
}

const paths = (phones || [])
    .flatMap(phone => phone.images || [])
    .map(url => {
        const marker = '/phone-images/';
        const index = url.indexOf(marker);

        if (index === -1) return null;

        return decodeURIComponent(
            url.substring(index + marker.length)
        );
    })
    .filter(Boolean);

if (paths.length) {
    const { error: storageError } =
        await db.storage
            .from('phone-images')
            .remove(paths);

    if (storageError) {
        console.warn(
            'Could not delete some images:',
            storageError
        );
    }
}

await refresh();


};

function esc(value) {
return String(value ?? '').replace(
/[&<>"']/g,
char => ({
'&': '&',
'<': '<',
'>': '>',
'"': '"',
"'": '''
}[char])
);
}

// Make refresh available globally for debugging
window.refresh = refresh;
