# 🔌 ION Entegrasyonu - API Dokümantasyonu

## 📡 API Endpoint

**URL:** `http://localhost:5000/analyze`  
**Method:** `POST`  
**Content-Type:** `application/json`

## 📥 Request Format (ION'dan Gönderilecek)

### Seçenek 1: Tek Görsel
```json
{
  "image_url": "https://idm.eu1.inforcloudsuite.com/ca/api/resources/FPLM_Document-XXXXX?$token=...&$tenant=..."
}
```

### Seçenek 2: Metadata ile (Opsiyonel)
```json
{
  "image_url": "https://idm.eu1.inforcloudsuite.com/ca/api/resources/FPLM_Document-XXXXX?$token=...&$tenant=...",
  "document_id": "FPLM_Document-XXXXX",
  "request_id": "unique-request-id",
  "timestamp": "2025-11-03T15:45:00Z"
}
```

### Seçenek 3: Batch (Çoklu Görsel)
```json
{
  "images": [
    {
      "image_url": "https://idm.eu1.inforcloudsuite.com/ca/api/resources/FPLM_Document-11111?$token=...&$tenant=...",
      "document_id": "FPLM_Document-11111"
    },
    {
      "image_url": "https://idm.eu1.inforcloudsuite.com/ca/api/resources/FPLM_Document-22222?$token=...&$tenant=...",
      "document_id": "FPLM_Document-22222"
    }
  ]
}
```

## 📤 Response Format (ION'a Dönecek)

### Başarılı Tek Analiz
```json
{
  "success": true,
  "data": {
    "tedarikcisi": "HILLTEKS",
    "tedarikci_kodu": "126/7038 01",
    "elyaf_icerigi": "%30PE 29CO 27VI 13LI 1EA",
    "gramaj": "190gr/m2 (+-5)",
    "en": "145 cm (+-3)"
  },
  "metadata": {
    "document_id": "FPLM_Document-XXXXX",
    "request_id": "unique-request-id",
    "timestamp": "2025-11-03T15:45:00Z",
    "processing_time_ms": 2345
  }
}
```

### Hata Durumu
```json
{
  "success": false,
  "error": "Görsel indirilemedi: 400 Client Error",
  "metadata": {
    "document_id": "FPLM_Document-XXXXX",
    "request_id": "unique-request-id",
    "timestamp": "2025-11-03T15:45:00Z"
  }
}
```

### Batch Response
```json
{
  "success": true,
  "results": [
    {
      "document_id": "FPLM_Document-11111",
      "success": true,
      "data": {
        "tedarikcisi": "HILLTEKS",
        "tedarikci_kodu": "126/7038 01",
        "elyaf_icerigi": "%30PE 29CO 27VI 13LI 1EA",
        "gramaj": "190gr/m2 (+-5)",
        "en": "145 cm (+-3)"
      }
    },
    {
      "document_id": "FPLM_Document-22222",
      "success": false,
      "error": "Görsel indirilemedi"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1,
    "processing_time_ms": 4567
  }
}
```

## 🔐 Authentication

API şu anda authentication gerektirmiyor. Production'da:
- API Key authentication eklenebilir
- JWT token kullanılabilir
- IP whitelist yapılabilir

## ⚡ Rate Limiting

Şu anda rate limit yok. Önerilen limitler:
- 100 request / dakika
- 1000 request / saat
- Batch request için maksimum 10 görsel

## 🧪 Test

### cURL ile Test
```bash
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://idm.eu1.inforcloudsuite.com/ca/api/resources/FPLM_Document-XXXXX?$token=...&$tenant=..."
  }'
```

### PowerShell ile Test
```powershell
$body = @{
    image_url = "https://idm.eu1.inforcloudsuite.com/ca/api/resources/FPLM_Document-XXXXX?`$token=...&`$tenant=..."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/analyze" -Method POST -Body $body -ContentType "application/json"
```

### Node.js test script
```bash
node test.js
```
(test_url.txt dosyasından URL okur)

## 📊 Çıkarılan Alanlar

| Alan | Açıklama | Örnek |
|------|----------|-------|
| `tedarikcisi` | Kumaş tedarikçisi firma adı | "HILLTEKS" |
| `tedarikci_kodu` | Ürün/artikel kodu | "126/7038 01" |
| `elyaf_icerigi` | Elyaf kompozisyonu | "%30PE 29CO 27VI 13LI 1EA" |
| `gramaj` | Kumaş ağırlığı (gr/m²) | "190gr/m2 (+-5)" |
| `en` | Kumaş genişliği (cm) | "145 cm (+-3)" |

## 🚀 Deployment

### Development
```bash
npm start
```

### Production
```bash
npm install --production
NODE_ENV=production node app.js
```

### Docker (Opsiyonel)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "app.js"]
```

## 📝 Notlar

1. **Token Expiry:** PLM URL'lerindeki token'lar zaman aşımına uğrayabilir
2. **Timeout:** Görsel indirme için 30 saniye timeout var
3. **Image Size:** Maksimum 50MB görsel boyutu desteklenir
4. **OpenAI Limit:** OpenAI API rate limit'i dikkate alınmalı
5. **Cost:** Her analiz yaklaşık $0.01 maliyetli (GPT-4o Vision)

## 🔍 Troubleshooting

### Problem: API bağlantı hatası
**Çözüm:** API'nin çalıştığından emin olun (`npm start`)

### Problem: Token expired
**Çözüm:** PLM'den yeni token içeren URL alın

### Problem: Slow response
**Çözüm:** ChatGPT API'si yavaş olabilir, timeout süresini artırın

### Problem: Invalid JSON response
**Çözüm:** ChatGPT bazen markdown formatında döndürüyor, zaten temizleniyor ama ek kontrol eklenebilir

