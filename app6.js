require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook").Strategy;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());

app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);


//Schema
const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String, //Google
  facebookId: String, //Facebook
  userSecret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//Model
const User = mongoose.model("User", userSchema);


//Passport
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


//Google OAuth2.0
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://secure-tor-61048.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo" //Needed because of Google+ sunsetting
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


//Facebook OAuth
passport.use(new FacebookStrategy( {
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "https://secure-tor-61048.herokuapp.com/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



//METHODS
app.get("/", function(req, res) {
  res.render("home");
});

//Google
app.get("/auth/google", //Where the Google buttons redirect
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets", //Where the Google authentication redirects
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  }
);

//Facebook
app.get("/auth/facebook", //Where the facebook buttons redirect
  passport.authenticate("facebook")
);

app.get("/auth/facebook/secrets", //Where the facebook authentication redirects
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  }
);

//Other routes
app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/logout", function(req, res) {
  //Deauthenticate the user and end the user session
  req.logout();
  res.redirect("/"); //Back to the root route
});

app.get("/secrets", function(req, res) {
  //Find where userSecret not equal to null, where it does exist
  User.find({"userSecret":{$ne: null}}, function(err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        //Passing a vble userWithSecrets to secrets.ejs
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/submit", function(req, res) {
  if (req.isAuthenticated()) { //Check is user is logged in
    res.render("submit");
  } else {
    res.redirect("/login"); //Not logged in
  }
});


app.post("/submit", function(req, res) {
  const submittedSecret = req.body.secret; //Escrito por el usuario

  //User ID from the DB
  User.findById(req.user.id, function(err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.userSecret = submittedSecret; //Save secret to the user's profile
        foundUser.save(function() { //Save changes and redirect
          res.redirect("/secrets");
        });
      }
    }
  });
});


app.post("/register", function(req, res) {

  //It's not necessary to create and then save the user
  //This PassportLocalMongoose function can be used instead
  User.register({username: req.body.username}, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register"); //So the user can try again
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});


app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) { //Function from Passport
    if (err) {
      console.log(err);
    } else { //Same as in register
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });

});



let port = process.env.PORT; //Heroku
if (port == null || port == "") {
  port = 3000; //local
}

app.listen(port, function() {
  console.log("Server started on port 3000 or Heroku");
});
