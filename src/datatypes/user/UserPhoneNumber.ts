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
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param phoneNumber UserPhoneNumber Information
   */
  static async create(
    dbClient: mariadb.Pool,
    phoneNumber: UserPhoneNumber
  ): Promise<void> {
    await dbClient.query(
      String.prototype.concat(
        'INSERT INTO user_phone_number ',
        '(username, country_code, phone_number) VALUES (?, ?, ?)'
      ),
      [phoneNumber.username, phoneNumber.countryCode, phoneNumber.phoneNumber]
    );
  }
}
