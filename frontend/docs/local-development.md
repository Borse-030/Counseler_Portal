# Local development

Run `npm run dev` from the frontend directory. Port 4000 is strict: a second development server must exit rather than silently choosing another port.

On WSL 1 with this project on a Windows mount, the launcher runs Vite using installed Windows Node.js. WSL 1 can reject Vite's dependency-cache directory renames even with a new cache outside the Windows mount. Windows Node lets Vite use its Windows filesystem handling. Windows and WSL 2 use their current Node runtime normally.

The WSL 1 launcher finds Windows Node in Program Files or the inherited PATH, translates the Vite CLI path with `wslpath`, and forwards command-line arguments. Windows Node must meet Vite's version requirement (20.19+ or 22.12+). WSL interoperability must be enabled.

WSL 1 also cannot safely pass Linux pipe handles to Windows Node. The launcher bridges output through a temporary regular file in ignored `node_modules/.cache`, streams that output to the terminal, and removes the file on normal shutdown. `Ctrl+C` stops the child server; keyboard shortcuts requiring stdin are unavailable through this bridge. Environment values loaded from frontend `.env` files continue to work normally.

Avoid running `vite` directly under WSL 1, since that bypasses the launcher. Alternatively, start `npm run dev` directly from Windows PowerShell.

Verified with forced dependency optimization, HTTP requests to the running app, and shutdown that released port 4000.
