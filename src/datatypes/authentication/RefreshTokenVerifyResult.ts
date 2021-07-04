/**
 * Define type for the objects that contains the result
 * for RefreshToken verification
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import AuthToken from './AuthToken';

/**
 * Interface to define RefreshToken's verification result
 * When RefreshToken is about to expire,
 * newToken field contains new RefreshToken that must be returned to user
 */
export default interface RefreshTokenVerifyResult {
  content: AuthToken; // token contents
  newToken?: string; // new JWT token (created when the token is about to expire)
}
