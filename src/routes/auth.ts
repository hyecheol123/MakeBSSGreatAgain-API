/**
 * express Router middleware for Auth APIs
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as express from 'express';
import * as redis from 'redis';
import * as mariadb from 'mariadb';
import ServerConfig from '../ServerConfig';
import {validateLoginCredentials} from '../functions/inputValidator/validateLoginCredentials';
import usernameRule from '../functions/inputValidator/usernameRule';
import passwordRule from '../functions/inputValidator/passwordRule';
import BadRequestError from '../exceptions/BadRequestError';
import AuthenticationError from '../exceptions/AuthenticationError';
import LoginCredentials from '../datatypes/authentication/LoginCredentials';
import User from '../datatypes/user/User';
import accessTokenCreate from '../functions/JWT/accessTokenCreate';
import refreshTokenCreate from '../functions/JWT/refreshTokenCreate';
import refreshTokenVerify from '../functions/JWT/refreshTokenVerify';
import redisDel from '../functions/asyncRedis/redisDel';
import HTTPError from '../exceptions/HTTPError';

// Path: /auth
const authRouter = express.Router();

// POST: /auth/login
authRouter.post('/login', async (req, res, next) => {
  const dbClient: mariadb.Pool = req.app.locals.dbClient;
  const redisClient: redis.RedisClient = req.app.locals.redisClient;

  try {
    // Verify Input
    const loginCredentials: LoginCredentials = req.body;
    if (!validateLoginCredentials(loginCredentials)) {
      throw new BadRequestError();
    }
    // Username & Password rule Check
    if (!usernameRule(loginCredentials.username)) {
      throw new AuthenticationError();
    }
    if (!passwordRule(loginCredentials.username, loginCredentials.password)) {
      throw new AuthenticationError();
    }

    // Retrieve User Information from DB
    let user;
    try {
      user = await User.read(dbClient, loginCredentials.username);
      if (user.status === 'suspended') {
        throw new HTTPError(400, 'Suspended User');
      }
      if (user.status === 'deleted') {
        throw new AuthenticationError();
      }
    } catch (e) {
      /* istanbul ignore else */
      if (e.statusCode === 404) {
        throw new AuthenticationError();
      } else {
        throw e;
      }
    }

    // Check Password
    const hashedPassword = ServerConfig.hash(
      user.username,
      user.memberSince.toISOString(),
      loginCredentials.password
    );
    if (hashedPassword !== user.password) {
      throw new AuthenticationError();
    }

    // Create Tokens
    const accessToken = accessTokenCreate(
      user.username,
      user.status,
      user.admin,
      req.app.get('jwtAccessKey')
    );
    const refreshToken = await refreshTokenCreate(
      user.username,
      user.status,
      user.admin,
      req.app.get('jwtRefreshKey'),
      redisClient
    );

    // Response
    const cookieOption: express.CookieOptions = {
      httpOnly: true,
      maxAge: 15 * 60,
      secure: true,
      domain: 'api.bshs.or.kr',
      path: '/',
      sameSite: 'strict',
    };
    res.cookie('X-ACCESS-TOKEN', accessToken, cookieOption);
    cookieOption.maxAge = 120 * 60;
    cookieOption.path = '/auth';
    res.cookie('X-REFRESH-TOKEN', refreshToken, cookieOption);
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

// DELETE: /auth/logout
authRouter.delete('/logout', async (req, res, next) => {
  try {
    const redisClient: redis.RedisClient = req.app.locals.redisClient;
    let refreshToken = req.cookies['X-REFRESH-TOKEN'];

    // Verify Refresh Token
    const verifyResult = await refreshTokenVerify(
      req,
      req.app.get('jwtRefreshKey'),
      redisClient
    );
    if (verifyResult.newToken !== undefined) {
      refreshToken = verifyResult.newToken;
    }

    // Remove token from redis server
    await redisDel(refreshToken, redisClient);

    // Clear Cookie & Response
    res.clearCookie('X-ACCESS-TOKEN', {httpOnly: true, maxAge: 0});
    res.clearCookie('X-REFRESH-TOKEN', {httpOnly: true, maxAge: 0});
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

export default authRouter;
