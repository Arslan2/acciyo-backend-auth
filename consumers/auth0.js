const { promisify } = require('util');
const request = promisify(require('request'));

const config = sails.config.custom.auth0;

/**
 * Delete user from auth0.
 * @param  {string} token - client token to use auth0 management api
 * @param  {string} id - user id to delete
 */

async function _deleteUser(token, id) {
  const options = {
    method: 'DELETE',
    url: `${config.baseUrl}/api/v2/users/${id}`,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      connection: config.connection
    },
    json: true
  };
  const data = await request(options);
  if (data.statusCode !== 204) {
    throw 'Unable to delete user';
  }
}
/**
 * Get Client Token to use managemnet api
 */
async function _getApiToken() {
  const options = {
    method: 'POST',
    url: `${config.baseUrl}/oauth/token`,
    headers: {
      'content-type': 'application/json'
    },
    body: {
      grant_type: 'client_credentials',
      audience: `${config.baseUrl}/api/v2/`,
      client_id: config.clientId,
      client_secret: config.clientSecret
    },
    json: true
  };
  const { body: data } = await request(options);
  if (data && data.access_token) {
    return data.access_token;
  }
  throw data;
}

module.exports = {
  /**
   * Returns user email
   * @param  {string} accessToken -accessToken of the user
   */
  getUserInfo: async function(accessToken) {
    const options = {
      method: 'GET',
      url: `${config.baseUrl}/userinfo`,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`
      },
      json: true
    };
    let data = await request(options);
    if (data.statusCode == 401) {
      throw 'UnAuthorized User';
    }
    return data.body.email;
  },
  /**
   * Sign In existing auth0 user.
   * @param  {string} username - username of user.
   * @param  {string} password - password of user.
   */
  signIn: async function(username, password) {
    const options = {
      method: 'POST',
      url: `${config.baseUrl}/oauth/token`,
      headers: {
        'content-type': 'application/json'
      },
      body: {
        grant_type: config.grantType,
        username,
        password,
        audience: config.audience,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: 'openid email read:email',
        realm: config.connection
      },
      json: true
    };
    const { body: data } = await request(options);
    if (data.error) {
      throw data;
    }
    return data;
  },

  /**
   * Create a new auth0 user
   * @param  {string} email - email of user.
   * @param  {string} password - password of user.
   */
  createUser: async function(email, password) {
    const token = await _getApiToken();
    const options = {
      method: 'POST',
      url: `${config.baseUrl}/api/v2/users`,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: {
        email,
        password,
        connection: config.connection
      },
      json: true
    };
    const { body: data } = await request(options);
    if (data.error) {
      throw data;
    }
    return {
      id: data.user_id,
      deleteUser: _deleteUser.bind(null, token) // provide delete function in user object to delete in case of server error
    };
  },
  resetPassword: async function(email, newPassword) {
    const token = await _getApiToken();

    const userIdReq = {
      method: 'GET',
      url: `${config.baseUrl}/api/v2/users-by-email?fields=user_id,created_at&include_fields=true&email=${email}`,

      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      json: true
    };
    let data = await request(userIdReq);
    console.log(`status for getting use id:${data.statusCode}`);

    if (data.statusCode == 401) {
      console.log('unauthorized user');
      throw 'UnAuthorized User';
    } else {
      //DOES NOT WORK BECAUSE WE DO NOT HAVE PERSMISSION FROM USER TO DO THIS WITH THIS SCOPE LEVEL.
      if (data.body.length < 1) {
        console.log('no body returned by users-by-email');
        throw 'No user found';
        return data.body;
      }

      let uid = data.body[0].user_id;
      console.log(`uid: ${uid}`);

      if (!uid) {
        throw 'user id field not found';
        return `no uid, body: ${data.body}`;
      }
      var t2 = await _getApiToken();

      const options = {
        method: 'PATCH',
        url: `${config.baseUrl}/api/v2/users/${uid}}`,
        // url: `https://acciyo.auth0.com/api/v2/users/${uid}`,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${t2}`
        },
        body: {
          password: newPassword,
          scope: 'update:users',
          connection: config.connection
        },
        json: true
      };

      const response = await request(options);
      console.log(`status for setting user : ${response.statusCode}`);

      console.log(response.body);
      if (response.error) {
        throw response;
      }
      return response.body;
    }
  }
};
