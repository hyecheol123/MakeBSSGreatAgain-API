/**
 * Jest unit test for DELETE /auth/logout/other-sessions method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
// eslint-disable-next-line node/no-unpublished-import
import MockDate from 'mockdate';
import TestEnv from '../../TestEnv';
import AuthToken from '../../../src/datatypes/authentication/AuthToken';
import redisScan from '../../../src/functions/asyncRedis/redisScan';
import redisTtl from '../../../src/functions/asyncRedis/redisTtl';

describe('DELETE /auth/logout/other-sessions - logout from other session', () => {
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
    // Login 1
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Login 2
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    // Login 3
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    // Login 4
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    // Login 5
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout from other sessions
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout/other-sessions')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Check Redis (Current session alive, others gone)
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

  test('Success - About to Expire (Get new token)', async () => {
    const currentDate = new Date();
    // Login 1
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Login 2
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    // Login 3
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    // Login 4
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    // Login 5
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout from other sessions
    currentDate.setMinutes(currentDate.getMinutes() + 100);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout/other-sessions')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Check Updated Token
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

    // Check Redis (Current session alive, others gone)
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

  test('Fail - Invalid Token', async () => {
    const currentDate = new Date();
    // Login 1
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];
    // Login 2
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    // Login 3
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    // Login 4
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    // Login 5
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout from other sessions
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout/other-sessions')
      .set('Cookie', [`X-REFRESH-TOKEN=${accessToken}`]);
    expect(response.status).toBe(401);

    // Check Redis (Current session alive, others gone)
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(5);
  });

  test('Fail - Token not in Redis', async () => {
    const currentDate = new Date();
    // Login 1
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];
    // Logout (remove Login 1 refresh token from Redis)
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);
    // Login 2
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    // Login 3
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    // Login 4
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    // Login 5
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout from other sessions
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout/other-sessions')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Check Redis (Current session alive, others gone)
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(4);
  });
});
