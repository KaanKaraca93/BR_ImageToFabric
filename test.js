/**
 * Kumaş Analiz API Test Script
 * Node.js ile URL testi
 */

const axios = require('axios');
const readline = require('readline');

const API_BASE_URL = 'http://localhost:5000';

async function testFabricAnalysis(imageUrl) {
    console.log('\n🧪 Kumaş Görseli Analiz Testi');
    console.log('='.repeat(60));
    console.log(`📸 URL: ${imageUrl.substring(0, 80)}...`);
    console.log('');

    try {
        const response = await axios.post(
            `${API_BASE_URL}/analyze`,
            { image_url: imageUrl },
            { timeout: 60000 }
        );

        console.log(`📊 Status Code: ${response.status}`);
        console.log('');

        const result = response.data;

        if (result.success) {
            console.log('✅ Analiz Başarılı!');
            console.log('');
            console.log('📋 PLM Input Formatı:');
            console.log('='.repeat(60));
            
            const data = result.data;
            
            // Temel bilgiler
            console.log(`Tedarikcisi: ${data.Tedarikcisi || 'null'}`);
            console.log(`Tedarikci_Kodu: ${data.Tedarikci_Kodu || 'null'}`);
            console.log(`Gramaj: ${data.Gramaj || 'null'}`);
            console.log(`En: ${data.En || 'null'}`);
            
            // Elyaf bilgileri (dinamik - sadece dolu olanları göster)
            for (let i = 1; i <= 5; i++) {
                if (data[`Elyaf${i}Yuzde`]) {
                    console.log(`Elyaf${i}Yuzde: ${data[`Elyaf${i}Yuzde`]}`);
                    console.log(`Elyaf${i}: ${data[`Elyaf${i}`]}`);
                    console.log(`Elyaf${i}Id: ${data[`Elyaf${i}Id`]}`);
                    console.log(`Elyaf${i}Code: ${data[`Elyaf${i}Code`]}`);
                }
            }
            
            console.log('');
            console.log('='.repeat(60));
            console.log('🎉 Test başarıyla tamamlandı!');
            console.log('');
            
            // Debug: Ham ChatGPT response
            if (result.raw_chatgpt_response) {
                console.log('🔍 Debug - ChatGPT Ham Response:');
                console.log(JSON.stringify(result.raw_chatgpt_response, null, 2));
            }
        } else {
            console.log('❌ Hata:', result.error || 'Bilinmeyen hata');
        }

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ API çalışmıyor!');
            console.log('💡 Lütfen önce API\'yi başlatın: npm start');
        } else if (error.response) {
            console.log('❌ Hata:', error.response.data.error || 'Bilinmeyen hata');
        } else {
            console.log('❌ Test Hatası:', error.message);
        }
    }
}

const fs = require('fs');
const path = require('path');

// Komut satırından URL al veya dosyadan oku veya kullanıcıdan iste
if (process.argv.length > 2) {
    // Komut satırından URL verilmiş
    const testUrl = process.argv[2];
    console.log('ℹ️  Komut satırından URL alındı');
    testFabricAnalysis(testUrl);
} else {
    // test_url.txt dosyasından oku
    const urlFilePath = path.join(__dirname, 'test_url.txt');
    
    if (fs.existsSync(urlFilePath)) {
        const testUrl = fs.readFileSync(urlFilePath, 'utf-8').trim();
        if (testUrl) {
            console.log('ℹ️  test_url.txt dosyasından URL alındı');
            testFabricAnalysis(testUrl);
            return;
        }
    }
    
    // Kullanıcıdan iste
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\n' + '='.repeat(60));
    console.log('🧵 KUMAŞ ANALİZ TEST');
    console.log('='.repeat(60));
    console.log('💡 İpucu: URL\'i test_url.txt dosyasına yazabilirsiniz');

    rl.question('\n📎 PLM Görsel URL\'ini girin: ', (testUrl) => {
        rl.close();

        if (!testUrl || testUrl.trim() === '') {
            console.log('❌ URL girilmedi, test iptal ediliyor.');
            process.exit(1);
        }

        testFabricAnalysis(testUrl.trim());
    });
}

