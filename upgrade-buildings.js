const mongoose = require('mongoose');
const Village = require('./models/Village');
const Building = require('./models/Building');
const gameLogic = require('./server/gameLogic');

// Подключение к базе данных
const TEST_URI = 'mongodb://localhost:27017/cryptotribes';
mongoose.connect(TEST_URI, { useNewUrlParser: true, useUnifiedTopology: true });

async function upgradeBuildings() {
    try {
        console.log('🏗️ Улучшение зданий для тестирования производства...');
        
        // Находим первую деревню
        const village = await Village.findOne().lean();
        if (!village) {
            console.log('❌ Деревни не найдены.');
            return;
        }
        
        console.log(`📍 Деревня: ${village.name}`);
        
        // Улучшаем производственные здания
        const productionBuildings = ['farm', 'lumbercamp', 'clay_pit', 'iron_mine'];
        
        for (const buildingType of productionBuildings) {
            try {
                // Устанавливаем ресурсы для улучшения
                await Village.updateOne(
                    { _id: village._id },
                    { 
                        wood: 10000, 
                        clay: 10000, 
                        iron: 10000, 
                        food: 10000 
                    }
                );
                
                // Улучшаем здание до уровня 1
                const building = await Building.findOne({ 
                    village_id: village._id, 
                    building_type: buildingType 
                });
                
                if (building && building.level === 0) {
                    await Building.updateOne(
                        { _id: building._id },
                        { level: 1 }
                    );
                    console.log(`✅ ${buildingType} улучшен до уровня 1`);
                }
            } catch (error) {
                console.error(`❌ Ошибка улучшения ${buildingType}:`, error);
            }
        }
        
        // Улучшаем склад
        try {
            await Building.updateOne(
                { village_id: village._id, building_type: 'warehouse' },
                { level: 1 }
            );
            console.log('✅ Склад улучшен до уровня 1');
        } catch (error) {
            console.error('❌ Ошибка улучшения склада:', error);
        }
        
        // Проверяем результат
        console.log('\n📊 Проверяем результат...');
        const updatedVillage = await Village.findById(village._id).lean();
        const buildings = await Building.find({ village_id: village._id }).lean();
        
        console.log(`🏗️ Здания:`);
        buildings.forEach(b => {
            console.log(`   ${b.building_type}: уровень ${b.level}`);
        });
        
        // Тестируем обновление ресурсов
        console.log('\n🔄 Тестируем обновление ресурсов...');
        const result = await gameLogic.updateVillageResources(updatedVillage);
        
        console.log(`📊 Ресурсы:`);
        console.log(`   Дерево: ${result.wood}`);
        console.log(`   Глина: ${result.clay}`);
        console.log(`   Железо: ${result.iron}`);
        console.log(`   Еда: ${result.food}`);
        
        console.log(`📈 Производство в час:`);
        console.log(`   Дерево: ${result.production.wood * 60}`);
        console.log(`   Глина: ${result.production.clay * 60}`);
        console.log(`   Железо: ${result.production.iron * 60}`);
        console.log(`   Еда: ${result.production.food * 60}`);
        
        console.log(`📦 Вместимость склада: ${result.capacity}`);
        
        console.log('\n✅ Улучшение зданий завершено!');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Отключение от базы данных');
    }
}

// Запускаем улучшение
upgradeBuildings(); 