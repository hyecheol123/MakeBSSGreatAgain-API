/**
 * express Router middleware for User APIs
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as express from 'express';
import * as mariadb from 'mariadb';
import ServerConfig from '../ServerConfig';
import {validateNewUserForm} from '../functions/inputValidator/validateNewUserForm';
import {validateChangeUserForm} from '../functions/inputValidator/validateChangeUserForm';
import usernameRule from '../functions/inputValidator/usernameRule';
import passwordRule from '../functions/inputValidator/passwordRule';
import accessTokenVerify from '../functions/JWT/accessTokenVerify';
import AuthenticationError from '../exceptions/AuthenticationError';
import BadRequestError from '../exceptions/BadRequestError';
import NewUserForm from '../datatypes/user/NewUserForm';
import ChangeUserForm from '../datatypes/user/ChangeUserForm';
import User from '../datatypes/user/User';
import UserEmail from '../datatypes/user/UserEmail';
import UserEmailVerifyTicket from '../datatypes/user/UserEmailVerifyTicket';
import UserPhoneNumber from '../datatypes/user/UserPhoneNumber';
import UserDetailResponse from '../datatypes/user/UserDetailResponse';

/**
 * Helper function to add new email and send verify ticket to the email
 *
 * @param dbClient DB Connection Pool (MariaDB)
 * @param userEmail UserEmail Information
 * @return {Promise<mariadb.UpsertResult>} UserEmailVerifyTicket DB Ops result
 */
async function addNewEmail(
  dbClient: mariadb.Pool,
  userEmail: UserEmail
): Promise<mariadb.UpsertResult> {
  const userEmailDBOps = await UserEmail.create(dbClient, userEmail);

  // UserEmailVerify
  const emailId = userEmailDBOps.insertId;
  const emailVerifyTicketExpire = new Date();
  emailVerifyTicketExpire.setDate(emailVerifyTicketExpire.getDate() + 3);
  const userEmailVerifyTicket = new UserEmailVerifyTicket(
    emailId,
    emailVerifyTicketExpire
  );
  const userEmailVerifyTicketDBOps = await UserEmailVerifyTicket.create(
    dbClient,
    userEmailVerifyTicket
  );

  // TODO: Send Email Verify Notice (AWS Lambda + SES)
  console.log(userEmail.email);

  return Promise.resolve(userEmailVerifyTicketDBOps);
}

// Path: /user
const userRouter = express.Router();

// POST /user
userRouter.post('/', async (req, res, next) => {
  const dbClient = req.app.locals.dbClient;
  try {
    // Verify User's Input
    const newUserForm: NewUserForm = req.body;
    if (!validateNewUserForm(newUserForm)) {
      throw new BadRequestError();
    }
    // Username & Password rule Check
    if (!usernameRule(newUserForm.username)) {
      throw new BadRequestError();
    }
    if (!passwordRule(newUserForm.username, newUserForm.password)) {
      throw new BadRequestError();
    }

    // Hash Password
    const memberSince = new Date();
    memberSince.setMilliseconds(0);
    const hashedPW = ServerConfig.hash(
      newUserForm.username,
      memberSince.toISOString(),
      newUserForm.password
    );

    // User
    if (
      newUserForm.admissionYear + 2002 > memberSince.getFullYear() ||
      newUserForm.admissionYear < 1
    ) {
      throw new BadRequestError();
    }
    const user = new User(
      newUserForm.username,
      hashedPW,
      memberSince,
      newUserForm.admissionYear,
      newUserForm.legalName,
      'unverified',
      false,
      newUserForm.nickname
    );
    if (newUserForm.affiliation !== undefined) {
      user.schoolCompany = newUserForm.affiliation.schoolCompany;
      user.majorDepartment = newUserForm.affiliation.majorDepartment;
    }
    await User.create(dbClient, user);

    // UserPhoneNumber
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let userPhoneNumberDBOps: Promise<any> = Promise.resolve();
    if (newUserForm.phoneNumber !== undefined) {
      const userPhoneNumber = new UserPhoneNumber(
        user.username,
        newUserForm.phoneNumber.countryCode,
        newUserForm.phoneNumber.phoneNumber
      );
      userPhoneNumberDBOps = UserPhoneNumber.create(dbClient, userPhoneNumber);
    }

    // UserEmail & Verify Ticket
    const userEmail = new UserEmail(
      user.username,
      newUserForm.email,
      true,
      false
    );
    const emailDBOps = addNewEmail(dbClient, userEmail);

    // Resolve Promises (DB Ops)
    await Promise.all([userPhoneNumberDBOps, emailDBOps]);

    // Response
    res.status(200).json({username: user.username});
  } catch (e) {
    next(e);
  }
});

// GET /user/{username}
userRouter.get('/:username', async (req, res, next) => {
  try {
    const dbClient = req.app.locals.dbClient;
    const username = req.params.username;

    // Check Access Token
    const tokenContent = accessTokenVerify(req, req.app.get('jwtAccessKey'));

    let response: UserDetailResponse;
    if (tokenContent.admin === true || tokenContent.username === username) {
      // Admin/Owner Request
      response = await UserDetailResponse.readAdminOwner(dbClient, username);
    } else {
      // Non-admin request
      response = await UserDetailResponse.read(dbClient, username);
    }

    // Response
    res.status(200).json(response);
  } catch (e) {
    next(e);
  }
});

// PUT /user/{username}
userRouter.put('/:username', async (req, res, next) => {
  try {
    const dbClient = req.app.locals.dbClient;
    const username = req.params.username;

    // Check Access Token
    const tokenContent = accessTokenVerify(req, req.app.get('jwtAccessKey'));
    if (tokenContent.admin === true || tokenContent.username === username) {
      throw new AuthenticationError();
    }

    // Validate User's Input (Ajv)
    const changeRequest: ChangeUserForm = req.body;
    if (
      !validateChangeUserForm(changeRequest) ||
      Object.keys(changeRequest).length === 0
    ) {
      throw new BadRequestError();
    }

    // DB Ops
    const dbOps = [];
    // nickname update
    if (changeRequest.nickname !== undefined) {
      dbOps.push(
        User.updateNickname(dbClient, username, changeRequest.nickname)
      );
    }
    // affiliation update
    if (changeRequest.affiliation !== undefined) {
      dbOps.push(
        User.updateAffiliation(
          dbClient,
          username,
          changeRequest.affiliation.schoolCompany,
          changeRequest.affiliation.majorDepartment
        )
      );
    }
    // phoneNumber update / create
    if (changeRequest.phoneNumber !== undefined) {
      const userPhoneNumber = new UserPhoneNumber(
        username,
        changeRequest.phoneNumber.countryCode,
        changeRequest.phoneNumber.phoneNumber
      );
      if (changeRequest.phoneNumber.opsType === 'create') {
        dbOps.push(UserPhoneNumber.create(dbClient, userPhoneNumber));
      } else if (changeRequest.phoneNumber.opsType === 'update') {
        dbOps.push(UserPhoneNumber.update(dbClient, userPhoneNumber));
      } else {
        throw new BadRequestError();
      }
    }
    // email Change requests
    let emailOps;
    if (changeRequest.emailChange !== undefined) {
      emailOps = changeRequest.emailChange.map(emailChangeReq => {
        if (emailChangeReq.requestType === 'delete') {
          return UserEmail.delete(dbClient, username, emailChangeReq.email);
        } else if (emailChangeReq.requestType === 'add') {
          const userEmail = new UserEmail(
            username,
            emailChangeReq.email,
            false,
            false
          );
          return addNewEmail(dbClient, userEmail);
        } else {
          throw new BadRequestError();
        }
      });
    }

    // Await for Async Operations
    let errorFlag = false;
    if (emailOps !== undefined) {
      const opsResults = await Promise.allSettled(emailOps).then();
      opsResults.some(result => {
        if (result.status === 'rejected') errorFlag = true;
      });
    }
    const opsResults = await Promise.allSettled(dbOps);
    opsResults.some(result => {
      if (result.status === 'rejected') errorFlag = true;
    });

    if (errorFlag) {
      res.status(200).json({message: 'Partially processed'});
    } else {
      res.status(200).send();
    }
  } catch (e) {
    next(e);
  }
});

export default userRouter;
