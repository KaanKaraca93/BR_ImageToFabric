# 📊 PLM Input Format Dokümantasyonu

## ✅ Başarılı Test Sonucu

Sistem şu formatta PLM'e kumaş açmak için gerekli input'u üretiyor:

```
Tedarikcisi: HILLTEKS
Tedarikci_Kodu: 126/7038 01
Gramaj: 190
En: 145
Elyaf1Yuzde: 30
Elyaf1: Polyester
Elyaf1Id: 13
Elyaf1Code: PES
Elyaf2Yuzde: 29
Elyaf2: Pamuk
Elyaf2Id: 9
Elyaf2Code: COT
Elyaf3Yuzde: 27
Elyaf3: Viskon
Elyaf3Id: 14
Elyaf3Code: VSK
Elyaf4Yuzde: 13
Elyaf4: Keten
Elyaf4Id: 6
Elyaf4Code: LIN
Elyaf5Yuzde: 1
Elyaf5: Elastan
Elyaf5Id: 4
Elyaf5Code: ELS
```

## 🔄 Akış

```
PLM Görsel URL → API → ChatGPT (Görsel Analizi) → Elyaf Mapping → PLM Input JSON
```

## 📥 API Request

```json
POST http://localhost:5000/analyze
Content-Type: application/json

{
  "image_url": "https://idm.eu1.inforcloudsuite.com/ca/api/resources/FPLM_Document-XXXXX?$token=...&$tenant=...",
  "document_id": "FPLM_Document-89069",
  "request_id": "req-123",
  "timestamp": "2025-11-05T..."
}
```

## 📤 API Response

```json
{
  "success": true,
  "data": {
    "Tedarikcisi": "HILLTEKS",
    "Tedarikci_Kodu": "126/7038 01",
    "Gramaj": 190,
    "En": 145,
    "Elyaf1Yuzde": 30,
    "Elyaf1": "Polyester",
    "Elyaf1Id": 13,
    "Elyaf1Code": "PES",
    "Elyaf2Yuzde": 29,
    "Elyaf2": "Pamuk",
    "Elyaf2Id": 9,
    "Elyaf2Code": "COT",
    "Elyaf3Yuzde": 27,
    "Elyaf3": "Viskon",
    "Elyaf3Id": 14,
    "Elyaf3Code": "VSK",
    "Elyaf4Yuzde": 13,
    "Elyaf4": "Keten",
    "Elyaf4Id": 6,
    "Elyaf4Code": "LIN",
    "Elyaf5Yuzde": 1,
    "Elyaf5": "Elastan",
    "Elyaf5Id": 4,
    "Elyaf5Code": "ELS"
  },
  "raw_chatgpt_response": {
    "tedarikcisi": "HILLTEKS",
    "tedarikci_kodu": "126/7038 01",
    "gramaj": 190,
    "en": 145,
    "elyaf1_yuzde": 30,
    "elyaf1_kod": "PES",
    "elyaf2_yuzde": 29,
    "elyaf2_kod": "COT",
    "elyaf3_yuzde": 27,
    "elyaf3_kod": "VSK",
    "elyaf4_yuzde": 13,
    "elyaf4_kod": "LIN",
    "elyaf5_yuzde": 1,
    "elyaf5_kod": "ELS"
  },
  "metadata": {
    "document_id": "FPLM_Document-89069",
    "request_id": "req-123",
    "timestamp": "2025-11-05T...",
    "processing_time_ms": 2345
  }
}
```

## 🧬 Elyaf Mapping Tablosu

API otomatik olarak elyaf kodlarını PLM formatına çeviriyor:

| Görsel Kodu | PLM Code | PLM Name | PLM Id |
|-------------|----------|----------|--------|
| PE, PES, PL, POLYESTER | PES | Polyester | 13 |
| CO, COT, COTTON | COT | Pamuk | 9 |
| VI, CV, VSK, VISCOSE | VSK | Viskon | 14 |
| LI, LIN, LINEN | LIN | Keten | 6 |
| EA, ELS, ELASTAN, SPANDEX | ELS | Elastan | 4 |
| PA, PAM, POLYAMIDE | PAM | Poliamid | 10 |
| ACR, ACRYLIC | ACR | Akrilik | 1 |
| MOD, MODAL | MOD | Modal | 3 |
| BAM, BAMBOO | BAM | Bambu | 2 |

## 📋 Önemli Kurallar

### 1. Elyaf Sıralaması
- Elyaflar **büyükten küçüğe** sıralanır (en yüksek yüzde Elyaf1)
- Örnek: %30 PES, %29 COT, %27 VSK, %13 LIN, %1 ELS

### 2. Dinamik Elyaf Sayısı
- Eğer **sadece 1 elyaf** varsa (%100), sadece `Elyaf1` alanları doldurulur
- Eğer **2 elyaf** varsa, sadece `Elyaf1` ve `Elyaf2` doldurulur
- Maksimum **5 elyaf** desteklenir

### 3. Sayısal Değerler
- `Gramaj`: Sadece sayı (190), birim ve tolerans çıkarılır
- `En`: Sadece sayı (145), birim ve tolerans çıkarılır

### 4. Null Değerler
- Eğer bir bilgi görselde yoksa `null` döner
- Boş elyaf alanları response'da yer almaz

## 🎯 Kullanım Senaryoları

### Senaryo 1: Tam Bilgili Kumaş
```
Input: 5 elyaflı kumaş görseli
Output: Elyaf1-5 tüm alanlar dolu
```

### Senaryo 2: Tek Elyaf (%100 Cotton)
```
Input: %100 Cotton kumaş
Output: Sadece Elyaf1 alanları dolu, Elyaf2-5 yok
```

### Senaryo 3: Eksik Bilgi
```
Input: Gramaj bilgisi olmayan görsel
Output: Gramaj: null
```

## 🔌 ION Entegrasyonu

ION'dan bu endpoint'e bağlanarak:
1. Kumaş görsel URL'i gönderilir
2. API görsel analizi yapar
3. PLM formatında input döner
4. ION bu input'u kullanarak PLM'de kumaş kaydı açar

## 🧪 Test

```bash
# API'yi başlat
npm start

# Test et
node test.js

# Veya manuel test
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_url": "PLM_URL"}'
```

## 📝 Notlar

1. **ChatGPT Accuracy**: GPT-4o Vision yüksek doğrulukla elyaf kodlarını tanıyor
2. **Mapping**: Tüm yaygın elyaf kısaltmaları mapping tablosunda mevcut
3. **Extensibility**: Yeni elyaf tipi eklemek için `ELYAF_MAPPING` objesine ekleme yapılabilir
4. **Error Handling**: Mapping bulunamazsa ham kod kullanılır, Id: null döner

## ✅ Production Ready

- ✅ Elyaf dönüşüm tablosu entegre
- ✅ Dinamik elyaf sayısı desteği
- ✅ PLM formatında output
- ✅ ION entegrasyonu hazır
- ✅ Test edildi ve doğrulandı

---

**Version**: 2.0.0  
**Status**: ✅ Production Ready  
**Last Test**: 2025-11-05

