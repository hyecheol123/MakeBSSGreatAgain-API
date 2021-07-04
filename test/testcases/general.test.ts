/**
 * Jest unit test for Express Server Setup (General Behaviors)
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import TestEnv from '../TestEnv';

describe('General Behaviors', () => {
  let testEnv: TestEnv;

  beforeAll(() => {
    jest.setTimeout(120000);
  });

  beforeEach(async () => {
    // Setup TestEnv
    testEnv = new TestEnv(expect.getState().currentTestName);

    // Start Test Environment
    await testEnv.start([]);
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Not Found', async () => {
    const response = await request(testEnv.expressServer.app)
      .post('/not-existing-path')
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });

  test('Not Permitted Methods', async () => {
    let response = await request(testEnv.expressServer.app)
      .options('/user')
      .send();
    expect(response.status).toBe(405);
    expect(response.body.error).toBe('Method Not Allowed');

    response = await request(testEnv.expressServer.app).trace('/user').send();
    expect(response.status).toBe(405);
    expect(response.body.error).toBe('Method Not Allowed');

    response = await request(testEnv.expressServer.app).patch('/user').send();
    expect(response.status).toBe(405);
    expect(response.body.error).toBe('Method Not Allowed');
  });
});
