/**
 * Generate new Refresh Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as jwt from 'jsonwebtoken';
import * as redis from 'redis';
import AuthToken from '../../datatypes/AuthToken';

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
 * @param redisClient redis client
 * @return refreshToken JWT access token
 */
export default function refreshTokenCreate(
  username: AuthToken['username'],
  status: AuthToken['status'],
  admin: AuthToken['admin'],
  redisClient: redis.RedisClient
): string {
  const tokenContent: AuthToken = {
    username: username,
    type: 'refresh',
    status: status,
  };
  if (admin) {
    tokenContent.admin = true;
  }

  // Generate RefreshToken
  const refreshToken = jwt.sign(
    tokenContent,
    process.env['jwtRefreshKey'] as string,
    {
      algorithm: 'HS512',
      expiresIn: '120m',
    }
  );

  // Redis
  redisClient.set(`${username}_${refreshToken}`, '', 'EX', 120 * 60);

  return refreshToken;
}
