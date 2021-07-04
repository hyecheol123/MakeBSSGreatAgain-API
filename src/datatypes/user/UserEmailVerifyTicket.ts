/**
 * Define type and CRUD methods for each user_email_verify_ticket entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import * as crypto from 'crypto';
import ServerConfig from '../../ServerConfig';

/**
 * Class for UserEmailVerifyTicket
 */
export default class UserEmailVerifyTicket {
  id: string; // Unique hashed ticketId
  emailId: number;
  expires: Date;

  /**
   * Constructor for UserEmailVerifyTicket Object
   *
   * @param emailId unique email id associated with the entry of user_email
   * @param expires When the email verify ticket expires (3 days after creation)
   */
  constructor(emailId: number, expires: Date) {
    // Generate hashed ticketId
    let id = ServerConfig.hash(
      emailId.toString(),
      crypto.randomBytes(20).toString('base64'),
      expires.toISOString()
    );
    // Make BASE64 to BASE64URL
    id = id.replace('+', '-').replace('/', '_');

    this.id = id.substr(0, 44);
    this.emailId = emailId;
    this.expires = expires;
  }

  /**
   * Create new entry in user_email_verify_ticket
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param ticket UserEmailVerifyTicket information
   * @return {Promise<mariadb.UpsertResult>} db operation result
   */
  static async create(
    dbClient: mariadb.Pool,
    ticket: UserEmailVerifyTicket
  ): Promise<mariadb.UpsertResult> {
    return await dbClient.query(
      String.prototype.concat(
        'INSERT INTO user_email_verify_ticket ',
        '(id, email_id, expires) VALUES (?, ?, ?)'
      ),
      [ticket.id, ticket.emailId, ticket.expires]
    );
  }
}
