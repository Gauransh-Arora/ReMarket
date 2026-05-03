const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const redis = require('../utils/redis');
const pool = require('../../db');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFRESH_TOKEN_EXPIRY_SECONDS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;

const generateJti = () => crypto.randomUUID();

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const generateAccessToken = (user) => {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    jti: generateJti(),
  };

  const privateKey = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');

  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  });
};

const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await pool.query(
    'UPDATE public.users SET refresh_token_hash = $1 WHERE id = $2',
    [tokenHash, userId]
  );

  return token;
};

const verifyRefreshToken = async (token) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const result = await pool.query(
    'SELECT id FROM public.users WHERE refresh_token_hash = $1',
    [tokenHash]
  );
  
  const user = result.rows[0];
  return user ? user.id : null;
};

const revokeRefreshToken = async (userId) => {
  await pool.query(
    'UPDATE public.users SET refresh_token_hash = NULL WHERE id = $1',
    [userId]
  );
};

const denylistJti = async (jti, exp) => {
  const now = Math.floor(Date.now() / 1000);
  const ttl = exp - now;
  if (ttl > 0) {
    await redis.set(`denylist:${jti}`, '1', 'EX', ttl);
  }
};

const isJtiDenylisted = async (jti) => {
  const result = await redis.get(`denylist:${jti}`);
  return !!result;
};

module.exports = {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  denylistJti,
  isJtiDenylisted,
};
