# MGH iPhone Store — Admin + Server

## Run locally
1. Install Node.js.
2. Open a terminal in this folder.
3. Run:
   npm install
   npm start
4. Open http://localhost:3000
5. Admin panel: http://localhost:3000/admin.html

## How it works
- Storefront: `/`
- Admin panel: `/admin.html`
- Add phone details and upload up to 10 images.
- Data is saved in `phones.json`.
- Uploaded images are saved in `public/uploads/`.

## Important
This is a real small Node/Express server, unlike a GitHub Pages-only site.
GitHub Pages cannot run the Node backend. To make the admin panel update the public store for everyone online, deploy this project to a Node-capable host such as Render, Railway, Fly.io, or your own VPS.

For production, add admin authentication before making `/admin.html` public.
