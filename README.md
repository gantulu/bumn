# BUMN Career

Frontend demo portal untuk menjelajahi contoh peluang karier BUMN Indonesia. Aplikasi menggunakan React, TypeScript, dan Vite serta dipublikasikan melalui GitHub Pages.

> **Penting:** data lowongan pada V1 berstatus sample, bukan pengumuman rekrutmen resmi. Formulir lamaran hanya simulasi; data yang diisi tidak disimpan dan tidak dikirim ke perusahaan.

## Menjalankan aplikasi

Memerlukan Node.js 22 dan npm.

~~~bash
npm ci
npm run dev
~~~

## Validasi

~~~bash
npm run typecheck
npm run test
npm run test:e2e
npm run build
~~~

Untuk menjalankan Vitest dalam mode watch:

~~~bash
npm run test:watch
~~~

## Fitur V1

- Beranda dan ringkasan lowongan contoh.
- Pencarian berdasarkan posisi, perusahaan, lokasi, dan kategori.
- Detail lowongan dengan status verifikasi dan batas pendaftaran.
- Simpan lowongan pada browser menggunakan localStorage.
- Bagikan tautan lowongan melalui Web Share API atau clipboard.
- Formulir simulasi lamaran untuk pengunjung tanpa login.
- Profil demo dan navigasi responsif.

## Struktur

- src/components: komponen layout dan kartu lowongan.
- src/pages: halaman aplikasi.
- src/data: satu sumber data lowongan V1.
- src/types: kontrak TypeScript.
- src/services: akses localStorage.
- src/styles: stylesheet aplikasi.
- src/test: konfigurasi pengujian unit.
- tests/e2e: pengujian browser Playwright.

## Kontrak data lowongan

Setiap lowongan menggunakan tipe Job pada src/types/job.ts. Status verifikasi adalah verified, unverified, atau sample. Data yang belum memiliki sumber resmi harus tetap diberi status sample atau unverified.

## Deployment GitHub Pages

Workflow deployment menggunakan Vite base path /bumn/. Pastikan Settings → Pages → Build and deployment menggunakan GitHub Actions. Deployment dijalankan dari branch main; branch implementasi tidak melakukan deployment production.
