#!/usr/bin/env node

// Скрипт для создания тестовых данных в игре
// Использование: node test-data.js

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'cryptotribes.db'));

console.log(`
╔═══════════════════════════════════════╗
║   CryptoTribes - Тестовые данные     ║
╚═══════════════════════════════════════╝
`);

// Тестовые пользователи
const testUsers = [
    { username: 'player1', password: 'password123' },
    { username: 'player2', password: 'password123' },
    { username: 'player3', password: 'password123' },
    { username: 'warrior', password: 'password123' },
    { username: 'builder', password: 'password123' }
];

// Названия деревень
const villageNames = [
    'Королевская цитадель',
    'Северная крепость',
    'Золотые поля',
    'Железный холм',
    'Лесная деревня'
];

// Создание тестовых данных
async function createTestData() {
    console.log('🔧 Создание тестовых пользователей...');
    
    for (let i = 0; i < testUsers.length; i++) {
        const user = testUsers[i];
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT OR IGNORE INTO users (username, password, crystals) VALUES (?, ?, ?)',
                [user.username, hashedPassword, 200 + i * 50],
                function(err) {
                    if (err) reject(err);
                    else {
                        console.log(`✅ Создан пользователь: ${user.username}`);
                        resolve(this.lastID);
                    }
                }
            );
        }).then(userId => {
            // Создаем деревню для пользователя
            return createVillageForUser(userId, villageNames[i], i);
        }).catch(err => {
            if (err.message.includes('UNIQUE constraint failed')) {
                console.log(`⚠️  Пользователь ${user.username} уже существует`);
            } else {
                console.error('Ошибка:', err);
            }
        });
    }
    
    // Создаем тестовое племя
    console.log('\n🛡️  Создание тестового племени...');
    
    await new Promise((resolve, reject) => {
        db.run(
            'INSERT OR IGNORE INTO tribes (name, tag, leader_id) VALUES (?, ?, ?)',
            ['Воины Севера', 'NORTH', 1],
            (err) => {
                if (err && !err.message.includes('UNIQUE constraint failed')) {
                    console.error('Ошибка создания племени:', err);
                } else {
                    console.log('✅ Создано племя: Воины Севера [NORTH]');
                }
                resolve();
            }
        );
    });
    
    console.log('\n✨ Тестовые данные созданы!');
    console.log('\nТестовые аккаунты:');
    testUsers.forEach(user => {
        console.log(`  Логин: ${user.username} | Пароль: ${user.password}`);
    });
}

// Создание деревни для пользователя
async function createVillageForUser(userId, villageName, index) {
    // Распределяем деревни по карте
    const positions = [
        { x: 5, y: 5 },
        { x: 15, y: 5 },
        { x: 5, y: 15 },
        { x: 15, y: 15 },
        { x: 10, y: 10 }
    ];
    
    const pos = positions[index] || { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) };
    
    // Разные начальные ресурсы для разнообразия
    const resources = {
        wood: 1000 + index * 200,
        clay: 1000 + index * 200,
        iron: 1000 + index * 200,
        food: 1000 + index * 200
    };
    
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR IGNORE INTO villages (user_id, name, x, y, wood, clay, iron, food, points) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, villageName, pos.x, pos.y, resources.wood, resources.clay, resources.iron, resources.food, index * 100],
            function(err) {
                if (err) {
                    console.error(`Ошибка создания деревни для пользователя ${userId}:`, err);
                    reject(err);
                } else {
                    const villageId = this.lastID;
                    console.log(`  📍 Деревня "${villageName}" создана в (${pos.x}, ${pos.y})`);
                    
                    // Создаем здания
                    createBuildingsForVillage(villageId, index);
                    
                    // Создаем войска для некоторых деревень
                    if (index < 3) {
                        createTroopsForVillage(villageId, index);
                    }
                    
                    resolve(villageId);
                }
            }
        );
    });
}

// Создание зданий для деревни
function createBuildingsForVillage(villageId, index) {
    const buildingTypes = [
        'tribal_hall', 'farm', 'lumbercamp', 'clay_pit', 
        'iron_mine', 'warehouse', 'barracks', 'wall'
    ];
    
    buildingTypes.forEach(buildingType => {
        let level = 0;
        
        // Разные уровни зданий для разных деревень
        if (buildingType === 'tribal_hall') {
            level = 1 + Math.min(index, 3);
        } else if (index > 0) {
            if (buildingType === 'barracks') {
                level = index > 1 ? 1 : 0;
            } else {
                level = Math.floor(Math.random() * Math.min(index + 1, 4));
            }
        }
        
        db.run(
            'INSERT OR IGNORE INTO buildings (village_id, building_type, level) VALUES (?, ?, ?)',
            [villageId, buildingType, level]
        );
    });
}

// Создание войск для деревни
function createTroopsForVillage(villageId, index) {
    const troopTypes = ['spearman', 'swordsman', 'archer', 'light_cavalry'];
    
    troopTypes.forEach(troopType => {
        let amount = 0;
        
        // Разное количество войск
        switch (troopType) {
            case 'spearman':
                amount = 10 + index * 5;
                break;
            case 'swordsman':
                amount = 5 + index * 3;
                break;
            case 'archer':
                amount = index > 0 ? 5 + index * 2 : 0;
                break;
            case 'light_cavalry':
                amount = index > 1 ? 2 + index : 0;
                break;
        }
        
        db.run(
            'INSERT OR IGNORE INTO troops (village_id, troop_type, amount) VALUES (?, ?, ?)',
            [villageId, troopType, amount]
        );
    });
}

// Запуск создания тестовых данных
createTestData().then(() => {
    setTimeout(() => {
        db.close();
        console.log('\n🎮 Готово! Можете запускать игру.');
        process.exit(0);
    }, 2000);
}).catch(err => {
    console.error('Ошибка:', err);
    db.close();
    process.exit(1);
});