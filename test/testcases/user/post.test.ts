/**
 * Jest unit test for POST /user method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
// eslint-disable-next-line node/no-unpublished-import
import MockDate from 'mockdate';
import TestEnv from '../../TestEnv';
import TestConfig from '../../TestConfig';

describe('POST /user - create new user', () => {
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

  test('Success - without nickname', async () => {
    // request
    const newUserForm = {
      username: 'successtest',
      password: 'UserPassword12!',
      admissionYear: 10,
      legalName: '홍길동',
      email: 'gildong.hong@gmail.com',
    };
    const response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('successtest');

    // DB Checks
    // user table
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].admission_year).toBe(10);
    expect(queryResult[0].legal_name).toBe('홍길동');
    expect(queryResult[0].nickname).toBe(null);
    expect(queryResult[0].status).toBe('unverified');
    expect(queryResult[0].admin).toBe(0); // False is 0
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'successtest',
        new Date(queryResult[0].membersince).toISOString(),
        'UserPassword12!'
      )
    );
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    // user_email table
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].email).toBe('gildong.hong@gmail.com');
    expect(queryResult[0].primary_addr).toBe(1); // true
    expect(queryResult[0].verified).toBe(0); // false
    const emailId = queryResult[0].id;
    // user_email_verify_ticket table
    queryResult = await testEnv.dbClient.query(
      `SELECT * FROM user_email_verify_ticket WHERE email_id=${emailId}`
    );
    expect(queryResult.length).toBe(1);
    const expectedExpire = new Date();
    expectedExpire.setDate(expectedExpire.getDate() + 2);
    expect(new Date(queryResult[0].expires) > expectedExpire).toBe(true);
    expectedExpire.setDate(expectedExpire.getDate() + 1);
    expect(new Date(queryResult[0].expires) < expectedExpire).toBe(true);
    // user_phone_number table
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(0);
  });

  test('Success - with nickname', async () => {
    // request
    const newUserForm = {
      username: 'successtest',
      password: 'UserPassword12!',
      admissionYear: 10,
      legalName: '홍길동',
      nickname: 'Road Hong',
      email: 'gildong.hong@gmail.com',
    };
    const response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('successtest');

    // DB Checks
    // user table
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].admission_year).toBe(10);
    expect(queryResult[0].legal_name).toBe('홍길동');
    expect(queryResult[0].nickname).toBe('Road Hong');
    expect(queryResult[0].status).toBe('unverified');
    expect(queryResult[0].admin).toBe(0); // False is 0
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'successtest',
        new Date(queryResult[0].membersince).toISOString(),
        'UserPassword12!'
      )
    );
    expect(queryResult[0].school_company).toBe(null);
    expect(queryResult[0].major_department).toBe(null);
    // user_email table
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].email).toBe('gildong.hong@gmail.com');
    expect(queryResult[0].primary_addr).toBe(1); // true
    expect(queryResult[0].verified).toBe(0); // false
    const emailId = queryResult[0].id;
    // user_email_verify_ticket table
    queryResult = await testEnv.dbClient.query(
      `SELECT * FROM user_email_verify_ticket WHERE email_id=${emailId}`
    );
    expect(queryResult.length).toBe(1);
    const expectedExpire = new Date();
    expectedExpire.setDate(expectedExpire.getDate() + 2);
    expect(new Date(queryResult[0].expires) > expectedExpire).toBe(true);
    expectedExpire.setDate(expectedExpire.getDate() + 1);
    expect(new Date(queryResult[0].expires) < expectedExpire).toBe(true);
    // user_phone_number table
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(0);
  });

  test('Success - all fields', async () => {
    // request
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
    const response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('successtest');

    // DB Checks
    // user table
    let queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].admission_year).toBe(10);
    expect(queryResult[0].legal_name).toBe('홍길동');
    expect(queryResult[0].nickname).toBe('Road Hong');
    expect(queryResult[0].status).toBe('unverified');
    expect(queryResult[0].admin).toBe(0); // False is 0
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'successtest',
        new Date(queryResult[0].membersince).toISOString(),
        'UserPassword12!'
      )
    );
    expect(queryResult[0].school_company).toBe('Busan Science High School');
    expect(queryResult[0].major_department).toBe('student');
    // user_email table
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_email WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].email).toBe('gildong.hong@gmail.com');
    expect(queryResult[0].primary_addr).toBe(1); // true
    expect(queryResult[0].verified).toBe(0); // false
    const emailId = queryResult[0].id;
    // user_email_verify_ticket table
    queryResult = await testEnv.dbClient.query(
      `SELECT * FROM user_email_verify_ticket WHERE email_id=${emailId}`
    );
    expect(queryResult.length).toBe(1);
    const expectedExpire = new Date();
    expectedExpire.setDate(expectedExpire.getDate() + 2);
    expect(new Date(queryResult[0].expires) > expectedExpire).toBe(true);
    expectedExpire.setDate(expectedExpire.getDate() + 1);
    expect(new Date(queryResult[0].expires) < expectedExpire).toBe(true);
    // user_phone_number table
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user_phone_number WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].country_code).toBe(82);
    expect(queryResult[0].phone_number).toBe(1234567890);
  });

  test('Fail - Missing Required Field', async () => {
    // request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newUserForm: any = {
      username: 'successtest',
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
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // Without required field in nested object
    // without phoneNumber.phoneNumber
    newUserForm.phoneNumber = {countryCode: 82};
    newUserForm.password = 'UserPassword12!';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // Without affiliation.majorDepartment
    newUserForm.phoneNumber = {countryCode: 82, phoneNumber: 1234567890};
    newUserForm.affiliation = {schoolCompany: 'Busan Science High School'};
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // Empty object body
    response = await request(testEnv.expressServer.app).post('/user').send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Checks
    // user table
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(0);
  });

  test('Fail - Additional Field', async () => {
    // request
    const newUserForm = {
      username: 'successtest',
      password: 'UserPassword12!',
      admissionYear: 10,
      legalName: '홍길동',
      nickname: 'Road Hong',
      nameEnglish: 'Gildong Hong',
      email: 'gildong.hong@gmail.com',
      phoneNumber: {countryCode: 82, phoneNumber: 1234567890},
    };
    const response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Checks
    // user table
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(0);
  });

  test('fail - username rule', async () => {
    // request
    const newUserForm = {
      username: '123456',
      password: 'UserPassword12!',
      admissionYear: 10,
      legalName: '홍길동',
      nickname: 'Road Hong',
      email: 'gildong.hong@gmail.com',
      phoneNumber: {countryCode: 82, phoneNumber: 1234567890},
    };
    let response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.username = '1abcdef';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.username = 'Abcdef';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.username = 'abcd@f';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.username = 'abcde';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.username = 'abcdefabcdef1';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Checks
    // user table
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(0);
  });

  // Password Rule Test
  test('fail - password rule', async () => {
    // request
    const newUserForm = {
      username: 'successtest',
      password: 'UserPassword12',
      admissionYear: 10,
      legalName: '홍길동',
      nickname: 'Road Hong',
      email: 'gildong.hong@gmail.com',
      phoneNumber: {countryCode: 82, phoneNumber: 1234567890},
    };
    let response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.password = 'UserPassword!';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.password = 'userpassword12!';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.password = 'USERPASSWORD12!';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.password = 'UserPassword12()';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.password = 'abcUserPassword12!';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.password = 'aaaUserPassword12!';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.password = 'cbaUserPassword12!';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.password = 'sucUserPassword12!';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.password = 'cusUserPassword12!';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.password = 'User12!';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.password =
      'User1234!!User1234!!User1234!!User1234!!User1234!!22';
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Checks
    // user table
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(0);
  });

  test('fail - invalid admissionYear', async () => {
    // Maximum admission Year = 13
    MockDate.set(new Date('2015-03-10T00:50:43.000Z'));

    // request
    const newUserForm = {
      username: 'successtest',
      password: 'UserPassword12!',
      admissionYear: 0,
      legalName: '홍길동',
      nickname: 'Road Hong',
      email: 'gildong.hong@gmail.com',
      phoneNumber: {countryCode: 82, phoneNumber: 1234567890},
    };
    let response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.admissionYear = -1;
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    newUserForm.admissionYear = 14;
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Checks
    // user table
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='successtest'"
    );
    expect(queryResult.length).toBe(0);

    // Success at 13
    newUserForm.admissionYear = 13;
    response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('successtest');
  });

  test('Fail - Duplicated username', async () => {
    // request
    const newUserForm = {
      username: 'admin1',
      password: 'UserPassword12!',
      admissionYear: 10,
      legalName: '홍길동',
      nickname: 'Road Hong',
      email: 'gildong.hong@gmail.com',
      phoneNumber: {countryCode: 82, phoneNumber: 1234567890},
    };
    const response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Duplicated Username');

    // DB Checks
    // user table
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM user WHERE username='admin1'"
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].admission_year).toBe(6);
    expect(queryResult[0].legal_name).toBe('최영재');
    expect(queryResult[0].nickname).toBe('나똑똑');
    expect(queryResult[0].status).toBe('verified');
    expect(queryResult[0].admin).toBe(1); // False is 0
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'admin1',
        new Date(queryResult[0].membersince).toISOString(),
        'rootPW12!@'
      )
    );
  });
});
