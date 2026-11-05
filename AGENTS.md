# Project rules

- Admin auth (`useAdminAuth`) re-verifies the admin role only when the user id changes, never on token refresh — a loading state unmounts the panel and closes open dialogs (mobile file picker returns trigger refreshes).
- The "Adicionar modelo" form keeps an unfinished draft (fields + compressed image) in localStorage and reopens on load — mobile OSes may kill the PWA while the photo picker is open.
