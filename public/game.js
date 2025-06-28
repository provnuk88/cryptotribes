// Функция для получения ID объекта (поддерживает и id и _id)
function getObjectId(obj) {
    if (!obj) {
        console.error('Object is null or undefined');
        return null;
    }
    
    const id = obj.id || obj._id;
    if (!id) {
        console.error('Object has no id or _id field:', obj);
        return null;
    }
    
    return id;
}

// Глобальные переменные
let currentUser = null;
let currentVillage = null;
let selectedMapVillage = null;
let updateInterval = null;
let csrfToken = null; // Для защиты от CSRF атак

// === МОБИЛЬНОЕ МЕНЮ ===

// Переключение мобильного меню
function toggleMobileMenu() {
    const nav = document.querySelector('.game-nav');
    nav.classList.toggle('active');
    
    // Закрываем меню при клике на пункт
    if (nav.classList.contains('active')) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                nav.classList.remove('active');
            });
        });
    }
}

// Закрытие мобильного меню при клике вне его
document.addEventListener('click', (e) => {
    const nav = document.querySelector('.game-nav');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    if (nav.classList.contains('active') && 
        !nav.contains(e.target) && 
        !toggle.contains(e.target)) {
        nav.classList.remove('active');
    }
});

// === БЕЗОПАСНОСТЬ ===

// Функция для экранирования HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// === АВТОРИЗАЦИЯ ===

// Показать вкладку авторизации
function showAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    if (tab === 'login') {
        document.querySelector('.tab-btn:first-child').classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelector('.tab-btn:last-child').classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
    
    clearAuthError();
}

// Очистить ошибки авторизации
function clearAuthError() {
    document.getElementById('auth-error').textContent = '';
}

// Показать ошибку авторизации
function showAuthError(message) {
    document.getElementById('auth-error').textContent = message;
}

// Обработка формы входа
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            csrfToken = data.csrfToken; // Сохраняем CSRF токен
            loginSuccess(data.username);
        } else {
            showAuthError(data.error || 'Ошибка входа');
        }
    } catch (error) {
        showAuthError('Ошибка соединения с сервером');
    }
});

// Обработка формы регистрации
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            csrfToken = data.csrfToken; // Сохраняем CSRF токен
            loginSuccess(data.username);
        } else {
            showAuthError(data.error || 'Ошибка регистрации');
        }
    } catch (error) {
        showAuthError('Ошибка соединения с сервером');
    }
});

// Успешный вход
function loginSuccess(username) {
    currentUser = { username };
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('username-display').textContent = username;
    
    // Запускаем игру
    initGame();
}

// Выход
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (error) {
        console.error('Ошибка выхода:', error);
    }
    
    // Останавливаем обновления
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    // Возвращаемся на экран входа
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('auth-screen').classList.add('active');
    
    // Очищаем формы
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
    clearAuthError();
}

// === ИГРОВАЯ ЛОГИКА ===

// Вспомогательная функция для безопасных запросов
async function secureRequest(url, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };
    
    // Добавляем CSRF токен для не-GET запросов
    if (options.method && options.method !== 'GET' && csrfToken) {
        defaultHeaders['X-CSRF-Token'] = csrfToken;
    }
    
    const finalOptions = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    
    const response = await fetch(url, finalOptions);
    
    // Обновляем CSRF токен если сервер прислал новый
    const newToken = response.headers.get('X-New-CSRF-Token');
    if (newToken) {
        csrfToken = newToken;
    }
    
    return response;
}

// Инициализация игры
async function initGame() {
    try {
        // Получаем данные пользователя
        const userResponse = await fetch('/api/user');
        if (!userResponse.ok) {
            throw new Error(`HTTP ${userResponse.status}: ${userResponse.statusText}`);
        }
        
        const userData = await userResponse.json();
        
        if (!userData || !userData.userId) {
            throw new Error('Получены некорректные данные пользователя');
        }
        
        currentUser = {
            ...userData,
            userId: userData.userId,
            username: userData.username,
            crystals: userData.crystals || 0
        };
        csrfToken = userData.csrfToken;
        
        // Сразу обновляем отображение кристаллов
        document.getElementById('crystals-amount').textContent = currentUser.crystals;
        
        // Загружаем деревню
        await loadVillage();
        
        // Запускаем периодическое обновление
        updateInterval = setInterval(updateGameData, 60000); // Каждую минуту
        
    } catch (error) {
        console.error('Ошибка инициализации игры:', error);
        showNotification('Ошибка загрузки игры. Попробуйте перезагрузить страницу.');
        // Попробуем перезагрузить через 10 секунд
        setTimeout(initGame, 10000);
    }
}

// Загрузить данные деревни
async function loadVillage() {
    try {
        const response = await fetch('/api/village');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const village = await response.json();
        
        if (!village || !village.id) {
            throw new Error('Получены некорректные данные деревни');
        }
        
        currentVillage = village;
        
        // Обновляем UI
        document.getElementById('village-name').textContent = village.name;
        updateResources(village);
        
        // Загружаем здания
        await loadBuildings();
        
    } catch (error) {
        console.error('Ошибка загрузки деревни:', error);
        showNotification('Ошибка загрузки деревни');
        // Попробуем перезагрузить через 5 секунд
        setTimeout(loadVillage, 5000);
    }
}

// Обновить отображение ресурсов
function updateResources(village) {
    document.getElementById('wood-amount').textContent = Math.floor(village.wood);
    document.getElementById('clay-amount').textContent = Math.floor(village.clay);
    document.getElementById('iron-amount').textContent = Math.floor(village.iron);
    document.getElementById('food-amount').textContent = Math.floor(village.food);
    
    if (village.production) {
        document.getElementById('wood-production').textContent = `+${village.production.wood}/ч`;
        document.getElementById('clay-production').textContent = `+${village.production.clay}/ч`;
        document.getElementById('iron-production').textContent = `+${village.production.iron}/ч`;
        
        const foodProd = village.production.food;
        document.getElementById('food-production').textContent = `${foodProd >= 0 ? '+' : ''}${foodProd}/ч`;
        document.getElementById('food-production').style.color = foodProd >= 0 ? '#4caf50' : '#f44336';
    }
    
    // Обновляем кристаллы из данных пользователя, а не из деревни
    if (currentUser && currentUser.crystals !== undefined) {
        document.getElementById('crystals-amount').textContent = currentUser.crystals;
    }
}

// Загрузить здания
async function loadBuildings() {
    const villageId = getObjectId(currentVillage);
    if (!villageId) {
        console.error('Village not loaded or has no ID!');
        showNotification('Ошибка: деревня не загружена');
        return;
    }
    
    try {
        const response = await fetch(`/api/buildings/${villageId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const buildings = await response.json();
        const grid = document.getElementById('buildings-grid');
        grid.innerHTML = '';
        buildings.forEach(building => {
            const card = createBuildingCard(building);
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Ошибка загрузки зданий:', error);
        showNotification('Ошибка загрузки зданий');
    }
}

// Создать карточку здания
function createBuildingCard(building) {
    const card = document.createElement('div');
    card.className = 'building-card';
    if (building.is_upgrading) {
        card.classList.add('upgrading');
    }
    
    // Эмодзи для зданий
    const buildingEmojis = {
        main: "🏰",
        barracks: "🏯",
        farm: "🌾",
        warehouse: "🏚️",
        wall: "🧱",
        lumbercamp: "🌲",
        clay_pit: "🪨",
        iron_mine: "⛏️",
        market: "🏤",
        tribal_hall: "👑",
        // Добавьте другие типы по необходимости
    };
    const emoji = buildingEmojis[building.building_type] || "❓";
    
    let statusText = '';
    if (building.is_upgrading) {
        const finishTime = new Date(building.upgrade_finish_time);
        const remaining = Math.max(0, finishTime - new Date());
        const minutes = Math.ceil(remaining / 60000);
        statusText = `<div class="building-status">Улучшается: ${minutes} мин</div>`;
    }
    
    let productionText = '';
    if (building.production) {
        productionText = `<div class="building-production">Производство: ${building.production}/ч</div>`;
    }
    
    card.innerHTML = `
        <div class="building-header">
            <span class="building-emoji" style="font-size:2em;">${emoji}</span>
            <span class="building-name">${building.name}</span>
            <span class="building-level">Ур. ${building.level}</span>
        </div>
        ${productionText}
        ${statusText}
    `;
    
    card.onclick = () => showBuildingModal(building);
    
    return card;
}

// Показать модальное окно здания
function showBuildingModal(building) {
    const modal = document.getElementById('building-modal');
    const overlay = document.getElementById('modal-overlay');
    
    document.getElementById('building-modal-title').textContent = building.name;
    
    const content = document.getElementById('building-modal-content');
    
    if (building.is_upgrading) {
        const buildingId = building._id || building.id;
        content.innerHTML = `
            <p>Здание улучшается...</p>
            <p>Осталось времени: <span id="upgrade-timer">загрузка...</span></p>
            <button class="btn btn-primary" onclick="speedUpBuilding('${buildingId}')">
                Ускорить за 10 💎
            </button>
        `;
        
        // Обновляем таймер
        updateBuildingTimer(building.upgrade_finish_time);
    } else {
        const canAfford = checkResourcesForBuilding(building.nextLevelCost);
        
        // Получаем описание здания
        const buildingDescriptions = {
            main: 'Центр вашей деревни. Увеличивает скорость строительства других зданий и позволяет сносить постройки.',
            barracks: 'Здесь обучаются пехотные войска. Чем выше уровень, тем быстрее происходит обучение.',
            farm: 'Обеспечивает продовольствием население деревни. Каждый уровень увеличивает лимит населения на 50.',
            warehouse: 'Увеличивает вместимость ресурсов. Защищает часть ресурсов от грабежа.',
            wall: 'Защищает деревню от атак. Увеличивает защитную силу всех войск в деревне.',
            lumbercamp: 'Производит древесину. Каждый уровень увеличивает производство дерева.',
            clay_pit: 'Добывает глину. Каждый уровень увеличивает производство глины.',
            iron_mine: 'Добывает железо. Каждый уровень увеличивает производство железа.',
            market: 'Позволяет торговать ресурсами с другими игроками. Увеличивает скорость торговцев.',
            tribal_hall: 'Административный центр деревни. Ограничивает максимальный уровень других зданий.',
            smithy: 'Позволяет исследовать улучшения для войск. Увеличивает атаку и защиту ваших воинов.'
        };
        
        const description = buildingDescriptions[building.building_type] || 'Описание недоступно';
        
        content.innerHTML = `
            <div class="building-description">
                <p>${description}</p>
            </div>
            
            <div class="upgrade-info">
                <p>Текущий уровень: ${building.level}</p>
                <p>Следующий уровень: ${building.level + 1}</p>
                ${building.production ? `<p>Производство: ${building.production} → ${Math.floor(building.production * 1.2)}/ч</p>` : ''}
                <p>Время строительства: ${building.buildTime} минут</p>
            </div>
            
            <h4>Стоимость улучшения:</h4>
            <div class="cost-display">
                ${createCostDisplay(building.nextLevelCost)}
            </div>
            
            <button class="btn btn-primary" onclick="upgradeBuilding('${building.building_type}')" 
                    ${!canAfford ? 'disabled' : ''}>
                ${canAfford ? 'Улучшить' : 'Недостаточно ресурсов'}
            </button>
        `;
    }
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

// Проверить наличие ресурсов
function checkResourcesForBuilding(cost) {
    return currentVillage.wood >= cost.wood &&
           currentVillage.clay >= cost.clay &&
           currentVillage.iron >= cost.iron &&
           currentVillage.food >= cost.food;
}

// Создать отображение стоимости
function createCostDisplay(cost) {
    const resources = ['wood', 'clay', 'iron', 'food'];
    const icons = { wood: '🌳', clay: '🧱', iron: '⚔️', food: '🌾' };
    
    return resources.map(res => {
        if (cost[res] === 0) return '';
        const sufficient = currentVillage[res] >= cost[res];
        return `
            <div class="cost-item ${!sufficient ? 'insufficient' : ''}">
                <span>${icons[res]}</span>
                <span>${cost[res]}</span>
            </div>
        `;
    }).join('');
}

// Улучшить здание
async function upgradeBuilding(buildingType) {
    const villageId = getObjectId(currentVillage);
    if (!villageId) {
        alert('Ошибка: деревня не загружена');
        return;
    }
    
    try {
        const response = await secureRequest('/api/build', {
            method: 'POST',
            body: JSON.stringify({
                villageId: villageId,
                buildingType: buildingType
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            await loadVillage();
            showNotification('Строительство начато!');
        } else {
            alert(data.error || 'Ошибка строительства');
        }
    } catch (error) {
        console.error('Ошибка улучшения здания:', error);
        alert('Ошибка соединения с сервером');
    }
}

// Ускорить строительство
async function speedUpBuilding(buildingId) {
    if (!confirm('Потратить 10 кристаллов на ускорение?')) return;
    
    try {
        const response = await secureRequest('/api/speed-up', {
            method: 'POST',
            body: JSON.stringify({
                actionId: buildingId,
                type: 'building'
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            await loadVillage();
            showNotification('Строительство завершено!');
        } else {
            alert(data.error || 'Ошибка ускорения');
        }
    } catch (error) {
        console.error('Ошибка ускорения:', error);
        alert('Ошибка соединения с сервером');
    }
}

// Обновить таймер здания
function updateBuildingTimer(finishTime) {
    const timerElement = document.getElementById('upgrade-timer');
    if (!timerElement) return;
    
    const updateTimer = () => {
        const now = new Date();
        const finish = new Date(finishTime);
        const remaining = Math.max(0, finish - now);
        
        if (remaining === 0) {
            timerElement.textContent = 'Завершено!';
            setTimeout(() => {
                closeModal();
                loadVillage();
            }, 1000);
            return;
        }
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        setTimeout(updateTimer, 1000);
    };
    
    updateTimer();
}

// === НАВИГАЦИЯ ===

// Показать вкладку игры
function showGameTab(tab) {
    // Обновляем кнопки навигации
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Обновляем вкладки
    document.querySelectorAll('.game-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    // Загружаем данные вкладки
    switch (tab) {
        case 'village':
            loadVillage();
            break;
        case 'barracks':
            loadBarracks();
            break;
        case 'map':
            loadWorldMap();
            break;
        case 'tribe':
            loadTribe();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// === КАЗАРМЫ ===

// Загрузить казармы
async function loadBarracks() {
    const villageId = getObjectId(currentVillage);
    if (!villageId) {
        console.error('Village not loaded or has no ID!');
        showNotification('Ошибка: деревня не загружена');
        return;
    }
    
    try {
        // Загружаем войска
        const troopsResponse = await fetch(`/api/troops/${villageId}`);
        if (!troopsResponse.ok) {
            throw new Error(`HTTP ${troopsResponse.status}: ${troopsResponse.statusText}`);
        }
        const troops = await troopsResponse.json();
        
        // Отображаем текущие войска
        const troopsList = document.getElementById('troops-list');
        troopsList.innerHTML = '';
        
        troops.forEach(troop => {
            const card = document.createElement('div');
            card.className = 'troop-card';
            card.innerHTML = `
                <div class="troop-name">${troop.name}</div>
                <div class="troop-amount">${troop.amount}</div>
                <div class="troop-stats">
                    Атака: ${troop.stats.attack} | Защита: ${troop.stats.defense}
                </div>
            `;
            troopsList.appendChild(card);
        });
        
        // Формы для обучения
        const trainTroops = document.getElementById('train-troops');
        trainTroops.innerHTML = '';
        
        const troopTypes = [
            { type: 'spearman', name: 'Копейщик', cost: { wood: 50, clay: 30, iron: 10 }, time: 2 },
            { type: 'swordsman', name: 'Мечник', cost: { wood: 30, clay: 30, iron: 70 }, time: 3 },
            { type: 'archer', name: 'Лучник', cost: { wood: 60, clay: 30, iron: 40 }, time: 3 },
            { type: 'light_cavalry', name: 'Легкая кавалерия', cost: { wood: 125, clay: 100, iron: 250 }, time: 5 }
        ];
        
        troopTypes.forEach(troopType => {
            const form = document.createElement('div');
            form.className = 'train-form';
            form.innerHTML = `
                <h4>${troopType.name}</h4>
                <div class="train-cost">
                    🌳 ${troopType.cost.wood} 
                    🧱 ${troopType.cost.clay} 
                    ⚔️ ${troopType.cost.iron}
                </div>
                <div class="train-cost">Время: ${troopType.time} мин/шт</div>
                <div class="train-input">
                    <input type="number" id="train-${troopType.type}" min="0" value="0">
                    <button onclick="trainTroops('${troopType.type}')">Обучить</button>
                </div>
            `;
            trainTroops.appendChild(form);
        });
        
        // Загружаем очередь обучения
        await loadTrainingQueue();
        
    } catch (error) {
        console.error('Ошибка загрузки казарм:', error);
        showNotification('Ошибка загрузки казарм');
    }
}

// Загрузить очередь обучения
async function loadTrainingQueue() {
    try {
        const response = await fetch(`/api/training-queue/${currentVillage.id}`);
        if (response.ok) {
            const queue = await response.json();
            displayTrainingQueue(queue);
        }
    } catch (error) {
        console.error('Ошибка загрузки очереди обучения:', error);
    }
}

// Отобразить очередь обучения
function displayTrainingQueue(queue) {
    const queueElement = document.getElementById('training-queue');
    if (!queueElement) return;
    
    if (queue.length === 0) {
        queueElement.innerHTML = '<p>Очередь обучения пуста</p>';
        return;
    }
    
    queueElement.innerHTML = queue.map(item => {
        const finishTime = new Date(item.finishTime);
        const now = new Date();
        const timeLeft = Math.max(0, Math.floor((finishTime - now) / 1000));
        
        return `
            <div class="training-item">
                <div class="training-info">
                    <strong>${item.name}</strong> x${item.amount}
                </div>
                <div class="training-time">
                    Завершится через: <span class="timer" data-finish="${item.finishTime}">${formatTime(timeLeft)}</span>
                </div>
                <button class="btn btn-primary btn-sm" onclick="speedUpTraining('${item.id}')">
                    Ускорить за 10 💎
                </button>
            </div>
        `;
    }).join('');
    
    // Запускаем таймеры
    startTimers();
}

// Ускорить обучение
async function speedUpTraining(trainingId) {
    if (!confirm('Потратить 10 кристаллов на ускорение обучения?')) return;
    
    try {
        const response = await secureRequest('/api/speed-up', {
            method: 'POST',
            body: JSON.stringify({
                actionId: trainingId,
                type: 'training'
            })
        });
        
        if (response.ok) {
            showNotification('Обучение ускорено!', 'success');
            await loadTrainingQueue();
            await loadBarracks();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Ошибка ускорения', 'error');
        }
    } catch (error) {
        console.error('Ошибка ускорения обучения:', error);
        showNotification('Ошибка ускорения', 'error');
    }
}

// Обучить войска
async function trainTroops(troopType) {
    const amount = parseInt(document.getElementById(`train-${troopType}`).value);
    
    if (!amount || amount < 1) {
        alert('Укажите количество войск');
        return;
    }
    
    const villageId = getObjectId(currentVillage);
    if (!villageId) {
        alert('Ошибка: деревня не загружена');
        return;
    }
    
    try {
        const response = await fetch('/api/train', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                villageId: villageId,
                troopType: troopType,
                amount: amount
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById(`train-${troopType}`).value = '0';
            await loadVillage();
            await loadBarracks();
            await loadTrainingQueue();
            showNotification(`Обучение ${amount} войск начато!`);
        } else {
            alert(data.error || 'Ошибка обучения войск');
        }
    } catch (error) {
        console.error('Ошибка обучения войск:', error);
        alert('Ошибка соединения с сервером');
    }
}

// === КАРТА МИРА ===

// Загрузить карту мира
async function loadWorldMap() {
    try {
        const response = await fetch('/api/map');
        const villages = await response.json();
        
        const mapContainer = document.getElementById('world-map');
        mapContainer.innerHTML = '<div class="map-grid"></div>';
        
        const mapGrid = mapContainer.querySelector('.map-grid');
        
        // Создаем сетку 20x20
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 20; x++) {
                const cell = document.createElement('div');
                cell.className = 'map-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                // Ищем деревню в этой позиции
                const village = villages.find(v => v.x === x && v.y === y);
                
                if (village) {
                    cell.classList.add('occupied');
                    
                    if (village.owner === currentUser.username) {
                        cell.classList.add('own');
                        cell.innerHTML = '<div class="village-marker">🏰</div>';
                    } else {
                        cell.classList.add('enemy');
                        cell.innerHTML = '<div class="village-marker">🏘️</div>';
                    }
                    
                    cell.onclick = () => selectMapVillage(village);
                }
                
                mapGrid.appendChild(cell);
            }
        }
        
    } catch (error) {
        console.error('Ошибка загрузки карты:', error);
    }
}

// Выбрать деревню на карте
function selectMapVillage(village) {
    selectedMapVillage = village;
    
    const info = document.getElementById('selected-village-info');
    
    const isOwn = village.owner === currentUser.username;
    const distance = Math.sqrt(
        Math.pow(village.x - currentVillage.x, 2) + 
        Math.pow(village.y - currentVillage.y, 2)
    );
    
    // БЕЗОПАСНЫЙ способ - используем textContent и createElement
    info.innerHTML = ''; // Очищаем
    
    const details = document.createElement('div');
    details.className = 'village-info-details';
    
    // Создаем элементы безопасно
    const nameP = document.createElement('p');
    nameP.innerHTML = '<strong>Название:</strong> <span></span>';
    nameP.querySelector('span').textContent = village.name; // textContent экранирует HTML
    details.appendChild(nameP);
    
    const ownerP = document.createElement('p');
    ownerP.innerHTML = '<strong>Владелец:</strong> <span></span>';
    ownerP.querySelector('span').textContent = village.owner;
    details.appendChild(ownerP);
    
    const coordsP = document.createElement('p');
    coordsP.innerHTML = `<strong>Координаты:</strong> (${village.x}, ${village.y})`;
    details.appendChild(coordsP);
    
    const pointsP = document.createElement('p');
    pointsP.innerHTML = `<strong>Очки:</strong> ${village.points || 0}`;
    details.appendChild(pointsP);
    
    const distanceP = document.createElement('p');
    distanceP.innerHTML = `<strong>Расстояние:</strong> ${distance.toFixed(1)} полей`;
    details.appendChild(distanceP);
    
    info.appendChild(details);
    
    // Добавляем кнопку атаки если нужно
    if (!isOwn) {
        const attackBtn = document.createElement('button');
        attackBtn.className = 'btn btn-danger attack-btn';
        attackBtn.textContent = 'Атаковать';
        attackBtn.onclick = () => showAttackModal(village.id);
        info.appendChild(attackBtn);
    }
}

// Показать модальное окно атаки
function showAttackModal(targetVillageId) {
    const modal = document.getElementById('attack-modal');
    const overlay = document.getElementById('modal-overlay');
    
    const village = selectedMapVillage;
    const distance = Math.sqrt(
        Math.pow(village.x - currentVillage.x, 2) + 
        Math.pow(village.y - currentVillage.y, 2)
    );
    const travelTime = Math.max(5, Math.floor(distance * 3));
    
    document.getElementById('attack-target-name').textContent = village.name;
    document.getElementById('attack-target-owner').textContent = village.owner;
    document.getElementById('attack-distance').textContent = distance.toFixed(1);
    document.getElementById('attack-travel-time').textContent = travelTime;
    
    // Загружаем доступные войска
    loadAttackTroops();
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

// Загрузить войска для атаки
async function loadAttackTroops() {
    const villageId = getObjectId(currentVillage);
    if (!villageId) {
        console.error('Village not loaded or has no ID!');
        return;
    }
    
    try {
        const response = await fetch(`/api/troops/${villageId}`);
        const troops = await response.json();
        
        const selection = document.getElementById('attack-troops-selection');
        selection.innerHTML = '';
        
        troops.forEach(troop => {
            if (troop.amount > 0) {
                const div = document.createElement('div');
                div.className = 'train-input';
                div.innerHTML = `
                    <label>${troop.name} (доступно: ${troop.amount})</label>
                    <input type="number" id="attack-${troop.troop_type}" 
                           min="0" max="${troop.amount}" value="0">
                `;
                selection.appendChild(div);
            }
        });
        
    } catch (error) {
        console.error('Ошибка загрузки войск:', error);
    }
}

// Отправить атаку
async function sendAttack() {
    const troops = {};
    const troopTypes = ['spearman', 'swordsman', 'archer', 'light_cavalry'];
    
    let totalTroops = 0;
    troopTypes.forEach(type => {
        const input = document.getElementById(`attack-${type}`);
        if (input) {
            const amount = parseInt(input.value) || 0;
            if (amount > 0) {
                troops[type] = amount;
                totalTroops += amount;
            }
        }
    });
    
    if (totalTroops === 0) {
        alert('Выберите войска для атаки');
        return;
    }
    
    if (!confirm(`Отправить ${totalTroops} войск в атаку?`)) return;
    
    const villageId = getObjectId(currentVillage);
    if (!villageId) {
        alert('Ошибка: деревня не загружена');
        return;
    }
    
    try {
        const response = await fetch('/api/attack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromVillageId: villageId,
                toVillageId: selectedMapVillage.id,
                troops: troops
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            showNotification('Атака отправлена!');
            await loadVillage();
        } else {
            alert(data.error || 'Ошибка отправки атаки');
        }
    } catch (error) {
        console.error('Ошибка атаки:', error);
        alert('Ошибка соединения с сервером');
    }
}

// === ПЛЕМЕНА ===

// Загрузить информацию о племенах
async function loadTribe() {
    try {
        const response = await fetch('/api/tribes');
        const tribes = await response.json();
        
        const content = document.getElementById('tribe-content');
        content.innerHTML = ''; // Очищаем
        
        // TODO: Проверить, состоит ли игрок в племени
        const userTribe = null;
        
        if (userTribe) {
            // Безопасное создание контента для племени игрока
            const tribeInfo = document.createElement('div');
            tribeInfo.className = 'tribe-info';
            
            const title = document.createElement('h3');
            title.textContent = `${userTribe.name} [${userTribe.tag}]`;
            tribeInfo.appendChild(title);
            
            const leader = document.createElement('p');
            leader.textContent = `Лидер: ${userTribe.leader_name}`;
            tribeInfo.appendChild(leader);
            
            const members = document.createElement('p');
            members.textContent = `Участников: ${userTribe.member_count}`;
            tribeInfo.appendChild(members);
            
            const points = document.createElement('p');
            points.textContent = `Очки: ${userTribe.points}`;
            tribeInfo.appendChild(points);
            
            content.appendChild(tribeInfo);
            
            // Добавляем чат
            const chatTitle = document.createElement('h3');
            chatTitle.textContent = 'Чат племени';
            content.appendChild(chatTitle);
            
            const chatDiv = document.createElement('div');
            chatDiv.className = 'tribe-chat';
            chatDiv.innerHTML = '<p>Чат будет доступен в следующем обновлении</p>';
            content.appendChild(chatDiv);
            
        } else {
            // Показываем список племен и форму создания
            const actions = document.createElement('div');
            actions.className = 'tribe-actions';
            
            const createBtn = document.createElement('button');
            createBtn.className = 'btn btn-primary';
            createBtn.textContent = 'Создать племя (1000 каждого ресурса)';
            createBtn.onclick = showCreateTribeForm;
            actions.appendChild(createBtn);
            
            content.appendChild(actions);
            
            // Форма создания племени
            const createForm = document.createElement('div');
            createForm.id = 'create-tribe-form';
            createForm.className = 'create-tribe-form';
            createForm.style.display = 'none';
            createForm.innerHTML = `
                    <h3>Создать новое племя</h3>
                    <div class="form-group">
                        <label>Название племени:</label>
                        <input type="text" id="tribe-name" maxlength="30" required>
                    </div>
                    <div class="form-group">
                        <label>Тег (до 5 символов):</label>
                        <input type="text" id="tribe-tag" maxlength="5" required>
                    </div>
                    <button class="btn btn-primary" onclick="createTribe()">Создать</button>
                    <button class="btn" onclick="hideCreateTribeForm()">Отмена</button>
            `;
            content.appendChild(createForm);
            
            // Список существующих племен
            const listTitle = document.createElement('h3');
            listTitle.textContent = 'Существующие племена';
            content.appendChild(listTitle);
            
            const tribesList = document.createElement('div');
            tribesList.className = 'tribes-list';
            
            // Безопасное создание карточек племен
            tribes.forEach(tribe => {
                const card = document.createElement('div');
                card.className = 'tribe-card';
                
                const info = document.createElement('div');
                info.className = 'tribe-info';
                
                const name = document.createElement('h4');
                name.textContent = tribe.name;
                info.appendChild(name);
                
                const tag = document.createElement('div');
                tag.className = 'tribe-tag';
                tag.textContent = `[${tribe.tag}]`;
                info.appendChild(tag);
                
                const stats = document.createElement('div');
                stats.className = 'tribe-stats';
                stats.textContent = `Лидер: ${tribe.leader_name} | Участников: ${tribe.member_count} | Очки: ${tribe.points}`;
                info.appendChild(stats);
                
                card.appendChild(info);
                
                const joinBtn = document.createElement('button');
                joinBtn.className = 'btn';
                joinBtn.textContent = 'Присоединиться';
                joinBtn.onclick = () => joinTribe(tribe.id);
                card.appendChild(joinBtn);
                
                tribesList.appendChild(card);
            });
            
            content.appendChild(tribesList);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки племен:', error);
    }
}

// Показать форму создания племени
function showCreateTribeForm() {
    document.getElementById('create-tribe-form').style.display = 'block';
}

// Скрыть форму создания племени
function hideCreateTribeForm() {
    document.getElementById('create-tribe-form').style.display = 'none';
    document.getElementById('tribe-name').value = '';
    document.getElementById('tribe-tag').value = '';
}

// Создать племя
async function createTribe() {
    const name = document.getElementById('tribe-name').value.trim();
    const tag = document.getElementById('tribe-tag').value.trim().toUpperCase();
    
    if (!name || !tag) {
        alert('Заполните все поля');
        return;
    }
    
    try {
        const response = await fetch('/api/tribe/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, tag })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            hideCreateTribeForm();
            await loadTribe();
            showNotification('Племя создано!');
        } else {
            alert(data.error || 'Ошибка создания племени');
        }
    } catch (error) {
        console.error('Ошибка создания племени:', error);
        alert('Ошибка соединения с сервером');
    }
}

// Присоединиться к племени
async function joinTribe(tribeId) {
    if (!confirm('Присоединиться к этому племени?')) return;
    
    try {
        const response = await fetch('/api/tribe/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tribeId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            await loadTribe();
            showNotification('Вы присоединились к племени!');
        } else {
            alert(data.error || 'Ошибка присоединения к племени');
        }
    } catch (error) {
        console.error('Ошибка присоединения к племени:', error);
        alert('Ошибка соединения с сервером');
    }
}

// === ОТЧЕТЫ ===

// Загрузить отчеты
async function loadReports() {
    const reportsList = document.getElementById('reports-list');
    reportsList.innerHTML = '<p>Отчеты будут доступны в следующем обновлении</p>';
    
    // TODO: Реализовать загрузку отчетов
}

// === МАГАЗИН ===

// === МАГАЗИН ===

// Выбор метода оплаты
async function selectPaymentMethod() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Выберите способ оплаты</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-content">
                <button class="btn btn-primary" onclick="resolvePayment('card')">
                    💳 Банковская карта
                </button>
                <button class="btn btn-primary" onclick="resolvePayment('crypto')">
                    ₿ Криптовалюта (USDT)
                </button>
            </div>
        `;
        
        window.resolvePayment = (method) => {
            modal.remove();
            resolve(method);
        };
        
        document.body.appendChild(modal);
        document.getElementById('modal-overlay').classList.add('active');
    });
}

// Показать модальное окно крипто-платежа
function showCryptoPaymentModal(paymentData) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    
    const header = document.createElement('div');
    header.className = 'modal-header';
    
    const title = document.createElement('h3');
    title.textContent = 'Оплата криптовалютой';
    header.appendChild(title);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.textContent = '×';
    closeBtn.onclick = closeModal;
    header.appendChild(closeBtn);
    
    modal.appendChild(header);
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    
    const amountP = document.createElement('p');
    amountP.innerHTML = '<strong>Отправьте точную сумму:</strong>';
    content.appendChild(amountP);
    
    const amountValue = document.createElement('p');
    amountValue.className = 'crypto-amount';
    amountValue.textContent = `${paymentData.amount} ${paymentData.currency}`;
    content.appendChild(amountValue);
    
    const addressP = document.createElement('p');
    addressP.innerHTML = '<strong>На адрес:</strong>';
    content.appendChild(addressP);
    
    const addressValue = document.createElement('p');
    addressValue.className = 'crypto-address';
    addressValue.textContent = paymentData.address; // textContent безопасен
    content.appendChild(addressValue);
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn';
    copyBtn.textContent = '📋 Скопировать адрес';
    copyBtn.onclick = () => copyToClipboard(paymentData.address);
    content.appendChild(copyBtn);
    
    const warning = document.createElement('p');
    warning.className = 'warning';
    warning.textContent = `⚠️ Отправляйте только ${paymentData.currency}! Другие валюты будут потеряны.`;
    content.appendChild(warning);
    
    const info = document.createElement('p');
    info.textContent = 'После отправки платеж будет обработан автоматически в течение 10-30 минут.';
    content.appendChild(info);
    
    modal.appendChild(content);
    
    document.body.appendChild(modal);
    document.getElementById('modal-overlay').classList.add('active');
}

// Копировать в буфер обмена
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Скопировано в буфер обмена!');
    }).catch(() => {
        // Fallback для старых браузеров
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showNotification('Скопировано!');
    });
}

// Купить кристаллы
async function buyCrystals(packageId) {
    // Для старой функции используем ID пакета
    if (typeof packageId === 'number') {
        const packages = {
            100: 'starter',
            500: 'popular', 
            1200: 'best'
        };
        packageId = packages[packageId] || 'starter';
    }
    
    const method = await selectPaymentMethod();
    if (!method) return;
    
    try {
        const response = await secureRequest('/api/shop/create-payment', {
            method: 'POST',
            body: JSON.stringify({ packageId, method })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (method === 'card') {
                // Редирект на Stripe Checkout
                window.location.href = data.checkoutUrl;
            } else if (method === 'crypto') {
                // Показываем адрес для оплаты
                showCryptoPaymentModal(data);
            }
        } else {
            alert(data.error || 'Ошибка создания платежа');
        }
    } catch (error) {
        console.error('Ошибка платежа:', error);
        alert('Ошибка соединения с сервером');
    }
}

// Обработка успешного платежа
function handlePaymentSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
        showNotification('Платеж успешно обработан! Кристаллы добавлены на ваш счет.');
        // Убираем параметр из URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Обновляем данные
        initGame();
    }
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

// Закрыть модальное окно
function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
    document.getElementById('modal-overlay').classList.remove('active');
}

// Показать уведомление
function showNotification(message) {
    // Простое уведомление через alert
    // В будущем можно заменить на красивые toast-уведомления
    alert(message);
}

// Периодическое обновление данных
async function updateGameData() {
    try {
        // Обновляем данные пользователя (включая кристаллы)
        const userResponse = await fetch('/api/user');
        if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData && userData.crystals !== undefined) {
                currentUser.crystals = userData.crystals;
                document.getElementById('crystals-amount').textContent = currentUser.crystals;
            }
        }
        
        // Обновляем деревню
        await loadVillage();
        
        // Обновляем текущую вкладку
        const activeTab = document.querySelector('.game-tab.active');
        if (activeTab) {
            const tabId = activeTab.id.replace('-tab', '');
            if (tabId === 'barracks') {
                await loadBarracks();
            }
        }
    } catch (error) {
        console.error('Ошибка обновления данных:', error);
        // Не показываем уведомление при ошибке автообновления, чтобы не спамить пользователя
    }
}

// Форматирование времени
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}ч ${minutes}м`;
    } else if (minutes > 0) {
        return `${minutes}м ${secs}с`;
    } else {
        return `${secs}с`;
    }
}

// Запустить таймеры
function startTimers() {
    const timers = document.querySelectorAll('.timer');
    
    timers.forEach(timer => {
        const finishTime = new Date(timer.dataset.finish);
        
        const updateTimer = () => {
            const now = new Date();
            const remaining = Math.max(0, Math.floor((finishTime - now) / 1000));
            
            if (remaining === 0) {
                timer.textContent = 'Завершено!';
                if (timer.parentElement) {
                    timer.parentElement.style.color = '#4caf50';
                }
                return;
            }
            
            timer.textContent = formatTime(remaining);
            setTimeout(updateTimer, 1000);
        };
        
        updateTimer();
    });
}

// === ИНИЦИАЛИЗАЦИЯ ===

// При загрузке страницы проверяем авторизацию
window.addEventListener('DOMContentLoaded', async () => {
    // Проверяем успешный платеж
    handlePaymentSuccess();
    
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const userData = await response.json();
            csrfToken = userData.csrfToken;
            loginSuccess(userData.username);
        }
    } catch (error) {
        console.log('Пользователь не авторизован');
    }
});

// Предотвращаем случайное закрытие страницы во время игры
window.addEventListener('beforeunload', (e) => {
    if (currentUser && currentVillage) {
        e.preventDefault();
        e.returnValue = '';
    }
});