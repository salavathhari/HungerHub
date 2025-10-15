Vendor pages (not automatically routed)

Files added:
- src/pages/Vendor/CreateRestaurant.jsx
- src/pages/Vendor/AddProduct.jsx

How to use:
1. Ensure you are logged in as a user with role `vendor`.
2. Add routes in `src/App.jsx` to expose these pages, for example:

  <Route path='/vendor/create' element={<CreateRestaurant/>} />
  <Route path='/vendor/add-product' element={<AddProduct/>} />

3. Start the frontend (`npm run dev`) and open `/vendor/create` or `/vendor/add-product`.

Notes:
- `CreateRestaurant` calls `POST /api/vendor/create` and requires auth token header.
- `AddProduct` posts multipart form to `POST /api/food/add` and requires auth token header.
- If you want these pages in the navbar for vendors only, update `Navbar.jsx` to check `role` from `StoreContext`.
