const mongoose = require('mongoose');
const Village = require('./models/Village');
const Building = require('./models/Building');
const gameLogic = require('./server/gameLogic');

// Подключение к базе данных
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptotribes';

async function debugResourceUpdate() {
    try {
        await mongoose.connect(MONGO_URI, { 
            useNewUrlParser: true, 
            useUnifiedTopology: true 
        });
        
        console.log('🔍 Отладка обновления ресурсов\n');
        
        // Находим все деревни
        const villages = await Village.find().populate('user_id', 'username').lean();
        console.log(`📊 Найдено деревень: ${villages.length}\n`);
        
        for (const village of villages) {
            console.log(`\n📍 Деревня: ${village.name} (Владелец: ${village.user_id?.username || 'Варвары'})`);
            console.log(`   ID: ${village._id}`);
            console.log(`   Координаты: (${village.x}, ${village.y})`);
            console.log(`   Последнее обновление: ${village.last_update}`);
            
            // Текущие ресурсы
            console.log(`\n   💰 Текущие ресурсы:`);
            console.log(`      Дерево: ${village.wood}`);
            console.log(`      Глина: ${village.clay}`);
            console.log(`      Железо: ${village.iron}`);
            console.log(`      Еда: ${village.food}`);
            
            // Здания
            const buildings = await Building.find({ village_id: village._id }).lean();
            console.log(`\n   🏗️ Здания:`);
            for (const building of buildings) {
                if (building.level > 0) {
                    console.log(`      ${building.building_type}: уровень ${building.level}`);
                }
            }
            
            // Пробуем обновить ресурсы
            console.log(`\n   🔄 Обновляем ресурсы...`);
            try {
                const updated = await gameLogic.updateVillageResources(village);
                
                console.log(`\n   📈 Производство в час:`);
                console.log(`      Дерево: ${updated.production.wood * 60}`);
                console.log(`      Глина: ${updated.production.clay * 60}`);
                console.log(`      Железо: ${updated.production.iron * 60}`);
                console.log(`      Еда: ${updated.production.food * 60}`);
                
                console.log(`\n   💰 Новые ресурсы:`);
                console.log(`      Дерево: ${Math.floor(updated.wood)} (+${Math.floor(updated.wood - village.wood)})`);
                console.log(`      Глина: ${Math.floor(updated.clay)} (+${Math.floor(updated.clay - village.clay)})`);
                console.log(`      Железо: ${Math.floor(updated.iron)} (+${Math.floor(updated.iron - village.iron)})`);
                console.log(`      Еда: ${Math.floor(updated.food)} (+${Math.floor(updated.food - village.food)})`);
                
                console.log(`\n   ✅ Обновление успешно!`);
                
            } catch (error) {
                console.error(`\n   ❌ Ошибка обновления: ${error.message}`);
            }
            
            console.log('\n' + '='.repeat(60));
        }
        
        // Проверяем варварские деревни
        const barbarianVillages = villages.filter(v => !v.user_id);
        console.log(`\n🏴‍☠️ Варварских деревень: ${barbarianVillages.length}`);
        
        if (barbarianVillages.length === 0) {
            console.log('\n💡 Совет: Создайте варварские деревни командой:');
            console.log('   POST /api/admin/generate-barbarians');
            console.log('   Body: { "count": 10 }');
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Отключение от базы данных');
    }
}

// Запускаем отладку
debugResourceUpdate(); 