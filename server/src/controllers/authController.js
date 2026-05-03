const pool = require('../../db');
const authService = require('../services/service');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const register = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const userResult = await pool.query('SELECT id FROM public.users WHERE email = $1', [email]);
    if (userResult.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await authService.hashPassword(password);
    const userId = uuidv4();


    await pool.query(
      'INSERT INTO public.users (id, name, email, password_hash, phone) VALUES ($1, $2, $3, $4, $5)',
      [userId, name, email, hashedPassword, phone]
    );

    res.status(201).json({ message: 'User registered successfully', userId });
  } catch (error) {
    logger.error('Registration failed', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT id, email, password_hash, role, status FROM public.users WHERE email = $1',
      [email]
    );

    const user = userResult.rows[0];

    if (!user || !(await authService.comparePassword(password, user.password_hash))) {
      logger.warn(`Failed login attempt for email: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Account is not active' });
    }

    const accessToken = authService.generateAccessToken(user);
    const refreshToken = await authService.generateRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch (error) {
    logger.error('Login failed', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const refresh = async (req, res) => {
  const oldRefreshToken = req.cookies.refreshToken;

  if (!oldRefreshToken) {
    return res.status(401).json({ message: 'Refresh token missing' });
  }

  try {
    const userId = await authService.verifyRefreshToken(oldRefreshToken);
    if (!userId) {
      logger.warn('Invalid or expired refresh token attempt');
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const userResult = await pool.query(
      'SELECT id, email, role FROM public.users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    await authService.revokeRefreshToken(userId);
    const newAccessToken = authService.generateAccessToken(user);
    const newRefreshToken = await authService.generateRefreshToken(user.id);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    logger.error('Refresh token rotation failed', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const logout = async (req, res) => {
  const { sub: userId, jti, exp } = req.user;

  try {
    await authService.revokeRefreshToken(userId);
    await authService.denylistJti(jti, exp);

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout failed', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};
