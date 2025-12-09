# PLM Görsel Yükleme Test Scripti

## 🎯 Amaç
Bu script, kumaş etiket görselini URL'den indirip PLM'de kumaş koduna **ana görsel** olarak ekler.

## 📋 Süreç

### 1️⃣ Görsel İndirme
URL'den görseli indirir ve geçici dosyaya kaydeder.

### 2️⃣ UploadFile (1. API)
```
POST /documents/api/document/UploadFile
```
- FormData ile görseli yükler
- `objectKey`, `thumbUrl`, `customUrl` alır
- `tempId` oluşturur

### 3️⃣ SaveMetadata (2. API)
```
POST /documents/api/document/SaveMetadata/
```
- Metadata'yı kaydeder
- **`isDefault: true`** → Ana görsel olarak işaretler
- `referenceId` → Material ID
- `code` → Material Code

### 4️⃣ Temizlik
Geçici dosyayı siler.

---

## 🚀 Kullanım

### Test Scripti Çalıştırma

```bash
node test_image_upload.js <IMAGE_URL> <MATERIAL_ID> <MATERIAL_CODE>
```

### Örnek:

```bash
node test_image_upload.js "https://example.com/fabric.jpg" "5097" "E0023"
```

### npm script ile:

```bash
npm run test:image -- "https://example.com/fabric.jpg" "5097" "E0023"
```

---

## 📊 Örnek Çıktı

```
🚀 PLM Görsel Yükleme Testi Başlıyor...

📝 Test Parametreleri:
  Image URL: https://example.com/fabric.jpg
  Material ID: 5097
  Material Code: E0023

🔐 PLM Token alınıyor...
✅ Token alındı

📥 Görsel indiriliyor: https://example.com/fabric.jpg
✅ Görsel indirildi: C:\...\temp_1733779234567.jpg

📤 1. Adım: Görsel yükleniyor...
  Material ID: 5097
  Material Code: E0023
  File: fabric.jpg
✅ Görsel yüklendi!

📋 2. Adım: Metadata kaydediliyor...
✅ Metadata kaydedildi! Ana görsel ayarlandı.

🎉 TEST BAŞARILI! Görsel ana görsel olarak eklendi.

📊 Final Sonuç:
  Object Key: Material_Overview_04396_...
  Thumb URL: https://...s3.amazonaws.com/.../thumb...
  Preview URL: https://...s3.amazonaws.com/.../preview...

🧹 Geçici dosya temizlendi
```

---

## 🔧 Parametreler

| Parametre | Açıklama | Örnek |
|-----------|----------|-------|
| `IMAGE_URL` | Kumaş etiket görselinin URL'si | `https://plm.../image.jpg` |
| `MATERIAL_ID` | PLM'de oluşturulan kumaş ID | `5097` |
| `MATERIAL_CODE` | PLM'de oluşturulan kumaş kodu | `E0023` |

---

## 📦 Payload Detayları

### UploadFile FormData:
```
atta: {
  "referenceId": "5097",           // Material ID
  "code": "E0023",                 // Material Code
  "originalObjectName": "fabric.jpg",
  "isDefault": false,              // İlk adımda false
  "tempId": "uuid-v4"
}
type: "undefined"
formType: "file"
schema: "FSH1"
overwrite: "false"
file: <binary-data>
```

### SaveMetadata JSON:
```json
{
  "AttaFileListDto": [{
    "referenceId": "5097",
    "code": "E0023",
    "isDefault": true,             // ANA GÖRSEL!
    "objectKey": "Material_Overview_...",
    "tempId": "uuid-v4",
    "thumbUrl": "...",
    "customUrl": "..."
  }],
  "Schema": "FSH1"
}
```

---

## ⚠️ Önemli Notlar

1. **Ana Görsel:** `isDefault: true` sadece SaveMetadata adımında kullanılır
2. **Material ID:** Kumaş oluşturulduktan sonra alınan ID
3. **Material Code:** Kumaş oluşturulduktan sonra alınan Code
4. **Geçici Dosya:** Test sonunda otomatik silinir
5. **Token:** Her testte yeni token alınır

---

## 🔗 Ana Kod Entegrasyonu

Test başarılı olduktan sonra, bu fonksiyonları `app.js`'e entegre edebiliriz:

```javascript
// app.js içinde:
const { uploadImageToPLM, saveImageMetadata } = require('./test_image_upload');

// createMaterialInPLM fonksiyonundan sonra:
if (imageUrl) {
  const uploadResult = await uploadImageToPLM(
    token, 
    imageFilePath, 
    imageFileName, 
    materialKey, 
    materialCode
  );
  
  await saveImageMetadata(
    token, 
    uploadResult, 
    materialKey, 
    materialCode
  );
}
```

---

## 🧪 Test Önceliği

1. ✅ Token alımını test et
2. ✅ Görseli indir
3. ✅ UploadFile API'yi test et
4. ✅ SaveMetadata API'yi test et
5. ✅ PLM'de görseli kontrol et

---

## 📝 TODO

- [ ] Test başarılı olursa `app.js`'e entegre et
- [ ] Hata senaryolarını test et (geçersiz URL, büyük dosya, vb.)
- [ ] Görsel format kontrolü ekle (JPEG, PNG, vb.)
- [ ] Dosya boyutu limiti kontrol et

