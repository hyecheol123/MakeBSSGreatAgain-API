/**
 * Validate user input - change password form
 *
 * @author Hyecheol (Jerry) Jang <hyecheo123@gmail.com>
 */

import Ajv from 'ajv';

export const validateChangePasswordForm = new Ajv().compile({
  type: 'object',
  properties: {
    currentPassword: {type: 'string'},
    newPassword: {type: 'string'},
  },
  required: ['currentPassword', 'newPassword'],
  additionalProperties: false,
});
