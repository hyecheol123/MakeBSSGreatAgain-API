/**
 * Jest unit test for POST /auth/login method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
// eslint-disable-next-line node/no-unpublished-import
import MockDate from 'mockdate';
import TestEnv from '../../TestEnv';
import redisScan from '../../functions/asyncRedis/redisScan';
import redisTtl from '../../functions/asyncRedis/redisTtl';
import AuthToken from '../../../src/datatypes/authentication/AuthToken';

describe('POST /auth/login - login', () => {
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

  test('Success - Using already existing account', async () => {
    // request - Unverified user
    let loginCredentials = {
      username: 'testuser1',
      password: 'Password13!',
    };
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    // Check Cookie & token Information
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Access Token
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    let tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.status).toBe('unverified');
    expect(tokenPayload.admin).toBeUndefined();
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.status).toBe('unverified');
    expect(tokenPayload.admin).toBeUndefined();

    // Check redis
    let resultTtl = await redisTtl(
      `testuser1_${cookie[1]}`,
      testEnv.redisClient
    );
    expect(resultTtl).toBeLessThanOrEqual(120 * 60);
    expect(resultTtl).toBeGreaterThan(0);
    let result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);

    // Request - Verified non-admin user
    loginCredentials = {
      username: 'testuser2',
      password: 'Password12!',
    };
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    // Check Cookie & token Information
    // Parse Access Token
    cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('testuser2');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.status).toBe('verified');
    expect(tokenPayload.admin).toBeUndefined();
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.username).toBe('testuser2');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.status).toBe('verified');
    expect(tokenPayload.admin).toBeUndefined();

    // Check redis
    resultTtl = await redisTtl(`testuser2_${cookie[1]}`, testEnv.redisClient);
    expect(resultTtl).toBeLessThanOrEqual(120 * 60);
    expect(resultTtl).toBeGreaterThan(0);
    result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser2_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);

    // Request - Verified admin user
    loginCredentials = {
      username: 'admin1',
      password: 'rootPW12!@',
    };
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    // Check Cookie & token Information
    // Parse Access Token
    cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('admin1');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.status).toBe('verified');
    expect(tokenPayload.admin).toBe(true);
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.username).toBe('admin1');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.status).toBe('verified');
    expect(tokenPayload.admin).toBe(true);

    // Check redis
    resultTtl = await redisTtl(`admin1_${cookie[1]}`, testEnv.redisClient);
    expect(resultTtl).toBeLessThanOrEqual(120 * 60);
    expect(resultTtl).toBeGreaterThan(0);
    result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_admin1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);
  });

  test('Success - Using newly created account', async () => {
    // Request - Create New User
    const newUserForm = {
      username: 'successtest',
      password: 'UserPassword12!',
      admissionYear: 10,
      legalName: '홍길동',
      nickname: 'Road Hong',
      email: 'gildong.hong@gmail.com',
      phoneNumber: {countryCode: 82, phoneNumber: 1234567890},
      affiliation: {
        schoolCompany: 'Busan Science High School',
        majorDepartment: 'student',
      },
    };
    let response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('successtest');

    // request - Newly created unverified user
    const loginCredentials = {
      username: 'successtest',
      password: 'UserPassword12!',
    };
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    // Check Cookie & token Information
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Access Token
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    let tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('successtest');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.status).toBe('unverified');
    expect(tokenPayload.admin).toBeUndefined();
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.username).toBe('successtest');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.status).toBe('unverified');
    expect(tokenPayload.admin).toBeUndefined();

    // Check redis
    const resultTtl = await redisTtl(
      `successtest_${cookie[1]}`,
      testEnv.redisClient
    );
    expect(resultTtl).toBeLessThanOrEqual(120 * 60);
    expect(resultTtl).toBeGreaterThan(0);
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_successtest_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);
  });

  test('Success - Login Twice', async () => {
    const currentDate = new Date();
    // Request  - First login
    MockDate.set(currentDate);
    const loginCredentials = {
      username: 'testuser1',
      password: 'Password13!',
    };
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    // Check Cookie & token Information
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Access Token
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    let tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.status).toBe('unverified');
    expect(tokenPayload.admin).toBeUndefined();
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.status).toBe('unverified');
    expect(tokenPayload.admin).toBeUndefined();

    // Check redis
    let resultTtl = await redisTtl(
      `testuser1_${cookie[1]}`,
      testEnv.redisClient
    );
    expect(resultTtl).toBeLessThanOrEqual(120 * 60);
    expect(resultTtl).toBeGreaterThan(0);
    let result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(1);

    // Request - Second Login
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    // Check Cookie & token Information
    // Parse Access Token
    cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.status).toBe('unverified');
    expect(tokenPayload.admin).toBeUndefined();
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.status).toBe('unverified');
    expect(tokenPayload.admin).toBeUndefined();

    // Check redis
    resultTtl = await redisTtl(`testuser1_${cookie[1]}`, testEnv.redisClient);
    expect(resultTtl).toBeLessThanOrEqual(120 * 60);
    expect(resultTtl).toBeGreaterThan(0);
    result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(2);
  });

  test('Fail - Suspended User', async () => {
    // request - Suspended user
    const loginCredentials = {
      username: 'suspended1',
      password: 'snuesDp12@',
    };
    const response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Suspended User');

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_suspended1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(0);
  });

  test('Fail - Deleted User', async () => {
    // request - Deleted user
    const loginCredentials = {
      username: 'deleted1',
      password: 'Dle12!4@!!',
    };
    const response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_deleted1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(0);
  });

  test('Fail - Missing Required field', async () => {
    // request - missing username
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({password: 'Password12!'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // request - missing password
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(0);
  });

  test('Fail - Additional field', async () => {
    // request - Additional Field
    const loginCredentials = {
      username: 'testuser1',
      password: 'Password13!',
      nickname: 'dummy',
    };
    const response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis
    const result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_testuser1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(0);
  });

  test('Fail - Not existing username', async () => {
    // request - Invalid username
    let loginCredentials = {
      username: 'adminadminadimin',
      password: 'Password13!',
    };
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis
    let result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_adminadminadimin_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(0);

    // request - Not-existing username
    loginCredentials = {
      username: 'admin2',
      password: 'Password13!',
    };
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis
    result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_adminadminadimin_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(0);
  });

  test('Fail - Wrong Password', async () => {
    // request - Invalid password
    let loginCredentials = {
      username: 'admin1',
      password: 'passwordPassword',
    };
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis
    let result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_admin1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(0);

    // request - Incorrect password
    loginCredentials = {
      username: 'admin1',
      password: 'Password13!',
    };
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Check redis
    result = await redisScan(
      `${testEnv.testConfig.redisIdentifier}_admin1_*`,
      testEnv.redisClient
    );
    expect(result.length).toBe(0);
  });
});
