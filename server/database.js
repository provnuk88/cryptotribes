const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Создание/подключение к базе данных
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../cryptotribes.db');
const db = new sqlite3.Database(dbPath);

// Инициализация таблиц
function initDatabase() {
    db.serialize(() => {
        // Оптимизация SQLite для производительности
        db.run("PRAGMA journal_mode = WAL"); // Write-Ahead Logging для лучшей конкурентности
        db.run("PRAGMA synchronous = NORMAL"); // Баланс между производительностью и надежностью
        db.run("PRAGMA cache_size = 10000"); // Увеличиваем кэш (10000 страниц)
        db.run("PRAGMA temp_store = MEMORY"); // Временные таблицы в памяти
        db.run("PRAGMA mmap_size = 30000000000"); // 30GB memory-mapped I/O
        
        // Таблица пользователей
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                crystals INTEGER DEFAULT 100,
                tribe_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Таблица деревень
        db.run(`
            CREATE TABLE IF NOT EXISTS villages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                x INTEGER NOT NULL,
                y INTEGER NOT NULL,
                wood INTEGER DEFAULT 1000,
                clay INTEGER DEFAULT 1000,
                iron INTEGER DEFAULT 1000,
                food INTEGER DEFAULT 1000,
                last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
                points INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(x, y)
            )
        `);

        // Таблица зданий
        db.run(`
            CREATE TABLE IF NOT EXISTS buildings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                village_id INTEGER NOT NULL,
                building_type TEXT NOT NULL,
                level INTEGER DEFAULT 0,
                is_upgrading INTEGER DEFAULT 0,
                upgrade_finish_time DATETIME,
                FOREIGN KEY (village_id) REFERENCES villages(id),
                UNIQUE(village_id, building_type)
            )
        `);

        // Таблица войск
        db.run(`
            CREATE TABLE IF NOT EXISTS troops (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                village_id INTEGER NOT NULL,
                troop_type TEXT NOT NULL,
                amount INTEGER DEFAULT 0,
                FOREIGN KEY (village_id) REFERENCES villages(id),
                UNIQUE(village_id, troop_type)
            )
        `);

        // Таблица очереди обучения
        db.run(`
            CREATE TABLE IF NOT EXISTS training_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                village_id INTEGER NOT NULL,
                troop_type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                finish_time DATETIME NOT NULL,
                FOREIGN KEY (village_id) REFERENCES villages(id)
            )
        `);

        // Таблица атак
        db.run(`
            CREATE TABLE IF NOT EXISTS attacks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_village_id INTEGER NOT NULL,
                to_village_id INTEGER NOT NULL,
                troops_data TEXT NOT NULL,
                arrival_time DATETIME NOT NULL,
                is_returning INTEGER DEFAULT 0,
                FOREIGN KEY (from_village_id) REFERENCES villages(id),
                FOREIGN KEY (to_village_id) REFERENCES villages(id)
            )
        `);

        // Таблица племен
        db.run(`
            CREATE TABLE IF NOT EXISTS tribes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                tag TEXT UNIQUE NOT NULL,
                leader_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                points INTEGER DEFAULT 0,
                FOREIGN KEY (leader_id) REFERENCES users(id)
            )
        `);

        // Таблица сообщений племени
        db.run(`
            CREATE TABLE IF NOT EXISTS tribe_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tribe_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tribe_id) REFERENCES tribes(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Таблица отчетов
        db.run(`
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `        );

        // Создание индексов для производительности
        db.run("CREATE INDEX IF NOT EXISTS idx_villages_user ON villages(user_id)");
        db.run("CREATE INDEX IF NOT EXISTS idx_villages_coords ON villages(x, y)");
        db.run("CREATE INDEX IF NOT EXISTS idx_buildings_village ON buildings(village_id)");
        db.run("CREATE INDEX IF NOT EXISTS idx_troops_village ON troops(village_id)");
        db.run("CREATE INDEX IF NOT EXISTS idx_attacks_arrival ON attacks(arrival_time)");
        db.run("CREATE INDEX IF NOT EXISTS idx_attacks_returning ON attacks(is_returning, arrival_time)");
        db.run("CREATE INDEX IF NOT EXISTS idx_training_finish ON training_queue(finish_time)");
        db.run("CREATE INDEX IF NOT EXISTS idx_users_tribe ON users(tribe_id)");
        db.run("CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id, is_read)");

        console.log('База данных инициализирована с оптимизациями');
    });
}

// Вспомогательные функции для работы с БД

// Выполнить запрос и вернуть Promise
function runAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

// Получить одну запись
function getAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Получить все записи
function allAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

module.exports = {
    db,
    initDatabase,
    runAsync,
    getAsync,
    allAsync
};