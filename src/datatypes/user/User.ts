/**
 * Define type and CRUD methods for each user entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import LoginCredentials from '../authentication/LoginCredentials';
import NotFoundError from '../../exceptions/NotFoundError';
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
  schoolCompany: string | null | undefined; // null for DB
  majorDepartment: string | null | undefined; // null for DB
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
   * @param majorDepartment optional field for Major/Department of user
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
    majorDepartment?: string
  ) {
    this.username = username;
    this.password = password;
    this.memberSince = memberSince;
    this.admissionYear = admissionYear;
    this.legalName = legalName;
    this.nickname = nickname;
    this.schoolCompany = schoolCompany;
    this.majorDepartment = majorDepartment;
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
    if (user.schoolCompany === undefined) {
      user.schoolCompany = null;
    }
    if (user.majorDepartment === undefined) {
      user.majorDepartment = null;
    }
    try {
      return await dbClient.query(
        String.prototype.concat(
          'INSERT INTO user ',
          '(username, password, membersince, admission_year, legal_name, nickname, school_company, major_department, status, admin) ',
          'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ),
        [
          user.username,
          user.password,
          user.memberSince,
          user.admissionYear,
          user.legalName,
          user.nickname,
          user.schoolCompany,
          user.majorDepartment,
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

  /**
   * Retrieve an User entry from DB
   *
   * @param dbClient DB Connection Pool
   * @param username username associated with the User
   * @return {Promise<User>} return information of User associated with the username
   */
  static async read(dbClient: mariadb.Pool, username: string): Promise<User> {
    const queryResult = await dbClient.query(
      'SELECT * FROM user WHERE username = ?',
      username
    );
    if (queryResult.length !== 1) {
      throw new NotFoundError();
    }

    queryResult[0].admin = queryResult[0].admin === 1;
    const user = new User(
      queryResult[0].username,
      queryResult[0].password,
      new Date(queryResult[0].membersince),
      queryResult[0].admission_year,
      queryResult[0].legal_name,
      queryResult[0].status,
      queryResult[0].admin,
      queryResult[0].nickname,
      queryResult[0].school_company,
      queryResult[0].major_department
    );

    if (user.nickname === null) {
      user.nickname = undefined;
    }
    if (user.majorDepartment === null) {
      user.majorDepartment = undefined;
    }
    if (user.schoolCompany === null) {
      user.schoolCompany = undefined;
    }

    return user;
  }

  /**
   * Update User's Password
   *
   * @param dbClient DB Connection Pool
   * @param username username associated with the User
   * @param hashedPassword new password to be updated (need to be hashed)
   * @return {Promise<mariadb.UpsertResult>} db operation result
   */
  static async updatePassword(
    dbClient: mariadb.Pool,
    username: string,
    hashedPassword: string
  ): Promise<mariadb.UpsertResult> {
    return await dbClient.query(
      'UPDATE user SET password = ? WHERE username = ?;',
      [hashedPassword, username]
    );
  }
	
  /**
   * Update User's Nickname
   *
   * @param dbClient DB Connection Pool
   * @param username username associated with the User
   * @param nickname new nickname to be updated
   */
	
  static async updateNickname(
    dbClient: mariadb.Pool,
    username: string,
    nickname: string
  ): Promise<void> {
	const queryResult = await dbClient.query(
      'UPDATE user SET nickname = ? WHERE username = ? AND (status = "verified" OR status = "unverified");',
      [nickname, username]
    );
		
	if (queryResult.affectedRows !== 1) {
      throw new NotFoundError();
    }
  }
	
  /**
   * Update User's Affiliation
   *
   * @param dbClient DB Connection Pool
   * @param username username associated with the User
   * @param schoolCompany new school/company info to be updated
   * @param majorDepartment new major/department info to be updated
   */
	
  static async updateAffiliation(
    dbClient: mariadb.Pool,
    username: string,
    schoolCompany: string,
	majorDepartment: string
  ): Promise<void> {
	const queryResult = await dbClient.query(
      'UPDATE user SET school_company = ?, major_department = ? WHERE username = ? AND (status = "verified" OR status = "unverified");',
      [schoolCompany, majorDepartment, username]
    );
		
	if (queryResult.affectedRows !== 1) {
      throw new NotFoundError();
    }
  }
}