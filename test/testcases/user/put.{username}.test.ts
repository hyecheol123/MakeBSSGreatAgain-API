/**
 * Jest unit test for PUT /user/{username} method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import TestEnv from '../../TestEnv';

describe('PUT /user/{username} - Update user information', () => {
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

  // TODO: Success - Owner (with phoneNumber record)
  // TODO: Success - Owner (Only update nickname)
  // TODO: Success - Owner (Only update affiliation)
  // TODO: Success - Owner (Only update phoneNumber)
  // TODO: Success - Owner (Only add email)
  // TODO: Success - Owner (Only delete email)
  // TODO: Partial Success - Owner (Add Duplicated email)
  // TODO: Partial Success - Owner (delete primary email)
  // TODO: Success - Admin
  // TODO: Fail - Bad Request (More field)
  // TODO: Fail - Bad Request (No Field)
  // TODO: Fail - Bad Request (Unknown email ops value)
  // TODO: Fail - Authentication Error (Not the owner)
  // TODO: Fail - Authentication Error (Missing Access Token)
  // TODO: Fail - Authentication Error (Invalid Access Token)
});
