/**
 * TAM AKIŞ TEST: Görsel Analizi + PLM'de Kumaş Açma
 */

const axios = require('axios');
const fs = require('fs');

const API_BASE_URL = 'http://localhost:5000';

async function testFullFlow(imageUrl, createInPLM = true) {
    console.log('\n🎯 TAM AKIŞ TESTİ: Analiz + PLM Kumaş Açma');
    console.log('='.repeat(70));
    console.log(`📸 URL: ${imageUrl.substring(0, 80)}...`);
    console.log(`🏭 PLM'de Açılsın mı: ${createInPLM ? 'EVET' : 'HAYIR'}`);
    console.log('');

    try {
        const response = await axios.post(
            `${API_BASE_URL}/analyze-and-create`,
            {
                image_url: imageUrl,
                document_id: 'TEST-' + Date.now(),
                request_id: 'req-test-' + Date.now(),
                timestamp: new Date().toISOString(),
                create_in_plm: createInPLM
            },
            { timeout: 120000 } // 2 dakika timeout
        );

        console.log('📊 Status Code:', response.status);
        console.log('');

        const result = response.data;

        if (result.success) {
            console.log('✅ TAM AKIŞ BAŞARILI!');
            console.log('');
            console.log('📋 ANALIZ SONUCU:');
            console.log('='.repeat(70));
            
            const data = result.analysis.data;
            console.log(`Tedarikçi: ${data.Tedarikcisi}`);
            console.log(`Kod: ${data.Tedarikci_Kodu}`);
            console.log(`Gramaj: ${data.Gramaj}`);
            console.log(`En: ${data.En}`);
            
            // Elyaf bilgileri
            for (let i = 1; i <= 5; i++) {
                if (data[`Elyaf${i}Yuzde`]) {
                    console.log(`Elyaf${i}: %${data[`Elyaf${i}Yuzde`]} ${data[`Elyaf${i}`]} (${data[`Elyaf${i}Code`]}, Id:${data[`Elyaf${i}Id`]})`);
                }
            }
            
            console.log('');
            console.log('🏭 PLM KUMAŞ AÇMA SONUCU:');
            console.log('='.repeat(70));
            
            if (result.plm_creation) {
                if (result.plm_creation.success) {
                    console.log('✅ PLM\'de kumaş kodu başarıyla açıldı!');
                    console.log(`📄 Kumaş: ${result.plm_creation.material_description}`);
                    console.log('');
                    console.log('📦 PLM Response:');
                    console.log(JSON.stringify(result.plm_creation.plm_response, null, 2));
                } else {
                    console.log('❌ PLM kumaş açma başarısız!');
                    console.log('Hata:', result.plm_creation.error);
                }
            } else {
                console.log('⏭️  PLM kumaş açma atlandı (create_in_plm: false)');
            }
            
            console.log('');
            console.log('='.repeat(70));
            console.log(`⏱️  Toplam Süre: ${result.metadata.processing_time_ms}ms`);
            console.log('🎉 Test tamamlandı!');
            
        } else {
            console.log('❌ TAM AKIŞ BAŞARISIZ!');
            console.log('Hata:', result.error || 'Bilinmeyen hata');
        }

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ API çalışmıyor!');
            console.log('💡 Lütfen önce API\'yi başlatın: npm start');
        } else if (error.response) {
            console.log('❌ API Hatası:');
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('❌ Test Hatası:', error.message);
        }
    }
}

// Test URL'ini oku
const urlFilePath = './test_url.txt';
if (fs.existsSync(urlFilePath)) {
    const testUrl = fs.readFileSync(urlFilePath, 'utf-8').trim();
    
    // Komut satırından create_in_plm parametresi al
    const createInPLM = process.argv[2] !== 'false';
    
    if (createInPLM) {
        console.log('\n⚠️  DİKKAT: Bu test PLM\'de GERÇEK kumaş kodu açacak!');
        console.log('💡 Sadece analiz yapmak için: node test_full_flow.js false');
        console.log('');
    }
    
    testFullFlow(testUrl, createInPLM);
} else {
    console.log('❌ test_url.txt dosyası bulunamadı!');
    console.log('💡 Lütfen test_url.txt dosyasına PLM görsel URL\'ini ekleyin.');
}

