/**
 * Jest unit test for PUT /auth/password method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
// eslint-disable-next-line node/no-unpublished-import
import MockDate from 'mockdate';
import TestEnv from '../../TestEnv';
import TestConfig from '../../TestConfig';
import AuthToken from '../../../src/datatypes/authentication/AuthToken';
import redisScan from '../../../src/functions/asyncRedis/redisScan';
import redisTtl from '../../../src/functions/asyncRedis/redisTtl';

describe('PUT /auth/password - Change password', () => {
  let testEnv: TestEnv;

  beforeAll(() => {
    jest.setTimeout(120000);
  });

  beforeEach(async () => {
    // Setup TestEnv
    testEnv = new TestEnv(expect.getState().currentTestName);

    // Start Test Environment
    const resourceList = ['USER'];
    await testEnv.start(resourceList);
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Success', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Dummy login (2)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Password Change request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'Password12!'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password12!'
      )
    );

    // Redis Check (Other Session Cleared)
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);
    const resultTtl = await redisTtl(
      `testuser1_${refreshToken}`,
      testEnv.redisClient
    );
    expect(resultTtl).toBeLessThanOrEqual(120 * 60);
    expect(resultTtl).toBeGreaterThan(0);
  });

  test('Success - Refresh Token about to expire', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Dummy login (2)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Password Change request (Refresh Token about to expire)
    currentDate.setMinutes(currentDate.getMinutes() + 110);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'Password12!'});
    expect(response.status).toBe(200);

    // Cookie Check (Token Updated)
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Refresh Token
    const cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    const tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.status).toBe('unverified');
    expect(tokenPayload.admin).toBeUndefined();

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password12!'
      )
    );

    // Redis Check (Other Session Cleared)
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);
    const resultTtl = await redisTtl(
      `testuser1_${cookie[1]}`,
      testEnv.redisClient
    );
    expect(resultTtl).toBeLessThanOrEqual(120 * 60);
    expect(resultTtl).toBeGreaterThan(0);
  });

  test('Success - user promoted to admin', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Dummy login (2)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // User Verified and Promoted to admin
    await testEnv.dbClient.query(
      'UPDATE user SET status = ?, admin = ? where username = ?',
      ['verified', true, 'testuser1']
    );

    // Password Change request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'Password12!'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password12!'
      )
    );

    // Redis Check (Other Session Cleared)
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);
    const resultTtl = await redisTtl(
      `testuser1_${refreshToken}`,
      testEnv.redisClient
    );
    expect(resultTtl).toBeLessThanOrEqual(120 * 60);
    expect(resultTtl).toBeGreaterThan(0);
  });

  test('Fail - Invalid Refresh Token', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];
    // Dummy login (2)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Password Change request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${accessToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'Password12!'});
    expect(response.status).toBe(401);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password13!'
      )
    );

    // Redis Check (No session cleared)
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(2);
  });

  test('Fail - Unregistered refresh token', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Dummy login (2)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    // Dummy login (3)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout (Invalidate Refresh Token)
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Password Change request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'Password12!'});
    expect(response.status).toBe(401);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password13!'
      )
    );

    // Redis Check (No session cleared)
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(2);
  });

  test('Fail - missing fields', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Dummy login (2)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Password Change request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!'});
    expect(response.status).toBe(400);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password13!'
      )
    );

    // Redis Check (No session cleared)
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(2);
  });

  test('Fail - additional fields', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Dummy login (2)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Password Change request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({
        currentPassword: 'Password13!',
        newPassword: 'Password12!',
        username: 'testuser1',
      });
    expect(response.status).toBe(400);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password13!'
      )
    );

    // Redis Check (No session cleared)
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(2);
  });

  test('Fail - currentPassword and newPassword are same', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Dummy login (2)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Password Change request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'Password13!'});
    expect(response.status).toBe(400);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password13!'
      )
    );

    // Redis Check (No session cleared)
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(2);
  });

  test('Fail - password rule', async () => {
    // newPassword does not satisfy rule
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Dummy login (2)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Password Change request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'passwordPa!'});
    expect(response.status).toBe(400);

    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'UserPassword12!'});
    expect(response.status).toBe(400);

    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'password12!'});
    expect(response.status).toBe(400);

    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'PASSWORD12!'});
    expect(response.status).toBe(400);

    // DB Check
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password13!'
      )
    );

    // Redis Check (No session cleared)
    let result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(2);

    // currentPassword does not satisfy the rule
    // Password Change request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'passwordPa!', newPassword: 'Password12!'});
    expect(response.status).toBe(400);

    // DB Check
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password13!'
      )
    );

    // Redis Check (No session cleared)
    result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(2);
  });

  test('Fail - Suspended user', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Dummy login (2)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // User Suspended
    await testEnv.dbClient.query(
      'UPDATE user SET status = ? where username = ?',
      ['suspended', 'testuser1']
    );

    // Password Change request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'Password12!'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Suspended User');

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password13!'
      )
    );
  });

  test('Fail - Deleted user', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Dummy login (2)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // User Deleted
    await testEnv.dbClient.query(
      'UPDATE user SET status = ? where username = ?',
      ['deleted', 'testuser1']
    );

    // Password Change request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'Password12!'});
    expect(response.status).toBe(401);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password13!'
      )
    );
  });

  test('Fail - Removed user', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Dummy login (2)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // User Removed
    await testEnv.dbClient.query('DELETE FROM user where username = ?', [
      'testuser1',
    ]);

    // Password Change request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'Password12!'});
    expect(response.status).toBe(401);
  });

  test('Fail - Mismatching current password', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Dummy login (2)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Password Change request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'WrongPw1256!', newPassword: 'Password12!'});
    expect(response.status).toBe(400);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password13!'
      )
    );

    // Redis Check (No session cleared)
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(2);
  });
});
