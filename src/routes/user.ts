/**
 * express Router middleware for User APIs
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as express from 'express';
import ServerConfig from '../ServerConfig';
import {validateNewUserForm} from '../functions/inputValidator/validateNewUserForm';
import usernameRule from '../functions/inputValidator/usernameRule';
import passwordRule from '../functions/inputValidator/passwordRule';
import BadRequestError from '../exceptions/BadRequestError';
import NewUserForm from '../datatypes/user/NewUserForm';
import User from '../datatypes/user/User';
import UserEmail from '../datatypes/user/UserEmail';
import UserEmailVerifyTicket from '../datatypes/user/UserEmailVerifyTicket';
import UserPhoneNumber from '../datatypes/user/UserPhoneNumber';

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
    if (newUserForm.admissionYear + 2002 > memberSince.getFullYear()) {
      throw new BadRequestError();
    }
    const user: User = {
      username: newUserForm.username,
      password: hashedPW,
      memberSince: memberSince,
      admissionYear: newUserForm.admissionYear,
      nameKorean: newUserForm.nameKorean,
      nameEnglish: newUserForm.nameEnglish,
      status: 'unverified',
      admin: false,
    };
    const userDBOps = User.create(dbClient, user);

    // UserEmail
    const userEmail: UserEmail = {
      username: user.username,
      email: newUserForm.email,
      primaryAddr: true,
      verified: false,
    };
    const userEmailDBOps = UserEmail.create(dbClient, userEmail);

    // UserPhoneNumber
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let userPhoneNumberDBOps: Promise<any> = Promise.resolve();
    if (newUserForm.phoneNumber !== undefined) {
      const userPhoneNumber: UserPhoneNumber = {
        username: user.username,
        countryCode: newUserForm.phoneNumber.countryCode,
        phoneNumber: newUserForm.phoneNumber.phoneNumber,
      };
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
    await Promise.all([
      userDBOps,
      userPhoneNumberDBOps,
      userEmailVerifyTicketDBOps,
    ]);

    // Response
  } catch (e) {
    next(e);
  }
});

export default userRouter;
