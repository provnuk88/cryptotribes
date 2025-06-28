const mongoose = require('mongoose');
const Village = require('./models/Village');
const Building = require('./models/Building');
const gameLogic = require('./server/gameLogic');

// Подключение к базе данных
const TEST_URI = 'mongodb://localhost:27017/cryptotribes';
mongoose.connect(TEST_URI, { useNewUrlParser: true, useUnifiedTopology: true });

async function testResourceUpdate() {
    try {
        console.log('🧪 Тестирование обновления ресурсов...');
        
        // Находим первую деревню
        const village = await Village.findOne().lean();
        if (!village) {
            console.log('❌ Деревни не найдены. Создайте пользователя и деревню через игру.');
            return;
        }
        
        console.log(`📍 Найдена деревня: ${village.name} (ID: ${village._id})`);
        console.log(`📊 Текущие ресурсы:`);
        console.log(`   Дерево: ${village.wood}`);
        console.log(`   Глина: ${village.clay}`);
        console.log(`   Железо: ${village.iron}`);
        console.log(`   Еда: ${village.food}`);
        console.log(`🕐 Последнее обновление: ${village.last_update}`);
        
        // Проверяем здания
        const buildings = await Building.find({ village_id: village._id }).lean();
        console.log(`🏗️ Здания в деревне:`);
        buildings.forEach(b => {
            console.log(`   ${b.building_type}: уровень ${b.level}`);
        });
        
        // Обновляем ресурсы
        console.log('\n🔄 Обновляем ресурсы...');
        const updated = await gameLogic.updateVillageResources(village);
        
        console.log(`📊 Обновленные ресурсы:`);
        console.log(`   Дерево: ${updated.wood} (${updated.wood - village.wood > 0 ? '+' : ''}${updated.wood - village.wood})`);
        console.log(`   Глина: ${updated.clay} (${updated.clay - village.clay > 0 ? '+' : ''}${updated.clay - village.clay})`);
        console.log(`   Железо: ${updated.iron} (${updated.iron - village.iron > 0 ? '+' : ''}${updated.iron - village.iron})`);
        console.log(`   Еда: ${updated.food} (${updated.food - village.food > 0 ? '+' : ''}${updated.food - village.food})`);
        
        console.log(`📈 Производство в час:`);
        console.log(`   Дерево: ${updated.production.wood * 60}`);
        console.log(`   Глина: ${updated.production.clay * 60}`);
        console.log(`   Железо: ${updated.production.iron * 60}`);
        console.log(`   Еда: ${updated.production.food * 60}`);
        
        console.log(`📦 Вместимость склада: ${updated.capacity}`);
        console.log(`🕐 Новое время обновления: ${updated.last_update}`);
        
        console.log('\n✅ Тест завершен успешно!');
        
    } catch (error) {
        console.error('❌ Ошибка тестирования:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Отключение от базы данных');
    }
}

// Запускаем тест
testResourceUpdate(); 