const { mongoose } = require("../db/mongoose");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        trim: true,
        unique: true,
        lowercase: true,
        default: function(){
            const emailName = (Math.random() + 1).toString(36).substring(7);
            const emailAddress = (Math.random() + 1).toString(36).substring(7);
             return `${emailName}@${emailAddress}.com`
        }
    },
    name: {
        type: String,
        requires: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    deviceId: {
        type: String,
        trim: true
    },    
    role: {
        type: [String],
        enum: ['superAdmin', 'shayaraAdmin','first','video','drone','last','driver'],
        trim: true,
        default: 'driver'
    },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
       }   ,
    shayara: {
        type: mongoose.Schema.Types.ObjectId,
        requires: true,
        ref: 'Shayara'
    },
    
    tokens: [
        {
            access: {
                type: String,
                required: true,
            },
            token: {
                type: String,
                required: true,
            },
        },
    ]
}, {
    timestamps: true
})


//INSTANCE methods

//generate token in each login access
userSchema.methods.generateAuthToken = function () {
    var user = this; //'this' stores the individual doc
    var access = "auth";
    var token = jwt
        .sign({ _id: user._id.toHexString(), access }, process.env.JWT_SECRET)
        .toString(); //arguments: 1. object - data we want to sign 2. secret value

    user.tokens = user.tokens.concat([{ access, token }]);

    return user.save().then(() => {
        return token;
    });
};

//MODEL methods


//authenticate the user by verifing the user token and role(user/admin)
userSchema.statics.findByToken = function (token, userTypes) {
    const User = this;
    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        return Promise.reject("4");
    }
    //console.log('findByToken find user after decode token token', token);
    return User.findOne({
        _id: decoded._id,
        role: { $in: userTypes },
        "tokens.token": token,
        "tokens.access": "auth",
    });
};


// userSchema.post("save", function (error, doc, next) {
//     if (error.name === "MongoError" && error.code === 11000)
//         next(new Error("This user name already exist"));
//     else next(error);
// });

const User = mongoose.model('User', userSchema)
module.exports = { User }