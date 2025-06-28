#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log(`
╔═══════════════════════════════════════╗
║     CryptoTribes - Установка          ║
╚═══════════════════════════════════════╝
`);

// Проверка Node.js версии
const nodeVersion = process.version.match(/^v(\d+)/)[1];
if (parseInt(nodeVersion) < 14) {
    console.error('❌ Требуется Node.js версии 14 или выше!');
    console.log('Текущая версия:', process.version);
    process.exit(1);
}

console.log('✅ Node.js версия:', process.version);

// Создание необходимых директорий
const dirs = ['public', 'server'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Создана директория: ${dir}`);
    }
});

// Проверка наличия файлов
const requiredFiles = [
    'package.json',
    'server/server.js',
    'server/gameLogic.js',
    'public/index.html',
    'public/style.css',
    'public/game.js'
];

let missingFiles = [];
requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
        missingFiles.push(file);
    }
});

if (missingFiles.length > 0) {
    console.error('❌ Отсутствуют необходимые файлы:');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    console.log('\nУбедитесь, что все файлы проекта скопированы правильно.');
    process.exit(1);
}

console.log('✅ Все необходимые файлы найдены');

// Создание .env файла из примера
if (!fs.existsSync('.env') && fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env');
    console.log('📄 Создан файл .env из примера');
} else if (!fs.existsSync('.env')) {
    // Создаем базовый .env файл
    const envContent = `# Порт сервера
PORT=3000

# Секретный ключ для сессий
SESSION_SECRET=cryptotribes-secret-${Math.random().toString(36).substring(7)}

# Режим разработки
NODE_ENV=development
`;
    fs.writeFileSync('.env', envContent);
    console.log('📄 Создан базовый файл .env');
}

// Установка зависимостей
console.log('\n📦 Установка зависимостей...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Зависимости установлены');
} catch (error) {
    console.error('❌ Ошибка установки зависимостей');
    console.log('Попробуйте выполнить вручную: npm install');
    process.exit(1);
}

// Создание директории для изображений (на будущее)
const imgDir = path.join('public', 'images');
if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
    console.log('📁 Создана директория для изображений');
}

console.log(`
╔═══════════════════════════════════════╗
║        Установка завершена!           ║
╟───────────────────────────────────────╢
║  Запустите игру командой:             ║
║  npm start                            ║
║                                       ║
║  Для режима разработки:               ║
║  npm run dev                          ║
║                                       ║
║  Откройте в браузере:                 ║
║  http://localhost:3000                ║
╚═══════════════════════════════════════╝

🎮 Приятной игры!
`);

// Предложение запустить игру сразу
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Запустить игру сейчас? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'д') {
        console.log('\n🚀 Запускаем CryptoTribes...\n');
        require('./server/server.js');
    } else {
        console.log('\nДля запуска используйте: npm start');
        process.exit(0);
    }
    rl.close();
});