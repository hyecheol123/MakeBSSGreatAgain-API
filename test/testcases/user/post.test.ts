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

  test('Success - without english name', async () => {
    // request
    const newUserForm = {
      username: 'successtest',
      password: 'UserPassword12!',
      admissionYear: 10,
      nameKorean: '홍길동',
      email: 'gildong.hong@gmail.com',
    };
    const response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('successtest');

    // TODO DB Checks: user, user_email, user_email_ticket, user_phone_number(nothing)
  });

  test('Success - with english name', async () => {
    // request
    const newUserForm = {
      username: 'successtest',
      password: 'UserPassword12!',
      admissionYear: 10,
      nameKorean: '홍길동',
      nameEnglish: 'Gildong Hong',
      email: 'gildong.hong@gmail.com',
    };
    const response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('successtest');

    // TODO DB Checks: user, user_email, user_email_ticket, user_phone_number(nothing)
  });

  test('Success - all fields', async () => {
    // request
    const newUserForm = {
      username: 'successtest',
      password: 'UserPassword12!',
      admissionYear: 10,
      nameKorean: '홍길동',
      nameEnglish: 'Gildong Hong',
      email: 'gildong.hong@gmail.com',
      phoneNumber: {countryCode: 82, phoneNumber: 1234567890},
    };
    const response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('successtest');

    // TODO DB Checks: user, user_email, user_email_ticket, user_phone_number(nothing)
  });

  test('Fail - Missing Required Field', async () => {
    // request
    const newUserForm = {
      username: 'successtest',
      admissionYear: 10,
      nameKorean: '홍길동',
      nameEnglish: 'Gildong Hong',
      email: 'gildong.hong@gmail.com',
      phoneNumber: {countryCode: 82, phoneNumber: 1234567890},
    };
    const response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // TODO DB Checks: user(nothing)
  });

  test('Fail - Additional Field', async () => {
    // request
    const newUserForm = {
      username: 'successtest',
      password: 'UserPassword12!',
      admissionYear: 10,
      nameKorean: '홍길동',
      nameEnglish: 'Gildong Hong',
      nickname: '홍길순',
      email: 'gildong.hong@gmail.com',
      phoneNumber: {countryCode: 82, phoneNumber: 1234567890},
    };
    const response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // TODO DB Checks: user(nothing)
  });

  test('fail - username rule', async () => {
    // request
    const newUserForm = {
      username: '123456',
      password: 'UserPassword12!',
      admissionYear: 10,
      nameKorean: '홍길동',
      nameEnglish: 'Gildong Hong',
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

    // TODO DB Checks: user(nothing)
  });

  // Password Rule Test
  test('fail - password rule', async () => {
    // request
    const newUserForm = {
      username: 'successtest',
      password: 'UserPassword12',
      admissionYear: 10,
      nameKorean: '홍길동',
      nameEnglish: 'Gildong Hong',
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

    // TODO DB Checks: user(nothing)
  });

  test('fail - invalid admissionYear', async () => {
    // Maximum admission Year = 13
    MockDate.set(new Date('2015-03-10T00:50:43.000Z'));

    // request
    const newUserForm = {
      username: 'successtest',
      password: 'UserPassword12!',
      admissionYear: 0,
      nameKorean: '홍길동',
      nameEnglish: 'Gildong Hong',
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

    // TODO DB Checks: user(nothing)

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
      nameKorean: '홍길동',
      nameEnglish: 'Gildong Hong',
      email: 'gildong.hong@gmail.com',
      phoneNumber: {countryCode: 82, phoneNumber: 1234567890},
    };
    const response = await request(testEnv.expressServer.app)
      .post('/user')
      .send(newUserForm);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Duplicated Username');

    // TODO DB Checks: user(not changed)
  });
});
