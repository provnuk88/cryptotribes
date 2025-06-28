# 🏰 CryptoTribes

**Браузерная стратегическая игра** в стиле Tribal Wars с интеграцией криптоплатежей.

## 📋 Содержание

- [Описание](#описание)
- [Возможности](#возможности)
- [Технологии](#технологии)
- [Установка](#установка)
- [Конфигурация](#конфигурация)
- [Запуск](#запуск)
- [API Документация](#api-документация)
- [Архитектура](#архитектура)
- [Безопасность](#безопасность)
- [Тестирование](#тестирование)
- [Развертывание](#развертывание)
- [Вклад в проект](#вклад-в-проект)
- [Лицензия](#лицензия)

## 🎮 Описание

CryptoTribes — это современная браузерная стратегическая игра, где игроки строят деревни, развивают экономику, тренируют войска и сражаются с другими игроками. Особенность игры — интеграция с криптоплатежами для покупки внутриигровой валюты.

### Основные механики:
- **Строительство зданий** — улучшение инфраструктуры деревни
- **Управление ресурсами** — добыча дерева, глины, железа и еды
- **Тренировка войск** — создание армии для защиты и атак
- **Боевая система** — тактические сражения между игроками
- **Племена** — объединение игроков в альянсы
- **Криптоплатежи** — покупка кристаллов через Stripe и криптовалюты

## ✨ Возможности

### 🏗️ Игровые механики
- [x] Система зданий с улучшениями
- [x] Производство ресурсов
- [x] Тренировка войск
- [x] Боевая система
- [x] Карта мира
- [x] Варварские деревни
- [x] Система племен

### 💳 Платежи
- [x] Stripe интеграция
- [x] Криптоплатежи (USDT, BTC, ETH)
- [x] Промокоды
- [x] История транзакций
- [x] Лимиты платежей

### 🔒 Безопасность
- [x] Аутентификация с сессиями
- [x] CSRF защита
- [x] Rate limiting
- [x] Защита от brute force
- [x] Валидация данных
- [x] XSS защита
- [x] NoSQL инъекции защита

### 📊 Мониторинг
- [x] Структурированное логирование
- [x] Метрики производительности
- [x] Health checks
- [x] Мониторинг запросов
- [x] Отслеживание медленных запросов

## 🛠️ Технологии

### Backend
- **Node.js** — среда выполнения
- **Express.js** — веб-фреймворк
- **MongoDB** — база данных
- **Mongoose** — ODM для MongoDB
- **Winston** — логирование
- **Jest** — тестирование

### Безопасность
- **bcryptjs** — хеширование паролей
- **express-session** — управление сессиями
- **helmet** — защита заголовков
- **express-rate-limit** — ограничение запросов
- **express-validator** — валидация данных

### Платежи
- **Stripe** — карточные платежи
- **Crypto API** — криптоплатежи

### Frontend
- **Vanilla JavaScript** — клиентская логика
- **HTML5/CSS3** — интерфейс
- **Responsive Design** — адаптивность

## 🚀 Установка

### Предварительные требования
- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB >= 4.4

### Клонирование и установка
```bash
# Клонируем репозиторий
git clone https://github.com/your-username/cryptotribes.git
cd cryptotribes

# Устанавливаем зависимости
npm install

# Создаем файл конфигурации
cp .env.example .env
```

## ⚙️ Конфигурация

### Переменные окружения (.env)
```env
# Основные настройки
NODE_ENV=development
PORT=3000
HOST=localhost

# База данных
MONGODB_URI=mongodb://localhost:27017/cryptotribes
MONGODB_TEST_URI=mongodb://localhost:27017/cryptotribes_test

# Сессии
SESSION_SECRET=your-super-secret-session-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Криптоплатежи
CRYPTO_API_KEY=your-crypto-api-key
CRYPTO_API_URL=https://api.crypto.com

# Логирование
LOG_LEVEL=info

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Конфигурация для продакшена
```env
NODE_ENV=production
SESSION_SECRET=very-long-random-secret-key
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/cryptotribes
STRIPE_SECRET_KEY=sk_live_...
CORS_ORIGIN=https://yourdomain.com
```

## 🏃‍♂️ Запуск

### Разработка
```bash
# Запуск в режиме разработки с автоперезагрузкой
npm run dev

# Или обычный запуск
npm start
```

### Тестирование
```bash
# Запуск всех тестов
npm test

# Тесты в режиме watch
npm run test:watch

# Тесты производительности
npm run test:performance

# Проверка покрытия кода
npm run test -- --coverage
```

### Линтинг
```bash
# Проверка кода
npm run lint

# Автоисправление
npm run lint:fix
```

### Аудит безопасности
```bash
npm run security-audit
```

## 📚 API Документация

### Аутентификация

#### Регистрация
```http
POST /api/register
Content-Type: application/json

{
  "username": "player1",
  "password": "securepass123",
  "email": "player@example.com"
}
```

#### Вход
```http
POST /api/login
Content-Type: application/json

{
  "username": "player1",
  "password": "securepass123"
}
```

### Игровые данные

#### Получение деревни
```http
GET /api/village
Authorization: Session required
```

#### Строительство
```http
POST /api/build
Content-Type: application/json
X-CSRF-Token: <token>

{
  "villageId": "village_id",
  "buildingType": "farm"
}
```

#### Тренировка войск
```http
POST /api/train
Content-Type: application/json
X-CSRF-Token: <token>

{
  "villageId": "village_id",
  "troopType": "spearman",
  "amount": 10
}
```

### Платежи

#### Создание платежа
```http
POST /api/shop/create-payment
Content-Type: application/json
X-CSRF-Token: <token>

{
  "packageId": "crystal_100",
  "method": "card",
  "currency": "USD"
}
```

## 🏗️ Архитектура

### Структура проекта
```
cryptotribes/
├── config/                 # Конфигурация
│   └── config.js
├── models/                 # Mongoose модели
│   ├── User.js
│   ├── Village.js
│   ├── Building.js
│   └── ...
├── server/                 # Серверная логика
│   ├── controllers/        # Контроллеры
│   ├── middlewares/        # Middleware
│   ├── routes/            # Маршруты
│   ├── services/          # Бизнес-логика
│   ├── utils/             # Утилиты
│   ├── gameLogic.js       # Игровая логика
│   ├── payments.js        # Платежи
│   └── server.js          # Основной сервер
├── public/                # Статические файлы
│   ├── game.js
│   ├── style.css
│   └── index.html
├── tests/                 # Тесты
├── logs/                  # Логи
└── coverage/              # Покрытие тестами
```

### Принципы архитектуры
- **Модульность** — разделение на логические модули
- **Сервисный слой** — бизнес-логика в сервисах
- **Middleware** — переиспользуемые компоненты
- **Валидация** — проверка данных на всех уровнях
- **Логирование** — детальное отслеживание событий
- **Безопасность** — защита на всех уровнях

## 🔒 Безопасность

### Реализованные меры
- **Аутентификация** — сессии с MongoDB
- **Авторизация** — ролевая система
- **Валидация** — проверка всех входных данных
- **Rate Limiting** — защита от DDoS
- **CSRF** — защита от межсайтовых запросов
- **XSS** — защита от скриптов
- **NoSQL Injection** — защита от инъекций
- **Brute Force** — защита от перебора паролей

### Рекомендации по безопасности
1. Всегда используйте HTTPS в продакшене
2. Регулярно обновляйте зависимости
3. Мониторьте логи на подозрительную активность
4. Используйте сильные пароли
5. Ограничивайте доступ к админ-панели

## 🧪 Тестирование

### Типы тестов
- **Unit тесты** — тестирование отдельных функций
- **Integration тесты** — тестирование API
- **Performance тесты** — тестирование производительности

### Запуск тестов
```bash
# Все тесты
npm test

# Конкретный тест
npm test -- --testNamePattern="User registration"

# С покрытием
npm test -- --coverage --collectCoverageFrom="server/**/*.js"
```

### Покрытие кода
- Цель: >80% покрытия
- Исключения: конфигурационные файлы, логика платежей

## 🚀 Развертывание

### Docker (рекомендуется)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### PM2
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Nginx конфигурация
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🤝 Вклад в проект

### Как внести вклад
1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Добавьте тесты
5. Убедитесь, что все тесты проходят
6. Создайте Pull Request

### Стандарты кода
- Используйте ESLint конфигурацию
- Следуйте принципам Clean Code
- Добавляйте JSDoc комментарии
- Пишите тесты для новой функциональности

### Структура коммитов
```
feat: добавлена новая функция
fix: исправлена ошибка
docs: обновлена документация
style: форматирование кода
refactor: рефакторинг
test: добавлены тесты
chore: обновление зависимостей
```

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 📞 Поддержка

- **Issues**: [GitHub Issues](https://github.com/your-username/cryptotribes/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/cryptotribes/discussions)
- **Email**: support@cryptotribes.com

## 🙏 Благодарности

- Вдохновение: Tribal Wars
- Иконки: [Feather Icons](https://feathericons.com/)
- Шрифты: [Google Fonts](https://fonts.google.com/)

---

**Сделано с ❤️ для игрового сообщества** 