# MGH iPhone Store — GitHub Pages + Supabase

## Setup

1. Put these files in your GitHub repository:
   - index.html
   - store.js
   - style.css
   - admin.html
   - admin.js
   - admin.css

2. Open Supabase Dashboard -> SQL Editor.

3. Run `supabase-setup.sql`.

4. Enable GitHub Pages for the repository.

5. Storefront:
   `https://YOUR-USERNAME.github.io/YOUR-REPO/`

6. Admin:
   `https://YOUR-USERNAME.github.io/YOUR-REPO/admin.html`

The storefront reads published phones from Supabase, and the admin page uploads images to the
`phone-images` bucket and saves the listing to the `phones` table.

## Important security note

The simple no-login setup allows anyone who can discover `admin.html` to insert/delete listings,
because the browser uses the Supabase publishable key. This is suitable for testing but is NOT
recommended for a real public store.

For production, add Supabase Auth and change the INSERT/DELETE policies to authenticated/admin-only
policies.
