MGH iPhone Store — Admin Edit + Store Sync

Replace these files in your GitHub repository:
- admin.html
- admin.js
- index.html

Then run supabase-edit-sync.sql once in Supabase SQL Editor.

What this adds:
1. An Edit button beside every Current Listing.
2. Clicking Edit loads the existing listing into the form.
3. You can change name, price, storage, color, condition, battery and description.
4. You can optionally upload new photos. If no new photos are selected, the existing photos stay.
5. Saving updates the same Supabase `phones` row, so the Store uses the updated information.
6. The Store listens for Supabase Realtime changes, so an open Store page updates automatically after Admin changes.
7. The old MGH storefront UI and large hero logo are preserved.

Important:
The SQL update policy follows the current public client-side admin setup. It is convenient but not secure for a production admin panel. Later, add Supabase Auth and restrict UPDATE to authenticated admins.
