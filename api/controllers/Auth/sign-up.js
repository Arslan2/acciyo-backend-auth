const { createUser, signIn } = require('../../../consumers/auth0');
const axios = require('axios');

module.exports = {
  friendlyName: 'SignUp',

  description: 'Sign up a new user.',

  inputs: {
    email: {
      description: 'Email of the user to sign up.',
      type: 'string',
      required: true,
      in: 'body'
    },
    password: {
      description: 'Password of the user to sign up.',
      type: 'string',
      required: true,
      in: 'body'
    },
    consent: {
      description: 'Access token from Auth0',
      type: 'string',
      required: false,
      in: 'body'
    },
    offerings: {
      description: 'Access token from Auth0',
      type: 'boolean',
      required: false,
      in: 'body'
    }
  },
  //TODO: check why created response type is not working
  exits: {
    success: {
      responseType: 'ok',
      description: 'Success response if the user is logged in successfully.'
    },

    forbidden: {
      responseType: 'forbidden',
      description: 'Forbidden response if invalid credentials are supplied.'
    },

    serverError: {
      responseType: 'serverError',
      description: 'Internal Server Error in the event of a server-side issue.'
    }
  },

  fn: async function({ email, password, consent, offerings }, exits) {
    //removed 'offerings'
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log('existing user; ', existingUser);
        return exits.forbidden();
      }
      console.log('user does not exist, creating now.');
      const createdUser = await createUser(email, password);
      const consentedToGdprTrackingAt = consent || consent === 'on' ? new Date() : null;
      const consentedToMarketingCommunicationAt = new Date();
      //= offerings ? new Date() : null;
      addNewUser(email);
      console.log('consentedToMarketingCommunicationAt: ', consentedToMarketingCommunicationAt);
      try {
        const user = await User.create({
          email,
          consentedToGdprTrackingAt,
          consentedToMarketingCommunicationAt
        }).fetch();
        console.log('user created: ', user);
        if (user && user.email) {
          const data = await signIn(email, password);

          return exits.success(JSON.stringify({ user, authToken: data.id_token }));
        }
        throw new Error('Unable to create user');
      } catch (err) {
        // delete user from auth0
        createdUser.deleteUser(createdUser.id);
        return exits.serverError();
      }
    } catch (err) {
      if (err.statusCode === 409 || err.statusCode === 400) {
        return exits.forbidden(err.message);
      }
      return exits.serverError();
    }
  }
};
function addNewUser(email) {
  // const apikey = '7ba68dd6-aedd-44f7-8a49-34ccc4a0c320';
  const apikey = '63626e7e-e6f2-45bd-b9da-a407d6b5832e';

  //const hubspotUrl = 'https://api.hubapi.com/contacts/v1/contact/?hapikey=' + apikey;
  const hubspotUrl = 'https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/' + email + '/?hapikey=' + apikey;

  axios
    .post(hubspotUrl, {
      properties: [
        {
          property: 'email',
          value: email
        }
      ]
    })
    .then(res => {
      //console.log(`statusCode: ${res.statusCode}`);
      let vid = 0;
      if (res.status === '409' || res.status === 409) {
        vid = res.data.identityProfiles.vid;
      } else {
        vid = res.data.vid;
      }
      console.log('VID : ', vid);
      const contactList = 'https://api.hubapi.com/contacts/v1/lists/14/add?hapikey=' + apikey;
      axios
        .post(contactList, {
          vids: [vid]
        })
        .then(res => {
          return true;
        })
        .catch(err => {
          console.log('error with adding email to list 14 in hubspot: ', err);
          return false;
        });
    })
    .catch(error => {
      console.log('error with email add to hubspot (google signin)');
    });
}

/*
  Returns a 200 response on success. The response will include the details for the created contact

  Returns a 409 Conflict if there is an existing contact with the email address included in the request. The response body will include the identityProfile details of the contact, which will include the vid of the existing record.

  Returns a 400 error when there is a problem with the data in the request body, including when there are no properties included in the reqest data.


 */
