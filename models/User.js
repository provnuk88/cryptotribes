const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: [true, 'Имя пользователя обязательно'],
        unique: true, 
        index: true,
        minlength: [3, 'Имя пользователя должно содержать минимум 3 символа'],
        maxlength: [20, 'Имя пользователя не может быть длиннее 20 символов'],
        match: [/^[a-zA-Z0-9_]+$/, 'Имя пользователя может содержать только буквы, цифры и подчеркивания'],
        trim: true
    },
    password: { 
        type: String, 
        required: [true, 'Пароль обязателен'],
        minlength: [6, 'Пароль должен содержать минимум 6 символов']
    },
    email: {
        type: String,
        unique: true,
        sparse: true, // Позволяет null значения
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Некорректный email адрес']
    },
    crystals: { 
        type: Number, 
        default: 250,
        min: [0, 'Количество кристаллов не может быть отрицательным']
    },
    tribe_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tribe', 
        default: null 
    },
    role: {
        type: String,
        enum: ['user', 'moderator', 'admin'],
        default: 'user'
    },
    is_active: {
        type: Boolean,
        default: true
    },
    last_login: { 
        type: Date, 
        default: Date.now 
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    },
    updated_at: { 
        type: Date, 
        default: Date.now 
    },
    // Безопасность
    login_attempts: {
        type: Number,
        default: 0
    },
    lock_until: {
        type: Date,
        default: null
    },
    reset_password_token: String,
    reset_password_expires: Date
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Индексы для оптимизации
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ tribe_id: 1 });
userSchema.index({ role: 1 });
userSchema.index({ is_active: 1 });
userSchema.index({ created_at: -1 });

// Виртуальные поля
userSchema.virtual('isLocked').get(function() {
    return !!(this.lock_until && this.lock_until > Date.now());
});

// Методы экземпляра
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hashPassword = async function() {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
    }
};

userSchema.methods.incrementLoginAttempts = function() {
    // Если аккаунт заблокирован и время блокировки истекло, сбрасываем
    if (this.lock_until && this.lock_until < Date.now()) {
        return this.updateOne({
            $unset: { lock_until: 1 },
            $set: { login_attempts: 1 }
        });
    }
    
    const updates = { $inc: { login_attempts: 1 } };
    
    // Блокируем аккаунт после 5 неудачных попыток на 2 часа
    if (this.login_attempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lock_until: Date.now() + 2 * 60 * 60 * 1000 };
    }
    
    return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { login_attempts: 1, lock_until: 1 }
    });
};

// Middleware
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    next();
});

userSchema.pre('findOneAndUpdate', async function(next) {
    const update = this.getUpdate();
    if (update.password) {
        update.password = await bcrypt.hash(update.password, 12);
    }
    next();
});

// Статические методы
userSchema.statics.findByUsername = function(username) {
    return this.findOne({ username: username.toLowerCase() });
};

userSchema.statics.findActiveUsers = function() {
    return this.find({ is_active: true });
};

// Метод для безопасного возврата данных пользователя
userSchema.methods.toSafeObject = function() {
    const user = this.toObject();
    delete user.password;
    delete user.reset_password_token;
    delete user.reset_password_expires;
    delete user.login_attempts;
    delete user.lock_until;
    return user;
};

module.exports = mongoose.model('User', userSchema);
