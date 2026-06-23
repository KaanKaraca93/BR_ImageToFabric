/**
 * Kumaş Analiz API - Node.js + Express
 * ChatGPT API ile görsel analizi
 */

// IPv6 öncelikli DNS, bazı bulut ortamlarında (Heroku) OpenAI'a giden
// bağlantının resetlenmesine ("Premature close") yol açabiliyor; IPv4'ü önceliyoruz.
require('dns').setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const OpenAI = require('openai');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// OpenAI client
// maxRetries + timeout: Heroku'da görülen "Premature close" (bayat keep-alive
// soketi) hatalarında istek otomatik olarak taze bağlantıyla yeniden denenir.
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
    timeout: 60000
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

// Kumaş Eni Mapping Tablosu (MaterialUserDefinedField12)
// PLM OData API'den alınan 40 kumaş eni değeri
const WIDTH_MAPPING = {
    "50": { Id: 40, Code: "50", Name: "50 CM" },
    "90": { Id: 36, Code: "090", Name: "90 CM" },
    "100": { Id: 35, Code: "100", Name: "100 CM" },
    "110": { Id: 34, Code: "110", Name: "110 CM" },
    "120": { Id: 33, Code: "120", Name: "120 CM" },
    "130": { Id: 9, Code: "130", Name: "130 cm" },
    "132": { Id: 15, Code: "132", Name: "132 cm" },
    "135": { Id: 4, Code: "135", Name: "135 cm" },
    "137": { Id: 8, Code: "137", Name: "137 cm" },
    "138": { Id: 14, Code: "138", Name: "138 cm" },
    "140": { Id: 5, Code: "140", Name: "140 cm" },
    "142": { Id: 12, Code: "142", Name: "142 cm" },
    "143": { Id: 10, Code: "143", Name: "143 cm" },
    "144": { Id: 20, Code: "144", Name: "144 cm" },
    "145": { Id: 11, Code: "145", Name: "145 cm" },
    "146": { Id: 3, Code: "146", Name: "146 cm" },
    "147": { Id: 13, Code: "147", Name: "147 cm" },
    "148": { Id: 2, Code: "148", Name: "148 cm" },
    "149": { Id: 26, Code: "149", Name: "149 cm" },
    "150": { Id: 1, Code: "150", Name: "150 cm" },
    "152": { Id: 25, Code: "152", Name: "152 cm" },
    "153": { Id: 17, Code: "153", Name: "153 cm" },
    "155": { Id: 16, Code: "155", Name: "155 cm" },
    "156": { Id: 31, Code: "156", Name: "156 cm" },
    "159": { Id: 23, Code: "159", Name: "159 cm" },
    "160": { Id: 6, Code: "160", Name: "160 cm" },
    "162": { Id: 22, Code: "162", Name: "162 cm" },
    "163": { Id: 18, Code: "163", Name: "163 cm" },
    "165": { Id: 24, Code: "165", Name: "165 cm" },
    "168": { Id: 21, Code: "168", Name: "168 cm" },
    "169": { Id: 7, Code: "169", Name: "169 cm" },
    "170": { Id: 30, Code: "170", Name: "170 cm" },
    "175": { Id: 32, Code: "175", Name: "175 cm" },
    "180": { Id: 27, Code: "180", Name: "180 cm" },
    "185": { Id: 28, Code: "185", Name: "185 cm" },
    "190": { Id: 29, Code: "190", Name: "190 cm" },
    "200": { Id: 37, Code: "200", Name: "200 CM" },
    "210": { Id: 38, Code: "210", Name: "210 CM" },
    "215": { Id: 39, Code: "215", Name: "215 cm" },
    "999": { Id: 19, Code: "999", Name: "999 cm" }
};

/**
 * Para birimini PLM Currency ID'ye çevir
 */
function getCurrencyId(currency) {
    if (!currency) return null;
    
    const currencyUpper = currency.toUpperCase().trim();
    
    const CURRENCY_MAPPING = {
        "USD": 3,
        "DOLLAR": 3,
        "$": 3,
        "TRY": 4,
        "TL": 4,
        "₺": 4,
        "TÜRK LİRASI": 4,
        "EUR": 1,
        "EURO": 1,
        "€": 1
    };
    
    return CURRENCY_MAPPING[currencyUpper] || 3; // Default: USD
}

/**
 * Kumaş enini normalize et ve mapping'den bul
 */
function findWidthMapping(width) {
    if (!width) return null;
    
    // Sayısal değeri string'e çevir
    const widthStr = String(width).trim();
    
    // Direkt mapping'de var mı kontrol et
    if (WIDTH_MAPPING[widthStr]) {
        return WIDTH_MAPPING[widthStr];
    }
    
    // En yakın değeri bul (tolerance: ±5 cm)
    const widthNum = parseInt(widthStr);
    if (isNaN(widthNum)) return null;
    
    const availableWidths = Object.keys(WIDTH_MAPPING).map(w => parseInt(w)).filter(w => w !== 999).sort((a, b) => a - b);
    
    // En yakın değeri bul
    let closest = availableWidths[0];
    let minDiff = Math.abs(widthNum - closest);
    
    for (const w of availableWidths) {
        const diff = Math.abs(widthNum - w);
        if (diff < minDiff) {
            minDiff = diff;
            closest = w;
        }
    }
    
    // 5 cm'den fazla fark varsa 999 (diğer) döndür
    if (minDiff > 5) {
        return WIDTH_MAPPING["999"];
    }
    
    return WIDTH_MAPPING[String(closest)];
}

// Elyaf Dönüşüm Tablosu (BR Tenant - JKARFH4LCGZA78A5_PRD)
// PLM OData API'den alınan 86 elyaf tipi
const ELYAF_MAPPING = {
    // Acrylic / Akrilik (Id: 1)
    "ACR": { Id: 1, Code: "ACR", Name: "Akrilik" },
    "AKRİLİK": { Id: 1, Code: "ACR", Name: "Akrilik" },
    "ACRYLIC": { Id: 1, Code: "ACR", Name: "Akrilik" },
    
    // Abaca (Id: 2)
    "ABA": { Id: 2, Code: "ABA", Name: "Abaca" },
    "ABACA": { Id: 2, Code: "ABA", Name: "Abaca" },
    
    // Alpha (Id: 3)
    "ALF": { Id: 3, Code: "ALF", Name: "Alfa" },
    "ALFA": { Id: 3, Code: "ALF", Name: "Alfa" },
    "ALPHA": { Id: 3, Code: "ALF", Name: "Alfa" },
    
    // Alginate (Id: 4)
    "ALG": { Id: 4, Code: "ALG", Name: "Alginat" },
    "ALGINATE": { Id: 4, Code: "ALG", Name: "Alginat" },
    "ALGİNAT": { Id: 4, Code: "ALG", Name: "Alginat" },
    
    // Alpaca (Id: 5)
    "ALP": { Id: 5, Code: "ALP", Name: "Alpaka" },
    "ALPACA": { Id: 5, Code: "ALP", Name: "Alpaka" },
    "ALPAKA": { Id: 5, Code: "ALP", Name: "Alpaka" },
    
    // Angora (Id: 6)
    "ANG": { Id: 6, Code: "ANG", Name: "Angora" },
    "ANGORA": { Id: 6, Code: "ANG", Name: "Angora" },
    
    // Aramidic (Id: 7)
    "ARM": { Id: 7, Code: "ARM", Name: "Aramid" },
    "ARAMID": { Id: 7, Code: "ARM", Name: "Aramid" },
    "ARAMIDIC": { Id: 7, Code: "ARM", Name: "Aramid" },
    
    // Asbestos (Id: 8)
    "ASB": { Id: 8, Code: "ASB", Name: "Asbest" },
    "ASBESTOS": { Id: 8, Code: "ASB", Name: "Asbest" },
    "ASBEST": { Id: 8, Code: "ASB", Name: "Asbest" },
    
    // Acetate (Id: 9)
    "ACE": { Id: 9, Code: "ACE", Name: "Asetat" },
    "ACETATE": { Id: 9, Code: "ACE", Name: "Asetat" },
    "ASETAT": { Id: 9, Code: "ACE", Name: "Asetat" },
    
    // Horsehair (Id: 10)
    "HRS": { Id: 10, Code: "HRS", Name: "At Kılı" },
    "HORSEHAIR": { Id: 10, Code: "HRS", Name: "At Kılı" },
    "AT KILI": { Id: 10, Code: "HRS", Name: "At Kılı" },
    
    // Bamboo (Id: 11) - INACTIVE in PLM but keeping for compatibility
    "BAM": { Id: 11, Code: "BAM", Name: "Bambu" },
    "BAMBOO": { Id: 11, Code: "BAM", Name: "Bambu" },
    "BAMBU": { Id: 11, Code: "BAM", Name: "Bambu" },
    
    // Viscous from Bamboo (Id: 12)
    "VFB": { Id: 12, Code: "VFB", Name: "Bambudan Üretilmiş Viskon" },
    
    // Broom (Id: 13)
    "BRO": { Id: 13, Code: "BRO", Name: "Broom" },
    "BROOM": { Id: 13, Code: "BRO", Name: "Broom" },
    
    // Fiberglass (Id: 14)
    "FIB": { Id: 14, Code: "FIB", Name: "Cam Elyapı" },
    "FIBERGLASS": { Id: 14, Code: "FIB", Name: "Cam Elyapı" },
    "CAM ELYAFI": { Id: 14, Code: "FIB", Name: "Cam Elyapı" },
    
    // Cashgora (Id: 15)
    "CAS": { Id: 15, Code: "CAS", Name: "Cashgora" },
    "CASHGORA": { Id: 15, Code: "CAS", Name: "Cashgora" },
    
    // Cupro (Id: 16)
    "CUP": { Id: 16, Code: "CUP", Name: "Cupro" },
    "CUPRO": { Id: 16, Code: "CUP", Name: "Cupro" },
    
    // Leather (Id: 17)
    "LEA": { Id: 17, Code: "LEA", Name: "Deri" },
    "LEATHER": { Id: 17, Code: "LEA", Name: "Deri" },
    "DERİ": { Id: 17, Code: "LEA", Name: "Deri" },
    
    // Camel Hair (Id: 18)
    "CAM": { Id: 18, Code: "CAM", Name: "Deve Tüyü" },
    "CAMEL": { Id: 18, Code: "CAM", Name: "Deve Tüyü" },
    "DEVE TÜYÜ": { Id: 18, Code: "CAM", Name: "Deve Tüyü" },
    
    // Other Fibre (Id: 19)
    "OTH": { Id: 19, Code: "OTH", Name: "Diğer Elyaf" },
    "OTHER": { Id: 19, Code: "OTH", Name: "Diğer Elyaf" },
    "DİĞER": { Id: 19, Code: "OTH", Name: "Diğer Elyaf" },
    
    // Elastane (Id: 20)
    "ELS": { Id: 20, Code: "ELS", Name: "Elastan" },
    "ELASTANE": { Id: 20, Code: "ELS", Name: "Elastan" },
    "ELASTAN": { Id: 20, Code: "ELS", Name: "Elastan" },
    "SPANDEX": { Id: 20, Code: "ELS", Name: "Elastan" },
    "EA": { Id: 20, Code: "ELS", Name: "Elastan" },
    "LYCRA": { Id: 20, Code: "ELS", Name: "Elastan" },
    
    // Elastodien (Id: 21)
    "ELT": { Id: 21, Code: "ELT", Name: "Elastodien" },
    "ELASTODIEN": { Id: 21, Code: "ELT", Name: "Elastodien" },
    
    // Elastolefin (Id: 22)
    "ELF": { Id: 22, Code: "ELF", Name: "Elastolefin" },
    "ELASTOLEFIN": { Id: 22, Code: "ELF", Name: "Elastolefin" },
    
    // Elastomultiester (Id: 23)
    "EME": { Id: 23, Code: "EME", Name: "Elastomultiester" },
    "ELASTOMULTIESTER": { Id: 23, Code: "EME", Name: "Elastomultiester" },
    
    // Film (Id: 24)
    "FLM": { Id: 24, Code: "FLM", Name: "Film" },
    "FILM": { Id: 24, Code: "FLM", Name: "Film" },
    
    // Floro Fiber (Id: 25)
    "FFB": { Id: 25, Code: "FFB", Name: "Floro Elyafı" },
    "FLORO": { Id: 25, Code: "FFB", Name: "Floro Elyafı" },
    
    // Floss (Id: 26)
    "FLO": { Id: 26, Code: "FLO", Name: "Floş" },
    "FLOSS": { Id: 26, Code: "FLO", Name: "Floş" },
    
    // Guanaco (Id: 27)
    "GUA": { Id: 27, Code: "GUA", Name: "Guanako" },
    "GUANACO": { Id: 27, Code: "GUA", Name: "Guanako" },
    
    // Henequen (Id: 28)
    "HEN": { Id: 28, Code: "HEN", Name: "Henequen" },
    "HENEQUEN": { Id: 28, Code: "HEN", Name: "Henequen" },
    
    // Coir Fiber (Id: 29)
    "COI": { Id: 29, Code: "COI", Name: "Hindistan Cevizi Lifi" },
    "COIR": { Id: 29, Code: "COI", Name: "Hindistan Cevizi Lifi" },
    
    // Down Feather (Id: 30)
    "DFT": { Id: 30, Code: "DFT", Name: "İnce Kuş Tüyü" },
    "DOWN": { Id: 30, Code: "DFT", Name: "İnce Kuş Tüyü" },
    
    // Silk (Id: 31)
    "SLK": { Id: 31, Code: "SLK", Name: "İpek" },
    "SILK": { Id: 31, Code: "SLK", Name: "İpek" },
    "İPEK": { Id: 31, Code: "SLK", Name: "İpek" },
    
    // Jute (Id: 32)
    "JUT": { Id: 32, Code: "JUT", Name: "Jut" },
    "JUTE": { Id: 32, Code: "JUT", Name: "Jut" },
    
    // Paper (Id: 33)
    "PPR": { Id: 33, Code: "PPR", Name: "Kayıt" },
    "PAPER": { Id: 33, Code: "PPR", Name: "Kayıt" },
    
    // Kapok (Id: 34)
    "KAP": { Id: 34, Code: "KAP", Name: "Kapok" },
    "KAPOK": { Id: 34, Code: "KAP", Name: "Kapok" },
    
    // Carbon Fiber (Id: 35)
    "CFB": { Id: 35, Code: "CFB", Name: "Karbon" },
    "CARBON": { Id: 35, Code: "CFB", Name: "Karbon" },
    "KARBON": { Id: 35, Code: "CFB", Name: "Karbon" },
    
    // Mixed Fiber (Id: 36)
    "MFB": { Id: 36, Code: "MFB", Name: "Karışık Elyaf" },
    "MIXED": { Id: 36, Code: "MFB", Name: "Karışık Elyaf" },
    
    // Cashmere (Id: 37)
    "CSH": { Id: 37, Code: "CSH", Name: "Kaşmir" },
    "CASHMERE": { Id: 37, Code: "CSH", Name: "Kaşmir" },
    "KAŞMİR": { Id: 37, Code: "CSH", Name: "Kaşmir" },
    
    // Goat Hair (Id: 38)
    "COA": { Id: 38, Code: "COA", Name: "Keçi Kılı" },
    "GOAT": { Id: 38, Code: "COA", Name: "Keçi Kılı" },
    "KEÇİ KILI": { Id: 38, Code: "COA", Name: "Keçi Kılı" },
    
    // Hemp (Id: 39)
    "HMP": { Id: 39, Code: "HMP", Name: "Kenevir" },
    "HEMP": { Id: 39, Code: "HMP", Name: "Kenevir" },
    "KENEVİR": { Id: 39, Code: "HMP", Name: "Kenevir" },
    
    // Linen (Id: 40)
    "LIN": { Id: 40, Code: "LIN", Name: "Keten" },
    "LINEN": { Id: 40, Code: "LIN", Name: "Keten" },
    "KETEN": { Id: 40, Code: "LIN", Name: "Keten" },
    "LI": { Id: 40, Code: "LIN", Name: "Keten" },
    
    // Shearing Wool (Id: 41)
    "SHW": { Id: 41, Code: "SHW", Name: "Kırkım Yünü" },
    "SHEARING": { Id: 41, Code: "SHW", Name: "Kırkım Yünü" },
    
    // Chlorofibre (Id: 42)
    "CHF": { Id: 42, Code: "CHF", Name: "Koloro lifi" },
    "CHLOROFIBRE": { Id: 42, Code: "CHF", Name: "Koloro lifi" },
    
    // Beavers Hair (Id: 43)
    "BVR": { Id: 43, Code: "BVR", Name: "Kunduz Kılı" },
    "BEAVER": { Id: 43, Code: "BVR", Name: "Kunduz Kılı" },
    
    // Feather (Id: 44)
    "FEA": { Id: 44, Code: "FEA", Name: "Kuş Tüyü" },
    "FEATHER": { Id: 44, Code: "FEA", Name: "Kuş Tüyü" },
    
    // Lambs Wool (Id: 45)
    "LWL": { Id: 45, Code: "LWL", Name: "Kuzu Yünü" },
    "LAMB": { Id: 45, Code: "LWL", Name: "Kuzu Yünü" },
    "KUZU": { Id: 45, Code: "LWL", Name: "Kuzu Yünü" },
    
    // Lama (Id: 46)
    "LMA": { Id: 46, Code: "LMA", Name: "Lama" },
    "LAMA": { Id: 46, Code: "LMA", Name: "Lama" },
    
    // Lyocell (Id: 47)
    "LYC": { Id: 47, Code: "LYC", Name: "Lyocell" },
    "LYOCELL": { Id: 47, Code: "LYC", Name: "Lyocell" },
    
    // Lurex (Id: 48)
    "LRX": { Id: 48, Code: "LRX", Name: "Lureks" },
    "LUREX": { Id: 48, Code: "LRX", Name: "Lureks" },
    "LUREKS": { Id: 48, Code: "LRX", Name: "Lureks" },
    
    // Maguey (Id: 49)
    "MGY": { Id: 49, Code: "MGY", Name: "Maguey" },
    "MAGUEY": { Id: 49, Code: "MGY", Name: "Maguey" },
    
    // Melamine (Id: 50)
    "MLM": { Id: 50, Code: "MLM", Name: "Melamin" },
    "MELAMINE": { Id: 50, Code: "MLM", Name: "Melamin" },
    "MELAMİN": { Id: 50, Code: "MLM", Name: "Melamin" },
    
    // Merino-Wool (Id: 51)
    "MWL": { Id: 51, Code: "MWL", Name: "Merinos Yünü" },
    "MERINO": { Id: 51, Code: "MWL", Name: "Merinos Yünü" },
    "MERİNOS": { Id: 51, Code: "MWL", Name: "Merinos Yünü" },
    
    // Metal (Id: 52)
    "MTL": { Id: 52, Code: "MTL", Name: "Metal" },
    "METAL": { Id: 52, Code: "MTL", Name: "Metal" },
    
    // Modacrylic (Id: 53)
    "MDA": { Id: 53, Code: "MDA", Name: "Modakrilik" },
    "MODACRYLIC": { Id: 53, Code: "MDA", Name: "Modakrilik" },
    "MODAKRİLİK": { Id: 53, Code: "MDA", Name: "Modakrilik" },
    
    // Modal (Id: 54)
    "MDL": { Id: 54, Code: "MDL", Name: "Modal" },
    "MODAL": { Id: 54, Code: "MDL", Name: "Modal" },
    "MOD": { Id: 54, Code: "MDL", Name: "Modal" },
    
    // Mohair (Id: 55)
    "MHR": { Id: 55, Code: "MHR", Name: "Moher" },
    "MOHAIR": { Id: 55, Code: "MHR", Name: "Moher" },
    "MOHER": { Id: 55, Code: "MHR", Name: "Moher" },
    
    // Cotton (Id: 56)
    "COT": { Id: 56, Code: "COT", Name: "Pamuk" },
    "COTTON": { Id: 56, Code: "COT", Name: "Pamuk" },
    "PAMUK": { Id: 56, Code: "COT", Name: "Pamuk" },
    "CO": { Id: 56, Code: "COT", Name: "Pamuk" },
    
    // Polyactide (Id: 57)
    "PAK": { Id: 57, Code: "PAK", Name: "Poliaktid" },
    "POLYACTIDE": { Id: 57, Code: "PAK", Name: "Poliaktid" },
    
    // Polyamide (Id: 58)
    "PAM": { Id: 58, Code: "PAM", Name: "Poliamid" },
    "POLYAMIDE": { Id: 58, Code: "PAM", Name: "Poliamid" },
    "POLİAMİD": { Id: 58, Code: "PAM", Name: "Poliamid" },
    "PA": { Id: 58, Code: "PAM", Name: "Poliamid" },
    "NYLON": { Id: 58, Code: "PAM", Name: "Poliamid" },
    
    // Polycarbamide (Id: 59)
    "PCM": { Id: 59, Code: "PCM", Name: "Polikarbamid" },
    "POLYCARBAMIDE": { Id: 59, Code: "PCM", Name: "Polikarbamid" },
    
    // Polypropylene (Id: 60)
    "PPL": { Id: 60, Code: "PPL", Name: "Polipropilen" },
    "POLYPROPYLENE": { Id: 60, Code: "PPL", Name: "Polipropilen" },
    "POLİPROPİLEN": { Id: 60, Code: "PPL", Name: "Polipropilen" },
    "PP": { Id: 60, Code: "PPL", Name: "Polipropilen" },
    
    // Polyurethan (Id: 61)
    "PUR": { Id: 61, Code: "PUR", Name: "Poliüretan" },
    "POLYURETHANE": { Id: 61, Code: "PUR", Name: "Poliüretan" },
    "POLİÜRETAN": { Id: 61, Code: "PUR", Name: "Poliüretan" },
    "PU": { Id: 61, Code: "PUR", Name: "Poliüretan" },
    
    // Polyvinylecloride (Id: 62)
    "PCL": { Id: 62, Code: "PCL", Name: "Polivinilklorür" },
    "PVC": { Id: 62, Code: "PCL", Name: "Polivinilklorür" },
    "POLİVİNİLKLORÜR": { Id: 62, Code: "PCL", Name: "Polivinilklorür" },
    
    // Polyester (Id: 63)
    "PES": { Id: 63, Code: "PES", Name: "Poliester" },
    "POLYESTER": { Id: 63, Code: "PES", Name: "Poliester" },
    "POLİESTER": { Id: 63, Code: "PES", Name: "Poliester" },
    "PE": { Id: 63, Code: "PES", Name: "Poliester" },
    "PL": { Id: 63, Code: "PES", Name: "Poliester" },
    "PET": { Id: 63, Code: "PES", Name: "Poliester" },
    
    // Protein (Id: 64)
    "PRT": { Id: 64, Code: "PRT", Name: "Protein" },
    "PROTEIN": { Id: 64, Code: "PRT", Name: "Protein" },
    
    // Ramie (Id: 65)
    "RAM": { Id: 65, Code: "RAM", Name: "Rami" },
    "RAMIE": { Id: 65, Code: "RAM", Name: "Rami" },
    "RAMİ": { Id: 65, Code: "RAM", Name: "Rami" },
    
    // Rayon (Id: 66)
    "RYN": { Id: 66, Code: "RYN", Name: "Rayon" },
    "RAYON": { Id: 66, Code: "RYN", Name: "Rayon" },
    
    // Pure New Wool (Id: 67)
    "PNW": { Id: 67, Code: "PNW", Name: "Saf Yeni Yün" },
    "PURE WOOL": { Id: 67, Code: "PNW", Name: "Saf Yeni Yün" },
    
    // Cattle Hair (Id: 68)
    "CHR": { Id: 68, Code: "CHR", Name: "Sığır Kılı" },
    "CATTLE": { Id: 68, Code: "CHR", Name: "Sığır Kılı" },
    
    // Sisal (Id: 69)
    "SIS": { Id: 69, Code: "SIS", Name: "Sisal" },
    "SISAL": { Id: 69, Code: "SIS", Name: "Sisal" },
    
    // Otter Hair (Id: 70)
    "OTR": { Id: 70, Code: "OTR", Name: "Su Samuru Kılı" },
    "OTTER": { Id: 70, Code: "OTR", Name: "Su Samuru Kılı" },
    
    // Angora (Rabbit) (Id: 71)
    "AGR": { Id: 71, Code: "AGR", Name: "Tavşan Yünü" },
    "RABBIT": { Id: 71, Code: "AGR", Name: "Tavşan Yünü" },
    
    // Mohair (Tiftik) (Id: 72)
    "MHE": { Id: 72, Code: "MHE", Name: "Tiftik" },
    "TİFTİK": { Id: 72, Code: "MHE", Name: "Tiftik" },
    
    // Triacetate (Id: 73)
    "TRA": { Id: 73, Code: "TRA", Name: "Triasetat" },
    "TRIACETATE": { Id: 73, Code: "TRA", Name: "Triasetat" },
    "TRİASETAT": { Id: 73, Code: "TRA", Name: "Triasetat" },
    
    // Trivinil (Id: 74)
    "TRV": { Id: 74, Code: "TRV", Name: "Trivinil" },
    "TRİVİNİL": { Id: 74, Code: "TRV", Name: "Trivinil" },
    
    // Vicuna (Id: 75)
    "VIC": { Id: 75, Code: "VIC", Name: "Vicuna" },
    "VICUNA": { Id: 75, Code: "VIC", Name: "Vicuna" },
    
    // Vinyl (Id: 76)
    "VNY": { Id: 76, Code: "VNY", Name: "Vinil" },
    "VINYL": { Id: 76, Code: "VNY", Name: "Vinil" },
    "VİNİL": { Id: 76, Code: "VNY", Name: "Vinil" },
    
    // Vinylal (Id: 77)
    "VIN": { Id: 77, Code: "VIN", Name: "Vinilal" },
    "VINYLAL": { Id: 77, Code: "VIN", Name: "Vinilal" },
    "VİNİLAL": { Id: 77, Code: "VIN", Name: "Vinilal" },
    
    // Viscose (Id: 78)
    "VSC": { Id: 78, Code: "VSC", Name: "Viskoz" },
    "VISCOSE": { Id: 78, Code: "VSC", Name: "Viskoz" },
    "VİSKOZ": { Id: 78, Code: "VSC", Name: "Viskoz" },
    "CV": { Id: 78, Code: "VSC", Name: "Viskoz" },
    
    // Yak (Id: 79)
    "YAK": { Id: 79, Code: "YAK", Name: "Yak" },
    
    // Fleece Wool (Id: 80)
    "FLW": { Id: 80, Code: "FLW", Name: "Yapağı Yünü" },
    "FLEECE": { Id: 80, Code: "FLW", Name: "Yapağı Yünü" },
    
    // Wool (Id: 81)
    "WOO": { Id: 81, Code: "WOO", Name: "Yün" },
    "WOOL": { Id: 81, Code: "WOO", Name: "Yün" },
    "YÜN": { Id: 81, Code: "WOO", Name: "Yün" },
    "WO": { Id: 81, Code: "WOO", Name: "Yün" },
    
    // Polibütilen tereftalat (Id: 82)
    "PBT": { Id: 82, Code: "PBT", Name: "Polibütilen tereftalat" },
    "POLİBÜTİLEN": { Id: 82, Code: "PBT", Name: "Polibütilen tereftalat" },
    
    // TENSEL (Id: 83)
    "TNS": { Id: 83, Code: "TNS", Name: "TENSEL" },
    "TENSEL": { Id: 83, Code: "TNS", Name: "TENSEL" },
    "TENCEL": { Id: 83, Code: "TNS", Name: "TENSEL" },
    
    // Viskon (Id: 84)
    "VSK": { Id: 84, Code: "VSK", Name: "Viskon" },
    "VİSKON": { Id: 84, Code: "VSK", Name: "Viskon" },
    "VI": { Id: 84, Code: "VSK", Name: "Viskon" },
    
    // Poliolefin (Id: 85)
    "POL": { Id: 85, Code: "POL", Name: "Poliolefin" },
    "POLIOLEFIN": { Id: 85, Code: "POL", Name: "Poliolefin" },
    "POLİOLEFİN": { Id: 85, Code: "POL", Name: "Poliolefin" },
    
    // Nylon (Id: 86)
    "NYL": { Id: 86, Code: "NYL", Name: "Naylon" },
    "NYLON": { Id: 86, Code: "NYL", Name: "Naylon" },
    "NAYLON": { Id: 86, Code: "NYL", Name: "Naylon" },
    "NY": { Id: 86, Code: "NYL", Name: "Naylon" }
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
        En: chatgptData.en || null,
        Fiyat: chatgptData.fiyat || null,
        ParaBirimi: chatgptData.para_birimi || null
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
            Value: 5,
            ValueName: "Yapay Zeka",
            Code: "AI"
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
            Value: 124
        },
        {
            FieldName: "Original_Name",
            Value: ""
        },
        {
            FieldName: "Original_Description",
            Value: ""
        },
        {
            FieldName: "Status",
            Value: 105,
            ValueName: 105
        },
        {
            FieldName: "UserDefinedField5",
            Value: 8,
            ValueName: "%10",
            Code: "DT008"
        },
        {
            FieldName: "UOMId",
            Value: 9,
            ValueName: "Mt",
            Code: "MT"
        }
    ];
    
    // Kumaş eni - Dinamik mapping
    const widthMapping = findWidthMapping(plmData.En);
    if (widthMapping) {
        fieldValues.push({
            FieldName: "MaterialUserDefinedField12Ids",
            Value: [widthMapping.Id],
            ValueName: widthMapping.Name,
            Code: widthMapping.Code
        });
    } else {
        // En bilgisi yoksa veya bulunamazsa, default 150 cm
        fieldValues.push({
            FieldName: "MaterialUserDefinedField12Ids",
            Value: [1],
            ValueName: "150 cm",
            Code: "150"
        });
    }
    
    // Yerli kumaş bilgisi - Sabit
    fieldValues.push({
        FieldName: "MaterialUserDefinedField11",
        Value: 2,
        ValueName: "YERLİ KUMAŞ",
        Code: "002"
    });

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
        Value: 10,
        Code: "GR",
        ValueName: "Gr"
    });

    fieldValues.push({
        FieldName: "Weight",
        Value: plmData.Gramaj || 0,
        Code: null,
        ValueName: plmData.Gramaj || 0
    });

    fieldValues.push({
        FieldName: "IsSetAsMainSupplier",
        Value: false
    });

    // SubEntities - MaterialConst
    const materialConstFieldValues = [
        {
            fieldName: "WeightUOMId",
            value: 10
        },
        {
            fieldName: "Weight",
            value: plmData.Gramaj || 0
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
        userId: "124",
        notificationMessageKey: "CREATED_MATERIAL_OVERVIEW",
        ModifyId: "124",
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
        Schema: "FSH1"
    };

    return payload;
}

/**
 * PLM'de kumaşa tedarikçi ekle (sourcing)
 */
async function addMaterialSupplier(token, materialId) {
    try {
        console.log(`  Material ID: ${materialId}`);
        
        // TempId oluştur (timestamp-based unique ID)
        const tempId = `MTc2NTMwNDE1MzgzMg==${materialId}`;
        
        const sourcingPayload = {
            MaterialId: String(materialId),
            action: "New",
            MaterialSuppliers: [
                {
                    Key: 0,
                    FieldValues: [
                        {
                            FieldName: "TempId",
                            Value: tempId
                        },
                        {
                            FieldName: "SupplierId",
                            Value: 135
                        },
                        {
                            FieldName: "MaterialId",
                            Value: String(materialId)
                        },
                        {
                            FieldName: "Code",
                            Value: "1111111111"
                        },
                        {
                            FieldName: "Name",
                            Value: "BR_KUMAS_FIYAT"
                        },
                        {
                            FieldName: "CountryId"
                        },
                        {
                            FieldName: "PurchasePrice",
                            Value: null
                        },
                        {
                            FieldName: "PurcCurrId"
                        }
                    ]
                }
            ],
            userId: 124,
            createId: 124,
            modifyId: 124,
            notificationMessageKey: "CREATED_MATERIAL_PARTNERS",
            Schema: "FSH1"
        };
        
        console.log('📦 Sourcing Payload:', JSON.stringify(sourcingPayload, null, 2));
        
        // Sourcing API'ye POST
        const sourcingUrl = `https://mingle-ionapi.eu1.inforcloudsuite.com/JKARFH4LCGZA78A5_PRD/FASHIONPLM/pdm/api/pdm/material/sourcing/save`;
        
        const response = await axios.post(
            sourcingUrl,
            sourcingPayload,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Tedarikçi başarıyla eklendi!');
        
        // Response'dan materialSupplierId al
        const materialSupplierId = response.data.materialSuppliersDto?.[0]?.materialSupplierId;
        
        if (!materialSupplierId) {
            console.warn('⚠️  materialSupplierId bulunamadı, ana tedarikçi ayarlanamadı');
            return {
                success: true,
                response: response.data,
                supplier_code: "1111111111",
                supplier_name: "BR_KUMAS_FIYAT",
                main_supplier_set: false
            };
        }
        
        console.log(`🔄 Ana tedarikçi olarak işaretleniyor... (SupplierId: ${materialSupplierId})`);
        
        // 2. Adım: Ana tedarikçi olarak işaretle (UpdateMain)
        const updateMainPayload = {
            MaterialId: String(materialId),
            MaterialSuppliers: [
                {
                    Key: materialSupplierId,
                    MaterialId: String(materialId),
                    FieldValues: [
                        {
                            FieldName: "MaterialId",
                            Value: parseInt(materialId)
                        },
                        {
                            FieldName: "SourcingName",
                            Value: "BR_KUMAS_FIYAT"
                        },
                        {
                            FieldName: "IsEem",
                            Value: false
                        },
                        {
                            FieldName: "IsMain",
                            Value: 1
                        },
                        {
                            FieldName: "SourcingCode",
                            Value: "1111111111"
                        },
                        {
                            FieldName: "SupplierId",
                            Value: 135
                        },
                        {
                            FieldName: "Name",
                            Value: "BR_KUMAS_FIYAT"
                        }
                    ]
                }
            ],
            userId: 124,
            modifyId: 124,
            notificationMessageKey: "UPDATED_MATERIAL_PARTNERS",
            action: "UpdateMain",
            moduleId: parseInt(materialId),
            Schema: "FSH1"
        };
        
        console.log('📦 UpdateMain Payload:', JSON.stringify(updateMainPayload, null, 2));
        
        const updateResponse = await axios.post(
            sourcingUrl,
            updateMainPayload,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Ana tedarikçi başarıyla ayarlandı!');
        
        return {
            success: true,
            add_response: response.data,
            update_main_response: updateResponse.data,
            supplier_code: "1111111111",
            supplier_name: "BR_KUMAS_FIYAT",
            material_supplier_id: materialSupplierId,
            main_supplier_set: true
        };
        
    } catch (error) {
        console.error('❌ Tedarikçi ekleme hatası:');
        console.error('Status:', error.response?.status);
        console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Error Message:', error.message);
        
        return {
            success: false,
            error: error.response?.data || error.message,
            error_type: error.name,
            error_status: error.response?.status
        };
    }
}

/**
 * PLM'de tedarikçi fiyatı ekle
 */
async function addSupplierPrice(token, materialId, materialSupplierId, rowVersionText, price, currency, plmData) {
    try {
        console.log(`💰 Fiyat ekleniyor: ${price} ${currency}`);
        
        // Para birimini ID'ye çevir
        const currencyId = getCurrencyId(currency);
        console.log(`  Currency ID: ${currencyId} (${currency})`);
        
        // FieldValues - PLM Auto Name Generator için gerekli alanlar
        const fieldValues = [
            {
                FieldName: "Description",
                Value: `${plmData.Tedarikcisi || 'Unknown'} - ${plmData.Tedarikci_Kodu || 'Unknown'}`,
                ValueName: `${plmData.Tedarikcisi || 'Unknown'} - ${plmData.Tedarikci_Kodu || 'Unknown'}`
            }
        ];
        
        // Kumaş eni ekle
        const widthMapping = findWidthMapping(plmData.En);
        if (widthMapping) {
            fieldValues.push({
                FieldName: "MaterialUserDefinedField12Ids",
                Value: [widthMapping.Id],
                ValueName: widthMapping.Name,
                Code: widthMapping.Code
            });
        }
        
        // SupplierId ekle
        fieldValues.push({
            FieldName: "SupplierId",
            Value: 135,
            ValueName: "BR_KUMAS_FIYAT",
            Code: "1111111111"
        });
        
        // Elyaf bilgilerini ekle
        for (let i = 1; i <= 5; i++) {
            const yuzde = plmData[`Elyaf${i}Yuzde`];
            const id = plmData[`Elyaf${i}Id`];
            const name = plmData[`Elyaf${i}`];
            const code = plmData[`Elyaf${i}Code`];

            if (yuzde && id) {
                fieldValues.push({
                    FieldName: `ContPercent${i}`,
                    Value: yuzde,
                    ValueName: yuzde,
                    Code: null
                });

                fieldValues.push({
                    FieldName: `GLContentTypeId${i}`,
                    Value: id,
                    ValueName: name,
                    Code: code
                });
            }
        }
        
        // Gramaj bilgileri ekle
        fieldValues.push({
            FieldName: "WeightUOMId",
            Value: 10,
            Code: "GR",
            ValueName: "Gr"
        });

        fieldValues.push({
            FieldName: "Weight",
            Value: plmData.Gramaj || 0,
            Code: null,
            ValueName: plmData.Gramaj || 0
        });
        
        fieldValues.push({
            FieldName: "IsSetAsMainSupplier",
            Value: true
        });
        
        const pricePayload = {
            Key: parseInt(materialId),
            userId: "124",
            notificationMessageKey: "UPDATED_MATERIAL_OVERVIEW",
            RowVersionText: rowVersionText,
            ModifyId: "124",
            FieldValues: fieldValues,
            SubEntities: [
                {
                    key: materialSupplierId,
                    subEntity: "MaterialSuppliers",
                    fieldValues: [
                        {
                            fieldName: "MaterialSupplierId",
                            value: materialSupplierId
                        },
                        {
                            fieldName: "MaterialId",
                            value: parseInt(materialId)
                        },
                        {
                            fieldName: "SupplierId",
                            value: 135
                        },
                        {
                            fieldName: "Code",
                            value: "1111111111"
                        },
                        {
                            fieldName: "Name",
                            value: "BR_KUMAS_FIYAT"
                        },
                        {
                            fieldName: "SupplierName",
                            value: "1111111111 - BR_KUMAS_FIYAT"
                        },
                        {
                            fieldName: "SourcingCode",
                            value: "1111111111"
                        },
                        {
                            fieldName: "SourcingName",
                            value: "BR_KUMAS_FIYAT"
                        },
                        {
                            fieldName: "IsModified",
                            value: 0
                        },
                        {
                            fieldName: "ShareToPartnerColab",
                            value: false
                        },
                        {
                            fieldName: "IsMain",
                            value: 1
                        },
                        {
                            fieldName: "IsEem",
                            value: false
                        },
                        {
                            fieldName: "ModifyId",
                            value: 0
                        },
                        {
                            fieldName: "ModifyDate",
                            value: "0001-01-01T00:00:00"
                        },
                        {
                            fieldName: "IsDeleted",
                            value: 0
                        },
                        {
                            fieldName: "PurchasePrice",
                            value: price
                        },
                        {
                            fieldName: "PurcPrice",
                            value: price
                        },
                        {
                            fieldName: "PurcCurrId",
                            value: currencyId
                        }
                    ],
                    subEntities: []
                }
            ],
            ModuleId: parseInt(materialId),
            Schema: "FSH1"
        };
        
        console.log('📦 Price Payload:', JSON.stringify(pricePayload, null, 2));
        
        // Material v2 save API'ye POST (aynı endpoint)
        const materialUrl = `https://mingle-ionapi.eu1.inforcloudsuite.com/JKARFH4LCGZA78A5_PRD/FASHIONPLM/pdm/api/pdm/material/v2/save`;
        
        const response = await axios.post(
            materialUrl,
            pricePayload,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Fiyat başarıyla eklendi!');
        
        return {
            success: true,
            response: response.data,
            price: price,
            currency: currency,
            currency_id: currencyId
        };
        
    } catch (error) {
        console.error('❌ Fiyat ekleme hatası:');
        console.error('Status:', error.response?.status);
        console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Error Message:', error.message);
        
        return {
            success: false,
            error: error.response?.data || error.message,
            error_type: error.name,
            error_status: error.response?.status
        };
    }
}

/**
 * PLM'de kumaş kodu aç
 */
async function createMaterialInPLM(plmData, imageUrl = null) {
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
        console.log(`📋 Material Key: ${response.data.key}`);
        
        const materialKey = response.data.key;
        
        // Tedarikçi ekleme (sourcing)
        console.log('🔗 Tedarikçi bilgisi ekleniyor...');
        const sourcingResult = await addMaterialSupplier(token, materialKey);
        
        if (!sourcingResult.success) {
            console.warn('⚠️  Tedarikçi eklenemedi, fiyat ekleme atlanıyor');
            return {
                success: true,
                plm_response: response.data,
                sourcing_response: sourcingResult,
                material_description: `${plmData.Tedarikcisi} - ${plmData.Tedarikci_Kodu}`
            };
        }
        
        // Fiyat bilgisi varsa ekle
        let priceResult = null;
        if (plmData.Fiyat && sourcingResult.material_supplier_id && sourcingResult.update_main_response?.materialRowVersionText) {
            console.log('💰 Fiyat bilgisi ekleniyor...');
            
            const rowVersionText = sourcingResult.update_main_response.materialRowVersionText;
            const materialSupplierId = sourcingResult.material_supplier_id;
            
            priceResult = await addSupplierPrice(
                token,
                materialKey,
                materialSupplierId,
                rowVersionText,
                plmData.Fiyat,
                plmData.ParaBirimi || 'USD',
                plmData
            );
            
            if (priceResult.success) {
                console.log('✅ Fiyat başarıyla eklendi!');
            } else {
                console.warn('⚠️  Fiyat eklenemedi ama kumaş ve tedarikçi başarılı');
            }
        } else {
            console.log('ℹ️  Fiyat bilgisi yok, atlanıyor');
        }
        
        // Görsel yükleme (varsa)
        let imageResult = null;
        if (imageUrl) {
            try {
                console.log('📷 Görsel yükleniyor...');
                
                // Görseli indir
                const { filePath, fileName } = await downloadImage(imageUrl);
                
                try {
                    // 1. Görseli PLM'e yükle
                    const uploadResponse = await uploadImageToPLM(token, filePath, fileName, materialKey);
                    
                    if (uploadResponse.addedFiles && uploadResponse.addedFiles.length > 0) {
                        // 2. Metadata kaydet (ana görsel olarak işaretle)
                        const metadataResponse = await saveImageMetadata(token, uploadResponse, materialKey);
                        
                        imageResult = {
                            success: true,
                            object_key: uploadResponse.addedFiles[0].objectKey,
                            thumb_url: uploadResponse.addedFiles[0].thumbUrl,
                            preview_url: uploadResponse.addedFiles[0].customUrl
                        };
                        
                        console.log('✅ Görsel başarıyla ana görsel olarak eklendi!');
                    } else {
                        imageResult = {
                            success: false,
                            error: 'Görsel yüklenemedi'
                        };
                        console.warn('⚠️  Görsel yüklenemedi ama kumaş başarıyla oluşturuldu');
                    }
                } finally {
                    // Geçici dosyayı temizle
                    if (filePath && fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log('🧹 Geçici dosya temizlendi');
                    }
                }
            } catch (imageError) {
                console.error('❌ Görsel yükleme hatası:', imageError.message);
                imageResult = {
                    success: false,
                    error: imageError.message
                };
            }
        } else {
            console.log('ℹ️  Görsel bilgisi yok, atlanıyor');
        }
        
        return {
            success: true,
            plm_response: response.data,
            sourcing_response: sourcingResult,
            price_response: priceResult,
            image_response: imageResult,
            material_description: `${plmData.Tedarikcisi} - ${plmData.Tedarikci_Kodu}`
        };

    } catch (error) {
        console.error('❌ PLM kumaş açma hatası:');
        console.error('Status:', error.response?.status);
        console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Error Message:', error.message);
        
        return {
            success: false,
            error: error.response?.data || error.message,
            error_type: error.name,
            error_status: error.response?.status,
            error_details: error.response?.data
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
6. FİYAT BİLGİSİ: Eğer görselde fiyat varsa, sadece sayısal değeri çıkar ve para birimini belirle (USD, TRY, EUR)

ELYAF KOD DÖNÜŞÜM TABLOSU (86 elyaf tipi desteklenir):

EN YAYIN KULLANILAN ELYAFLAR:
- PE, PES, PL, PET, POLYESTER, POLİESTER → PES (Poliester)
- CO, COT, COTTON, PAMUK → COT (Pamuk)
- VI, CV, VSK, VSC, VISCOSE, VİSKON, VİSKOZ → VSK veya VSC (Viskon/Viskoz)
- LI, LIN, LINEN, KETEN → LIN (Keten)
- EA, ELS, ELASTANE, ELASTAN, SPANDEX, LYCRA → ELS (Elastan)
- PA, PAM, POLYAMIDE, POLİAMİD, NY, NYL, NYLON, NAYLON → PAM veya NYL (Poliamid/Naylon)
- ACR, ACRYLIC, AKRİLİK → ACR (Akrilik)
- MOD, MDL, MODAL → MDL (Modal)
- BAM, BAMBOO, BAMBU → BAM (Bambu)

DİĞER ÖNEMLİ ELYAFLAR:
- WO, WOO, WOOL, YÜN → WOO (Yün)
- SLK, SILK, İPEK → SLK (İpek)
- LYC, LYOCELL → LYC (Lyocell)
- TNS, TENSEL, TENCEL → TNS (Tensel)
- ACE, ACETATE, ASETAT → ACE (Asetat)
- PP, PPL, POLYPROPYLENE, POLİPROPİLEN → PPL (Polipropilen)
- PU, PUR, POLYURETHANE, POLİÜRETAN → PUR (Poliüretan)
- PVC, PCL → PCL (PVC)
- CSH, CASHMERE, KAŞMİR → CSH (Kaşmir)
- MHR, MOHAIR, MOHER → MHR (Moher)
- LEA, LEATHER, DERİ → LEA (Deri)
- LRX, LUREX, LUREKS → LRX (Lureks)
- RAM, RAMIE, RAMİ → RAM (Rami)
- HMP, HEMP, KENEVİR → HMP (Kenevir)
- JUT, JUTE → JUT (Jut)
- SIS, SISAL → SIS (Sisal)

NOT: Eğer elyaf kodu yukarıdaki listede yoksa, etiket üzerindeki kodu AYNEN kullan.

Sadece JSON formatında cevap ver, başka açıklama ekleme:
{
    "tedarikcisi": "Tedarikçi firma adı",
    "tedarikci_kodu": "Ürün kodu",
    "gramaj": 190,
    "en": 145,
    "fiyat": 16.50,
    "para_birimi": "USD",
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

PARA BİRİMİ KURALLARI:
- Dolar işareti ($), USD, DOLLAR → "USD"
- TL, TRY, ₺, TÜRK LİRASI → "TRY"
- EUR, €, EURO → "EUR"
- Eğer para birimi belirtilmemişse → "USD" (default)

NOT: Eğer 5'ten az elyaf varsa, boş alanları null bırak. Eğer bilgi yoksa null yaz.
FİYAT: Eğer görselde fiyat bilgisi yoksa, fiyat ve para_birimi için null yaz.`;

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
            plmResult = await createMaterialInPLM(analysisResult.data, image_url);
            
            if (plmResult.success) {
                console.log('✅ PLM\'de kumaş kodu açıldı');
                if (plmResult.image_response?.success) {
                    console.log('📷 Ana görsel eklendi');
                }
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

// Test endpoint - Direkt PLM'e test verisi gönder
app.post('/test-plm', async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Request body'den test parametreleri al
        const testWidth = req.body.test_width || 190;
        const testPrice = req.body.test_price || 16.50;
        const testCurrency = req.body.test_currency || 'USD';
        
        const testData = {
            Tedarikcisi: "TEST KUMAŞ A.Ş.",
            Tedarikci_Kodu: "TEST-001",
            Gramaj: 200,
            En: testWidth,
            Fiyat: testPrice,
            ParaBirimi: testCurrency,
            Elyaf1Yuzde: 80,
            Elyaf1: "Poliester",
            Elyaf1Id: 63,
            Elyaf1Code: "PES",
            Elyaf2Yuzde: 20,
            Elyaf2: "Pamuk",
            Elyaf2Id: 56,
            Elyaf2Code: "COT"
        };

        console.log('\n🧪 TEST ENDPOINT: Direkt PLM Test');
        console.log('='.repeat(70));
        console.log('📦 Test Data:', JSON.stringify(testData, null, 2));

        const plmResult = await createMaterialInPLM(testData);

        console.log('='.repeat(70));
        console.log('🎉 Test Tamamlandı!\n');

        res.json({
            success: true,
            test_data: testData,
            plm_result: plmResult,
            metadata: {
                processing_time_ms: Date.now() - startTime
            }
        });

    } catch (error) {
        console.error('\n❌ Test Hatası:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            metadata: {
                processing_time_ms: Date.now() - startTime
            }
        });
    }
});

/*********************************************************
 * GÖRSEL YÜKLEME FONKSİYONLARI
 *********************************************************/

const DOCUMENTS_BASE = 'https://mingle-ionapi.eu1.inforcloudsuite.com/JKARFH4LCGZA78A5_PRD/FASHIONPLM/documents';

/**
 * Görseli URL'den indir ve geçici dosyaya kaydet
 */
async function downloadImage(imageUrl) {
    console.log('📥 Görsel indiriliyor:', imageUrl);
    
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            maxRedirects: 5
        });

        console.log('✅ Görsel indirildi, boyut:', response.data.length, 'bytes');

        const tempFileName = `temp_${Date.now()}.jpg`;
        const tempFilePath = path.join(__dirname, tempFileName);
        fs.writeFileSync(tempFilePath, response.data);
        
        // Dosya adını URL'den al, extension yoksa .jpg ekle
        let baseName = path.basename(imageUrl).split('?')[0] || 'fabric_image';
        if (!baseName.match(/\.(jpg|jpeg|png|gif)$/i)) {
            baseName = baseName + '.jpg';
        }
        
        return {
            filePath: tempFilePath,
            fileName: baseName
        };
    } catch (error) {
        console.error('❌ Görsel indirme hatası:');
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('URL:', imageUrl);
        throw new Error(`Görsel indirilemedi: ${error.message}`);
    }
}

function generateTempId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function uploadImageToPLM(token, filePath, originalFileName, materialId) {
    try {
        console.log('📤 Görsel yükleniyor:', materialId);

        const form = new FormData();
        const attaData = {
            objectFilePath: `blob:temp/${originalFileName}`,
            objectExtension: null,
            sequence: 0,
            details: { name: null, note: null },
            referenceId: materialId.toString(),
            modifyDate: "0001-01-01T00:00:00",
            code: "E0023",  // Sabit değer
            isDefault: false,
            objectId: 0,
            originalObjectName: originalFileName,
            objectStream: null,
            tempId: generateTempId()
        };

        form.append('atta', JSON.stringify(attaData));
        form.append('type', 'undefined');
        form.append('formType', 'file');
        form.append('schema', 'FSH1');
        form.append('overwrite', 'false');
        form.append('file', fs.createReadStream(filePath), {
            filename: originalFileName,
            contentType: 'image/jpeg'
        });

        console.log('🔗 API URL:', `${DOCUMENTS_BASE}/api/document/UploadFile`);

        const response = await axios.post(`${DOCUMENTS_BASE}/api/document/UploadFile`, form, {
            headers: { ...form.getHeaders(), 'Authorization': `Bearer ${token}` },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        console.log('✅ Upload Response:', JSON.stringify(response.data, null, 2));

        return response.data;
    } catch (error) {
        console.error('❌ Upload hatası:');
        console.error('Status:', error.response?.status);
        console.error('Response:', JSON.stringify(error.response?.data, null, 2));
        console.error('Message:', error.message);
        throw error;
    }
}

async function saveImageMetadata(token, uploadResponse, materialId) {
    console.log('📋 Metadata kaydediliyor...');

    const addedFile = uploadResponse.addedFiles[0];
    const metadataPayload = {
        AttaFileListDto: [{
            ...addedFile,
            referenceId: materialId.toString(),
            code: "E0023",  // Sabit değer
            isDefault: true, // ANA GÖRSEL!
            tempId: addedFile.tempId || generateTempId()
        }],
        Schema: "FSH1"
    };

    const response = await axios.post(`${DOCUMENTS_BASE}/api/document/SaveMetadata/`, metadataPayload, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data;
}

/*********************************************************
 * TEST ENDPOINT: GÖRSEL YÜKLEME
 *********************************************************/

app.post('/test-image-upload', async (req, res) => {
    let tempFilePath = null;

    try {
        const { image_url, material_id } = req.body;

        if (!image_url || !material_id) {
            return res.status(400).json({
                success: false,
                error: 'image_url ve material_id gerekli'
            });
        }

        const token = await getAccessToken();
        const { filePath, fileName } = await downloadImage(image_url);
        tempFilePath = filePath;

        const uploadResponse = await uploadImageToPLM(token, filePath, fileName, material_id);
        
        if (!uploadResponse.addedFiles || uploadResponse.addedFiles.length === 0) {
            throw new Error('Görsel yüklenemedi');
        }

        const metadataResponse = await saveImageMetadata(token, uploadResponse, material_id);

        res.json({
            success: true,
            message: 'Görsel ana görsel olarak eklendi',
            object_key: uploadResponse.addedFiles[0].objectKey,
            thumb_url: uploadResponse.addedFiles[0].thumbUrl,
            preview_url: uploadResponse.addedFiles[0].customUrl
        });

    } catch (error) {
        console.error('❌ Test başarısız:', error.message);
        console.error('Stack:', error.stack);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
        res.status(500).json({
            success: false,
            error: error.message,
            error_data: error.response?.data,
            error_stack: error.stack
        });
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log('🧹 Geçici dosya temizlendi');
        }
    }
});

// Server başlat
app.listen(PORT, () => {
    console.log('🚀 Kumaş Analiz API başlatılıyor...');
    console.log(`📡 API URL: http://localhost:${PORT}`);
    console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
    console.log(`📊 Analyze Endpoint: http://localhost:${PORT}/analyze`);
    console.log(`🏭 Analyze + Create: http://localhost:${PORT}/analyze-and-create`);
    console.log(`🧪 Test PLM: http://localhost:${PORT}/test-plm`);
    console.log(`📷 Test Image: http://localhost:${PORT}/test-image-upload`);
    console.log('');
    console.log('⚡ Akış 1: PLM URL → Analiz → JSON');
    console.log('⚡ Akış 2: PLM URL → Analiz → PLM Kumaş Açma → JSON');
    console.log('⚡ Akış 3: Test Data → PLM (test için)');
    console.log('⚡ Akış 4: Görsel Yükleme (test için)');
    console.log('');
});

