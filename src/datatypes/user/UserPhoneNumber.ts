/**
 * Define type and CRUD methods for each user_phone_number entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import NotFoundError from '../../exceptions/NotFoundError';

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

  /**
   * Update User's PhoneNumber
   *
   * @param dbClient DB Connection Pool
   * @param username username associated with the User
   * @param countryCode new countryCode to be updated
   * @param phoneNumber new phoneNumber to be updated
   */
  static async update(
    dbClient: mariadb.Pool,
    username: string,
    countryCode: number,
    phoneNumber: number
  ): Promise<void> {
    const queryResult = await dbClient.query(
      String.prototype.concat(
        'UPDATE user_phone_number as UPN ',
        'INNER JOIN user as U ',
        'ON UPN.username = ? ',
        'AND (U.status = "verified" OR U.status = "unverified") ',
        'SET UPN.country_code = ?, UPN.phone_number = ?;'
      ),
      [username, countryCode, phoneNumber]
    );

    if (queryResult.affectedRows !== 1) {
      throw new NotFoundError();
    }
  }
}
