const Sequelize = require('sequelize');

const client = new Sequelize('mysql://root@localhost:3307/Elearning');

let userModel = client.define( 'users', {

    id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    encrypted_pass: {
        type: Sequelize.STRING,
        allowNull: false
    },
    login_status: {
        type: Sequelize.BOOLEAN
    }
});



let courseModel = client.define( 'courses', {
    id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    description: {
        type: Sequelize.STRING
    },
    available_seats: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
    }
});



let enrollmentModel = client.define( 'enrollment', {
    id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    course_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: 'courses',
            key: 'id'
        }
    },
    user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
});


userModel.hasMany( enrollmentModel,{
    foreignKey: 'user_id'
});
enrollmentModel.belongsTo(userModel, {
    foreignKey: 'user_id'
});

courseModel.hasMany( enrollmentModel, {
    foreignKey: 'course_id'
});
enrollmentModel.belongsTo(courseModel, {
    foreignKey: 'course_id'
});




const connectMysql = async() => {
    await client.sync({ alter: false });
    //await client.sync();
};

module.exports = {
    connectMysql,
    userModel,
    courseModel,
    enrollmentModel
}