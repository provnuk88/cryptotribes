const userService = require('../services/userService');

exports.register = async (req, res, next) => {
  try {
    const result = await userService.register(req.body, req.session);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const result = await userService.login(req.body, req.session);
    res.json(result);
  } catch (err) {
    next(err);
  }
}; 