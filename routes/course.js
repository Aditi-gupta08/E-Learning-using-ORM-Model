const express = require('express');
const router = express.Router();
const utils = require('../data/utils');
const {to} = require('await-to-js');
const { admin_id } = require('../data/utils');
const models = require('../lib/database/mysql/index');
const { Sequelize } = require('sequelize');


// GET all courses
router.get('/', async function(req, res, next) {

    let [err, COURSES] = await to(models.courseModel.findAll({
      attributes:
      [ 'id', 'name', 'description', 'available_seats']
    }));

    if(err)
      return res.json({data:null, error: err});

    return res.json({ data: COURSES, error: null});

});


// GET a course by id 
router.get('/:c_id', utils.verifyToken, async (req, res, next) => {

  let c_id = req.params.c_id;

  let [err, COURSE] = await to(models.courseModel.findOne({ 
    where: {
      id: c_id
    }
  }));

  if(err)
    return res.json({data: null, error: err});

  if( COURSE == null)
    return res.json({ data: null, error: "No course found with this id !"});


  // Finding users enrolled in the course
    let Enroll;
    [err, Enroll] = await to(models.enrollmentModel.findAll({ 
        include: [
            { model: models.userModel},
            {   model: models.courseModel,
                where: { id: c_id }
            }
        ]
    }));

    if(err)
        return res.json({data: null, error: "Sone error occured in fetching data!"});

    let enrolled = Enroll;
    let enrolled_users = [];
    enrolled.forEach( (enr) => enrolled_users.push(enr.dataValues.user.email));

    COURSE.dataValues["enrolled_users"] = enrolled_users;
  
  return res.json({ data: COURSE, error: null});

});


// Add course
router.post( '/addcourse', utils.verifyToken, async (req, res) => {


    // Checking the user should be admin
    let token_user_id = res.cur_user.id;

    if( token_user_id != utils.admin_id)
        return res.json({ data: null, error: "Only admin can add a course!" });

    
    let payload_course = req.body;

    // Validation
    let validated = await utils.validate_addCourse.validate(payload_course);

    if(validated && validated.error)
    {
        return res.json({ data: null, error: validated["error"].message });
    }


    // find course or create new one
    const [ course, created ] = await to(models.courseModel.findOrCreate({
      where: { name: payload_course.name },
      defaults: payload_course
    }));

    // courses contain the course either earlier one or new one
    // created: boolean - whether new course was created or not

    // console.log(created[1]);

    if( !created[1])
      return res.json({ data: null, error: "A course with this name alreasy exists !"});

    return res.json({ data: "Course added successfully !", error: null});

});





// Delete course by id
router.delete( '/delete/:c_id', utils.verifyToken, async (req, res) => {

  // Checking the user should be admin
  let token_user_id = res.cur_user.id;

  if( token_user_id != utils.admin_id)
      return res.json({ data: null, error: "Only admin can delete a course!" });

  let c_id = req.params.c_id;

  // Disenrolling the students of this course
  let [err, deleted] = await to( models.enrollmentModel.destroy({
    where: {
      course_id: c_id
    }
  }));

  // Removing course
  [err, deleted] = await to( models.courseModel.destroy({
    where: {
      id: c_id
    }
  }));

  if( deleted == 0 )
    return res.json({data: null, error: "NO course found with this id!"});

  return res.json({ data: "Course deleted successfully!", error: null});
  
});



// Enroll a student in course
router.put( '/:c_id/enroll', utils.verifyToken, async (req, res) => {

    const c_id = req.params.c_id;
    const u_id = req.body.user_id; 


    // Validation
    let validated = await utils.validate_enrollStudent.validate(req.body);

    if(validated && validated.error)
    {
        return res.json({ data: null, error: validated["error"].message });
    }


    // Checking if user id is invalid 
    let [err, USER] = await to(models.userModel.findOne({ 
      where: {
        id: u_id
      }
    }));

    if(err)
      return res.json({data: null, error: "Some error occured in fetching data!"});

    if(USER == null)
      return res.json({ data: null, error: `No user found with the id ${u_id}` });


       

    // Checking if the user wants to enroll themself or other or admin wants to do so
    let token_user_id = res.cur_user.id;
    //console.log(token_user_id);

    if( token_user_id != u_id && token_user_id != utils.admin_id)
        return res.json({ data:null, error: "User can't enroll anyone else !" });

    if(u_id == utils.admin_id)
      return res.json({ data: null, error: "Admin can't be enrolled !"});

   

    // Checking if course id is invalid 
    let COURSE;
    [err, COURSE] = await to(models.courseModel.findOne({ 
      where: {
        id: c_id
      }
    }));

    if(err)
      return res.json({data: null, error: "Some error occured in fetching data!"});

    if( COURSE == null)
      return res.json({ data: null, error: `No course found with the id ${c_id}` });


    // Checking seats are left or not
    let seats_left = COURSE.dataValues.available_seats;
    if( seats_left <=0)
      return res.json({data: null, error: "No seats are left in this course!"});

    seats_left -=1;


    // find enrollment or create new one
    const [ enroll, created ] = await to(models.enrollmentModel.findOrCreate({
      where:  { 
          course_id: c_id,
          user_id: u_id 
      }
    }));

    if(!created)
      return res.json({ data: null, error: "The user is already enrolled in the course !"});


    // Decrement the avalaible seats
    await models.courseModel.update({ available_seats: seats_left }, {
      where: {
        id: c_id
      }
    });

    return res.json({ data: "User is enrolled successfully !", error: null});


});






// Disenroll a student from a course
router.put( '/:c_id/disenroll', utils.verifyToken, async (req, res) => {

    const c_id = req.params.c_id;
    const u_id = req.body.user_id; 


    // Validation
    let validated = await utils.validate_enrollStudent.validate(req.body);

    if(validated && validated.error)
    {
        return res.json({ data: null, error: validated["error"].message });
    }


    // Checking if user id is invalid 
    let [err, USER] = await to(models.userModel.findOne({ 
      where: {
        id: u_id
      }
    }));

    if(err)
      return res.json({data: null, error: "Some error occured in fetching data!"});

    if(USER == null)
      return res.json({ data: null, error: `No user found with the id ${u_id}` });


       

    // Checking if the user wants to enroll themself or other or admin wants to do so
    let token_user_id = res.cur_user.id;
    //console.log(token_user_id);

    if( token_user_id != u_id && token_user_id != utils.admin_id)
        return res.json({ data:null, error: "User can't disenroll anyone else !" });

    if(u_id == utils.admin_id)
      return res.json({ data: null, error: "Admin can't be enrolled !"});

   

    // Checking if course id is invalid 
    let COURSE;
    [err, COURSE] = await to(models.courseModel.findOne({ 
      where: {
        id: c_id
      }
    }));

    if(err)
      return res.json({data: null, error: "Some error occured in fetching data!"});

    if( COURSE == null)
      return res.json({ data: null, error: `No course found with the id ${c_id}` });


    // Calculating seats left
    let seats_left = COURSE.dataValues.available_seats;
    seats_left +=1;


    // Delete enrollment if it exists
    let deleted;
    [err, deleted] = await to( models.enrollmentModel.destroy({
        where: {
          course_id: c_id,
          user_id: u_id
        }
    }));

    if( deleted == 0 )
      return res.json({data: null, error: "User was not enrolled in the course !"});


    // Increment the avalaible seats
    await models.courseModel.update({ available_seats: seats_left }, {
      where: {
        id: c_id
      }
    });

    return res.json({ data: "User is disenrolled successfully !", error: null});

});


module.exports = router;
