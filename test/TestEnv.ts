/**
 * Setup test environment
 *  - Setup Database for testing
 *  - Build In-memory table that will be used during the testing
 *  - Setup express server
 *
 * Teardown test environment after test
 *  - Remove used table and close database connection from the express server
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as crypto from 'crypto';
import * as mariadb from 'mariadb';
import * as redis from 'redis';
import TestConfig from './TestConfig';
import ExpressServer from '../src/ExpressServer';
import redisScan from '../src/functions/asyncRedis/redisScan';
import redisDel from '../src/functions/asyncRedis/redisDel';

/**
 * Class for Test Environment
 */
export default class TestEnv {
  testConfig: TestConfig; // Configuration Object (to use hash function later)
  expressServer: ExpressServer; // Express Server Object
  dbClient: mariadb.Pool; // DB Client Object
  redisClient: redis.RedisClient; // Redis Client Object
  dbIdentifier: string; // unique identifier string for the database

  /**
   * Constructor for TestEnv
   *  - Setup express server
   *  - Setup db client
   *  - Setup redis client
   *
   * @param identifier Identifier to specify the test
   */
  constructor(identifier: string) {
    // Hash identifier to create new identifier string
    this.dbIdentifier = crypto
      .createHash('md5')
      .update(identifier)
      .digest('hex');
    // Generate TestConfig obj
    this.testConfig = new TestConfig(this.dbIdentifier);

    // Setup DB Connection Pool
    this.dbClient = mariadb.createPool({
      host: this.testConfig.db.url,
      port: this.testConfig.db.port,
      user: this.testConfig.db.username,
      password: this.testConfig.db.password,
      database: this.testConfig.db.defaultDatabase,
      compress: true,
    });

    // Setup Redis Client
    this.redisClient = redis.createClient(this.testConfig.redis);

    // Setup Express Server
    this.expressServer = new ExpressServer(this.testConfig);
  }

  /**
   * beforeEach test case, run this function
   * - Setup Database/Redis for testing
   * - Build In-memory table that will be used during the testing
   *
   * @param resourceList List of resource names that indicates which resources
   *     are used for the test
   */
  async start(resourceList: string[]): Promise<void> {
    // Remove duplicates in the resourceList
    resourceList = Array.from(new Set(resourceList));

    // Create test database
    const dbConnection = await mariadb.createConnection({
      host: this.testConfig.db.url,
      port: this.testConfig.db.port,
      user: this.testConfig.db.username,
      password: this.testConfig.db.password,
      compress: true,
    });
    await dbConnection.query(`CREATE DATABASE db_${this.dbIdentifier};`);
    await dbConnection.end();

    // Create resources
    const dbActions = [];
    for (const i of resourceList) {
      switch (i) {
        case 'USER':
          dbActions.push(this.user());
          break;
        /* istanbul ignore next */
        default:
          throw new Error('Resource name not valid!!');
      }
    }
    await Promise.all(dbActions);
  }

  /**
   * Teardown test environment after test
   *  - Remove used resources (DB)
   *  - close database/redis connection from the express server
   */
  async stop(): Promise<void> {
    // Drop database
    await this.dbClient.query(`DROP DATABASE db_${this.dbIdentifier}`);
    const keys = await redisScan(
      `${this.testConfig.redisIdentifier}_*`,
      this.redisClient
    );
    await Promise.all(
      keys.map(key =>
        redisDel(key.substr(key.indexOf('_') + 1), this.redisClient)
      )
    );

    // Close database connection of the express server
    await this.expressServer.closeServer();

    // Close database/redis connection used during tests
    await this.dbClient.end();
    this.redisClient.quit();
  }

  /**
   * Helper method to create user table for testing
   * @private
   */
  private async user(): Promise<void> {
    // Create Table
    await this.dbClient.query(
      // user table
      String.prototype.concat(
        'CREATE TABLE user (',
        'username VARCHAR(12) NOT NULL PRIMARY KEY,',
        'password CHAR(88) NOT NULL,',
        'membersince TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,',
        'admission_year TINYINT(2) NOT NULL,',
        'legal_name VARCHAR(255) NOT NULL,',
        'nickname VARCHAR(255) NULL DEFAULT NULL,',
        'school_company VARCHAR(255) NULL DEFAULT NULL,',
        'major_department VARCHAR(255) NULL DEFAULT NULL,',
        'status VARCHAR(10) NOT NULL,',
        'admin BOOLEAN NOT NULL',
        ') CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;'
      )
    );
    await Promise.all([
      // user_email table
      this.dbClient.query(
        String.prototype.concat(
          'CREATE TABLE user_email (',
          'id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,',
          'username VARCHAR(12) NOT NULL,',
          'FOREIGN KEY (username) REFERENCES user(username) ON DELETE CASCADE ON UPDATE CASCADE,',
          'email VARCHAR(255) NOT NULL,',
          'UNIQUE INDEX username_email (username, email),',
          'INDEX index_email(email),',
          'primary_addr BOOLEAN NOT NULL,',
          'INDEX index_primary_addr(primary_addr),',
          'verified BOOLEAN NOT NULL,',
          'INDEX index_verified(verified)',
          ') CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;'
        )
      ),
      // user_phone_number
      this.dbClient.query(
        String.prototype.concat(
          'CREATE TABLE user_phone_number (',
          'username VARCHAR(12) NOT NULL PRIMARY KEY,',
          'FOREIGN KEY (username) REFERENCES user(username) ON DELETE CASCADE ON UPDATE CASCADE,',
          'country_code TINYINT(3) NOT NULL,',
          'phone_number BIGINT(15) NOT NULL',
          ') CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;'
        )
      ),
    ]);
    await this.dbClient.query(
      // user_email_verify_ticket table
      String.prototype.concat(
        'CREATE TABLE user_email_verify_ticket (',
        'id VARCHAR(44) NOT NULL PRIMARY KEY,',
        'email_id INT(11) NOT NULL,',
        'FOREIGN KEY (email_id) REFERENCES user_email(id) ON DELETE CASCADE ON UPDATE CASCADE,',
        'expires TIMESTAMP NOT NULL,',
        'INDEX index_expires(expires)',
        ') CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;'
      )
    );

    // user Sample Data
    const userSamples = [];
    // testuser1, Password13!, 2015 admitted (13), 홍길동, unverified user
    let userTimestamp = new Date('2021-03-10T00:50:43.000Z');
    userSamples.push([
      'testuser1',
      TestConfig.hash('testuser1', userTimestamp.toISOString(), 'Password13!'),
      userTimestamp,
      13,
      '홍길동',
      null,
      null,
      null,
      'unverified',
      false,
    ]);
    // testuser2, Password12!, 2003 admitted (1), 김철수, Charles Kim, verified user
    userTimestamp = new Date('2021-03-07T01:15:42.000Z');
    userSamples.push([
      'testuser2',
      TestConfig.hash('testuser2', userTimestamp.toISOString(), 'Password12!'),
      userTimestamp,
      1,
      '김철수',
      'Charles Kim',
      null,
      null,
      'verified',
      false,
    ]);
    // admin1, rootPW12!@, 2008 admitted (6), 최영재, Youngjae Choi, Busan Science High School, Student, verified admin user
    userTimestamp = new Date('2021-02-07T01:12:42.000Z');
    userSamples.push([
      'admin1',
      TestConfig.hash('admin1', userTimestamp.toISOString(), 'rootPW12!@'),
      userTimestamp,
      6,
      '최영재',
      '나똑똑',
      'Busan Science High School',
      'Student',
      'verified',
      true,
    ]);
    // suspended1, snuesDp12@, 2010 admitted (8), 나불법, suspended user
    userTimestamp = new Date('2021-04-07T01:12:42.000Z');
    userSamples.push([
      'suspended1',
      TestConfig.hash('suspended1', userTimestamp.toISOString(), 'snuesDp12@@'),
      userTimestamp,
      8,
      '나불법',
      null,
      null,
      null,
      'suspended',
      false,
    ]);
    // deleted1, Dle12!4@!!, 2014 admitted (12), 김영희, deleted user
    userTimestamp = new Date('2021-07-07T01:12:42.000Z');
    userSamples.push([
      'deleted1',
      TestConfig.hash('deleted1', userTimestamp.toISOString(), 'Dle12!4@!!'),
      userTimestamp,
      12,
      '김영희',
      null,
      null,
      null,
      'deleted',
      false,
    ]);
    // Insert Data
    await this.dbClient.batch(
      String.prototype.concat(
        'INSERT INTO user ',
        '(username, password, membersince, admission_year, legal_name, nickname, school_company, major_department, status, admin) ',
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ),
      userSamples
    );

    // user_email Sample Data
    const userEmailSamples = [];
    // testuser1, testuser1@gmail.com, primary, unverified
    userEmailSamples.push(['testuser1', 'testuser1@gmail.com', true, false]);
    // testuser2, charles@gmail.com, primary, verified
    userEmailSamples.push(['testuser2', 'charles@gmail.com', true, true]);
    // testuser2, charles@hotmail.com, not primary, unverified
    userEmailSamples.push(['testuser2', 'charles@hotmail.com', false, false]);
    // admin1, charles@hotmail.com, primary, verified
    userEmailSamples.push(['admin1', 'charles@hotmail.com', true, true]);
    // admin1, charles.temp@hotmail.com, not primary, verified
    userEmailSamples.push(['admin1', 'charles.temp@hotmail.com', false, true]);
    // admin1, charles.a2@hotmail.com, not primary, unverified
    userEmailSamples.push(['admin1', 'charles.a2@hotmail.com', false, false]);
    // suspended1, noname@naver.com, primary, verified
    userEmailSamples.push(['suspended1', 'noname@naver.com', true, true]);
    // suspended1, noname@hanmail.net, not primary, unverified
    userEmailSamples.push(['suspended1', 'noname@hanmail.net', false, false]);
    // Insert Data
    await this.dbClient.batch(
      String.prototype.concat(
        'INSERT INTO user_email ',
        '(username, email, primary_addr, verified) VALUES (?, ?, ?, ?)'
      ),
      userEmailSamples
    );

    // user_email_verify_ticket Sample Data will be generated during test

    // user_phone_number Sample Data
    const userPhoneNumberSamples = [];
    // testuser1 do not have phone number
    // testuser2, 82, 1012345678
    userPhoneNumberSamples.push(['testuser2', 82, 1012345678]);
    // admin1, 1, 2345678901
    userPhoneNumberSamples.push(['admin1', 1, 2345678901]);
    // suspended1, 44, 2222567890
    userPhoneNumberSamples.push(['suspended1', 44, 2222567890]);
    // Insert Data
    await this.dbClient.batch(
      String.prototype.concat(
        'INSERT INTO user_phone_number ',
        '(username, country_code, phone_number) VALUES (?, ?, ?)'
      ),
      userPhoneNumberSamples
    );
  }
}
