/**
 * Define type and CRUD methods for each user_phone_number entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';

/**
 * Class for UserPhoneNumber
 */
export default class UserPhoneNumber {
  username: string;
  countryCode: number;
  phoneNumber: number;

  /**
   * Constructor for UserPhoneNumber Object
   *
   * @param username username associated with the phone number
   * @param countryCode country code of the number
   * @param phoneNumber remaining part of the number
   */
  constructor(username: string, countryCode: number, phoneNumber: number) {
    this.username = username;
    this.countryCode = countryCode;
    this.phoneNumber = phoneNumber;
  }

  /**
   * Create new entry in phone_number table
   * - When duplicated username found,update the content
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param phoneNumber UserPhoneNumber Information
   */
  static async createUpdate(
    dbClient: mariadb.Pool,
    phoneNumber: UserPhoneNumber
  ): Promise<void> {
    await dbClient.query(
      String.prototype.concat(
        'INSERT INTO user_phone_number ',
        '(username, country_code, phone_number) VALUES (?, ?, ?) ',
        'ON DUPLICATE KEY UPDATE country_code = ?, phone_number = ?'
      ),
      [
        phoneNumber.username,
        phoneNumber.countryCode,
        phoneNumber.phoneNumber,
        phoneNumber.countryCode,
        phoneNumber.phoneNumber,
      ]
    );
  }

  /**
   * Retrieve an existing user_phone_number entry associated with given username
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param username username associated with the user_phone_number entry
   */
  static async read(
    dbClient: mariadb.Pool,
    username: string
  ): Promise<UserPhoneNumber | null> {
    const queryResult = await dbClient.query(
      'SELECT * FROM user_phone_number WHERE username = ?',
      username
    );
    if (queryResult.length !== 0) {
      return {
        username: queryResult[0].username,
        countryCode: queryResult[0].country_code,
        phoneNumber: queryResult[0].phone_number,
      };
    } else {
      return null;
    }
  }
}
