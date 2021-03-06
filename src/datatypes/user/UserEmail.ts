/**
 * Define type and CRUD methods for each user_email entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import UserEmailResponse from './UserEmailResponse';
import NotFoundError from '../../exceptions/NotFoundError';

/**
 * Class for UserEmail
 */
export default class UserEmail {
  username: string;
  email: string;
  primaryAddr: boolean;
  verified: boolean;

  /**
   * Constructor for UserEmail Object
   *
   * @param username username associated with the email address
   * @param email email address
   * @param primary whether the email address is primary or not
   * @param verified whether the email is verified or not
   */
  constructor(
    username: string,
    email: string,
    primary: boolean,
    verified: boolean
  ) {
    this.username = username;
    this.email = email;
    this.primaryAddr = primary;
    this.verified = verified;
  }

  /**
   * Create new entry in user_email table
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param email UserEmail Information
   * @return {Promise<mariadb.UpsertResult>} db operation result
   */
  static async create(
    dbClient: mariadb.Pool,
    email: UserEmail
  ): Promise<mariadb.UpsertResult> {
    return await dbClient.query(
      String.prototype.concat(
        'INSERT INTO user_email ',
        '(username, email, primary_addr, verified) VALUES (?, ?, ?, ?)'
      ),
      [email.username, email.email, email.primaryAddr, email.verified]
    );
  }

  /**
   * Retrieve user_email entry
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param username username associated with the user_email entries
   * @return {Promise<UserEmailResponse[]>} Array of UserEmailResponse with email addresses associated with the user
   */
  static async read(
    dbClient: mariadb.Pool,
    username: string
  ): Promise<UserEmailResponse[]> {
    const queryResult = await dbClient.query(
      'SELECT * FROM user_email WHERE username = ?',
      username
    );

    const response: UserEmailResponse[] = [];
    for (const i of queryResult) {
      i.primary_addr = i.primary_addr === 1;
      i.verified = i.verified === 1;

      response.push({
        email: i.email,
        primaryAddr: i.primary_addr,
        verified: i.verified,
      });
    }
    return response;
  }

  /**
   * Delete an user_email entry
   * Only able to delete non-primary address
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param username username associated with the user_email entries
   * @param email email of username which associated with the user_email entries
   */
  static async delete(
    dbClient: mariadb.Pool,
    username: string,
    email: string
  ): Promise<void> {
    const queryResult = await dbClient.query(
      'DELETE FROM user_email WHERE username = ? AND email = ? AND primary_addr = 0;',
      [username, email]
    );

    if (queryResult.affectedRows !== 1) {
      throw new NotFoundError();
    }
  }
}
