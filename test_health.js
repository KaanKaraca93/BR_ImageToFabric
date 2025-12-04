/**
 * Health Check Test Script
 * Tüm servislerin durumunu kontrol eder
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';

console.log('🏥 Health Check Tests başlatılıyor...');
console.log('='.repeat(70));

async function testBasicHealth() {
    console.log('\n📊 Test 1: Basic Health Check');
    console.log('-'.repeat(70));
    
    try {
        const response = await axios.get(`${API_URL}/health`);
        
        console.log('✅ Durum:', response.status);
        console.log('📝 Response:', JSON.stringify(response.data, null, 2));
        
        if (response.data.status === 'healthy') {
            console.log('✅ API çalışıyor!');
            return true;
        } else {
            console.log('⚠️  API durumu healthy değil');
            return false;
        }
    } catch (error) {
        console.error('❌ Basic health check başarısız:', error.message);
        return false;
    }
}

async function testDetailedHealth() {
    console.log('\n📊 Test 2: Detailed Health Check (Tüm Servisler)');
    console.log('-'.repeat(70));
    
    try {
        const response = await axios.get(`${API_URL}/health/detailed`);
        
        console.log('✅ Durum:', response.status);
        console.log('📝 Response:', JSON.stringify(response.data, null, 2));
        
        const { services } = response.data;
        
        // Servis durumlarını göster
        console.log('\n📋 Servis Durumları:');
        console.log('-'.repeat(70));
        
        // API Status
        const apiStatus = services.api.status === 'healthy' ? '✅' : '❌';
        console.log(`${apiStatus} Express API: ${services.api.message}`);
        console.log(`   Uptime: ${services.api.uptime_seconds} saniye`);
        
        // OpenAI Status
        const openaiStatus = services.openai.status === 'healthy' ? '✅' : 
                           services.openai.status === 'unhealthy' ? '❌' : '⚠️';
        console.log(`${openaiStatus} OpenAI API: ${services.openai.message}`);
        console.log(`   API Key: ${services.openai.api_key_configured ? 'Configured' : 'NOT configured'}`);
        if (services.openai.models_available) {
            console.log(`   Models Available: ${services.openai.models_available}`);
        }
        
        // PLM Status
        const plmStatus = services.plm.status === 'healthy' ? '✅' : 
                         services.plm.status === 'unhealthy' ? '❌' : '⚠️';
        console.log(`${plmStatus} PLM API: ${services.plm.message}`);
        console.log(`   Credentials: ${services.plm.credentials_configured ? 'Configured' : 'NOT configured'}`);
        console.log(`   Token Status: ${services.plm.token_status}`);
        if (services.plm.token_expires_in_seconds) {
            console.log(`   Token Expires In: ${services.plm.token_expires_in_seconds} saniye`);
        }
        
        // GitHub Status
        console.log(`ℹ️  GitHub: ${services.github.message}`);
        
        // Overall status
        console.log('\n' + '='.repeat(70));
        if (response.data.status === 'healthy') {
            console.log('✅ TÜM SERVİSLER SAĞLIKLI!');
            return true;
        } else if (response.data.status === 'degraded') {
            console.log('⚠️  BAZI SERVİSLERDE SORUN VAR (Degraded)');
            return false;
        } else {
            console.log('❌ SERVİSLER SAĞLIKSIZ!');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Detailed health check başarısız:', error.message);
        
        if (error.response) {
            console.log('📝 Error Response:', JSON.stringify(error.response.data, null, 2));
        }
        
        return false;
    }
}

async function runTests() {
    console.log(`\n🎯 Target API: ${API_URL}\n`);
    
    const test1 = await testBasicHealth();
    const test2 = await testDetailedHealth();
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SONUÇLARI:');
    console.log('='.repeat(70));
    console.log(`Basic Health Check: ${test1 ? '✅ BAŞARILI' : '❌ BAŞARISIZ'}`);
    console.log(`Detailed Health Check: ${test2 ? '✅ BAŞARILI' : '❌ BAŞARISIZ'}`);
    console.log('='.repeat(70));
    
    const allPassed = test1 && test2;
    
    if (allPassed) {
        console.log('\n🎉 TÜM TESTLER BAŞARILI!\n');
        process.exit(0);
    } else {
        console.log('\n⚠️  BAZI TESTLER BAŞARISIZ!\n');
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('\n❌ Test script hatası:', error.message);
    process.exit(1);
});

