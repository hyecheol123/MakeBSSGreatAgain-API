/**
 * Define type and CRUD methods for each user_email entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';

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
   */
  static async create(dbClient: mariadb.Pool, email: UserEmail): Promise<void> {
    await dbClient.query(
      String.prototype.concat(
        'INSERT INTO user_email ',
        '(username, email, primary_addr, verified) VALUES (?, ?, ?, ?)'
      ),
      [email.username, email.email, email.primaryAddr, email.verified]
    );
  }
}
