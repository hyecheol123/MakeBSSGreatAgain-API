/**
 * Define type and CRUD methods for each user entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import LoginCredentials from '../authentication/LoginCredentials';
import HTTPError from '../../exceptions/HTTPError';

/**
 * Class for User
 */
export default class User implements LoginCredentials {
  username: string;
  password: string; // Hashed Password
  memberSince: Date;
  admissionYear: number;
  legalName: string;
  nickname: string | null | undefined; // null for DB
  schoolCompany: string | null | undefined; // how about default value like 'BSS'
  majorPosition: string | null | undefined; // how about default value like 'alumni'
  status: 'verified' | 'unverified' | 'suspended' | 'deleted';
  admin: boolean;

  /**
   * Constructor for User Object
   *
   * @param username unique username of the user (Maximum 12 character)
   * @param password user's password
   * @param memberSince When user signed up
   * @param admissionYear When user admitted to BSS (year 2003 -> admissionYear 1)
   * @param legalName Korean name of user
   * @param status member status (either 'verified' | 'unverified' | 'suspended' | 'deleted')
   * @param admin whether the user is admin or not
   * @param nickname optional field for nickname of user
   * @param schoolCompany optional field for School/Company info of user
   * @param majorPosition optional field for Major/Position of user
   */
  constructor(
    username: string,
    password: string,
    memberSince: Date,
    admissionYear: number,
    legalName: string,
    status: 'verified' | 'unverified' | 'suspended' | 'deleted',
    admin: boolean,
    nickname?: string,
	schoolCompany?: string,
	majorPosition?: string
  ) {
    this.username = username;
    this.password = password;
    this.memberSince = memberSince;
    this.admissionYear = admissionYear;
    this.legalName = legalName;
    this.nickname = nickname;
	this.schoolCompany = schoolCompany;
	this.majorPosition = majorPosition;
    this.status = status;
    this.admin = admin;
  }

  /**
   * Create new entry in user table
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param user User Information
   * @return {Promise<mariadb.UpsertResult>} db operation result
   */
  static async create(
    dbClient: mariadb.Pool,
    user: User
  ): Promise<mariadb.UpsertResult> {
    if (user.nickname === undefined) {
      user.nickname = null;
    }
    try {
      return await dbClient.query(
        String.prototype.concat(
          'INSERT INTO user ',
          '(username, password, membersince, admission_year, legal_name, nickname, status, admin) ',
          'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ),
        [
          user.username,
          user.password,
          user.memberSince,
          user.admissionYear,
          user.legalName,
          user.nickname,
          user.status,
          user.admin,
        ]
      );
    } catch (e) {
      /* istanbul ignore else */
      if (e.code === 'ER_DUP_ENTRY') {
        throw new HTTPError(400, 'Duplicated Username');
      } else {
        throw e;
      }
    }
  }
}
