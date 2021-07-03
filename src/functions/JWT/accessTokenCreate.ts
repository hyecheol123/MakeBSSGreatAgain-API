/**
 * Generate new Access Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as jwt from 'jsonwebtoken';
import AuthToken from '../../datatypes/AuthToken';

/**
 * Method to generate new accessToken
 *  - expires within 15min
 *  - using HS512 as hashing algorithm
 *  - contains username, user status, and whether the user is admin or not
 *
 * @param username unique username indicates the owner of this token
 * @param status user status
 * @param admin whether user is admin or not
 * @return accessToken JWT access token
 */
export default function accessTokenCreate(
  username: AuthToken['username'],
  status: AuthToken['status'],
  admin: AuthToken['admin']
): string {
  const tokenContent: AuthToken = {
    username: username,
    type: 'access',
    status: status,
  };
  if (admin) {
    tokenContent.admin = true;
  }

  // Generate AccessToken
  return jwt.sign(tokenContent, process.env['jwtAccessKey'] as string, {
    algorithm: 'HS512',
    expiresIn: '15m',
  });
}
