var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var {to} = require('await-to-js');
const utils = require('../data/utils');
const models = require('../lib/database/mysql/index');
const { enrollmentModel } = require('../lib/database/mysql/index');



router.post('/signup', async (req, res) => {


    // Validation
    let validated = await utils.validate_signup.validate(req.body);

    if(validated && validated.error)
    {
        return res.json({ data: null, error: validated["error"].message });
    }


    let payload_user = req.body;

    // Encrypting password
    const [tmp, encrypted_pass] = await to( utils.passwordHash( payload_user.password ));
    if(tmp)
        return res.json({ data: null, error: "Error in encrypting password"});


    // find user or create new one
    const [ user, created] = await models.userModel.findOrCreate({
        where: { email: payload_user.email },
        defaults: {
            name: payload_user.name,
            email: payload_user.email,
            encrypted_pass: encrypted_pass,
            login_status: false
        }
    });
  
    if(!created)
        return res.json({ data: null, error: "A user with this email alreasy exists !"});
  
    return res.json({ data: "User added successfully !", error: null});

});



router.put('/login', async (req, res) => {

    // Validation 
    let validated = await utils.validate_login.validate(req.body);

    if(validated && validated.error)
    {
        return res.json({ data: null, error: validated["error"].message });
    }
        

    // Checking if user isn't signed up or already logged in
    let payload_user = req.body;

    let [err, USER] = await to(models.userModel.findOne({ 
        where: {
          email: payload_user.email
        }
    }));
    
    if(err)
        return res.json({data: null, error: "Sone error occured in fetching data!"});
    
    if( USER == null )
        return res.json({ data: null, error: "No user found with this email!"});

    let user = USER.dataValues;
    //console.log(user);

    if( user.login_status == true)
        return res.json({ data: null, error: "User is already logged in!"});

    
    const newUser = {
        id: user.id,
        name: user.name,
        email: user.email
    } 
    

    // Checking password
    let [error, isValid] = await to( bcrypt.compare( payload_user.password, user.encrypted_pass) )

    if(error){
        return res.json({ data: null, error: "Some error occured in comparing password"});
    }

    if(!isValid){
        return res.json({ data: null, error: "Incorrect Password !"});
    }

    // Creating user's token

    jwt.sign( {newUser}, 'secretkey', async (error, token) => {

        if(error)
            return res.json({ data: null, "error": "Error in assigning token" });


        // Updating login_status to true
        await models.userModel.update({ login_status: true }, {
            where: {
              email: newUser.email
            }
        });

        return res.json({
            "accessToken" : token,
            "error": null
        });
    }); 

});


router.put('/logout', utils.verifyToken, async (req, res) => {

    let {email} = res.cur_user;
    //let {email} = req.body;

    // Updating login_status to false
    await models.userModel.update({ login_status: false }, {
        where: {
          email: email
        }
    });

    res.json({ data: "Logged out succesfully !!", error: null});
 
});


router.get('/try', utils.verifyToken, async (req, res) => {
    res.send("Aa");
});



module.exports = router;
