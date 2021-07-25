/**
 * Jest unit test for DELETE /auth/logout method
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

describe('DELETE /auth/logout - logout from current session', () => {
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

  test('Success logout', async () => {
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
    // Dummy Login
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout Request
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Cookie Clear Check
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    expect(cookie[1]).toBe('');
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    expect(cookie[1]).toBe('');

    // Check redis server
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);
  });

  test('Success logout - about to expire refreshToken', async () => {
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

    // Logout Request
    currentDate.setMinutes(currentDate.getMinutes() + 101); // About to expire
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Cookie Clear Check
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    expect(cookie[1]).toBe('');
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    expect(cookie[1]).toBe('');

    // Check redis server
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(0);
  });

  test('Fail - Use accessToken to logout', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Logout Request
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis server
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);
  });

  test('Fail - Use unregistered refreshToken', async () => {
    const currentDate = new Date();

    // Create RefreshToken
    MockDate.set(currentDate);
    const tokenContents: AuthToken = {
      username: 'testuser1',
      type: 'refresh',
      status: 'unverified',
    };
    const jwtOption: jwt.SignOptions = {
      algorithm: 'HS512',
      expiresIn: '120m',
    };
    const refreshToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    );

    // Login Request
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout Request
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis server
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);
  });

  test('Fail - Use expired refreshToken', async () => {
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

    // Logout Request
    currentDate.setMinutes(currentDate.getMinutes() + 121); // Expired
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis server - Meaningless here
    // Once TTL Exactly set, it will automatically removed
    // Cannot be tested with MockDate
  });

  test('Fail - Use refreshToken generated with wrong key', async () => {
    // Create RefreshToken
    const tokenContents: AuthToken = {
      username: 'testuser1',
      type: 'refresh',
      status: 'unverified',
    };
    const jwtOption: jwt.SignOptions = {
      algorithm: 'HS512',
      expiresIn: '120m',
    };
    const refreshToken = jwt.sign(tokenContents, 'dummyKey', jwtOption);

    // Login Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout Request
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis server
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);
  });

  test('Fail - Wrong refreshToken secret key', async () => {
    // Create RefreshToken
    const tokenContents = {
      username: 'testuser1',
      type: 'undecided',
      status: 'unverified',
    };
    const jwtOption: jwt.SignOptions = {
      algorithm: 'HS512',
      expiresIn: '120m',
    };
    const refreshToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    );

    // Login Request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout Request
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis server
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);
  });

  test('Fail - No Token', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout Request
    response = await request(testEnv.expressServer.app).delete('/auth/logout');
    expect(response.status).toBe(401);

    // Cookie Clear Check
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis server
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);
  });
});
