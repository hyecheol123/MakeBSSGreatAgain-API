/**
 * Configuration for the Test Environment.
 * Work identical as ServerConfig of src.
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as crypto from 'crypto';
import {ConfigObj} from '../src/datatypes/ConfigObj';
import ServerConfigTemplate from '../src/ServerConfigTemplate';

/**
 * Module contains the configuration
 */
export default class TestConfig extends ServerConfigTemplate {
  redisIdentifier: string;

  /**
   * Constructor for ServerConfig
   *
   * @param identifier test name / used to identify test cases
   */
  constructor(identifier: string) {
    const redisIdentifier = crypto
      .createHash('sha1')
      .update(identifier)
      .digest('base64')
      .substr(0, 10)
      .replace(/-/g, 'a');
    const config: ConfigObj = {
      db: {
        url: 'localhost',
        port: 3306,
        username: 'apptest',
        password: '',
        defaultDatabase: `db_${identifier}`,
      },
      redis: {
        host: 'localhost',
        port: 6379,
        user: '',
        db: 14,
        prefix: `${redisIdentifier}_`,
      },
      expressPort: 3000,
      jwtKeys: {secretKey: 'keySecret', refreshKey: 'keySecret'},
    };
    super(config);
    this.redisIdentifier = redisIdentifier;
  }

  /**
   * Function to create hashed password
   *
   * @param id user's id (used to generate salt)
   * @param additionalSalt unique additional salt element for each user
   * @param secretString string to be hashed (password, etc)
   * @returns {string} Hashed Password
   */
  static hash(
    id: crypto.BinaryLike,
    additionalSalt: crypto.BinaryLike,
    secretString: crypto.BinaryLike
  ): string {
    const salt: crypto.BinaryLike = id.toString() + additionalSalt.toString();
    return crypto
      .pbkdf2Sync(secretString, salt, 10, 64, 'sha512')
      .toString('base64');
  }
}
