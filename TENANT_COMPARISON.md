# 🔄 Tenant Karşılaştırma Analizi

## İki Tenant Konfigürasyonu

### Tenant 1: Kartela Örnekleri (Orijinal)
- **Tenant ID:** `HA286TFZ2VY8TRHK_PRD`
- **Connection Name:** -
- **GitHub:** https://github.com/KaanKaraca93/AIFabricCreatePOC
- **Heroku:** Yok
- **Local Port:** 5000

### Tenant 2: BR_ImageToFabric (Yeni)
- **Tenant ID:** `JKARFH4LCGZA78A5_PRD`
- **Connection Name:** BR_Entegrasyon
- **GitHub:** https://github.com/KaanKaraca93/BR_ImageToFabric
- **Heroku:** https://br-image-to-fabric-d512063e011c.herokuapp.com
- **Local Port:** 5001

---

## 🔐 OAuth Credentials Karşılaştırması

| Parametre | Kartela Örnekleri | BR_ImageToFabric |
|-----------|-------------------|------------------|
| **Client ID** | `HA286TFZ2VY8TRHK_PRD~jVqI...` | `JKARFH4LCGZA78A5_PRD~v5Lc...` |
| **Client Secret** | `fBFip3OjD6Z3RMyuNQYq...` | `b719ZdA_4L3IV8jcJWoe...` |
| **Username** | `HA286TFZ2VY8TRHK_PRD#cHMn...` | `JKARFH4LCGZA78A5_PRD#mH98...` |
| **Password** | `THJoUh_JfB5yGOosp4Hs...` | `ABGwIcLtfqiAzr6cilIA...` |
| **Token URL** | `https://mingle-sso.eu1.inforcloudsuite.com:443/HA286TFZ2VY8TRHK_PRD/as/token.oauth2` | `https://mingle-sso.eu1.inforcloudsuite.com:443/JKARFH4LCGZA78A5_PRD/as/token.oauth2` |
| **API URL** | `https://mingle-ionapi.eu1.inforcloudsuite.com/HA286TFZ2VY8TRHK_PRD/FASHIONPLM/pdm/api/pdm/material/v2/save` | `https://mingle-ionapi.eu1.inforcloudsuite.com/JKARFH4LCGZA78A5_PRD/FASHIONPLM/pdm/api/pdm/material/v2/save` |

**⚠️ ÖNEMLİ:** Her tenant'ın kendi unique OAuth credentials'ları var!

---

## 📦 Kumaş Kodu Yazma Süreci

### Akış Diyagramı

```
📸 Görsel Analizi (ChatGPT GPT-4o)
    ↓
    Çıktı: Tedarikçi, Kod, Gramaj, En, Elyaf1-5 (Yüzde + Kod)
    ↓
🧬 Elyaf Mapping (40+ kod → 9 standart elyaf)
    ↓
    Örnek: "PE" → {Id: 13, Code: "PES", Name: "Polyester"}
    ↓
📦 PLM Payload Oluşturma
    ↓
    ├── FieldValues (Ana bilgiler)
    │   ├── MainCategoryId: 5 (Yapay Zeka / AI)
    │   ├── Description: "Tedarikçi - Kod"
    │   ├── CreateId: 124
    │   ├── Weight: Gramaj (Gr)
    │   └── Elyaf bilgileri (ContPercent + GLContentTypeId)
    │
    └── SubEntities
        ├── MaterialConst
        │   ├── Weight: Gramaj
        │   ├── ActWidth: En (cm)
        │   ├── WeightUOMId: 10 (Gr)
        │   └── ActWidthUOMId: 3
        │
        └── MaterialConstContent
            └── Elyaf detayları (1-5 elyaf)
    ↓
🔑 OAuth Token Alma (Tenant spesifik)
    ↓
    POST → Token URL (tenant ID ile)
    Response: access_token (7200 saniye geçerli)
    ↓
🏭 PLM API POST
    ↓
    POST → API URL (tenant ID ile)
    Headers: Authorization: Bearer {token}
    Body: PLM Payload
    ↓
✅ Kumaş Kodu Açıldı
    ↓
    Response: {key, addedCode, name}
```

---

## 🎯 Payload Yapısı (Her İki Tenant'ta AYNI)

### Ana Payload

```json
{
  "Key": 0,
  "userId": "124",
  "notificationMessageKey": "CREATED_MATERIAL_OVERVIEW",
  "ModifyId": "124",
  "FieldValues": [...],
  "SubEntities": [...],
  "ModuleId": 0,
  "idGenContextVal": "",
  "idGenContextVal2": "[]",
  "locale": "en-US",
  "cultureInfos": null,
  "Schema": "FSH2"
}
```

### FieldValues (Ana Bilgiler)

```json
[
  {
    "FieldName": "MainCategoryId",
    "Value": 5,
    "ValueName": "Yapay Zeka",
    "Code": "AI"
  },
  {
    "FieldName": "Description",
    "Value": "NISH KUMAŞ SAN. VE TİC. LTD. ŞTİ. - NK1178",
    "ValueName": "NISH KUMAŞ SAN. VE TİC. LTD. ŞTİ. - NK1178"
  },
  {
    "FieldName": "MaterialCode",
    "Value": null,
    "ValueName": null
  },
  {
    "FieldName": "MaterialName",
    "Value": null,
    "ValueName": null
  },
  {
    "FieldName": "CreateId",
    "Value": 3
  },
  {
    "FieldName": "WeightUOMId",
    "Value": 10,
    "Code": "GR",
    "ValueName": "Gr"
  },
  {
    "FieldName": "Weight",
    "Value": 210,
    "ValueName": 210
  },
  // Elyaf bilgileri (dinamik 1-5)
  {
    "FieldName": "ContPercent1",
    "Value": 79,
    "ValueName": 79,
    "Code": null
  },
  {
    "FieldName": "GLContentTypeId1",
    "Value": 13,
    "ValueName": "Polyester",
    "Code": "PES"
  }
]
```

### SubEntities

#### 1. MaterialConst (Kumaş Özellikleri)

```json
{
  "key": 0,
  "subEntity": "MaterialConst",
  "fieldValues": [
    {
      "fieldName": "WeightUOMId",
      "value": 10
    },
    {
      "fieldName": "ActWidth",
      "value": 190  // En (cm)
    },
    {
      "fieldName": "Weight",
      "value": 210  // Gramaj
    },
    {
      "fieldName": "ActWidthUOMId",
      "value": 3
    }
  ],
  "subEntities": []
}
```

#### 2. MaterialConstContent (Elyaf İçeriği)

```json
{
  "key": 0,
  "subEntity": "MaterialConstContent",
  "fieldValues": [
    {
      "fieldName": "GLContentTypeId1",
      "value": 13  // Polyester
    },
    {
      "fieldName": "ContPercent1",
      "value": 79  // %79
    },
    {
      "fieldName": "GLContentTypeId2",
      "value": 9  // Pamuk
    },
    {
      "fieldName": "ContPercent2",
      "value": 21  // %21
    }
  ],
  "subEntities": []
}
```

---

## 🔍 Tenant Spesifik Farklılıklar

### ✅ AYNI Olanlar (Payload Yapısı)

| Özellik | Kartela | BR | Durum |
|---------|---------|-----|-------|
| **Payload Yapısı** | FSH2 Schema | FSH2 Schema | ✅ Aynı |
| **MainCategoryId** | 2 (Woven) | 5 (Yapay Zeka) | ❌ Farklı |
| **CreateId** | 3 | 124 | ❌ Farklı |
| **userId** | "3" | "124" | ❌ Farklı |
| **WeightUOMId** | 1 (GSM) | 10 (Gr) | ❌ Farklı |
| **ActWidthUOMId** | 3 | 3 | ✅ Aynı |
| **SubEntities** | MaterialConst + MaterialConstContent | MaterialConst + MaterialConstContent | ✅ Aynı |
| **Elyaf Mapping** | 9 tip, 40+ kod | 9 tip, 40+ kod | ✅ Aynı |

### ⚠️ FARKLI Olanlar (Tenant Konfigürasyonu)

| Özellik | Kartela | BR | Durum |
|---------|---------|-----|-------|
| **Tenant ID** | HA286TFZ2VY8TRHK_PRD | JKARFH4LCGZA78A5_PRD | ❌ Farklı |
| **OAuth Credentials** | Unique set | Unique set | ❌ Farklı |
| **Token URL** | .../HA286TFZ2VY8TRHK_PRD/... | .../JKARFH4LCGZA78A5_PRD/... | ❌ Farklı |
| **API URL** | .../HA286TFZ2VY8TRHK_PRD/... | .../JKARFH4LCGZA78A5_PRD/... | ❌ Farklı |
| **Access Token** | Tenant-specific | Tenant-specific | ❌ Farklı |

---

## 🧬 Elyaf Mapping Tablosu 

### ⚠️ TENANT'LAR ARASI FARK

**Kartela Tenant (HA286TFZ2VY8TRHK_PRD):** 9 elyaf tipi  
**BR Tenant (JKARFH4LCGZA78A5_PRD):** 86 elyaf tipi ✅

### BR Tenant - En Yaygın Elyaflar:

| Görsel Kodu | PLM ID | PLM Code | PLM Name (TR) | Varyasyonlar |
|-------------|--------|----------|---------------|--------------|
| **Polyester** | 63 | PES | Poliester | PE, PES, PL, PET, POLYESTER |
| **Pamuk** | 56 | COT | Pamuk | CO, COT, COTTON |
| **Viskon** | 84 | VSK | Viskon | VI, CV, VSK, VISCOSE |
| **Viskoz** | 78 | VSC | Viskoz | VSC, VISCOSE |
| **Keten** | 40 | LIN | Keten | LI, LIN, LINEN |
| **Elastan** | 20 | ELS | Elastan | EA, ELS, ELASTANE, SPANDEX, LYCRA |
| **Poliamid** | 58 | PAM | Poliamid | PA, PAM, POLYAMIDE, NYLON |
| **Naylon** | 86 | NYL | Naylon | NY, NYL, NYLON |
| **Akrilik** | 1 | ACR | Akrilik | ACR, ACRYLIC |
| **Modal** | 54 | MDL | Modal | MOD, MDL, MODAL |
| **Bambu** | 11 | BAM | Bambu | BAM, BAMBOO |
| **Yün** | 81 | WOO | Yün | WO, WOO, WOOL |
| **İpek** | 31 | SLK | İpek | SLK, SILK |
| **Lyocell** | 47 | LYC | Lyocell | LYC, LYOCELL |
| **Tensel** | 83 | TNS | Tensel | TNS, TENSEL, TENCEL |

**+ 71 elyaf daha:** Asetat, Kaşmir, Moher, Deri, Lureks, Kenevir, Jut, Sisal vb.

**Önemli Not:** Elyaf ID'leri tenant'lar arasında **FARKLI**! Her tenant'ın kendi PLM veritabanı var.

---

## 📊 Örnek: Tam Akış

### Input (ChatGPT'den)

```json
{
  "tedarikcisi": "NISH KUMAŞ SAN. VE TİC. LTD. ŞTİ.",
  "tedarikci_kodu": "NK1178",
  "gramaj": 210,
  "en": 190,
  "elyaf1_yuzde": 79,
  "elyaf1_kod": "PES",
  "elyaf2_yuzde": 21,
  "elyaf2_kod": "COT"
}
```

### Mapping Sonrası

```json
{
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
}
```

### PLM Response

```json
{
  "key": 105,
  "addedCode": "20251205-120000123",
  "name": "NISH KUMAŞ SAN. VE TİC. LTD. ŞTİ. - NK1178,210 GSM,79%21%Pamuk"
}
```

---

## 🎯 Özet

### Tenant Bağımsız (Shared Logic)

✅ Payload yapısı aynı  
✅ Elyaf mapping aynı  
✅ API endpoint path'leri aynı (/api/pdm/material/v2/save)  
✅ ChatGPT analiz prompt'u aynı  
✅ Kod mantığı %100 aynı  

### Tenant Spesifik (Per-Tenant Config)

⚠️ OAuth credentials (client_id, client_secret, username, password)  
⚠️ Token URL (tenant ID içeriyor)  
⚠️ API Base URL (tenant ID içeriyor)  
⚠️ Access tokens (her tenant'ın kendi token'ı)  

---

## 💡 Sonuç

İki tenant için **KOD TAMAMEN AYNI**, sadece **KONFİGÜRASYON FARKLI**.

Bu sayede:
- ✅ Aynı codebase'i kullanabiliyoruz
- ✅ Sadece credentials değiştirerek yeni tenant ekleyebiliyoruz
- ✅ Her tenant kendi PLM instance'ına bağlanıyor
- ✅ Güvenlik izole (her tenant'ın kendi credentials'ı)

**Yeni tenant eklemek için yapılması gerekenler:**
1. PLM'den tenant credentials al
2. `PLM_CONFIG` değişkenini güncelle
3. Deploy et
4. Bitti! 🚀

---

**Oluşturulma Tarihi:** 2025-12-05  
**Versiyon:** 1.0

