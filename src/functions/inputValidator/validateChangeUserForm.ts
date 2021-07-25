/**
 * Validate user input - Change User Form
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import addFormats from 'ajv-formats';
import Ajv from 'ajv';

export const validateChangeUserForm = addFormats(new Ajv()).compile({
  type: 'object',
  properties: {
    nickname: {type: 'string'},
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
    emailChange: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: {
        type: 'object',
        properties: {
          email: {type: 'string', format: 'email'},
          requestType: {type: 'string', format: '^(delete|add)$'},
        },
        required: ['email', 'requestType'],
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
});
