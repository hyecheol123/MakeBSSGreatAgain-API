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
    nameKorean: {type: 'string'},
    nameEnglish: {type: 'string'},
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
  },
  required: ['username', 'password', 'admissionYear', 'nameKorean', 'email'],
  additionalProperties: false,
});
