const { getUserInfo } = require('../../../consumers/auth0');

module.exports = {
  friendlyName: 'CheckUserExists',

  description: 'Check if user exits in database.',

  inputs: {
    accessToken: {
      description: 'Access token from Auth0',
      type: 'string',
      required: true,
      in: 'query'
    }
  },

  exits: {
    success: {
      responseType: 'ok',
      description: 'Success response if the user exists.'
    },

    forbidden: {
      responseType: 'forbidden',
      description: 'Forbidden response if user does not exist.'
    }
  },

  fn: async function({ accessToken }, exits) {
    try {
      const email = await getUserInfo(accessToken);
      const user = await User.findOne({ email });
      if (user) {
        return exits.success(JSON.stringify({ error: false, gdprConsent: user.consentedToGdprTrackingAt }));
      }
      return exits.forbidden('User Not Found');
    } catch (err) {
      return exits.forbidden('User Not Found');
    }
  }
};
