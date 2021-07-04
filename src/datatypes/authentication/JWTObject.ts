/**
 * Object type definition for JWT Token Payload
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import AuthToken from './AuthToken';

/**
 * Interface to define JSON Web Token contents
 */
export default interface JWTObject extends AuthToken {
  iat?: number; // issued at
  exp?: number; // expire at
}
