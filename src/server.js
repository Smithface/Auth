const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const User = require('./user');

const STATUS_USER_ERROR = 422;
const BCRYPT_COST = 11;

const server = express();
// to enable parsing of json bodies for post requests
server.use(bodyParser.json());
server.use(session({
  secret: 'e5SPiqsEtjexkTj3Xqovsjzq8ovjfgVDFMfUzSmJO21dtXs4re',
  resave: true,
  saveUninitialized: false
}));

/* Sends the given err, a string or an object, to the client. Sets the status
 * code appropriately. */
const sendUserError = (err, res) => {
  res.status(STATUS_USER_ERROR);
  if (err && err.message) {
    res.json({ message: err.message, stack: err.stack });
  } else {
    res.json({ error: err });
  }
};

// TODO: implement routes
server.post('/users', (req, res) => {
  if (!req.body.password) { sendUserError({ error: 'password required' }, res); }
  const userInfo = {
    username: req.body.username,
    passwordHash: req.body.password
  };
  const newUser = new User(userInfo);
  bcrypt.hash(newUser.passwordHash, BCRYPT_COST, (err, passwordHash) => {
    if (err) {
      sendUserError(err, res);
    } else {
      newUser.passwordHash = passwordHash;
      newUser.save()
        .then((user) => {
          res.status(200).json(user);
        })
        .catch((catchErr) => {
          sendUserError(catchErr, res);
        });
    }
  });
});

server.post('/log-in', (req, res) => {
  const { username, password } = req.body;
  User
    .findOne({ username }, '_id passwordHash')
    .then((user) => {
      bcrypt.compare(password, user.passwordHash, (err, resp) => {
        if (!resp) {
          sendUserError(err, res);
        } else {
          res.status(200).json({ success: true });
        }
      });
    })
    .catch((err) => {
      // console.log('failure to find the One');
      sendUserError(err, res);
    });
});

const loggedIn = (req, res, next) => {
  const { username } = req.session;
  // console.log(req.session);
  if (!username) {
    sendUserError('User is not logged in', res);
    return;
  }
  User.findOne({ username }, (err, user) => {
    if (err) {
      sendUserError(err, res);
    } else if (!user) {
      sendUserError('User does exist', res);
    } else {
      req.user = user;
      next();
    }
  });
};

// TODO: add local middleware to this route to ensure the user is logged in
server.get('/me', loggedIn, (req, res) => {
  // Do NOT modify this route handler in any way.
  res.json(req.user);
});

module.exports = { server };
