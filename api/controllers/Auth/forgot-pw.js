const { resetPassword } = require('../../../consumers/auth0');
module.exports = {
  friendlyName: 'pw_reset',

  description: 'Email a password reset page to user.',

  inputs: {
    email: {
      description: 'Email of the user (associatd with acct).',
      type: 'string',
      required: true,
      in: 'body'
    },
    pw: {
      description: 'New password for user (associatd with acct).',
      type: 'string',
      required: true,
      in: 'body'
    }
  },

  exits: {
    success: {
      responseType: 'ok',
      description: 'Success response if server sends email successfully'
    },

    serverError: {
      responseType: 'serverError',
      description: 'Failed if server returns error code'
    }
  },

  fn: async function({ email, pw }, exits) {
    try {
      const successful = await resetPassword(email, pw);
      return exits.success(successful.body);
    } catch (err) {
      console.log(err);
      return exits.serverError('Yikes! Something went wrong. Please try again later.');
    }
  }
};
