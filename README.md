# BUMN Career

Frontend portal peluang karier BUMN dengan React, TypeScript, dan Vite.

## Development
```bash
npm install
npm run dev
```

## Validation
```bash
npm run typecheck
npm run build
npm run preview
```

## Architecture
- `src/components`: shared layout and UI.
- `src/features`: home, search, saved jobs, profile.
- `src/data`: demonstrasi data lowongan.
- `src/hooks`: reusable state hooks.
- `src/services`: data/API adapter.
- `src/types`: shared TypeScript contracts.

Data lowongan saat ini adalah data demonstrasi, bukan pengumuman rekrutmen resmi. Adapter API siap dikonfigurasi melalui `VITE_API_BASE_URL` setelah backend dan kontraknya tersedia.

## GitHub Pages
Repository Pages menggunakan base path `/bumn/`. Workflow deploy berjalan saat ada push ke `main`. Pada **Settings → Pages → Build and deployment**, pilih **GitHub Actions**.

URL target: https://gantulu.github.io/bumn/
