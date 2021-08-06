/**
 * Jest unit test for PUT /user/{username} method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import TestEnv from '../../TestEnv';
// eslint-disable-next-line node/no-unpublished-import
import MockDate from 'mockdate';

describe('PUT /user/{username} - Update user information', () => {
  let testEnv: TestEnv;

  beforeAll(() => {
    jest.setTimeout(120000);
  });

  beforeEach(async () => {
    // Setup TestEnv
    testEnv = new TestEnv(expect.getState().currentTestName);
    MockDate.set(new Date());

    // Start Test Environment
    const resourceList = ['USER'];
    await testEnv.start(resourceList);
  });

  afterEach(async () => {
    await testEnv.stop();
    MockDate.reset();
  });

  test('Success - Owner (without phoneNumber record)', async () => {
    // Login with testuser1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'test@test.com', requestType: 'add'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(200);
    expect(response.body.message).toBeUndefined();

    // nickname
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe('Test Nickname');
    // affiliation
    expect(queryResult[0].school_company).toBe('PNU');
    expect(queryResult[0].major_department).toBe('Physics');
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('홍길동');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].country_code).toBe(82);
    expect(queryResult[0].phone_number).toBe(123456789);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(2);
    let emailId = -1;
    for (const obj of queryResult) {
      switch (obj.email) {
        case 'test@test.com':
          expect(obj.primary_addr).toBe(0);
          expect(obj.verified).toBe(0);
          emailId = obj.id;
          break;
        case 'testuser1@gmail.com':
          expect(obj.primary_addr).toBe(1);
          expect(obj.verified).toBe(0);
          break;
        default:
          fail();
      }
    }
    queryResult = await testEnv.dbClient.query(
      `SELECT * FROM user_email_verify_ticket WHERE email_id=${emailId}`
    );
    expect(queryResult.length).toBe(1);
    const expectedExpire = new Date();
    expectedExpire.setDate(expectedExpire.getDate() + 2);
    expect(new Date(queryResult[0].expires) > expectedExpire).toBe(true);
    expectedExpire.setDate(expectedExpire.getDate() + 1);
    expect(new Date(queryResult[0].expires) < expectedExpire).toBe(true);
  });

  test('Success - Owner (with phoneNumber record)', async () => {
    // Login with testuser2
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser2', password: 'Password12!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 1, phoneNumber: 1234567890},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [
        {email: 'charles@hotmail.com', requestType: 'delete'},
        {email: 'test@test.com', requestType: 'add'},
      ],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser2')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(200);
    expect(response.body.message).toBeUndefined();

    // nickname
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser2'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe('Test Nickname');
    // affiliation
    expect(queryResult[0].school_company).toBe('PNU');
    expect(queryResult[0].major_department).toBe('Physics');
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('김철수');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser2'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].country_code).toBe(1);
    expect(queryResult[0].phone_number).toBe(1234567890);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser2'"
    );
    expect(queryResult.length).toBe(2);
    let emailId = -1;
    for (const obj of queryResult) {
      switch (obj.email) {
        case 'charles@gmail.com':
          expect(obj.primary_addr).toBe(1);
          expect(obj.verified).toBe(1);
          break;
        case 'test@test.com':
          expect(obj.primary_addr).toBe(0);
          expect(obj.verified).toBe(0);
          emailId = obj.id;
          break;
        default:
          fail();
      }
    }
    queryResult = await testEnv.dbClient.query(
      `SELECT * FROM user_email_verify_ticket WHERE email_id=${emailId}`
    );
    expect(queryResult.length).toBe(1);
    const expectedExpire = new Date();
    expectedExpire.setDate(expectedExpire.getDate() + 2);
    expect(new Date(queryResult[0].expires) > expectedExpire).toBe(true);
    expectedExpire.setDate(expectedExpire.getDate() + 1);
    expect(new Date(queryResult[0].expires) < expectedExpire).toBe(true);
  });

  test('Success - Owner (Only update nickname)', async () => {
    // Login with testuser1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(200);
    expect(response.body.message).toBeUndefined();

    // nickname
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe('Test Nickname');
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('홍길동');
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(0);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].email).toBe('testuser1@gmail.com');
    expect(queryResult[0].primary_addr).toBe(1);
    expect(queryResult[0].verified).toBe(0);
  });

  test('Success - Owner (Only update affiliation)', async () => {
    // Login with testuser1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(200);
    expect(response.body.message).toBeUndefined();

    // affiliation
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].school_company).toBe('PNU');
    expect(queryResult[0].major_department).toBe('Physics');
    // Other field unchanged
    expect(queryResult[0].nickname).toBe(null);
    expect(queryResult[0].legal_name).toBe('홍길동');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(0);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].email).toBe('testuser1@gmail.com');
    expect(queryResult[0].primary_addr).toBe(1);
    expect(queryResult[0].verified).toBe(0);
  });

  test('Success - Owner (Only update phoneNumber)', async () => {
    // Login with testuser1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(200);
    expect(response.body.message).toBeUndefined();

    // Other field unchanged
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    expect(queryResult[0].nickname).toBe(null);
    expect(queryResult[0].legal_name).toBe('홍길동');
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].country_code).toBe(82);
    expect(queryResult[0].phone_number).toBe(123456789);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].email).toBe('testuser1@gmail.com');
    expect(queryResult[0].primary_addr).toBe(1);
    expect(queryResult[0].verified).toBe(0);
  });

  test('Success - Owner (Only add email)', async () => {
    // Login with testuser1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      emailChange: [{email: 'test@test.com', requestType: 'add'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(200);
    expect(response.body.message).toBeUndefined();

    // Other field unchanged
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    expect(queryResult[0].nickname).toBe(null);
    expect(queryResult[0].legal_name).toBe('홍길동');
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(0);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(2);
    let emailId = -1;
    for (const obj of queryResult) {
      switch (obj.email) {
        case 'test@test.com':
          expect(obj.primary_addr).toBe(0);
          expect(obj.verified).toBe(0);
          emailId = obj.id;
          break;
        case 'testuser1@gmail.com':
          expect(obj.primary_addr).toBe(1);
          expect(obj.verified).toBe(0);
          break;
        default:
          fail();
      }
    }
    queryResult = await testEnv.dbClient.query(
      `SELECT * FROM user_email_verify_ticket WHERE email_id=${emailId}`
    );
    expect(queryResult.length).toBe(1);
    const expectedExpire = new Date();
    expectedExpire.setDate(expectedExpire.getDate() + 2);
    expect(new Date(queryResult[0].expires) > expectedExpire).toBe(true);
    expectedExpire.setDate(expectedExpire.getDate() + 1);
    expect(new Date(queryResult[0].expires) < expectedExpire).toBe(true);
  });

  test('Success - Owner (Only delete email)', async () => {
    // Retrieve Email ID which will be deleted
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser2' AND email='charles@hotmail.com'"
    );
    const emailId = queryResult[0].id;

    // Login with testuser2
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser2', password: 'Password12!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      emailChange: [{email: 'charles@hotmail.com', requestType: 'delete'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser2')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(200);
    expect(response.body.message).toBeUndefined();

    // Other field unchanged
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser2'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe('Charles Kim');
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    expect(queryResult[0].legal_name).toBe('김철수');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser2'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].country_code).toBe(82);
    expect(queryResult[0].phone_number).toBe(1012345678);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser2'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].email).toBe('charles@gmail.com');
    expect(queryResult[0].primary_addr).toBe(1);
    expect(queryResult[0].verified).toBe(1);
    queryResult = await testEnv.dbClient.query(
      `SELECT * FROM user_email_verify_ticket WHERE email_id=${emailId}`
    );
    expect(queryResult.length).toBe(0);
  });

  test('Partial Success - Owner (Add Duplicated email)', async () => {
    // Login with testuser1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'testuser1@gmail.com', requestType: 'add'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Partially processed');

    // nickname
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe('Test Nickname');
    // affiliation
    expect(queryResult[0].school_company).toBe('PNU');
    expect(queryResult[0].major_department).toBe('Physics');
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('홍길동');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].country_code).toBe(82);
    expect(queryResult[0].phone_number).toBe(123456789);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].email).toBe('testuser1@gmail.com');
    expect(queryResult[0].primary_addr).toBe(1);
    expect(queryResult[0].verified).toBe(0);
    const emailId = queryResult[0].id;
    queryResult = await testEnv.dbClient.query(
      `SELECT * FROM user_email_verify_ticket WHERE email_id=${emailId}`
    );
    expect(queryResult.length).toBe(0);
  });

  test('Partial Success - Owner (delete primary email)', async () => {
    // Login with testuser2
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser2', password: 'Password12!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 1, phoneNumber: 1234567890},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'charles@gmail.com', requestType: 'delete'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser2')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Partially processed');

    // nickname
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser2'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe('Test Nickname');
    // affiliation
    expect(queryResult[0].school_company).toBe('PNU');
    expect(queryResult[0].major_department).toBe('Physics');
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('김철수');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser2'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].country_code).toBe(1);
    expect(queryResult[0].phone_number).toBe(1234567890);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser2'"
    );
    expect(queryResult.length).toBe(2);
    for (const obj of queryResult) {
      switch (obj.email) {
        case 'charles@gmail.com':
          expect(obj.primary_addr).toBe(1);
          expect(obj.verified).toBe(1);
          break;
        case 'charles@hotmail.com':
          expect(obj.primary_addr).toBe(0);
          expect(obj.verified).toBe(0);
          break;
        default:
          fail();
      }
    }
  });

  test('Success - Admin', async () => {
    // Login with admin1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'test@test.com', requestType: 'add'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(200);
    expect(response.body.message).toBeUndefined();

    // nickname
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe('Test Nickname');
    // affiliation
    expect(queryResult[0].school_company).toBe('PNU');
    expect(queryResult[0].major_department).toBe('Physics');
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('홍길동');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].country_code).toBe(82);
    expect(queryResult[0].phone_number).toBe(123456789);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(2);
    let emailId = -1;
    for (const obj of queryResult) {
      switch (obj.email) {
        case 'test@test.com':
          expect(obj.primary_addr).toBe(0);
          expect(obj.verified).toBe(0);
          emailId = obj.id;
          break;
        case 'testuser1@gmail.com':
          expect(obj.primary_addr).toBe(1);
          expect(obj.verified).toBe(0);
          break;
        default:
          fail();
      }
    }
    queryResult = await testEnv.dbClient.query(
      `SELECT * FROM user_email_verify_ticket WHERE email_id=${emailId}`
    );
    expect(queryResult.length).toBe(1);
    const expectedExpire = new Date();
    expectedExpire.setDate(expectedExpire.getDate() + 2);
    expect(new Date(queryResult[0].expires) > expectedExpire).toBe(true);
    expectedExpire.setDate(expectedExpire.getDate() + 1);
    expect(new Date(queryResult[0].expires) < expectedExpire).toBe(true);
  });

  test('Fail - Suspended Target User', async () => {
    // Login with admin1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'test@test.com', requestType: 'add'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/suspended1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Suspended User');

    // nickname
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='suspended1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe(null);
    // affiliation
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    // Other field
    expect(queryResult[0].legal_name).toBe('나불법');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='suspended1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].country_code).toBe(44);
    expect(queryResult[0].phone_number).toBe(2222567890);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='suspended1'"
    );
    expect(queryResult.length).toBe(2);
    for (const obj of queryResult) {
      switch (obj.email) {
        case 'noname@naver.com':
          expect(obj.primary_addr).toBe(1);
          expect(obj.verified).toBe(1);
          break;
        case 'noname@hanmail.net':
          expect(obj.primary_addr).toBe(0);
          expect(obj.verified).toBe(0);
          break;
        default:
          fail();
      }
    }
  });

  test('Fail - Deleted Target User', async () => {
    // Login with admin1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'test@test.com', requestType: 'add'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/deleted1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // nickname
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='deleted1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe(null);
    // affiliation
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    // Other field
    expect(queryResult[0].legal_name).toBe('김영희');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='deleted1'"
    );
    expect(queryResult.length).toBe(0);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='deleted1'"
    );
    expect(queryResult.length).toBe(0);
  });

  test('Fail - Suspended Update User', async () => {
    // Login with admin1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // User suspended
    await testEnv.dbClient.query(
      "UPDATE user SET status = 'suspended' WHERE username='admin1'"
    );

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'test@test.com', requestType: 'add'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // nickname
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe(null);
    // affiliation
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('홍길동');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(0);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].email).toBe('testuser1@gmail.com');
  });

  test('Fail - Deleted Update User', async () => {
    // Login with testuser1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // User deleted
    await testEnv.dbClient.query(
      "UPDATE user SET status = 'deleted' WHERE username='admin1'"
    );

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'test@test.com', requestType: 'add'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // nickname
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe(null);
    // affiliation
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('홍길동');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(0);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].email).toBe('testuser1@gmail.com');
  });

  test('Fail - Not Found (User not in DB)', async () => {
    // Login with testuser1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'test@test.com', requestType: 'add'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/notindb11')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });

  test('Fail - Bad Request (More field)', async () => {
    // Login with admin1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'test@test.com', requestType: 'add'}],
      updated: true,
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // nickname
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe(null);
    // affiliation
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('홍길동');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(0);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].email).toBe('testuser1@gmail.com');
  });

  test('Fail - Bad Request (No Field)', async () => {
    // Login with admin1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {};
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // nickname
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe(null);
    // affiliation
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('홍길동');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(0);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].email).toBe('testuser1@gmail.com');
  });

  test('Fail - Bad Request (Unknown email ops value)', async () => {
    // Login with admin1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'admin1', password: 'rootPW12!@'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'test@test.com', requestType: 'modify'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // nickname
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe(null);
    // affiliation
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('홍길동');

    // phoneNumber
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(0);

    // email / verify ticket
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].email).toBe('testuser1@gmail.com');
  });

  test('Fail - Authentication Error (Not the owner)', async () => {
    // Login with testuser1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'test@test.com', requestType: 'add'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser2')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // nickname
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser2'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe('Charles Kim');
    // affiliation
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('김철수');
  });

  test('Fail - Authentication Error (Missing Access Token)', async () => {
    // Login with testuser1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'test@test.com', requestType: 'add'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .send(changeUserForm);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // nickname
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe(null);
    // affiliation
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('홍길동');
  });

  test('Fail - Authentication Error (Invalid Access Token)', async () => {
    // Login with testuser1
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Modify user information
    const changeUserForm = {
      nickname: 'Test Nickname',
      phoneNumber: {countryCode: 82, phoneNumber: 123456789},
      affiliation: {schoolCompany: 'PNU', majorDepartment: 'Physics'},
      emailChange: [{email: 'test@test.com', requestType: 'add'}],
    };
    response = await request(testEnv.expressServer.app)
      .put('/user/testuser1')
      .set('Cookie', [`X-ACCESS-TOKEN=${refreshToken}`])
      .send(changeUserForm);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // nickname
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='testuser1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].nickname).toBe(null);
    // affiliation
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    // Other field unchanged
    expect(queryResult[0].legal_name).toBe('홍길동');
  });
});
