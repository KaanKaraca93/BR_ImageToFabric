# 🧵 AI Fabric Analysis & PLM Integration API - BR Tenant

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

ChatGPT Vision ile kumaş etiket görsellerini analiz edip Infor Fashion PLM'de otomatik kumaş kodu açan **Node.js + Express** API.

**Tenant:** JKARFH4LCGZA78A5_PRD (BR_Entegrasyon)

## ✨ Özellikler

- ✅ **ChatGPT GPT-4o Vision** - Görsel analizi
- ✅ **9 Elyaf Tipi** - 40+ kod varyasyonu (PES, COT, VSK, LIN, ELS, vb.)
- ✅ **Dinamik Elyaf** - 1-5 elyaf arası otomatik
- ✅ **OAuth 2.0** - PLM token yönetimi
- ✅ **Infor Fashion PLM** - Otomatik kumaş kodu açma
- ✅ **ION Ready** - JSON API formatı
- ✅ **Swagger Docs** - API dokümantasyonu

## 🔍 Çıkarılan Bilgiler

1. **Kumaş Tedarikçisi** (firma adı)
2. **Kumaş Tedarikçi Kodu** (ürün/artikel kodu)
3. **Kumaş Elyaf İçeriği** (her elyaf için: Yüzde, Ad, Id, Code)
4. **Kumaş Gramaj** (gr/m²)
5. **Kumaş Eni** (cm)

## 🚀 Hızlı Başlangıç

### 1. Kurulum

```bash
npm install
```

### 2. Environment Variables

`.env` dosyası oluşturun:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=5000
```

### 3. Çalıştırma

```bash
npm start
```

API `http://localhost:5000` adresinde çalışacak.

## 📡 API Endpoints

### Health Check (Basic)
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "message": "Kumaş Analiz API çalışıyor",
  "timestamp": "2025-12-04T12:00:00.000Z"
}
```

### Health Check (Detailed) - Tüm Servisler
```http
GET /health/detailed
```

Tüm bağlı servislerin durumunu kontrol eder:
- ✅ Express API
- ✅ OpenAI API (GPT-4o Vision)
- ✅ PLM API (OAuth token)
- ℹ️ GitHub (repository info)

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-04T12:00:00.000Z",
  "services": {
    "api": {
      "status": "healthy",
      "message": "Express API çalışıyor",
      "uptime_seconds": 3600
    },
    "openai": {
      "status": "healthy",
      "message": "OpenAI API bağlantısı başarılı",
      "api_key_configured": true,
      "models_available": 15
    },
    "plm": {
      "status": "healthy",
      "message": "PLM OAuth token başarıyla alındı",
      "credentials_configured": true,
      "token_status": "valid",
      "token_expires_in_seconds": 3600
    },
    "github": {
      "status": "info",
      "message": "GitHub sadece kod repository olarak kullanılıyor",
      "repository": "https://github.com/YourRepo"
    }
  }
}
```

### Sadece Analiz
```http
POST /analyze
Content-Type: application/json

{
  "image_url": "https://idm.eu1.inforcloudsuite.com/ca/api/resources/FPLM_Document-XXXXX?$token=...&$tenant=...",
  "document_id": "FPLM_Document-89057",
  "request_id": "req-12345"
}
```

### Analiz + PLM'de Kumaş Aç
```http
POST /analyze-and-create
Content-Type: application/json

{
  "image_url": "https://idm.eu1.inforcloudsuite.com/ca/api/resources/FPLM_Document-XXXXX?$token=...&$tenant=...",
  "document_id": "FPLM_Document-89057",
  "request_id": "req-12345",
  "create_in_plm": true
}
```

## 📊 Response Format

### Başarılı Analiz
```json
{
  "success": true,
  "data": {
    "Tedarikcisi": "NISH KUMAŞ SAN. VE TİC. LTD. ŞTİ.",
    "Tedarikci_Kodu": "NK1178",
    "Gramaj": 210,
    "En": 190,
    "Elyaf1Yuzde": 79,
    "Elyaf1": "Polyester",
    "Elyaf1Id": 13,
    "Elyaf1Code": "PES",
    "Elyaf2Yuzde": 21,
    "Elyaf2": "Pamuk",
    "Elyaf2Id": 9,
    "Elyaf2Code": "COT"
  },
  "metadata": {
    "document_id": "FPLM_Document-89057",
    "request_id": "req-12345",
    "timestamp": "2025-11-05T23:27:19Z",
    "processing_time_ms": 2345
  }
}
```

### Tam Akış Response
```json
{
  "success": true,
  "analysis": {
    "success": true,
    "data": { /* Analiz sonucu */ }
  },
  "plm_creation": {
    "success": true,
    "plm_response": {
      "key": 105,
      "addedCode": "20251105-232719473",
      "name": "NISH KUMAŞ SAN. VE TİC. LTD. ŞTİ. - NK1178,210 GSM,79%21%Pamuk"
    },
    "material_description": "NISH KUMAŞ SAN. VE TİC. LTD. ŞTİ. - NK1178"
  },
  "metadata": {
    "processing_time_ms": 26350
  }
}
```

## 🧬 Elyaf Mapping Tablosu

**86 elyaf tipi desteklenir!** En yaygın kullanılanlar:

| Görsel Kodu | PLM Code | PLM Name (TR) | PLM Id |
|-------------|----------|---------------|--------|
| PE, PES, PL, PET, POLYESTER | PES | Poliester | 63 |
| CO, COT, COTTON | COT | Pamuk | 56 |
| VI, CV, VSK, VSC, VISCOSE | VSK/VSC | Viskon/Viskoz | 84/78 |
| LI, LIN, LINEN | LIN | Keten | 40 |
| EA, ELS, ELASTANE, SPANDEX, LYCRA | ELS | Elastan | 20 |
| PA, PAM, POLYAMIDE, NYLON | PAM | Poliamid | 58 |
| NY, NYL, NYLON | NYL | Naylon | 86 |
| ACR, ACRYLIC | ACR | Akrilik | 1 |
| MOD, MDL, MODAL | MDL | Modal | 54 |
| BAM, BAMBOO | BAM | Bambu | 11 |
| WO, WOO, WOOL | WOO | Yün | 81 |
| SLK, SILK | SLK | İpek | 31 |
| LYC, LYOCELL | LYC | Lyocell | 47 |
| TNS, TENSEL, TENCEL | TNS | Tensel | 83 |
| ACE, ACETATE | ACE | Asetat | 9 |
| PP, PPL, POLYPROPYLENE | PPL | Polipropilen | 60 |
| PU, PUR, POLYURETHANE | PUR | Poliüretan | 61 |
| PVC, PCL | PCL | PVC | 62 |
| CSH, CASHMERE | CSH | Kaşmir | 37 |
| MHR, MOHAIR | MHR | Moher | 55 |
| LEA, LEATHER | LEA | Deri | 17 |
| LRX, LUREX | LRX | Lureks | 48 |
| RAM, RAMIE | RAM | Rami | 65 |
| HMP, HEMP | HMP | Kenevir | 39 |
| JUT, JUTE | JUT | Jut | 32 |
| SIS, SISAL | SIS | Sisal | 69 |

📝 **Not:** Tam liste 86 elyaf içerir. Yukarıda en sık kullanılanlar gösterilmiştir.

## 🧪 Test

### Health Check Tests
```bash
# Tüm servislerin durumunu kontrol et
npm run test:health

# Veya direkt:
node test_health.js
```

**Heroku'da test:**
```bash
API_URL=https://your-app.herokuapp.com npm run test:health
```

### Manuel Test
```bash
npm test
```

### Tam Akış Testi
```bash
# Sadece analiz (PLM'e yazmaz)
node test_full_flow.js false

# Analiz + PLM'de kumaş aç
node test_full_flow.js
```

### Tüm Testleri Çalıştır
```bash
npm run test:all
```

## 🔄 Akış Diyagramı

```
ION/PLM → POST Request → Express API
    ↓
📸 Görsel İndirme (Base64)
    ↓
🤖 ChatGPT Analizi (GPT-4o Vision)
    ↓
🧬 Elyaf Mapping (PES, COT, VSK...)
    ↓
📦 PLM Payload Oluşturma
    ↓
🔑 OAuth Token Alma
    ↓
🏭 PLM API POST
    ↓
✅ KUMAŞ KODU AÇILDI!
```

## 🌐 Heroku Deployment

### 1. Heroku CLI ile

```bash
# Heroku'ya login
heroku login

# Yeni app oluştur
heroku create your-app-name

# Environment variables ayarla
heroku config:set OPENAI_API_KEY=your_key_here

# Deploy
git push heroku main
```

### 2. GitHub ile Otomatik Deploy

1. GitHub'a push yapın
2. Heroku Dashboard'da "Deploy" sekmesine gidin
3. "GitHub" deployment method'unu seçin
4. Repository'yi bağlayın
5. "Enable Automatic Deploys" aktif edin
6. "Deploy Branch" butonuna tıklayın

### 3. Environment Variables (Heroku)

Heroku Dashboard → Settings → Config Vars:

```
OPENAI_API_KEY = your_openai_api_key_here
```

## 📚 Dokümantasyon

- **Swagger UI:** `/swagger` (yakında)
- **API Docs:** `swagger.yaml`
- **PLM Format:** `PLM_INPUT_FORMAT.md`
- **ION Integration:** `ION_API.md`

## 🛠️ Teknolojiler

- **Backend:** Node.js 18+ + Express
- **AI:** OpenAI GPT-4o Vision
- **HTTP Client:** Axios
- **PLM:** Infor Fashion PLM (OAuth 2.0)
- **CORS:** cors middleware

## 📊 Test Sonuçları

### ✅ Test 1: HILLTEKS (5 Elyaf)
```
Tedarikçi: HILLTEKS
Kod: 126/7038 01
Gramaj: 190
En: 145
Elyaflar: %30 PES, %29 COT, %27 VSK, %13 LIN, %1 ELS
```

### ✅ Test 2: NISH KUMAŞ (2 Elyaf)
```
Tedarikçi: NISH KUMAŞ SAN. VE TİC. LTD. ŞTİ.
Kod: NK1178
Gramaj: 210
En: 190
Elyaflar: %79 PES, %21 COT
PLM Material Key: 105
```

## 🔐 Güvenlik

- ✅ API anahtarları `.env` dosyasında (git'e commit edilmez)
- ✅ CORS tüm origin'lere açık (production'da düzenlenmeli)
- ⚠️ Rate limiting yok (production'da eklenebilir)
- ⚠️ Authentication yok (production'da eklenebilir)

## 📝 Notlar

- OpenAI API kredisi gereklidir ($10+ önerilir)
- Her analiz ~$0.01 maliyetlidir
- PLM token'ları otomatik yenilenir
- Maksimum 50MB görsel boyutu
- 30 saniye download timeout

## 🎯 Roadmap

- [x] Görsel analizi (ChatGPT)
- [x] Elyaf mapping
- [x] PLM entegrasyonu
- [x] ION formatı
- [x] Heroku deployment
- [ ] Swagger UI
- [ ] Rate limiting
- [ ] API authentication
- [ ] Database (analiz geçmişi)
- [ ] Webhook support

## 📞 İletişim

**Email:** kaan.karaca93@gmail.com  
**GitHub:** [@KaanKaraca93](https://github.com/KaanKaraca93)

## 📄 License

MIT

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** 2025-11-05
