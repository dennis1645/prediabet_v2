# PrediaBeat Backend (Express.js + SQLite)

Backend REST API untuk platform pencegahan dan pendampingan prediabetes **PrediaBeat**, dibangun dengan **Express.js**, **SQLite**, dan **JWT Authentication** sesuai standar klinis **PERKENI 2021** & **Kemenkes RI**.

---

## 🚀 Fitur Utama

1. **Autentikasi & Keamanan (JWT)**:
   - Registrasi & Login terenkripsi `bcryptjs`.
   - Token JWT Bearer dengan masa kedaluwarsa terkonfigurasi.
   - Middleware `authenticateJWT` untuk melindungi endpoint privat.
   - Semua kredensial rahasia disimpan di file `.env`.

2. **Mesin Kalkulasi Klinis Presisi (Clinical Engine)**:
   - **BMI Asia-Pasifik (Kemenkes)**: Klasifikasi Underweight, Normal, Overweight, Obesitas.
   - **TDEE (Mifflin-St Jeor)**: Penyesuaian BMR berdasarkan gender dan tingkat aktivitas fisik.
   - **Skor Risiko Prediabetes (PERKENI / Modified FINDRISC)**: Evaluasi usia, lingkar pinggang, gaya hidup, riwayat keluarga, gejala klasik, dan hasil lab GDP/HbA1c.
   - **Target 3J (Jadwal, Jumlah, Jenis)**: Perhitungan defisit kalori sehat dan pembagian gram makronutrien (Karbohidrat, Protein, Lemak).
   - **Program Diet Khusus**: Dukungan penyesuaian makro dinamis untuk *Diet Mediterania*, *Diet Rendah Karbohidrat (<130g)*, dan *Diet DASH*.

3. **Meal Plan 3J Otomatis**:
   - Pemilihan makanan harian dari dataset master 4.300+ bahan pangan Indonesia.
   - Filter pantangan & alergi pasien (kacang, seafood, susu, telur, santan, alkohol, dll.).
   - Prioritas indeks glikemik rendah (GI < 55) ramah sensitivitas insulin.
   - Fitur re-shuffle / ganti menu acak secara dinamis.

4. **Progress Tracker & Health Score**:
   - Pencatatan log harian (kalori aktual, aktivitas fisik, jam tidur, air, catatan).
   - Perhitungan estimasi defisit kalori harian dan Health Score mingguan.

5. **AI Context Isolation Endpoint**:
   - Endpoint khusus `GET /api/ai/context` yang menyuplai data medis pasien ke Server AI (FastAPI) secara terisolasi tanpa risiko kebocoran konteks antar pengguna (*zero cross-user context leakage*).

---

## 📁 Struktur Direktori

```
backend/
├── data/
│   ├── reference/
│   │   ├── activities.csv
│   │   ├── diets/NutrinusaDatabase_InformationDiet.csv
│   │   └── food/master_makanan_kategori_flag_mealplan.csv
│   └── prediabeat.db (auto-created SQLite DB)
├── src/
│   ├── config/
│   │   └── env.js
│   ├── database/
│   │   ├── connection.js
│   │   └── initSchema.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── errorHandler.js
│   ├── clinical/
│   │   ├── assessment.js
│   │   └── mealPlanEngine.js
│   ├── services/
│   │   └── referenceService.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── questionnaireController.js
│   │   ├── dashboardController.js
│   │   ├── dietController.js
│   │   ├── foodController.js
│   │   ├── progressController.js
│   │   └── aiContextController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── questionnaireRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── dietRoutes.js
│   │   ├── foodRoutes.js
│   │   ├── activityRoutes.js
│   │   ├── progressRoutes.js
│   │   ├── aiContextRoutes.js
│   │   └── index.js
│   ├── app.js
│   └── server.js
├── .env.example
├── .env
├── .gitignore
└── package.json
```

---

## ⚙️ Cara Menjalankan

### 1. Masuk ke direktori backend:
```bash
cd D:\Kuliah\prediabeat_app\prediabeat_app\backend
```

### 2. Jalankan server:
```bash
npm start
# atau mode development dengan nodemon:
npm run dev
```

Server akan aktif di: `http://localhost:5000`

---

## 🔑 Akun Demo Bawaan (Auto-Seeded)
- **Username**: `budi_santoso`
- **Password**: `PrediaBeat2026!`

---

## 📡 Ringkasan Endpoint API

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/health` | Publik | Status server & database |
| `POST` | `/api/auth/register` | Publik | Mendaftar akun baru |
| `POST` | `/api/auth/login` | Publik | Masuk akun & dapatkan JWT |
| `GET` | `/api/auth/me` | JWT | Profil akun yang sedang login |
| `GET` | `/api/questionnaire/draft` | JWT | Ambil draft kuesioner |
| `POST` | `/api/questionnaire/draft` | JWT | Simpan draft kuesioner |
| `POST` | `/api/questionnaire/submit` | JWT | Hitung analisis klinis & meal plan |
| `GET` | `/api/dashboard` | JWT | Data dashboard, profil & analisis lengkap |
| `POST` | `/api/dashboard/regenerate-meal-plan` | JWT | Mengacak ulang menu harian |
| `GET` | `/api/diet` | Publik | Daftar katalog program diet |
| `GET` | `/api/diet/:slug` | Publik | Detail program diet |
| `POST` | `/api/diet/activate` | JWT | Mengaktifkan program diet |
| `GET` | `/api/foods` | Publik | Pencarian bahan makanan & filter GI |
| `GET` | `/api/activities` | Publik | Daftar aktivitas fisik & MET |
| `GET` | `/api/progress` | JWT | Log progres harian |
| `POST` | `/api/progress/log` | JWT | Simpan log harian |
| `GET` | `/api/ai/context` | JWT | Suplai konteks medis terisolasi untuk AI |
