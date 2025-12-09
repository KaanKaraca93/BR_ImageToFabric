/**
 * TEST: PLM Görsel Yükleme (Image Upload to Material)
 * 
 * 2 adımlı süreç:
 * 1. UploadFile: Görseli yükle, objectKey al
 * 2. SaveMetadata: Metadata kaydet, ana görsel olarak işaretle (isDefault: true)
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// PLM OAuth
const PLM_BASE = 'https://mingle-ionapi.eu1.inforcloudsuite.com/JKARFH4LCGZA78A5_PRD/FASHIONPLM';
const DOCUMENTS_BASE = 'https://mingle-ionapi.eu1.inforcloudsuite.com/JKARFH4LCGZA78A5_PRD/FASHIONPLM/documents';
const TOKEN_URL = 'https://mingle-sso.eu1.inforcloudsuite.com:443/JKARFH4LCGZA78A5_PRD/as/token.oauth2';

require('dotenv').config();

/**
 * PLM Token Al
 */
async function getPLMToken() {
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('client_id', process.env.PLM_CLIENT_ID);
        params.append('client_secret', process.env.PLM_CLIENT_SECRET);
        params.append('username', process.env.PLM_USERNAME);
        params.append('password', process.env.PLM_PASSWORD);

        const response = await axios.post(
            TOKEN_URL,
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        return response.data.access_token;
    } catch (error) {
        console.error('❌ Token alma hatası:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Görseli URL'den indir ve geçici dosyaya kaydet
 */
async function downloadImage(imageUrl) {
    try {
        console.log('📥 Görsel indiriliyor:', imageUrl);
        
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer'
        });

        // Geçici dosya adı oluştur
        const tempFileName = `temp_${Date.now()}.jpg`;
        const tempFilePath = path.join(__dirname, tempFileName);

        // Dosyayı kaydet
        fs.writeFileSync(tempFilePath, response.data);
        
        console.log('✅ Görsel indirildi:', tempFilePath);
        
        return {
            filePath: tempFilePath,
            fileName: path.basename(imageUrl).split('?')[0] || 'fabric_image.jpg'
        };
    } catch (error) {
        console.error('❌ Görsel indirme hatası:', error.message);
        throw error;
    }
}

/**
 * 1. Adım: Görseli PLM'e yükle
 */
async function uploadImageToPLM(token, filePath, originalFileName, materialId, materialCode) {
    try {
        console.log('\n📤 1. Adım: Görsel yükleniyor...');
        console.log('  Material ID:', materialId);
        console.log('  Material Code:', materialCode);
        console.log('  File:', originalFileName);

        // FormData oluştur
        const form = new FormData();

        // Atta JSON (metadata)
        const attaData = {
            objectFilePath: `blob:temp/${originalFileName}`,
            objectExtension: null,
            sequence: 0,
            details: {
                name: null,
                note: null
            },
            referenceId: materialId.toString(),
            modifyDate: "0001-01-01T00:00:00",
            code: materialCode,
            isDefault: false,
            objectId: 0,
            originalObjectName: originalFileName,
            objectStream: null,
            tempId: generateTempId()
        };

        // Form alanlarını ekle
        form.append('atta', JSON.stringify(attaData));
        form.append('type', 'undefined');
        form.append('formType', 'file');
        form.append('schema', 'FSH1');
        form.append('overwrite', 'false');
        
        // Dosyayı ekle
        form.append('file', fs.createReadStream(filePath), {
            filename: originalFileName,
            contentType: 'image/jpeg'
        });

        const uploadUrl = `${DOCUMENTS_BASE}/api/document/UploadFile`;

        const response = await axios.post(uploadUrl, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        console.log('✅ Görsel yüklendi!');
        console.log('Response:', JSON.stringify(response.data, null, 2));

        return response.data;

    } catch (error) {
        console.error('❌ Görsel yükleme hatası:');
        console.error('Status:', error.response?.status);
        console.error('Response:', JSON.stringify(error.response?.data, null, 2));
        console.error('Message:', error.message);
        throw error;
    }
}

/**
 * 2. Adım: Metadata kaydet ve ana görsel olarak işaretle
 */
async function saveImageMetadata(token, uploadResponse, materialId, materialCode) {
    try {
        console.log('\n📋 2. Adım: Metadata kaydediliyor...');

        const addedFile = uploadResponse.addedFiles[0];

        const metadataPayload = {
            AttaFileListDto: [{
                objectFilePath: addedFile.objectFilePath,
                objectExtension: addedFile.objectExtension,
                sequence: 0,
                details: {
                    name: null,
                    note: null
                },
                referenceId: materialId.toString(),
                modifyDate: "0001-01-01T00:00:00",
                code: materialCode,
                isDefault: true, // ANA GÖRSEL!
                objectId: 0,
                originalObjectName: addedFile.oldFileName,
                objectStream: null,
                tempId: addedFile.tempId || generateTempId(),
                objectKey: addedFile.objectKey,
                oldFileName: addedFile.oldFileName,
                documentUrl: addedFile.documentUrl,
                thumbUrl: addedFile.thumbUrl,
                customUrl: addedFile.customUrl
            }],
            Schema: "FSH1"
        };

        console.log('📦 Metadata Payload:', JSON.stringify(metadataPayload, null, 2));

        const metadataUrl = `${DOCUMENTS_BASE}/api/document/SaveMetadata/`;

        const response = await axios.post(metadataUrl, metadataPayload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Metadata kaydedildi! Ana görsel ayarlandı.');
        console.log('Response:', JSON.stringify(response.data, null, 2));

        return response.data;

    } catch (error) {
        console.error('❌ Metadata kaydetme hatası:');
        console.error('Status:', error.response?.status);
        console.error('Response:', JSON.stringify(error.response?.data, null, 2));
        console.error('Message:', error.message);
        throw error;
    }
}

/**
 * Yardımcı: Temp ID oluştur
 */
function generateTempId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Ana test fonksiyonu
 */
async function testImageUpload() {
    let tempFilePath = null;

    try {
        console.log('🚀 PLM Görsel Yükleme Testi Başlıyor...\n');

        // Test parametreleri
        const TEST_IMAGE_URL = process.argv[2] || 'https://example.com/fabric.jpg';
        const TEST_MATERIAL_ID = process.argv[3] || '5097';
        const TEST_MATERIAL_CODE = process.argv[4] || 'E0023';

        console.log('📝 Test Parametreleri:');
        console.log('  Image URL:', TEST_IMAGE_URL);
        console.log('  Material ID:', TEST_MATERIAL_ID);
        console.log('  Material Code:', TEST_MATERIAL_CODE);

        // Token al
        console.log('\n🔐 PLM Token alınıyor...');
        const token = await getPLMToken();
        console.log('✅ Token alındı');

        // Görseli indir
        const { filePath, fileName } = await downloadImage(TEST_IMAGE_URL);
        tempFilePath = filePath;

        // 1. Görseli yükle
        const uploadResponse = await uploadImageToPLM(
            token,
            filePath,
            fileName,
            TEST_MATERIAL_ID,
            TEST_MATERIAL_CODE
        );

        if (!uploadResponse.addedFiles || uploadResponse.addedFiles.length === 0) {
            throw new Error('Görsel yüklenemedi, addedFiles boş');
        }

        // 2. Metadata kaydet
        const metadataResponse = await saveImageMetadata(
            token,
            uploadResponse,
            TEST_MATERIAL_ID,
            TEST_MATERIAL_CODE
        );

        console.log('\n🎉 TEST BAŞARILI! Görsel ana görsel olarak eklendi.');
        console.log('\n📊 Final Sonuç:');
        console.log('  Object Key:', uploadResponse.addedFiles[0].objectKey);
        console.log('  Thumb URL:', uploadResponse.addedFiles[0].thumbUrl);
        console.log('  Preview URL:', uploadResponse.addedFiles[0].customUrl);

    } catch (error) {
        console.error('\n❌ TEST BAŞARISIZ!');
        console.error('Hata:', error.message);
        process.exit(1);
    } finally {
        // Geçici dosyayı temizle
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log('\n🧹 Geçici dosya temizlendi');
        }
    }
}

// Test başlat
if (require.main === module) {
    testImageUpload();
}

module.exports = {
    downloadImage,
    uploadImageToPLM,
    saveImageMetadata,
    getPLMToken
};

