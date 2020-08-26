var express = require('express');
var jwt = require('jsonwebtoken');
var {to} = require('await-to-js');
var bcrypt = require('bcrypt');
const joi = require('joi');
const { JSONCookie } = require('cookie-parser');
const models = require('../lib/database/mysql/index')

// Verify token (middleware function)
const verifyToken = (req, res, next) => {

    // Get auth header value
    const bearerHeader = req.headers['authorization'];
  
    // Check if bearer is undefined
    if(typeof bearerHeader !== 'undefined'){
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
  
        req.token = bearerToken;

        jwt.verify( req.token, 'secretkey', async (error, authData) => {
            if(error) {
                return res.status(400).json({ "error": "Not verified successfully"}); 
            } 
            
            //console.log(authData);
            let email = authData.newUser.email;
                
            // Checking if user exist and is logged in or not  
            let [err, USER] = await to(models.userModel.findOne({ 
                where: {
                  email: email
                }
            }));
            
            if(err)
                return res.json({data: null, error: "Sone error occured in fetching data!"});
            
            if(USER == null)
                return res.json({ data: null, error: "No user found with this id !"});

            if(USER.dataValues.login_status == false)
                return res.status(400).json({ "err": "User is not logged in !"});

            //console.log(authData.newStudent);
            res.cur_user = authData.newUser; 
            next();
            
        })
        
    } else {
      res.status(400).json({error: 'Token not found'});
    } 
} 


const passwordHash = async (password) => {
    const saltRounds = 10;
    const [err, encrypted_pass ] = await to( bcrypt.hash(password, saltRounds));

    if(err)
        return res.send( {"msg": "Error while generating password hash"});

    return encrypted_pass;
};


const validate_signup = joi.object().keys({
    name: joi.string().required(),
    email: joi.string().email().required(),
    password: joi.string().min(3).max(10).required()
});


const validate_login = joi.object().keys({
    email: joi.string().email().required(),
    password: joi.string().min(3).max(10).required()
});


const validate_addCourse = joi.object().keys({
    name: joi.string().required(),
    description: joi.string(),
    available_seats: joi.number().positive().required()
});


const validate_enrollStudent = joi.object().keys({
    user_id: joi.number().positive().required()
});

const validate_disenrollStudent = joi.object().keys({
    user_id: joi.number().positive().required()
});


const admin_id = 1;

module.exports = {
    verifyToken,
    passwordHash,
    admin_id,
    validate_signup,
    validate_login,
    validate_addCourse,
    validate_enrollStudent,
    validate_disenrollStudent
};
