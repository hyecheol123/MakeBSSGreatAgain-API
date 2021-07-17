/**
 * Validate user input - new user form
 *
 * @author Hyecheol (Jerry) Jang <hyecheo123@gmail.com>
 */

import addFormats from 'ajv-formats';
import Ajv from 'ajv';

export const validateNewUserForm = addFormats(new Ajv()).compile({
  type: 'object',
  properties: {
    username: {type: 'string'},
    password: {type: 'string'},
    admissionYear: {type: 'integer', minimum: 1},
    legalName: {type: 'string'},
    nickname: {type: 'string'},
    email: {type: 'string', format: 'email'},
    phoneNumber: {
      type: 'object',
      properties: {
        countryCode: {type: 'number'},
        phoneNumber: {type: 'number'},
      },
      required: ['countryCode', 'phoneNumber'],
      additionalProperties: false,
    },
    affiliation: {
      type: 'object',
      properties: {
        schoolCompany: {type: 'string'},
        majorDepartment: {type: 'string'},
      },
      required: ['schoolCompany', 'majorDepartment'],
      additionalProperties: false,
    },
  },
  required: ['username', 'password', 'admissionYear', 'legalName', 'email'],
  additionalProperties: false,
});
