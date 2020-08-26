const express = require('express');
const router = express.Router();
const path = require('path');
const utils = require('../data/utils');
const models = require('../lib/database/mysql/index');
const { Sequelize } = require('sequelize');
const { enrollmentModel } = require('../lib/database/mysql/index');


// GET all users 
router.get( '/', utils.verifyToken, async (req, res) => {

  let [err, USERS] = await to(models.userModel.findAll({
    attributes:
    [ 'id', 'name', 'email']
  }));

  if(err)
    return res.json({data:null, error: err});

  return res.json({ data: USERS, error: null});

});


// GET user by id
router.get( '/:u_id', utils.verifyToken, async (req, res) => {

  let u_id = req.params.u_id;

  let [err, USER] = await to(models.userModel.findOne({ 
    where: {
      id: u_id
    }
  }));

  if(err)
    return res.json({data: null, error: "Sone error occured in fetching data!"});

  if(USER == null)
    return res.json({ data: null, error: "No user found with this id !"});


    // Find the courses they are registered
    let Enroll;
    [err, Enroll] = await to(models.enrollmentModel.findAll({ 
        include: [
            {
                model: models.userModel,
                where: {
                    id: u_id
                }
            },
            {
                model: models.courseModel
            }
        ]
    }));

    if(err)
        return res.json({data: null, error: "Sone error occured in fetching data!"});

    let enrolled = Enroll;
    let enrolled_courses = [];
    enrolled.forEach( (enr) => enrolled_courses.push(enr.dataValues.course.name));

    console.log(enrolled_courses);
    USER.dataValues["enrolled_in_courses"] = enrolled_courses;

    return res.json({ data: USER, error: null});

});




// Delete user
router.delete( '/:u_id', utils.verifyToken, async (req, res) => {

  let u_id = req.params.u_id;


  // Only user itself of admin can delete 
  let token_user_id = res.cur_user.id;


  if( token_user_id != u_id && token_user_id != utils.admin_id)
      return res.json({ data:null, error: "User can't delete anyone else!" });

  if(u_id == utils.admin_id)
      return res.json({ data: null, error: "Admin can't be deleted !"});

  // Deleting the enrollments of this user
  let [err, deleted] = await to( models.enrollmentModel.destroy({
    where: {
      user_id: u_id
    }
  }));

  // Deleting user
  [err, deleted] = await to( models.userModel.destroy({
    where: {
      id: u_id
    }
  }));

  if( deleted == 0 )
    return res.json({data: null, error: "NO user found with this id!"});

  return res.json({ data: "User deleted successfully!", error: null});
  
  /* 
  // Incrementing available slots of the courses in which student was enrolled
  let err, USERS;
  [err, USERS] = await to(models.userModel.findOne({ 
    include: models.enrollmentModel,
    where: {
      id: u_id
    }
  }));

  if(err)
    return res.json({data: null, error: "Sone error occured in fetching data!"});

  let enrolled = USERS.dataValues.enrollments;
  let enrolled_courses = [];
  enrolled.forEach( (enr) => enrolled_courses.push(enr.dataValues.course_id));

  return res.json(enrolled_courses); */

}); 




module.exports = router;
