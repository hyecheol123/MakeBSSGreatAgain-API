/**
 * Define type and CRUD methods for each user_email entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import UserEmailResponse from './UserEmailResponse';

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
   * Update User's email
   *
   * @param dbClient DB Connection Pool
   * @param username username associated with the User
   * @param email new email info to be updated
   * @param requestType determine update between delete and add
   */
	
  static async updateEmail(
    dbClient: mariadb.Pool,
    username: string,
    email: string,
	requestType: string
  ): Promise<void> {
	if (requestType === 'delete') {
	  const primaryCheck = await dbClient.query(
	    'SELECT * FROM user_email WHERE username = ? AND email = ? AND primary_addr = ?',
	    [username, email, 'false']
	  ); // check whether email is primary one or not
	  if (primaryCheck.length !== 1) {
	    throw new BadRequestError();
	  }
	  else {
	    const queryResult = await dbClient.query(
	      'DELETE FROM user_email WHERE username = ? AND email = ?',
		  [username, email]
		);
		if (queryResult.affectedRows !== 1) {
    	  throw new NotFoundError();
    	}
	  }
	}
	else if (requestType === 'add') {
	  const dubplicationCheck = await dbClient.query(
	    'SELECT * FROM user_email WHERE email = ?',
	    email
	  ); // check whether there are dubplicated email or not
	  if (dubplicationCheck.length !== 0) {
	    throw new BadRequestError();
	  }
	  else {
		try { // from here, same as Create function in User.ts
		  // create new UserEmail
		  const userEmail = new UserEmail(
		    username,
		    email,
		    false,
		    false
		  );
		  const userEmailDBOps = UserEmail.create(dbClient, userEmail);
		  
		  // UserEmailVerify
    	  const emailId = (await userEmailDBOps).insertId;
    	  const emailVerifyTicketExpire = new Date(memberSince.toISOString());
    emailVerifyTicketExpire.setDate(emailVerifyTicketExpire.getDate() + 3);
    	  const userEmailVerifyTicket = new UserEmailVerifyTicket(
      	    emailId,
      	    emailVerifyTicketExpire
    	  );
    	  const userEmailVerifyTicketDBOps = UserEmailVerifyTicket.create(
      	    dbClient,
      	    userEmailVerifyTicket
    	  );
		  // TODO: Send Email Verify Notice (AWS Lambda + SES)
		  // Resolve Promises (DB Ops)
		  await Promise(userEmailVerifyTicketDBOps);
		  
		  // Response
		  //res.status(200).json({username: username});
		} catch (e) {
		  //next(e);
		}
	  }	
	}
	else {
		throw new BadRequestError();
	}
  }
}
