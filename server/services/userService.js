/**
 * Сервис для работы с пользователями
 * Содержит всю бизнес-логику, связанную с пользователями
 */

const User = require('../../models/User');
const Village = require('../../models/Village');
const { logger, gameLogger } = require('../logger');
const { AppError } = require('../middlewares/errorHandler');
// const config = require('../../config/config'); // TODO: раскомментировать когда создадим config
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class UserService {
    /**
     * Регистрация нового пользователя
     */
    async registerUser(userData) {
        try {
            const { username, password, email } = userData;

            // Проверяем существование пользователя
            const existingUser = await User.findOne({
                $or: [
                    { username: username.toLowerCase() },
                    ...(email ? [{ email: email.toLowerCase() }] : [])
                ]
            });

            if (existingUser) {
                throw new AppError(
                    'Пользователь с таким именем или email уже существует',
                    409,
                    'USER_EXISTS'
                );
            }

            // Создаем пользователя
            const user = new User({
                username: username.toLowerCase(),
                password,
                email: email ? email.toLowerCase() : undefined
            });

            await user.save();

            // Логируем регистрацию
            gameLogger.userRegistered(username, user._id.toString());

            return {
                userId: user._id.toString(),
                username: user.username,
                email: user.email,
                crystals: user.crystals,
                role: user.role
            };
        } catch (error) {
            logger.error('User registration error', { error: error.message });
            throw error;
        }
    }

    /**
     * Аутентификация пользователя
     */
    async authenticateUser(credentials) {
        try {
            const { username, password } = credentials;

            // Находим пользователя
            const user = await User.findOne({ username: username.toLowerCase() });
            if (!user) {
                throw new AppError('Неверный логин или пароль', 401, 'INVALID_CREDENTIALS');
            }

            // Проверяем блокировку
            if (user.isLocked) {
                throw new AppError(
                    `Аккаунт заблокирован до ${user.lock_until.toLocaleString()}`,
                    423,
                    'ACCOUNT_LOCKED'
                );
            }

            // Проверяем пароль
            const isValidPassword = await user.comparePassword(password);
            if (!isValidPassword) {
                // Увеличиваем счетчик неудачных попыток
                await user.incrementLoginAttempts();
                throw new AppError('Неверный логин или пароль', 401, 'INVALID_CREDENTIALS');
            }

            // Сбрасываем счетчик неудачных попыток
            await user.resetLoginAttempts();

            // Обновляем время последнего входа
            user.last_login = new Date();
            await user.save();

            // Логируем вход
            gameLogger.userLogin(user.username, user._id.toString());

            return {
                userId: user._id.toString(),
                username: user.username,
                email: user.email,
                crystals: user.crystals,
                role: user.role,
                lastLogin: user.last_login
            };
        } catch (error) {
            logger.error('User authentication error', { error: error.message });
            throw error;
        }
    }

    /**
     * Получение профиля пользователя
     */
    async getUserProfile(userId) {
        try {
            const user = await User.findById(userId)
                .select('-password -reset_password_token -reset_password_expires -login_attempts -lock_until')
                .lean();

            if (!user) {
                throw new AppError('Пользователь не найден', 404, 'USER_NOT_FOUND');
            }

            // Получаем статистику пользователя
            const stats = await this.getUserStats(userId);

            return {
                ...user,
                stats
            };
        } catch (error) {
            logger.error('Get user profile error', { error: error.message });
            throw error;
        }
    }

    /**
     * Обновление профиля пользователя
     */
    async updateUserProfile(userId, updateData) {
        try {
            const allowedFields = ['username', 'email'];
            const filteredData = {};

            // Фильтруем разрешенные поля
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    filteredData[field] = updateData[field];
                }
            }

            if (Object.keys(filteredData).length === 0) {
                throw new AppError('Нет данных для обновления', 400, 'NO_UPDATE_DATA');
            }

            // Проверяем уникальность
            if (filteredData.username || filteredData.email) {
                const query = {};
                if (filteredData.username) query.username = filteredData.username.toLowerCase();
                if (filteredData.email) query.email = filteredData.email.toLowerCase();

                const existingUser = await User.findOne({
                    ...query,
                    _id: { $ne: userId }
                });

                if (existingUser) {
                    throw new AppError('Пользователь с такими данными уже существует', 409, 'USER_EXISTS');
                }
            }

            const user = await User.findByIdAndUpdate(
                userId,
                { ...filteredData, updated_at: new Date() },
                { new: true, runValidators: true }
            ).select('-password');

            if (!user) {
                throw new AppError('Пользователь не найден', 404, 'USER_NOT_FOUND');
            }

            logger.info('User profile updated', { userId, updatedFields: Object.keys(filteredData) });

            return user;
        } catch (error) {
            logger.error('Update user profile error', { error: error.message });
            throw error;
        }
    }

    /**
     * Изменение пароля
     */
    async changePassword(userId, passwordData) {
        try {
            const { currentPassword, newPassword } = passwordData;

            const user = await User.findById(userId);
            if (!user) {
                throw new AppError('Пользователь не найден', 404, 'USER_NOT_FOUND');
            }

            // Проверяем текущий пароль
            const isValidPassword = await user.comparePassword(currentPassword);
            if (!isValidPassword) {
                throw new AppError('Неверный текущий пароль', 400, 'INVALID_CURRENT_PASSWORD');
            }

            // Обновляем пароль
            user.password = newPassword;
            await user.save();

            logger.info('User password changed', { userId });

            return { success: true };
        } catch (error) {
            logger.error('Change password error', { error: error.message });
            throw error;
        }
    }

    /**
     * Сброс пароля
     */
    async resetPassword(email) {
        try {
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                // Не раскрываем информацию о существовании email
                return { success: true, message: 'Если email существует, инструкции отправлены' };
            }

            // Генерируем токен для сброса
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 час

            user.reset_password_token = resetToken;
            user.reset_password_expires = resetExpires;
            await user.save();

            // Здесь должна быть отправка email
            logger.info('Password reset token generated', { userId: user._id, email });

            return { success: true, message: 'Если email существует, инструкции отправлены' };
        } catch (error) {
            logger.error('Reset password error', { error: error.message });
            throw error;
        }
    }

    /**
     * Подтверждение сброса пароля
     */
    async confirmPasswordReset(token, newPassword) {
        try {
            const user = await User.findOne({
                reset_password_token: token,
                reset_password_expires: { $gt: Date.now() }
            });

            if (!user) {
                throw new AppError('Недействительный или истекший токен', 400, 'INVALID_RESET_TOKEN');
            }

            // Обновляем пароль
            user.password = newPassword;
            user.reset_password_token = undefined;
            user.reset_password_expires = undefined;
            await user.save();

            logger.info('Password reset confirmed', { userId: user._id });

            return { success: true };
        } catch (error) {
            logger.error('Confirm password reset error', { error: error.message });
            throw error;
        }
    }

    /**
     * Получение статистики пользователя
     */
    async getUserStats(userId) {
        try {
            const [villageCount, totalPoints, lastActivity] = await Promise.all([
                Village.countDocuments({ user_id: userId }),
                Village.aggregate([
                    { $match: { user_id: new require('mongoose').Types.ObjectId(userId) } },
                    { $group: { _id: null, total: { $sum: '$points' } } }
                ]),
                Village.findOne({ user_id: userId })
                    .sort({ last_update: -1 })
                    .select('last_update')
                    .lean()
            ]);

            return {
                villages: villageCount,
                totalPoints: totalPoints[0]?.total || 0,
                lastActivity: lastActivity?.last_update || null
            };
        } catch (error) {
            logger.error('Get user stats error', { error: error.message });
            return {
                villages: 0,
                totalPoints: 0,
                lastActivity: null
            };
        }
    }

    /**
     * Управление кристаллами
     */
    async updateCrystals(userId, amount, reason = 'manual') {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new AppError('Пользователь не найден', 404, 'USER_NOT_FOUND');
            }

            const newAmount = user.crystals + amount;
            if (newAmount < 0) {
                throw new AppError('Недостаточно кристаллов', 400, 'INSUFFICIENT_CRYSTALS');
            }

            user.crystals = newAmount;
            await user.save();

            logger.info('Crystals updated', { 
                userId, 
                amount, 
                newAmount, 
                reason 
            });

            return { crystals: user.crystals };
        } catch (error) {
            logger.error('Update crystals error', { error: error.message });
            throw error;
        }
    }

    /**
     * Блокировка/разблокировка пользователя
     */
    async toggleUserStatus(userId, isActive, reason = '') {
        try {
            const user = await User.findByIdAndUpdate(
                userId,
                { 
                    is_active: isActive,
                    ...(isActive ? {} : { lock_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }) // 1 год
                },
                { new: true }
            );

            if (!user) {
                throw new AppError('Пользователь не найден', 404, 'USER_NOT_FOUND');
            }

            logger.info('User status toggled', { 
                userId, 
                isActive, 
                reason,
                admin: 'system'
            });

            return user;
        } catch (error) {
            logger.error('Toggle user status error', { error: error.message });
            throw error;
        }
    }

    /**
     * Поиск пользователей (для админов)
     */
    async searchUsers(query, page = 1, limit = 20) {
        try {
            const skip = (page - 1) * limit;
            const searchQuery = {};

            if (query.username) {
                searchQuery.username = { $regex: query.username, $options: 'i' };
            }
            if (query.email) {
                searchQuery.email = { $regex: query.email, $options: 'i' };
            }
            if (query.role) {
                searchQuery.role = query.role;
            }
            if (query.isActive !== undefined) {
                searchQuery.is_active = query.isActive;
            }

            const [users, total] = await Promise.all([
                User.find(searchQuery)
                    .select('-password -reset_password_token -reset_password_expires')
                    .sort({ created_at: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                User.countDocuments(searchQuery)
            ]);

            return {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Search users error', { error: error.message });
            throw error;
        }
    }
}

module.exports = new UserService(); 