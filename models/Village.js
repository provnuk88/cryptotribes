const mongoose = require('mongoose');

const villageSchema = new mongoose.Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: [true, 'ID пользователя обязателен'], 
        index: true 
    },
    name: { 
        type: String, 
        required: [true, 'Название деревни обязательно'],
        minlength: [2, 'Название должно содержать минимум 2 символа'],
        maxlength: [30, 'Название не может быть длиннее 30 символов'],
        trim: true
    },
    x: { 
        type: Number, 
        required: [true, 'Координата X обязательна'],
        min: [0, 'Координата X не может быть отрицательной'],
        max: [999, 'Координата X не может быть больше 999']
    },
    y: { 
        type: Number, 
        required: [true, 'Координата Y обязательна'],
        min: [0, 'Координата Y не может быть отрицательной'],
        max: [999, 'Координата Y не может быть больше 999']
    },
    // Ресурсы
    wood: { 
        type: Number, 
        default: 1000,
        min: [0, 'Количество дерева не может быть отрицательным']
    },
    clay: { 
        type: Number, 
        default: 1000,
        min: [0, 'Количество глины не может быть отрицательным']
    },
    iron: { 
        type: Number, 
        default: 1000,
        min: [0, 'Количество железа не может быть отрицательным']
    },
    food: { 
        type: Number, 
        default: 1000,
        min: [0, 'Количество еды не может быть отрицательным']
    },
    // Метаданные
    last_update: { 
        type: Date, 
        default: Date.now,
        index: true
    },
    points: { 
        type: Number, 
        default: 0,
        min: [0, 'Очки не могут быть отрицательными']
    },
    // Дополнительные поля
    population: {
        type: Number,
        default: 0,
        min: [0, 'Население не может быть отрицательным']
    },
    max_population: {
        type: Number,
        default: 100,
        min: [0, 'Максимальное население не может быть отрицательным']
    },
    is_barbarian: {
        type: Boolean,
        default: false
    },
    is_capital: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Составной уникальный индекс для координат
villageSchema.index({ x: 1, y: 1 }, { unique: true });

// Дополнительные индексы для оптимизации
villageSchema.index({ user_id: 1, created_at: -1 });
villageSchema.index({ is_barbarian: 1 });
villageSchema.index({ points: -1 });
villageSchema.index({ last_update: -1 });

// Виртуальные поля
villageSchema.virtual('coordinates').get(function() {
    return `${this.x}|${this.y}`;
});

villageSchema.virtual('totalResources').get(function() {
    return this.wood + this.clay + this.iron + this.food;
});

villageSchema.virtual('isActive').get(function() {
    const now = new Date();
    const lastUpdate = new Date(this.last_update);
    return (now - lastUpdate) < 24 * 60 * 60 * 1000; // Активна если обновлялась в последние 24 часа
});

// Методы экземпляра
villageSchema.methods.addResources = function(resources) {
    this.wood = Math.max(0, this.wood + (resources.wood || 0));
    this.clay = Math.max(0, this.clay + (resources.clay || 0));
    this.iron = Math.max(0, this.iron + (resources.iron || 0));
    this.food = Math.max(0, this.food + (resources.food || 0));
    this.last_update = new Date();
    return this;
};

villageSchema.methods.removeResources = function(resources) {
    this.wood = Math.max(0, this.wood - (resources.wood || 0));
    this.clay = Math.max(0, this.clay - (resources.clay || 0));
    this.iron = Math.max(0, this.iron - (resources.iron || 0));
    this.food = Math.max(0, this.food - (resources.food || 0));
    this.last_update = new Date();
    return this;
};

villageSchema.methods.hasEnoughResources = function(resources) {
    return this.wood >= (resources.wood || 0) &&
           this.clay >= (resources.clay || 0) &&
           this.iron >= (resources.iron || 0) &&
           this.food >= (resources.food || 0);
};

villageSchema.methods.calculateDistance = function(otherVillage) {
    const dx = this.x - otherVillage.x;
    const dy = this.y - otherVillage.y;
    return Math.sqrt(dx * dx + dy * dy);
};

villageSchema.methods.updatePoints = function() {
    // Расчет очков на основе зданий и войск
    // Это будет реализовано в gameLogic
    return this;
};

// Статические методы
villageSchema.statics.findByCoordinates = function(x, y) {
    return this.findOne({ x, y });
};

villageSchema.statics.findByUser = function(userId) {
    return this.find({ user_id: userId }).sort({ created_at: -1 });
};

villageSchema.statics.findBarbarianVillages = function() {
    return this.find({ is_barbarian: true });
};

villageSchema.statics.findActiveVillages = function() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 часа назад
    return this.find({ last_update: { $gte: cutoff } });
};

// Middleware
villageSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

villageSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updated_at: new Date() });
    next();
});

// Метод для безопасного возврата данных деревни
villageSchema.methods.toPublicObject = function() {
    const village = this.toObject();
    // Убираем чувствительные данные для публичного API
    delete village.user_id;
    return village;
};

module.exports = mongoose.model('Village', villageSchema);
