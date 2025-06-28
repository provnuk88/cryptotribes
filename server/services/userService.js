const User = require('../../models/User');
const Village = require('../../models/Village');
const bcrypt = require('bcryptjs');

exports.register = async (data, session) => {
  const { username, password } = data;
  // Проверка существования пользователя
  const existingUser = await User.findOne({ username });
  if (existingUser) throw new Error('User already exists');

  // Хеширование пароля
  const hashedPassword = await bcrypt.hash(password, 10);

  // Создание пользователя
  const user = await User.create({ username, password: hashedPassword });

  // Создание деревни
  const village = await Village.create({ user_id: user._id, name: `${username}'s Village` });

  // Сохраняем сессию
  session.userId = user._id.toString();
  session.username = username;
  session.csrfToken = require('crypto').randomBytes(32).toString('hex');

  return { success: true, userId: user._id.toString(), username, csrfToken: session.csrfToken };
};

exports.login = async (data, session) => {
  const { username, password } = data;
  const user = await User.findOne({ username });
  if (!user) throw new Error('Invalid username or password');
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new Error('Invalid username or password');
  session.userId = user._id.toString();
  session.username = user.username;
  session.csrfToken = require('crypto').randomBytes(32).toString('hex');
  user.last_login = new Date();
  await user.save();
  return { success: true, userId: user._id.toString(), username: user.username, csrfToken: session.csrfToken };
}; 