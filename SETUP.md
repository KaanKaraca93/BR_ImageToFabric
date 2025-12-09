# 🚀 BR_ImageToFabric - Setup Guide

## ✅ Tamamlanan Adımlar

- ✅ Proje dosyaları kopyalandı
- ✅ PLM Tenant bilgileri güncellendi (JKARFH4LCGZA78A5_PRD)
- ✅ Git repository initialize edildi
- ✅ Dependencies yüklendi (npm install)
- ✅ .env dosyası oluşturuldu

## 📝 Yapılması Gerekenler

### 1. OpenAI API Key Ekle

`.env` dosyasını düzenleyin ve OpenAI API key'inizi ekleyin:

```env
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

### 2. Local Test

```bash
# API'yi başlat
npm start

# Başka terminalde health check
npm run test:health
```

### 3. GitHub Repository Oluştur

```bash
# GitHub'da yeni repository oluştur: BR_ImageToFabric
# https://github.com/new

# Repository'yi bağla
git remote add origin https://github.com/KaanKaraca93/BR_ImageToFabric.git

# İlk commit ve push
git add .
git commit -m "Initial commit - BR Tenant (JKARFH4LCGZA78A5_PRD)"
git branch -M main
git push -u origin main
```

### 4. Heroku App Oluştur

#### Option A: Heroku Dashboard

1. https://dashboard.heroku.com/new-app
2. App name: `br-image-to-fabric` (veya istediğiniz isim)
3. Region: Europe
4. Create app

#### Option B: Heroku CLI

```bash
heroku login
heroku create br-image-to-fabric --region eu
```

### 5. Heroku Environment Variables

Heroku Dashboard → Settings → Config Vars'a şunları ekleyin:

```
OPENAI_API_KEY = sk-your-actual-openai-api-key-here
```

**Not:** PLM credentials zaten app.js'te hardcoded olduğu için Heroku'ya eklemek gerekmiyor.

### 6. Deploy to Heroku

#### GitHub ile Otomatik Deploy (Önerilen):

1. Heroku Dashboard → Deploy sekmesi
2. Deployment method: **GitHub**
3. Repository'yi bağla: `BR_ImageToFabric`
4. **Enable Automatic Deploys** (isteğe bağlı)
5. **Deploy Branch** butonuna tıkla

#### Git Push ile Deploy:

```bash
heroku git:remote -a br-image-to-fabric
git push heroku main
```

### 7. Test Heroku Deployment

```bash
# Basic health check
curl https://br-image-to-fabric.herokuapp.com/health

# Detailed health check
curl https://br-image-to-fabric.herokuapp.com/health/detailed

# Test script ile
API_URL=https://br-image-to-fabric.herokuapp.com npm run test:health
```

## 🔧 PLM Tenant Bilgileri

- **Tenant ID:** JKARFH4LCGZA78A5_PRD
- **Connection Name:** BR_Entegrasyon
- **Token URL:** https://mingle-sso.eu1.inforcloudsuite.com:443/JKARFH4LCGZA78A5_PRD/as/token.oauth2
- **API URL:** https://mingle-ionapi.eu1.inforcloudsuite.com/JKARFH4LCGZA78A5_PRD/FASHIONPLM/pdm/api/pdm/material/v2/save

## 📡 API Endpoints

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check (all services)
- `POST /analyze` - Analyze fabric image
- `POST /analyze-and-create` - Analyze + Create in PLM

## 🧪 Test Commands

```bash
# Health check
npm run test:health

# Basic analysis test
npm test

# Full flow test (with PLM)
node test_full_flow.js

# All tests
npm run test:all
```

## 📚 Documentation

- **API Docs:** `swagger.yaml`
- **PLM Format:** `PLM_INPUT_FORMAT.md`
- **ION Integration:** `ION_API.md`

## 🔗 Links

- **GitHub Repo:** https://github.com/KaanKaraca93/BR_ImageToFabric
- **Heroku App:** https://br-image-to-fabric.herokuapp.com (deployment sonrası)
- **Original Project:** https://github.com/KaanKaraca93/AIFabricCreatePOC

---

**Status:** ⚙️ Setup in Progress  
**Next Step:** OpenAI API Key ekle ve local test yap


