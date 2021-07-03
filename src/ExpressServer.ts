/**
 * Express application middleware dealing with the API requests
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as express from 'express';
import * as mariadb from 'mariadb';
import * as redis from 'redis';
import * as cookieParser from 'cookie-parser';
import ServerConfig from './ServerConfig';
import HTTPError from './exceptions/HTTPError';
import userRouter from './routes/user';

/**
 * Class contains Express Application and other relevant instances/functions
 */
export default class ExpressServer {
  app: express.Application;

  /**
   * Constructor for ExpressServer
   *
   * @param config Server's configuration variables
   */
  constructor(config: ServerConfig) {
    // Setup Express Application
    this.app = express();
    // Create DB Connection pool and link to the express application
    this.app.locals.dbClient = mariadb.createPool({
      host: config.db.url,
      port: config.db.port,
      user: config.db.username,
      password: config.db.password,
      database: config.db.defaultDatabase,
      compress: true,
    });
    // Create Redis Client and link to the express application
    this.app.locals.redisClient = redis.createClient(config.redis);

    // JWT Keys
    this.app.set('jwtAccessKey', config.jwt.secretKey);
    this.app.set('jwtRefreshKey', config.jwt.refreshKey);

    // Setup Parsers
    this.app.use(express.json());
    this.app.use(cookieParser());

    // Only Allow GET, POST, DELETE, PUT method
    this.app.use(
      (
        req: express.Request,
        _res: express.Response,
        next: express.NextFunction
      ): void => {
        // Check HTTP methods
        if (!['GET', 'POST', 'DELETE', 'PUT', 'HEAD'].includes(req.method)) {
          next(new HTTPError(405, 'Method Not Allowed'));
        } else {
          next();
        }
      }
    );

    // Routers
    this.app.use('/user', userRouter);

    // Default Error Handler
    this.app.use(
      (
        err: HTTPError | Error,
        _req: express.Request,
        res: express.Response,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _next: express.NextFunction
      ): void => {
        /* istanbul ignore next */
        if (!(err instanceof HTTPError)) {
          console.error(err);
          err = new HTTPError(500, 'Server Error');
        }
        res.status((err as HTTPError).statusCode).json({error: err.message});
      }
    );

    this.app.use((req, res) => {
      res.status(404).send({error: 'Not Found'});
    });
  }

  /**
   * CLose Server
   * - Close connection with Database/Redis server gracefully
   * - Flush Log
   */
  async closeServer(): Promise<void> {
    await this.app.locals.dbClient.end();
    this.app.locals.redisClient.end(true);
  }
}
