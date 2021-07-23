/**
 * Generate new Refresh Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as jwt from 'jsonwebtoken';
import * as redis from 'redis';
import redisSetEX from '../asyncRedis/redisSet';
import AuthToken from '../../datatypes/authentication/AuthToken';

/**
 * Method to generate new refreshToken
 *  - expires within 120min
 *  - using HS512 as hashing algorithm
 *  - contains username, user status, and whether the user is admin or not
 *  - Saved to Redis Server (Format: [username]_[refreshToken])
 *
 * @param username unique username indicates the owner of this token
 * @param status user status
 * @param admin whether user is admin or not
 * @param jwtRefreshKey jwt Refresh Token Secret
 * @param redisClient redis client
 * @return {Promise<string>} JWT refresh Token
 */
export default async function refreshTokenCreate(
  username: AuthToken['username'],
  status: AuthToken['status'],
  admin: AuthToken['admin'],
  jwtRefreshKey: string,
  redisClient: redis.RedisClient
): Promise<string> {
  const tokenContent: AuthToken = {
    username: username,
    type: 'refresh',
    status: status,
  };
  if (admin) {
    tokenContent.admin = true;
  }

  // Generate RefreshToken
  const refreshToken = jwt.sign(tokenContent, jwtRefreshKey, {
    algorithm: 'HS512',
    expiresIn: '120m',
  });

  // Redis
  await redisSetEX(`${username}_${refreshToken}`, '', 120 * 60, redisClient);

  return refreshToken;
}
