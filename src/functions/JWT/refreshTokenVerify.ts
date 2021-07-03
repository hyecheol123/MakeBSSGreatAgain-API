/**
 * Verifying Refresh Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang
 */

import {Request} from 'express';
import * as jwt from 'jsonwebtoken';
import * as redis from 'redis';
import AuthToken from '../../datatypes/AuthToken';
import JWTObject from '../../datatypes/JWTObject';
import RefreshTokenVerifyResult from '../../datatypes/RefreshTokenVerifyResult';
import AuthenticationError from '../../exceptions/AuthenticationError';
import refreshTokenCreate from './refreshTokenCreate';

/**
 * Method to verify refreshToken
 *
 * @param req Express Request object
 * @param redisClient redis client
 * @return RefreshTokenVerifyResult verification result of refresh token
 *   (new token included if the refresh token is about to expire)
 */
export default function refreshTokenVerify(
  req: Request,
  redisClient: redis.RedisClient
): RefreshTokenVerifyResult {
  if (!('X-REFRESH-TOKEN' in req.cookies)) {
    throw new AuthenticationError();
  }
  let tokenContents: JWTObject; // place to store contents of JWT
  // Verify and retrieve the token contents
  try {
    tokenContents = jwt.verify(
      req.cookies['X-REFRESH-TOKEN'],
      process.env['jwtRefreshKey'] as string,
      {algorithms: ['HS512']}
    ) as JWTObject;
  } catch (e) {
    throw new AuthenticationError();
  }
  if (tokenContents.type !== 'refresh') {
    throw new AuthenticationError();
  }

  // Check token in Redis Server
  redisClient.get(
    `${tokenContents.username}_${req.cookies['X-REFRESH-TOKEN']}`,
    (err, reply) => {
      if (err) throw err;
      if (reply === null) {
        throw new AuthenticationError();
      }
    }
  );

  // If RefreshToken expires within 20min, create new refresh token
  const expectedExpire = new Date();
  expectedExpire.setMinutes(new Date().getMinutes() + 20);
  let newRefreshToken;
  if (new Date((tokenContents.exp as number) * 1000) < expectedExpire) {
    // Less than 20 min remaining
    newRefreshToken = refreshTokenCreate(
      tokenContents.username,
      tokenContents.status,
      tokenContents.admin,
      redisClient
    );
  }

  delete tokenContents.iat;
  delete tokenContents.exp;
  return {content: tokenContents as AuthToken, newToken: newRefreshToken};
}
