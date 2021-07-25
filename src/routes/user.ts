/**
 * express Router middleware for User APIs
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as express from 'express';
import ServerConfig from '../ServerConfig';
import {validateNewUserForm} from '../functions/inputValidator/validateNewUserForm';
import {validateChangeUserForm} from '../functions/inputValidator/validateChangeUserForm';
import usernameRule from '../functions/inputValidator/usernameRule';
import passwordRule from '../functions/inputValidator/passwordRule';
import AuthenticationError from '../exceptions/AuthenticationError';
import BadRequestError from '../exceptions/BadRequestError';
import NewUserForm from '../datatypes/user/NewUserForm';
import ChangeUserForm from '../datatypes/user/ChangeUserForm';
import User from '../datatypes/user/User';
import UserEmail from '../datatypes/user/UserEmail';
import UserEmailVerifyTicket from '../datatypes/user/UserEmailVerifyTicket';
import UserPhoneNumber from '../datatypes/user/UserPhoneNumber';
import accessTokenVerify from '../functions/JWT/accessTokenVerify';
import UserDetailResponse from '../datatypes/user/UserDetailResponse';

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

    // UserEmail
    const userEmail = new UserEmail(
      user.username,
      newUserForm.email,
      true,
      false
    );
    const userEmailDBOps = UserEmail.create(dbClient, userEmail);

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
    await Promise.all([userPhoneNumberDBOps, userEmailVerifyTicketDBOps]);

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

    // TODO: DB Ops
    // TODO: Response
  } catch (e) {
    next(e);
  }
});

export default userRouter;
