/**
 * Configuration for the Test Environment.
 * Work identical as ServerConfig of src.
 *
 * @author Hyecheol (Jerry) Jang
 */

import {ConfigObj} from '../src/datatypes/ConfigObj';
import ServerConfigTemplate from '../src/ServerConfigTemplate';

/**
 * Module contains the configuration
 */
export default class TestConfig extends ServerConfigTemplate {
  /**
   * Constructor for ServerConfig
   *
   * @param identifier test name / used to identify test cases
   */
  constructor(identifier: string) {
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
      },
      expressPort: 3000,
      jwtKeys: {secretKey: 'keySecret', refreshKey: 'keySecret'},
    };
    super(config);
  }
}
