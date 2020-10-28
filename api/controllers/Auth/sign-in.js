const { signIn } = require('../../../consumers/auth0');
var axios = require('axios');
module.exports = {
  friendlyName: 'SignIn',

  description: 'Sign in an auth0 user into the system.',

  inputs: {
    email: {
      description: 'Email of the user to sign in.',
      type: 'string',
      required: true,
      in: 'body'
    },
    password: {
      description: 'Password of the user to sign in.',
      type: 'string',
      required: true,
      in: 'body'
    }
  },

  exits: {
    success: {
      responseType: 'ok',
      description: 'Success response if the user is signed in successfully.'
    },

    forbidden: {
      responseType: 'forbidden',
      description: 'Forbidden response if invalid credentials are supplied.'
    }
  },

  fn: async function({ email, password }, exits) {
    try {
      const data = await signIn(email, password);
      const user = await User.findOrCreate({ email }, { email });
      addNewUser(email);
      // return exits.success({ authToken: data.id_token, user });
      return exits.success(JSON.stringify({ authToken: data.id_token, user }));
    } catch (err) {
      console.log(err);
      return exits.forbidden('Invalid credentials');
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
