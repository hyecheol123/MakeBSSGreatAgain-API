/**
 * Verifying Access Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang
 */

import {Request} from 'express';
import * as jwt from 'jsonwebtoken';
import AuthToken from '../../datatypes/authentication/AuthToken';
import JWTObject from '../../datatypes/authentication/JWTObject';
import AuthenticationError from '../../exceptions/AuthenticationError';

/**
 * Method to verify accessToken
 *
 * @param req Express Request object
 * @param jwtAccessKey jwt access key secret
 * @return {AuthToken} authentication token contents
 */
export default function accessTokenVerify(
  req: Request,
  jwtAccessKey: string
): AuthToken {
  if (!('X-ACCESS-TOKEN' in req.cookies)) {
    throw new AuthenticationError();
  }
  let tokenContents: JWTObject; // place to store contents of JWT
  // Verify and retrieve the token contents
  try {
    tokenContents = jwt.verify(req.cookies['X-ACCESS-TOKEN'], jwtAccessKey, {
      algorithms: ['HS512'],
    }) as JWTObject;
  } catch (e) {
    throw new AuthenticationError();
  }
  if (tokenContents.type !== 'access') {
    throw new AuthenticationError();
  }
  delete tokenContents.iat;
  delete tokenContents.exp;
  return tokenContents as AuthToken;
}
