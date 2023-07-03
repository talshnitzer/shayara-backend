const {User} = require('./../models/user');
const {error} = require('./../utils');

const authenticate = (userTypes) => {
    
    return (req,res,next) => {
        const token = req.header('x-auth');
        console.log('authenticate token', token);
        
        User.findByToken(token, userTypes).then((user) => {
            if (!user){
                console.log('authenticate - user not found');
                return Promise.reject('5');  
            }
            if (user.blocked) {
                console.log('authenticate - user blocked');
                return Promise.reject('3');
            }
    
            req.user = user;
            req.token = token;
            next();
        }).catch((e) => {
            console.log('authenticate catch e', e);
            
            res.status(200).send(error(e));
        });
    };
}

module.exports = { auth:  authenticate};