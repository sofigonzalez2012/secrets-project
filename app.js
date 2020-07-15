require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true}));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});


//Schema
const userSchema = new mongoose.Schema ({
  email: String,
  password: String
});

//Moongose Encryption
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"] }); //Encryption is set up (secret and fields to encrypt)

//Model
const User = mongoose.model("User", userSchema);


//Methods
app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", function(req, res) {

  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    const user = new User ({
      email: req.body.username,
      password: hash
      // password: md5(req.body.password) //Hash with MD5
    });

    user.save(function(err) { //Here the password gets encrypted
      if (err) {
        console.log(err);
      } else {
        res.render("secrets"); //Only render the secrets page when the user is registred
      }
    });

  });

});



app.post("/login", function(req, res) {
  const username = req.body.username;
  const password = req.body.password;
  // const password = md5(req.body.password); //Hash with MD5

  User.findOne( {email: username}, function(err, foundUser) {
    if (err) {  //Error
      console.log(err);
    } else {
      if (foundUser) { //The user does exist
        //Here the password gets decrypted (LEVEL 1)
        //if (foundUser.password === password) { //The password matches the user found

        bcrypt.compare(password, foundUser.password, function(err, result) {
          if (result === true) {
            res.render("secrets");
          }
        });
      }
    }
  });

});



app.listen(3000, function() {
  console.log("Server started on port 3000");
});
