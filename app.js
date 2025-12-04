/**
 * Kumaş Analiz API - Node.js + Express
 * ChatGPT API ile görsel analizi
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/*********************************************************
 * PLM OAuth TOKEN YÖNETİMİ
 *********************************************************/

let accessToken = null;
let refreshToken = null;
let expiresAt = 0;

// PLM OAuth credentials (from environment variables)
// Tenant: JKARFH4LCGZA78A5_PRD (BR_Entegrasyon)
const PLM_CONFIG = {
    client_id: process.env.PLM_CLIENT_ID || 'JKARFH4LCGZA78A5_PRD~v5Lc4NhRCRBgIWqu66v3decDkOnua6U1B2r5cJ8DXpA',
    client_secret: process.env.PLM_CLIENT_SECRET || 'b719ZdA_4L3IV8jcJWoeloGiJBglqafNoAxM14DoZaWHSGrD8GGVvio8JyHP2F-MaYOfgiFIxuapPetzNqKVqA',
    username: process.env.PLM_USERNAME || 'JKARFH4LCGZA78A5_PRD#mH9888ZyFUwKPgkaeuzTyrH_-rdRitN-NCy_HnCf_fJXLxCCvdRnXGFvcveTd8LJtl-OtTld-ZTpq_szty0UPg',
    password: process.env.PLM_PASSWORD || 'ABGwIcLtfqiAzr6cilIAnV8Q7tCF0DKU-M8JHGtrUiWh9voH73XUwfyRQCJc3UFNGu5y9xU22AFyDv2TQ7_S9A',
    token_url: process.env.PLM_TOKEN_URL || 'https://mingle-sso.eu1.inforcloudsuite.com:443/JKARFH4LCGZA78A5_PRD/as/token.oauth2',
    api_base_url: process.env.PLM_API_URL || 'https://mingle-ionapi.eu1.inforcloudsuite.com/JKARFH4LCGZA78A5_PRD/FASHIONPLM/pdm/api/pdm/material/v2/save'
};

async function loginWithPassword() {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', PLM_CONFIG.client_id);
    params.append('client_secret', PLM_CONFIG.client_secret);
    params.append('username', PLM_CONFIG.username);
    params.append('password', PLM_CONFIG.password);

    const response = await axios.post(
        PLM_CONFIG.token_url,
        params.toString(),
        {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
    );
    return response.data;
}

function storeTokenData(tokenResponse) {
    accessToken = tokenResponse.access_token;
    refreshToken = tokenResponse.refresh_token || null;
    const expiresIn = tokenResponse.expires_in || 3600;
    expiresAt = Date.now() + (expiresIn * 1000);
}

async function getAccessToken() {
    const now = Date.now();
    if (accessToken && now < expiresAt) {
        return accessToken;
    }

    console.log('🔑 PLM token alınıyor...');
    const tokenResponse = await loginWithPassword();
    storeTokenData(tokenResponse);
    console.log('✅ PLM token başarıyla alındı!');
    return accessToken;
}

// Elyaf Dönüşüm Tablosu (PLM'den alınan)
const ELYAF_MAPPING = {
    "ACR": { Id: 1, Code: "ACR", Name: "Akrilik" },
    "AKRİLİK": { Id: 1, Code: "ACR", Name: "Akrilik" },
    "ACRYLIC": { Id: 1, Code: "ACR", Name: "Akrilik" },
    
    "BAM": { Id: 2, Code: "BAM", Name: "Bambu" },
    "BAMBU": { Id: 2, Code: "BAM", Name: "Bambu" },
    "BAMBOO": { Id: 2, Code: "BAM", Name: "Bambu" },
    
    "MOD": { Id: 3, Code: "MOD", Name: "Modal" },
    "MODAL": { Id: 3, Code: "MOD", Name: "Modal" },
    
    "ELS": { Id: 4, Code: "ELS", Name: "Elastan" },
    "ELASTAN": { Id: 4, Code: "ELS", Name: "Elastan" },
    "ELASTANE": { Id: 4, Code: "ELS", Name: "Elastan" },
    "SPANDEX": { Id: 4, Code: "ELS", Name: "Elastan" },
    "EA": { Id: 4, Code: "ELS", Name: "Elastan" },
    
    "LIN": { Id: 6, Code: "LIN", Name: "Keten" },
    "KETEN": { Id: 6, Code: "LIN", Name: "Keten" },
    "LINEN": { Id: 6, Code: "LIN", Name: "Keten" },
    "LI": { Id: 6, Code: "LIN", Name: "Keten" },
    
    "COT": { Id: 9, Code: "COT", Name: "Pamuk" },
    "PAMUK": { Id: 9, Code: "COT", Name: "Pamuk" },
    "COTTON": { Id: 9, Code: "COT", Name: "Pamuk" },
    "CO": { Id: 9, Code: "COT", Name: "Pamuk" },
    
    "PAM": { Id: 10, Code: "PAM", Name: "Poliamid" },
    "POLİAMİD": { Id: 10, Code: "PAM", Name: "Poliamid" },
    "POLYAMIDE": { Id: 10, Code: "PAM", Name: "Poliamid" },
    "PA": { Id: 10, Code: "PAM", Name: "Poliamid" },
    
    "PES": { Id: 13, Code: "PES", Name: "Polyester" },
    "POLYESTER": { Id: 13, Code: "PES", Name: "Polyester" },
    "PE": { Id: 13, Code: "PES", Name: "Polyester" },
    "PL": { Id: 13, Code: "PES", Name: "Polyester" },
    
    "VSK": { Id: 14, Code: "VSK", Name: "Viskon" },
    "VİSKON": { Id: 14, Code: "VSK", Name: "Viskon" },
    "VISCOSE": { Id: 14, Code: "VSK", Name: "Viskon" },
    "VI": { Id: 14, Code: "VSK", Name: "Viskon" },
    "CV": { Id: 14, Code: "VSK", Name: "Viskon" }
};

/**
 * Elyaf kodunu normalize et ve mapping'den bul
 */
function findFiberMapping(fiberCode) {
    const normalized = fiberCode.toUpperCase().trim();
    return ELYAF_MAPPING[normalized] || null;
}

/**
 * ChatGPT response'unu PLM input formatına çevir
 */
function convertToPLMFormat(chatgptData) {
    const plmData = {
        Tedarikcisi: chatgptData.tedarikcisi || null,
        Tedarikci_Kodu: chatgptData.tedarikci_kodu || null,
        Gramaj: chatgptData.gramaj || null,
        En: chatgptData.en || null
    };

    // Elyaf bilgilerini işle (maksimum 5 elyaf)
    for (let i = 1; i <= 5; i++) {
        const yuzdeKey = `elyaf${i}_yuzde`;
        const kodKey = `elyaf${i}_kod`;
        
        const yuzde = chatgptData[yuzdeKey];
        const kod = chatgptData[kodKey];

        if (yuzde && kod) {
            const mapping = findFiberMapping(kod);
            
            if (mapping) {
                plmData[`Elyaf${i}Yuzde`] = yuzde;
                plmData[`Elyaf${i}`] = mapping.Name;
                plmData[`Elyaf${i}Id`] = mapping.Id;
                plmData[`Elyaf${i}Code`] = mapping.Code;
            } else {
                // Mapping bulunamadı, ham veriyi kullan
                plmData[`Elyaf${i}Yuzde`] = yuzde;
                plmData[`Elyaf${i}`] = kod;
                plmData[`Elyaf${i}Id`] = null;
                plmData[`Elyaf${i}Code`] = kod;
            }
        }
    }

    return plmData;
}

/**
 * PLM kumaş açma payload'unu oluştur
 */
function createPLMMaterialPayload(plmData) {
    // Description: Tedarikçi + Kod
    const description = `${plmData.Tedarikcisi || 'Unknown'} - ${plmData.Tedarikci_Kodu || 'Unknown'}`;
    
    // Temel FieldValues
    const fieldValues = [
        {
            FieldName: "MainCategoryId",
            Value: 2,
            ValueName: "Woven",
            Code: "DK"
        },
        {
            FieldName: "Description",
            Value: description,
            ValueName: description
        },
        {
            FieldName: "MaterialCode",
            Value: null,
            ValueName: null
        },
        {
            FieldName: "MaterialName",
            Value: null,
            ValueName: null
        },
        {
            FieldName: "CreateId",
            Value: 3
        },
        {
            FieldName: "Original_Name",
            Value: ""
        },
        {
            FieldName: "Original_Description",
            Value: ""
        }
    ];

    // Elyaf bilgilerini ekle (dinamik)
    for (let i = 1; i <= 5; i++) {
        const yuzde = plmData[`Elyaf${i}Yuzde`];
        const id = plmData[`Elyaf${i}Id`];
        const name = plmData[`Elyaf${i}`];
        const code = plmData[`Elyaf${i}Code`];

        if (yuzde && id) {
            // ContPercent
            fieldValues.push({
                FieldName: `ContPercent${i}`,
                Value: yuzde,
                ValueName: yuzde,
                Code: null
            });

            // GLContentTypeId
            fieldValues.push({
                FieldName: `GLContentTypeId${i}`,
                Value: id,
                ValueName: name,
                Code: code
            });
        }
    }

    // Gramaj ve birim
    fieldValues.push({
        FieldName: "WeightUOMId",
        Value: 1,
        Code: "MU001",
        ValueName: "GSM"
    });

    fieldValues.push({
        FieldName: "Weight",
        Value: plmData.Gramaj || 0,
        Code: null,
        ValueName: plmData.Gramaj || 0
    });

    fieldValues.push({
        fieldName: "IsSetAsMainSupplier",
        value: false
    });

    // SubEntities - MaterialConst
    const materialConstFieldValues = [
        {
            fieldName: "WeightUOMId",
            value: 1
        },
        {
            fieldName: "ActWidth",
            value: plmData.En || 0
        },
        {
            fieldName: "Weight",
            value: plmData.Gramaj || 0
        },
        {
            fieldName: "ActWidthUOMId",
            value: 3
        }
    ];

    // SubEntities - MaterialConstContent
    const materialConstContentFieldValues = [];
    for (let i = 1; i <= 5; i++) {
        const id = plmData[`Elyaf${i}Id`];
        const yuzde = plmData[`Elyaf${i}Yuzde`];

        if (id && yuzde) {
            materialConstContentFieldValues.push({
                fieldName: `GLContentTypeId${i}`,
                value: id
            });
            materialConstContentFieldValues.push({
                fieldName: `ContPercent${i}`,
                value: yuzde
            });
        }
    }

    // Final payload
    const payload = {
        Key: 0,
        userId: "3",
        notificationMessageKey: "CREATED_MATERIAL_OVERVIEW",
        ModifyId: "3",
        FieldValues: fieldValues,
        SubEntities: [
            {
                key: 0,
                subEntity: "MaterialConst",
                fieldValues: materialConstFieldValues,
                subEntities: []
            },
            {
                key: 0,
                subEntity: "MaterialConstContent",
                fieldValues: materialConstContentFieldValues,
                subEntities: []
            }
        ],
        ModuleId: 0,
        idGenContextVal: "",
        idGenContextVal2: "[]",
        locale: "en-US",
        cultureInfos: null,
        Schema: "FSH2"
    };

    return payload;
}

/**
 * PLM'de kumaş kodu aç
 */
async function createMaterialInPLM(plmData) {
    try {
        console.log('🏭 PLM\'de kumaş kodu açılıyor...');
        
        // Token al
        const token = await getAccessToken();
        
        // Payload oluştur
        const payload = createPLMMaterialPayload(plmData);
        
        console.log('📦 Payload hazırlandı:', JSON.stringify(payload, null, 2));
        
        // PLM API'ye POST
        const response = await axios.post(
            PLM_CONFIG.api_base_url,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ PLM\'de kumaş kodu başarıyla açıldı!');
        
        return {
            success: true,
            plm_response: response.data,
            material_description: `${plmData.Tedarikcisi} - ${plmData.Tedarikci_Kodu}`
        };

    } catch (error) {
        console.error('❌ PLM kumaş açma hatası:', error.response?.data || error.message);
        
        return {
            success: false,
            error: error.response?.data || error.message,
            error_type: error.name
        };
    }
}

/**
 * Kumaş görselini ChatGPT ile analiz et
 * Akış: URL → İndirme → Base64 → ChatGPT → JSON
 */
async function analyzeFabricImage(imageUrl) {
    try {
        console.log(`📸 URL'den analiz ediliyor: ${imageUrl.substring(0, 100)}...`);

        // 1. Görseli URL'den indir
        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        // 2. Base64'e çevir
        const imageBase64 = Buffer.from(imageResponse.data).toString('base64');

        // 3. ChatGPT'ye gönderilecek prompt (PLM formatı için)
        const prompt = `
Bu kumaş etiket görselini analiz et ve aşağıdaki bilgileri çıkar.

ÖNEMLİ KURALLAR:
1. Elyaf içeriğini ayrıştır: Her elyafı ayrı ayrı yüzde ve kod olarak ver
2. Elyaf kodlarını STANDART KISALTMALARA çevir (PE→PES, CO→COT, VI→VSK, LI→LIN, EA→ELS vb.)
3. Gramaj ve En'den sadece SAYISAL değeri al (birim ve toleransları çıkar)
4. Elyaf sıralaması büyükten küçüğe olmalı (en yüksek yüzde Elyaf1)
5. Eğer sadece 1 elyaf varsa (%100) sadece Elyaf1 doldur, diğerlerini boş bırak

ELYAF KOD DÖNÜŞÜM TABLOSU:
- PE, PES, PL, POLYESTER → PES
- CO, COT, COTTON → COT
- VI, CV, VSK, VISCOSE, VİSKON → VSK
- LI, LIN, LINEN, KETEN → LIN
- EA, ELS, ELASTAN, ELASTANE, SPANDEX → ELS
- PA, PAM, POLYAMIDE, POLİAMİD → PAM
- ACR, AKRİLİK, ACRYLIC → ACR
- MOD, MODAL → MOD
- BAM, BAMBU, BAMBOO → BAM

Sadece JSON formatında cevap ver, başka açıklama ekleme:
{
    "tedarikcisi": "Tedarikçi firma adı",
    "tedarikci_kodu": "Ürün kodu",
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
}

NOT: Eğer 5'ten az elyaf varsa, boş alanları null bırak. Eğer bilgi yoksa null yaz.`;

        // 4. ChatGPT'ye gönder
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 500,
            temperature: 0.1
        });

        // 5. Sonucu parse et
        let content = response.choices[0].message.content.trim();

        // JSON formatını temizle (eğer markdown içinde geldiyse)
        if (content.startsWith('```json')) {
            content = content.substring(7);
        }
        if (content.endsWith('```')) {
            content = content.substring(0, content.length - 3);
        }
        content = content.trim();

        // JSON'a çevir
        const chatgptData = JSON.parse(content);

        // PLM formatına çevir
        const plmData = convertToPLMFormat(chatgptData);

        return {
            success: true,
            data: plmData,
            raw_chatgpt_response: chatgptData  // Debug için ham response
        };

    } catch (error) {
        console.error('❌ Hata:', error.message);
        
        if (error.response) {
            // HTTP hatası
            return {
                success: false,
                error: `Görsel indirilemedi: ${error.response.status} ${error.response.statusText}`
            };
        } else if (error instanceof SyntaxError) {
            // JSON parse hatası
            return {
                success: false,
                error: `ChatGPT cevabı JSON formatında değil: ${error.message}`
            };
        } else {
            // Genel hata
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Basic Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'Kumaş Analiz API çalışıyor',
        timestamp: new Date().toISOString()
    });
});

// Detailed Health check endpoint (checks all integrations)
app.get('/health/detailed', async (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            api: {
                status: 'healthy',
                message: 'Express API çalışıyor',
                uptime_seconds: Math.floor(process.uptime())
            },
            openai: {
                status: 'unknown',
                message: '',
                api_key_configured: false
            },
            plm: {
                status: 'unknown',
                message: '',
                credentials_configured: false,
                token_status: 'not_checked'
            },
            github: {
                status: 'info',
                message: 'GitHub sadece kod repository olarak kullanılıyor',
                repository: 'https://github.com/KaanKaraca93/BR_ImageToFabric' // BR Tenant Repository
            }
        }
    };

    // Check OpenAI Configuration
    if (process.env.OPENAI_API_KEY) {
        healthStatus.services.openai.api_key_configured = true;
        
        try {
            // Test OpenAI connection with a minimal request
            const testResponse = await openai.models.list();
            healthStatus.services.openai.status = 'healthy';
            healthStatus.services.openai.message = 'OpenAI API bağlantısı başarılı';
            healthStatus.services.openai.models_available = testResponse.data.length;
        } catch (error) {
            healthStatus.services.openai.status = 'unhealthy';
            healthStatus.services.openai.message = `OpenAI API hatası: ${error.message}`;
            healthStatus.status = 'degraded';
        }
    } else {
        healthStatus.services.openai.status = 'unhealthy';
        healthStatus.services.openai.message = 'OPENAI_API_KEY environment variable bulunamadı';
        healthStatus.status = 'degraded';
    }

    // Check PLM Configuration and Token
    if (PLM_CONFIG.client_id && PLM_CONFIG.client_secret && PLM_CONFIG.username && PLM_CONFIG.password) {
        healthStatus.services.plm.credentials_configured = true;
        
        try {
            // Try to get a token
            const token = await getAccessToken();
            
            if (token) {
                healthStatus.services.plm.status = 'healthy';
                healthStatus.services.plm.message = 'PLM OAuth token başarıyla alındı';
                healthStatus.services.plm.token_status = 'valid';
                healthStatus.services.plm.token_expires_in_seconds = Math.floor((expiresAt - Date.now()) / 1000);
            } else {
                healthStatus.services.plm.status = 'unhealthy';
                healthStatus.services.plm.message = 'Token alınamadı';
                healthStatus.services.plm.token_status = 'failed';
                healthStatus.status = 'degraded';
            }
        } catch (error) {
            healthStatus.services.plm.status = 'unhealthy';
            healthStatus.services.plm.message = `PLM bağlantı hatası: ${error.message}`;
            healthStatus.services.plm.token_status = 'error';
            healthStatus.status = 'degraded';
        }
    } else {
        healthStatus.services.plm.status = 'unhealthy';
        healthStatus.services.plm.message = 'PLM credentials eksik';
        healthStatus.status = 'degraded';
    }

    // Set overall status code
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                       healthStatus.status === 'degraded' ? 503 : 500;

    res.status(statusCode).json(healthStatus);
});

// Analiz endpoint'i (ION Entegrasyonu)
app.post('/analyze', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { image_url, images, document_id, request_id, timestamp } = req.body;

        // Batch işlem (çoklu görsel)
        if (images && Array.isArray(images)) {
            const results = [];
            
            for (const item of images) {
                const itemResult = await analyzeFabricImage(item.image_url);
                results.push({
                    document_id: item.document_id || 'unknown',
                    ...itemResult
                });
            }
            
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            
            return res.json({
                success: true,
                results: results,
                summary: {
                    total: results.length,
                    successful: successful,
                    failed: failed,
                    processing_time_ms: Date.now() - startTime
                }
            });
        }

        // Tek görsel işlem
        if (!image_url) {
            return res.status(400).json({
                success: false,
                error: 'image_url veya images parametresi gerekli'
            });
        }

        const result = await analyzeFabricImage(image_url);

        // Metadata ekle
        const response = {
            ...result,
            metadata: {
                document_id: document_id || null,
                request_id: request_id || null,
                timestamp: timestamp || new Date().toISOString(),
                processing_time_ms: Date.now() - startTime
            }
        };

        if (result.success) {
            res.json(response);
        } else {
            res.status(500).json(response);
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            metadata: {
                document_id: req.body.document_id || null,
                request_id: req.body.request_id || null,
                timestamp: req.body.timestamp || new Date().toISOString(),
                processing_time_ms: Date.now() - startTime
            }
        });
    }
});

// Analiz + PLM'de Kumaş Aç endpoint'i
app.post('/analyze-and-create', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { image_url, document_id, request_id, timestamp, create_in_plm } = req.body;

        if (!image_url) {
            return res.status(400).json({
                success: false,
                error: 'image_url parametresi gerekli'
            });
        }

        console.log('\n🎯 TAM AKIŞ BAŞLADI: Analiz + PLM Kumaş Açma');
        console.log('='.repeat(70));

        // 1. Görsel Analizi
        console.log('\n📸 ADIM 1: Görsel Analizi');
        const analysisResult = await analyzeFabricImage(image_url);

        if (!analysisResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Görsel analizi başarısız',
                analysis_error: analysisResult.error,
                metadata: {
                    document_id: document_id || null,
                    request_id: request_id || null,
                    timestamp: timestamp || new Date().toISOString(),
                    processing_time_ms: Date.now() - startTime
                }
            });
        }

        console.log('✅ Görsel analizi tamamlandı');
        console.log(`   Tedarikçi: ${analysisResult.data.Tedarikcisi}`);
        console.log(`   Kod: ${analysisResult.data.Tedarikci_Kodu}`);

        // 2. PLM'de Kumaş Aç (opsiyonel)
        let plmResult = null;
        if (create_in_plm !== false) {  // Default true
            console.log('\n🏭 ADIM 2: PLM\'de Kumaş Kodu Açma');
            plmResult = await createMaterialInPLM(analysisResult.data);
            
            if (plmResult.success) {
                console.log('✅ PLM\'de kumaş kodu açıldı');
            } else {
                console.log('⚠️  PLM kumaş açma başarısız (analiz sonucu döndürülüyor)');
            }
        } else {
            console.log('\n⏭️  ADIM 2 ATLANDI: PLM kumaş açma istenmedi');
        }

        console.log('\n' + '='.repeat(70));
        console.log('🎉 TAM AKIŞ TAMAMLANDI!\n');

        // Final response
        const response = {
            success: true,
            analysis: {
                success: true,
                data: analysisResult.data,
                raw_chatgpt_response: analysisResult.raw_chatgpt_response
            },
            plm_creation: plmResult,
            metadata: {
                document_id: document_id || null,
                request_id: request_id || null,
                timestamp: timestamp || new Date().toISOString(),
                processing_time_ms: Date.now() - startTime
            }
        };

        res.json(response);

    } catch (error) {
        console.error('\n❌ TAM AKIŞ HATASI:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            error_type: error.name,
            metadata: {
                document_id: req.body.document_id || null,
                request_id: req.body.request_id || null,
                timestamp: req.body.timestamp || new Date().toISOString(),
                processing_time_ms: Date.now() - startTime
            }
        });
    }
});

// Server başlat
app.listen(PORT, () => {
    console.log('🚀 Kumaş Analiz API başlatılıyor...');
    console.log(`📡 API URL: http://localhost:${PORT}`);
    console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
    console.log(`📊 Analyze Endpoint: http://localhost:${PORT}/analyze`);
    console.log(`🏭 Analyze + Create: http://localhost:${PORT}/analyze-and-create`);
    console.log('');
    console.log('⚡ Akış 1: PLM URL → Analiz → JSON');
    console.log('⚡ Akış 2: PLM URL → Analiz → PLM Kumaş Açma → JSON');
    console.log('');
});

