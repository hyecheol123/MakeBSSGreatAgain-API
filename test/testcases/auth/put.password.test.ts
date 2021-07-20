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
    // TODO
  });

  test('Success - user promoted to admin', async () => {
    // TODO
  });

  test('Fail - Invalid Refresh Token', async () => {
    // TODO
  });

  test('Fail - Unregistered refresh token', async () => {
    // TODO
  });

  test('Fail - missing fields', async () => {
    // TODO
  });

  test('Fail - additional fields', async () => {
    // TODO
  });

  test('Fail - currentPassword and newPassword are same', async () => {
    // TODO
  });

  test('Fail - password rule', async () => {
    // TODO: newPassword
    // TODO: currentPassword
  });

  test('Fail - Suspended user', async () => {
    // TODO
  });

  test('Fail - Deleted user', async () => {
    // TODO
  });

  test('Fail - Removed user', async () => {
    // TODO
  });

  test('Fail - Mismatching current password', async () => {
    // TODO
  });
});
