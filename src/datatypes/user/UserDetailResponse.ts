/**
 * Define type and Read Methods (DB) for the object contains User's detail
 * that will be return as a response of GET /user/{username}
 *
 * password, memberSince, user status and admin status should not be included at all time.
 * phoneNumber is retrieved only when admin account or account owner calls the method.
 * For admin account and account owner,
 * list of all email addresses associated with the account will be returned,
 * while the others will get verified primary email account only.
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as mariadb from 'mariadb';
import User from './User';
import UserEmail from './UserEmail';
import UserEmailResponse from './UserEmailResponse';
import UserPhoneNumber from './UserPhoneNumber';
import NotFoundError from '../../exceptions/NotFoundError';

/**
 * Class for UserDetailResponse
 */
export default class UserDetailResponse {
  username: string;
  admissionYear: number;
  legalName: string;
  nickname?: string;
  email: UserEmailResponse[];
  phoneNumber?: {countryCode: number; phoneNumber: number};
  affiliation?: {schoolCompany: string; majorDepartment: string};

  /**
   * Constructor for UserDetailResponse with required fields
   *
   * @param username username associated with the target user
   * @param admissionYear admission year of the user
   * @param legalName legal name of the user
   * @param email email associated with the user
   */
  constructor(
    username: string,
    admissionYear: number,
    legalName: string,
    email: UserEmailResponse[]
  ) {
    this.username = username;
    this.admissionYear = admissionYear;
    this.legalName = legalName;
    this.email = email;
  }

  /**
   * Get UserDetailResponse for non-admin/non-owner users' request
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param username username associated with the search target
   * @return {Promise<UserDetailResponse>}
   *   UserDetailResponse for non-admin/non-owner users' request
   */
  static async read(
    dbClient: mariadb.Pool,
    username: string
  ): Promise<UserDetailResponse> {
    const queryResult = await dbClient.query(
      String.prototype.concat(
        'SELECT * FROM user ',
        'LEFT JOIN user_email ',
        'ON user.username = user_email.username',
        'AND user_email.primary_addr = true,',
        'AND user_email.verified = true',
        'WHERE user.username = ?,'
      ),
      username
    );

    if (queryResult.length !== 1) {
      throw new NotFoundError();
    }

    // Generate UserDetailResponse Object
    let response: UserDetailResponse;
    if (queryResult[0].verified === null) {
      // Email not yet verified
      response = new UserDetailResponse(
        queryResult[0].username,
        queryResult[0].admission_year,
        queryResult[0].legal_name,
        []
      );
    } else {
      // Email verified
      const email: UserEmailResponse = {
        email: queryResult[0].email,
        primaryAddr: true,
        verified: true,
      };
      response = new UserDetailResponse(
        queryResult[0].username,
        queryResult[0].admission_year,
        queryResult[0].legal_name,
        [email]
      );
    }
    if (queryResult[0].nickname) {
      response.nickname = queryResult[0].nickname;
    }
    if (queryResult[0].major_department && queryResult[0].school_company) {
      response.affiliation = {
        majorDepartment: queryResult[0].major_department,
        schoolCompany: queryResult[0].school_company,
      };
    }

    return response;
  }

  /**
   * Get UserDetailResponse for admin/owner users' request
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param username username associated with the search target
   * @return {Promise<UserDetailResponse>}
   *   UserDetailResponse for admin/owner users' request
   */
  static async readAdminOwner(
    dbClient: mariadb.Pool,
    username: string
  ): Promise<UserDetailResponse> {
    const queries = await Promise.all([
      User.read(dbClient, username),
      UserEmail.read(dbClient, username),
      UserPhoneNumber.read(dbClient, username),
    ]);

    const response = new UserDetailResponse(
      queries[0].username,
      queries[0].admissionYear,
      queries[0].legalName,
      queries[1]
    );
    if (queries[0].nickname) {
      response.nickname = queries[0].nickname;
    }
    if (queries[0].majorDepartment && queries[0].schoolCompany) {
      response.affiliation = {
        majorDepartment: queries[0].majorDepartment,
        schoolCompany: queries[0].schoolCompany,
      };
    }
    if (queries[2] !== null) {
      response.phoneNumber = {
        countryCode: queries[2].countryCode,
        phoneNumber: queries[2].phoneNumber,
      };
    }
    return response;
  }
}
