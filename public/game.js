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
        const userData = await userResponse.json();
        currentUser = userData;
        csrfToken = userData.csrfToken; // Обновляем CSRF токен
        
        // Обновляем отображение кристаллов
        document.getElementById('crystals-amount').textContent = userData.crystals || 0;
        
        // Загружаем деревню
        await loadVillage();
        
        // Запускаем периодическое обновление
        updateInterval = setInterval(updateGameData, 30000); // Каждые 30 секунд
        
    } catch (error) {
        console.error('Ошибка инициализации игры:', error);
        alert('Ошибка загрузки игры. Попробуйте перезагрузить страницу.');
    }
}

// Загрузить данные деревни
async function loadVillage() {
    try {
        const response = await fetch('/api/village');
        const village = await response.json();
        
        currentVillage = village;
        
        // Обновляем UI
        document.getElementById('village-name').textContent = village.name;
        updateResources(village);
        
        // Загружаем здания
        await loadBuildings();
        
    } catch (error) {
        console.error('Ошибка загрузки деревни:', error);
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
    
    // TODO: Получить кристаллы из данных пользователя
    document.getElementById('crystals-amount').textContent = '100';
}

// Загрузить здания
async function loadBuildings() {
    try {
        const response = await fetch(`/api/buildings/${currentVillage.id}`);
        const buildings = await response.json();
        
        const grid = document.getElementById('buildings-grid');
        grid.innerHTML = '';
        
        buildings.forEach(building => {
            const card = createBuildingCard(building);
            grid.appendChild(card);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки зданий:', error);
    }
}

// Создать карточку здания
function createBuildingCard(building) {
    const card = document.createElement('div');
    card.className = 'building-card';
    if (building.is_upgrading) {
        card.classList.add('upgrading');
    }
    
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
        content.innerHTML = `
            <p>Здание улучшается...</p>
            <p>Осталось времени: <span id="upgrade-timer">загрузка...</span></p>
            <button class="btn btn-primary" onclick="speedUpBuilding(${building.id})">
                Ускорить за 10 💎
            </button>
        `;
        
        // Обновляем таймер
        updateBuildingTimer(building.upgrade_finish_time);
    } else {
        const canAfford = checkResourcesForBuilding(building.nextLevelCost);
        
        content.innerHTML = `
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
    try {
        const response = await secureRequest('/api/build', {
            method: 'POST',
            body: JSON.stringify({
                villageId: currentVillage.id,
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
        const response = await fetch('/api/speed-up', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    try {
        // Загружаем войска
        const troopsResponse = await fetch(`/api/troops/${currentVillage.id}`);
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
        
        // TODO: Загрузить очередь обучения
        
    } catch (error) {
        console.error('Ошибка загрузки казарм:', error);
    }
}

// Обучить войска
async function trainTroops(troopType) {
    const amount = parseInt(document.getElementById(`train-${troopType}`).value);
    
    if (!amount || amount < 1) {
        alert('Укажите количество войск');
        return;
    }
    
    try {
        const response = await fetch('/api/train', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                villageId: currentVillage.id,
                troopType: troopType,
                amount: amount
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById(`train-${troopType}`).value = '0';
            await loadVillage();
            await loadBarracks();
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
    
    info.innerHTML = `
        <div class="village-info-details">
            <p><strong>Название:</strong> ${village.name}</p>
            <p><strong>Владелец:</strong> ${village.owner}</p>
            <p><strong>Координаты:</strong> (${village.x}, ${village.y})</p>
            <p><strong>Очки:</strong> ${village.points || 0}</p>
            <p><strong>Расстояние:</strong> ${distance.toFixed(1)} полей</p>
            ${!isOwn ? `
                <button class="btn btn-danger attack-btn" onclick="showAttackModal(${village.id})">
                    Атаковать
                </button>
            ` : ''}
        </div>
    `;
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
    try {
        const response = await fetch(`/api/troops/${currentVillage.id}`);
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
    
    try {
        const response = await fetch('/api/attack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromVillageId: currentVillage.id,
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
        
        // TODO: Проверить, состоит ли игрок в племени
        const userTribe = null;
        
        if (userTribe) {
            // Показываем информацию о племени игрока
            content.innerHTML = `
                <div class="tribe-info">
                    <h3>${userTribe.name} [${userTribe.tag}]</h3>
                    <p>Лидер: ${userTribe.leader_name}</p>
                    <p>Участников: ${userTribe.member_count}</p>
                    <p>Очки: ${userTribe.points}</p>
                </div>
                
                <h3>Чат племени</h3>
                <div class="tribe-chat">
                    <!-- TODO: Реализовать чат -->
                    <p>Чат будет доступен в следующем обновлении</p>
                </div>
            `;
        } else {
            // Показываем список племен и форму создания
            content.innerHTML = `
                <div class="tribe-actions">
                    <button class="btn btn-primary" onclick="showCreateTribeForm()">
                        Создать племя (1000 каждого ресурса)
                    </button>
                </div>
                
                <div id="create-tribe-form" class="create-tribe-form" style="display: none;">
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
                </div>
                
                <h3>Существующие племена</h3>
                <div class="tribes-list">
                    ${tribes.map(tribe => `
                        <div class="tribe-card">
                            <div class="tribe-info">
                                <h4>${tribe.name}</h4>
                                <div class="tribe-tag">[${tribe.tag}]</div>
                                <div class="tribe-stats">
                                    Лидер: ${tribe.leader_name} | 
                                    Участников: ${tribe.member_count} | 
                                    Очки: ${tribe.points}
                                </div>
                            </div>
                            <button class="btn" onclick="joinTribe(${tribe.id})">
                                Присоединиться
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
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
    modal.innerHTML = `
        <div class="modal-header">
            <h3>Оплата криптовалютой</h3>
            <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-content">
            <p><strong>Отправьте точную сумму:</strong></p>
            <p class="crypto-amount">${paymentData.amount} ${paymentData.currency}</p>
            <p><strong>На адрес:</strong></p>
            <p class="crypto-address">${escapeHtml(paymentData.address)}</p>
            <button class="btn" onclick="copyToClipboard('${escapeHtml(paymentData.address)}')">
                📋 Скопировать адрес
            </button>
            <p class="warning">⚠️ Отправляйте только ${paymentData.currency}! Другие валюты будут потеряны.</p>
            <p>После отправки платеж будет обработан автоматически в течение 10-30 минут.</p>
        </div>
    `;
    
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