/**
 * Jest unit test for GET /auth/renew method
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

describe('GET /auth/renew - renew access/refresh token', () => {
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
    let currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    let refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Both token alive - need to process renewal request
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Check Cookie and Token Values
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

    // Passed 20 min (Refresh token alive, access token expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Check Cookie and Token Values
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

    currentDate = new Date();
    // Login - admin
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Passed 20 min (Refresh token alive, access token expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Check Cookie and Token Values
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

    // Passed 110 min (Refresh token about to expire, access token expired
    currentDate.setMinutes(currentDate.getMinutes() + 110);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Check Cookie and Token Values
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Refresh Token
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // Check for Refresh Token Name
    let tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('refresh');
    expect(tokenPayload.status).toBe('unverified');
    expect(tokenPayload.admin).toBeUndefined();
    // Parse Access Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
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
  });

  test('Success - User verified', async () => {
    // Only check access token
    // Refresh tokens are modified at the time the user verified
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

    // User Verified
    await testEnv.dbClient.query(
      'UPDATE user SET status = ? where username = ?',
      ['verified', 'testuser1']
    );

    // Passed 20 min (Refresh token alive, access token expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Check Cookie and Token Values
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Access Token
    const cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    const tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.status).toBe('verified');
    expect(tokenPayload.admin).toBeUndefined();
  });

  test('Success - User promoted to admin', async () => {
    // Only check access token
    // Refresh tokens are modified at the time the user promoted to admin
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

    // User Verified
    await testEnv.dbClient.query(
      'UPDATE user SET status = ?, admin = ? where username = ?',
      ['verified', true, 'testuser1']
    );

    // Passed 20 min (Refresh token alive, access token expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Check Cookie and Token Values
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Access Token
    const cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    const tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('access');
    expect(tokenPayload.status).toBe('verified');
    expect(tokenPayload.admin).toBe(true);
  });

  test('Fail - Invalid Token', async () => {
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

    // Passed 20 min (Refresh token alive, access token expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${accessToken}`]);
    expect(response.status).toBe(401);

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();
  });

  test('Fail - Token not in Redis (logged out)', async () => {
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

    // Logout
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Passed 20 min (Refresh token alive, access token expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();
  });

  test('Fail - User suspended', async () => {
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

    // User Suspended
    await testEnv.dbClient.query(
      'UPDATE user SET status = ? where username = ?',
      ['suspended', 'testuser1']
    );

    // Passed 20 min (Refresh token alive, access token expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Suspended User');

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();
  });

  test('Fail - User deleted', async () => {
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

    // User Deleted
    await testEnv.dbClient.query(
      'UPDATE user SET status = ? where username = ?',
      ['deleted', 'testuser1']
    );

    // Passed 20 min (Refresh token alive, access token expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();
  });

  test('Fail - User removed from DB', async () => {
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

    // Remove user entry
    await testEnv.dbClient.query(
      'DELETE from user where username = ?',
      'testuser1'
    );

    // Passed 20 min (Refresh token alive, access token expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();
  });
});
