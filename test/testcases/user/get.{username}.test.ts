/**
 * Jest unit test for GET /user/{username} method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
// eslint-disable-next-line node/no-unpublished-import
import MockDate from 'mockdate';
import TestEnv from '../../TestEnv';

describe('GET /user/{username} - Retrieve user detail', () => {
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

  test('Success - Owner', async () => {
    // Login with testuser1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    let accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];
    // Retrieve user information
    response = await request(testEnv.expressServer.app)
      .get('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('testuser1');
    expect(response.body.admissionYear).toBe(13);
    expect(response.body.legalName).toBe('홍길동');
    expect(response.body.nickname).toBe(undefined);
    expect(response.body.email.length).toBe(1);
    expect(response.body.email[0].email).toBe('testuser1@gmail.com');
    expect(response.body.email[0].primaryAddr).toBe(true);
    expect(response.body.email[0].verified).toBe(false);
    expect(response.body.phoneNumber).toBe(undefined);
    expect(response.body.affiliation).toBe(undefined);

    // Login with testuser2
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser2', password: 'Password12!'});
    expect(response.status).toBe(200);
    accessToken = response.header['set-cookie'][0].split('; ')[0].split('=')[1];
    // Retrieve user information
    response = await request(testEnv.expressServer.app)
      .get('/user/testuser2')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('testuser2');
    expect(response.body.admissionYear).toBe(1);
    expect(response.body.legalName).toBe('김철수');
    expect(response.body.nickname).toBe('Charles Kim');
    expect(response.body.email.length).toBe(2);
    for (const obj of response.body.email) {
      switch (obj.email) {
        case 'charles@gmail.com':
          expect(obj.primaryAddr).toBe(true);
          expect(obj.verified).toBe(true);
          break;
        case 'charles@hotmail.com':
          expect(obj.primaryAddr).toBe(false);
          expect(obj.verified).toBe(false);
          break;
        default:
          fail();
      }
    }
    expect(response.body.phoneNumber.countryCode).toBe(82);
    expect(response.body.phoneNumber.phoneNumber).toBe(1012345678);
    expect(response.body.affiliation).toBe(undefined);

    // Login with admin1
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    accessToken = response.header['set-cookie'][0].split('; ')[0].split('=')[1];
    // Retrieve user information
    response = await request(testEnv.expressServer.app)
      .get('/user/admin1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('admin1');
    expect(response.body.admissionYear).toBe(6);
    expect(response.body.legalName).toBe('최영재');
    expect(response.body.nickname).toBe('나똑똑');
    expect(response.body.email.length).toBe(3);
    for (const obj of response.body.email) {
      switch (obj.email) {
        case 'charles@hotmail.com':
          expect(obj.primaryAddr).toBe(true);
          expect(obj.verified).toBe(true);
          break;
        case 'charles.temp@hotmail.com':
          expect(obj.primaryAddr).toBe(false);
          expect(obj.verified).toBe(true);
          break;
        case 'charles.a2@hotmail.com':
          expect(obj.primaryAddr).toBe(false);
          expect(obj.verified).toBe(false);
          break;
        default:
          fail();
      }
    }
    expect(response.body.phoneNumber.countryCode).toBe(1);
    expect(response.body.phoneNumber.phoneNumber).toBe(2345678901);
    expect(response.body.affiliation).not.toBe(undefined);
    expect(response.body.affiliation.schoolCompany).toBe(
      'Busan Science High School'
    );
    expect(response.body.affiliation.majorDepartment).toBe('Student');
  });

  // Success - Admin
  test('Success - Admin', async () => {
    // Login with admin1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Retrieve testuser1 information
    response = await request(testEnv.expressServer.app)
      .get('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('testuser1');
    expect(response.body.admissionYear).toBe(13);
    expect(response.body.legalName).toBe('홍길동');
    expect(response.body.nickname).toBe(undefined);
    expect(response.body.email.length).toBe(1);
    expect(response.body.email[0].email).toBe('testuser1@gmail.com');
    expect(response.body.email[0].primaryAddr).toBe(true);
    expect(response.body.email[0].verified).toBe(false);
    expect(response.body.phoneNumber).toBe(undefined);
    expect(response.body.affiliation).toBe(undefined);

    // Retrieve testuser2 information
    response = await request(testEnv.expressServer.app)
      .get('/user/testuser2')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('testuser2');
    expect(response.body.admissionYear).toBe(1);
    expect(response.body.legalName).toBe('김철수');
    expect(response.body.nickname).toBe('Charles Kim');
    expect(response.body.email.length).toBe(2);
    for (const obj of response.body.email) {
      switch (obj.email) {
        case 'charles@gmail.com':
          expect(obj.primaryAddr).toBe(true);
          expect(obj.verified).toBe(true);
          break;
        case 'charles@hotmail.com':
          expect(obj.primaryAddr).toBe(false);
          expect(obj.verified).toBe(false);
          break;
        default:
          fail();
      }
    }
    expect(response.body.phoneNumber.countryCode).toBe(82);
    expect(response.body.phoneNumber.phoneNumber).toBe(1012345678);
    expect(response.body.affiliation).toBe(undefined);
  });

  test('Success - Others', async () => {
    // testuser1 -> admin1 (Multiple verified email / phone number)
    // Login with testuser1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    let accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];
    // Retrieve admin1 user information
    response = await request(testEnv.expressServer.app)
      .get('/user/admin1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('admin1');
    expect(response.body.admissionYear).toBe(6);
    expect(response.body.legalName).toBe('최영재');
    expect(response.body.nickname).toBe('나똑똑');
    expect(response.body.email.length).toBe(1);
    expect(response.body.email[0].email).toBe('charles@hotmail.com');
    expect(response.body.email[0].primaryAddr).toBe(true);
    expect(response.body.email[0].verified).toBe(true);
    expect(response.body.phoneNumber).toBe(undefined);
    expect(response.body.affiliation).not.toBe(undefined);
    expect(response.body.affiliation.schoolCompany).toBe(
      'Busan Science High School'
    );
    expect(response.body.affiliation.majorDepartment).toBe('Student');

    // testuser1 -> testuser2 (Only one verified email)
    // Signed in above
    // Retrieve testuser2 information
    response = await request(testEnv.expressServer.app)
      .get('/user/testuser2')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('testuser2');
    expect(response.body.admissionYear).toBe(1);
    expect(response.body.legalName).toBe('김철수');
    expect(response.body.nickname).toBe('Charles Kim');
    expect(response.body.email.length).toBe(1);
    expect(response.body.email[0].email).toBe('charles@gmail.com');
    expect(response.body.email[0].primaryAddr).toBe(true);
    expect(response.body.email[0].verified).toBe(true);
    expect(response.body.phoneNumber).toBe(undefined);
    expect(response.body.affiliation).toBe(undefined);

    // testuser2 -> testuser1 (No verified email / no phone number)
    // Login
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser2', password: 'Password12!'});
    expect(response.status).toBe(200);
    accessToken = response.header['set-cookie'][0].split('; ')[0].split('=')[1];
    // Retrieve testuser1 information
    response = await request(testEnv.expressServer.app)
      .get('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('testuser1');
    expect(response.body.admissionYear).toBe(13);
    expect(response.body.legalName).toBe('홍길동');
    expect(response.body.nickname).toBe(undefined);
    expect(response.body.email.length).toBe(0);
    expect(response.body.phoneNumber).toBe(undefined);
    expect(response.body.affiliation).toBe(undefined);
  });

  test('Fail - Search for Suspended User', async () => {
    // Admin Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    let accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];
    // Retrieve suspended1 information
    response = await request(testEnv.expressServer.app)
      .get('/user/suspended1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Suspended User');

    // Other (testuser2) login
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser2', password: 'Password12!'});
    expect(response.status).toBe(200);
    accessToken = response.header['set-cookie'][0].split('; ')[0].split('=')[1];
    // Retrieve suspended1 information
    response = await request(testEnv.expressServer.app)
      .get('/user/suspended1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Suspended User');
  });

  test('Fail - Search for Deleted User', async () => {
    // Admin Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    let accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];
    // Retrieve deleted1 information
    response = await request(testEnv.expressServer.app)
      .get('/user/deleted1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // Other (testuser2) login
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser2', password: 'Password12!'});
    expect(response.status).toBe(200);
    accessToken = response.header['set-cookie'][0].split('; ')[0].split('=')[1];
    // Retrieve deleted1 information
    response = await request(testEnv.expressServer.app)
      .get('/user/deleted1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });

  test('Fail - Expired Access Token', async () => {
    const currentDate = new Date();
    MockDate.set(currentDate);

    // Admin Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    let accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];
    // Access Token Expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Retrieve deleted1 information
    response = await request(testEnv.expressServer.app)
      .get('/user/deleted1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // Other (testuser2) login
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser2', password: 'Password12!'});
    expect(response.status).toBe(200);
    accessToken = response.header['set-cookie'][0].split('; ')[0].split('=')[1];
    // Access Token Expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Retrieve deleted1 information
    response = await request(testEnv.expressServer.app)
      .get('/user/deleted1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );
  });

  test('Fail - Invalid Access Token (Not signed with proper keys)', async () => {
    // Create AccessToken
    const tokenContent = {
      username: 'testuser1',
      type: 'access',
      status: 'unverified',
    };
    const accessToken = jwt.sign(
      tokenContent,
      testEnv.testConfig.jwt.refreshKey,
      {algorithm: 'HS512', expiresIn: '15m'}
    );

    // Request with invalid access token
    const response = await request(testEnv.expressServer.app)
      .get('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );
  });

  test('Fail - Token type is not "access"', async () => {
    // Create AccessToken
    const tokenContent = {
      username: 'testuser1',
      type: 'unknown',
      status: 'unverified',
    };
    const accessToken = jwt.sign(
      tokenContent,
      testEnv.testConfig.jwt.secretKey,
      {algorithm: 'HS512', expiresIn: '15m'}
    );

    // Request with invalid access token
    const response = await request(testEnv.expressServer.app)
      .get('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );
  });

  test('Fail - Request without access token', async () => {
    // Admin Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    // Retrieve testuser1 information without accessToken
    response = await request(testEnv.expressServer.app).get('/user/testuser1');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // Other (testuser2) login
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser2', password: 'Password12!'});
    expect(response.status).toBe(200);
    // Retrieve deleted1 information without accessToken
    response = await request(testEnv.expressServer.app).get('/user/deleted1');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );
  });

  test('Fail - Username not found', async () => {
    // Admin Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    let accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];
    // Retrieve not existing user's information
    response = await request(testEnv.expressServer.app)
      .get('/user/notexist')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // Other (testuser2) login
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser2', password: 'Password12!'});
    expect(response.status).toBe(200);
    accessToken = response.header['set-cookie'][0].split('; ')[0].split('=')[1];
    // Retrieve not existing user's information
    response = await request(testEnv.expressServer.app)
      .get('/user/notexist')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });
});
