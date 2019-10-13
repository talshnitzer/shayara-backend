var {mongoose} = require('../db/mongoose.js');

var UserSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1
    },
    phoneNum: {
        type: String,
        trim: true,
        minlength: 1,
        unique: true
    }
});

const User = mongoose.model('User', UserSchema);

module.exports = {User};