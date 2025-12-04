/**
 * ION Entegrasyon Test Script
 * ION'dan gelecek farklı formatları test eder
 */

const axios = require('axios');
const fs = require('fs');

const API_BASE_URL = 'http://localhost:5000';

// test_url.txt'den URL oku
const testUrl = fs.readFileSync('test_url.txt', 'utf-8').trim();

console.log('🔌 ION ENTEGRASYON TESTLERİ');
console.log('='.repeat(70));
console.log('');

// Test 1: Basit tek görsel
async function test1_SingleImage() {
    console.log('📋 Test 1: Basit Tek Görsel');
    console.log('-'.repeat(70));
    
    try {
        const response = await axios.post(`${API_BASE_URL}/analyze`, {
            image_url: testUrl
        });
        
        console.log('✅ Başarılı!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ Hata:', error.response?.data || error.message);
    }
    console.log('');
}

// Test 2: Metadata ile tek görsel
async function test2_WithMetadata() {
    console.log('📋 Test 2: Metadata ile Tek Görsel');
    console.log('-'.repeat(70));
    
    try {
        const response = await axios.post(`${API_BASE_URL}/analyze`, {
            image_url: testUrl,
            document_id: 'FPLM_Document-89069',
            request_id: 'req-test-' + Date.now(),
            timestamp: new Date().toISOString()
        });
        
        console.log('✅ Başarılı!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ Hata:', error.response?.data || error.message);
    }
    console.log('');
}

// Test 3: Batch (çoklu görsel) - aynı URL ile test
async function test3_BatchProcessing() {
    console.log('📋 Test 3: Batch Processing (Çoklu Görsel)');
    console.log('-'.repeat(70));
    
    try {
        const response = await axios.post(`${API_BASE_URL}/analyze`, {
            images: [
                {
                    image_url: testUrl,
                    document_id: 'FPLM_Document-89069-1'
                },
                {
                    image_url: testUrl,
                    document_id: 'FPLM_Document-89069-2'
                }
            ]
        });
        
        console.log('✅ Başarılı!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ Hata:', error.response?.data || error.message);
    }
    console.log('');
}

// Test 4: Hata durumu (geçersiz URL)
async function test4_ErrorHandling() {
    console.log('📋 Test 4: Hata Yönetimi (Geçersiz URL)');
    console.log('-'.repeat(70));
    
    try {
        const response = await axios.post(`${API_BASE_URL}/analyze`, {
            image_url: 'https://invalid-url-test.com/image.jpg',
            document_id: 'FPLM_Document-INVALID',
            request_id: 'req-error-test'
        });
        
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('⚠️  Beklenen hata alındı (bu normaldir)');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
    }
    console.log('');
}

// Tüm testleri çalıştır
async function runAllTests() {
    console.log('⏳ Testler başlatılıyor...\n');
    
    await test1_SingleImage();
    await test2_WithMetadata();
    
    console.log('⚠️  Dikkat: Batch test 2 görsel için ~30 saniye sürebilir (OpenAI API)');
    console.log('İptal etmek için Ctrl+C basabilirsiniz.\n');
    
    // Kullanıcıya seçim ver
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('Batch testi çalıştırmak istiyor musunuz? (y/n): ', async (answer) => {
        rl.close();
        
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            await test3_BatchProcessing();
        } else {
            console.log('ℹ️  Batch test atlandı.\n');
        }
        
        await test4_ErrorHandling();
        
        console.log('='.repeat(70));
        console.log('✅ Tüm testler tamamlandı!');
        console.log('');
        console.log('📝 ION Entegrasyonu için:');
        console.log('   - Endpoint: POST http://localhost:5000/analyze');
        console.log('   - Format: ION_API.md dosyasına bakın');
        console.log('   - Batch desteği: Evet (images array)');
        console.log('   - Metadata desteği: Evet (document_id, request_id, timestamp)');
    });
}

// Testleri başlat
runAllTests().catch(console.error);

