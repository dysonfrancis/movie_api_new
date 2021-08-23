//Uploaded Aug 20


const express = require("express"); 



const bodyParser = require('body-parser');
const methodOverride = require('method-override');
morgan = require('morgan');

//const movies = require("./moviedata.js");
//const users  = require("./userdata.js");
const app = express();

app.use(express.json());
const { v4: uuidv4 } = require('uuid');
app.use(morgan('common'));

app.use(methodOverride());
const mongoose = require('mongoose');
const Models = require('./models.js');
const Movies = Models.Movie;
const Users = Models.User;

app.use(bodyParser.urlencoded({ extended: true }));

const cors = require("cors");
app.use(cors());
let auth = require('./auth')(app);

const passport = require('passport');
require('./passport');

const { check, validationResult } = require('express-validator');

mongoose.connect( process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });
// mongoose.connection.once('open', function(){
//   console.log('Conection has been made!');
// }).on('error', function(error){
//     console.log('Error is: ', error);
// });


//Static file path
app.use(express.static('public'));

//1.Return a list of ALL movies to the user
  app.get('/movies', passport.authenticate('jwt', {session: false}), (req, res) => {
    Movies.find()
    .then((movies) => {
      res.status(201).json(movies);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
    });
    


//2. Return data (description, genre, director, image URL, whether it’s featured or not) about a single movie by title to the user
app.get('/movies/:Title', passport.authenticate('jwt', {session: false}),  (req, res) => {
    Movies.findOne({ Title: req.params.Title })
      .then((movie) => {
        res.json(movie);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });  


//3. Return data about a genre (description) by name/title
app.get('/movies/genre/:Name' , passport.authenticate('jwt', {session: false}), (req, res) => {
    Movies.find({ 'Genre.Name': req.params.Name })
      .then((movie) => {
        res.json(movie);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });  



//4. Return data about a director by director name
app.get('/movies/director/:Name' , passport.authenticate('jwt', {session: false}), (req, res) => {
  Movies.find({ 'Director.Name': req.params.Name })
    .then((movie) => {
      res.json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});  


//Return list of users
//  app.get('/users', (req, res) => {
//     res.status(200).send(users);
//  })   

//5. Allow new users to register
app.post('/users/:Username', 
[check('Username', 'Username should be a minimum of 5 characters').isLength({min:5}),
check('Username', 'Username cannot contain non-alphanumeric characters!').isAlphanumeric(),
check('Password', 'A Password is required').not().isEmpty(),
check('Email', 'The Email address does not appear to be valid').isEmail()
], (req, res) => {
  // check the validation object for errors
  let errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  let hashedPassword = Users.hashPassword(req.body.Password);
  Users.findOne({ Username: req.body.Username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + 'already exists');
      } else {
        Users
          .create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday
          })
          .then((user) =>{res.status(201).json(user) })
        .catch((error) => {
          console.error(error);
          res.status(500).send('Error: ' + error);
        })
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});


//GET(READ) ALL USERS
app.get('/users', (req, res) => {
Users.find()
.then((users) => {
  res.status(201).json(users);
})
.catch((error) => {
  console.error(error);
  res.status(500).send('Error: ' + error);
});
});


//GET USER BY USERNAME
app.get('/users/:Username', (req, res) => {
  Users.findOne({ Username: req.params.Username })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


//6. Allow users to update their user info (username, password, email, date of birth)
app.put('/users/:Username' , 

[check('Username', 'Username is required!').isLength({min:5}),
check('Username', 'Username cannot contain non-alphanumeric characters!').isAlphanumeric(),
check('Password', 'Password is required!').not().isEmpty(),
check('Email', 'Email does not appear to be valid').isEmail()
], (req, res) => {
  // check the validation object for errors
  let errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
    {
      Username: req.body.Username,
      Password: req.body.Password,
      Email: req.body.Email,
      Birthday: req.body.Birthday
    }
  },
  { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if(err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});


//7. Allow users to add a movie to their list of favorites
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', {session: false}), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
     $push: { FavoriteMovies: req.params.MovieID }
   },
   { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

//8. Allow users to remove a movie from their list of favorites
app.delete('/users/:Username/movies/:MovieID' , passport.authenticate('jwt', {session: false}), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
     $pull: { FavoriteMovies: req.params.MovieID }
   },
   { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});


//9. Allow existing users to deregister 
app.delete('/users/:Username'  , passport.authenticate('jwt', {session: false}), (req, res) => {
  Users.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//Set PORT
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0',() => {
 console.log('Listening on Port ' + port);
});

//Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });
  