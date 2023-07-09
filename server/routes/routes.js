
const _ = require('lodash');
const express = require('express');
const multer = require('multer');
const gcm = require('node-gcm');

const {User} = require('../models/user');
const {Shayara} = require('../models/shayara');
const { auth } = require('../middleware/authenticate')
const {Post} = require('../models/post');
const { error, sendEmail, createValidationCode } = require('../utils')


const router = new express.Router()


//upload files
const upload = multer({});

// Set up the sender with your GCM/FCM API key (declare this once for multiple messages)
const sender = new gcm.Sender(process.env.FCM_SERVER_KEY);

const userOutputFields =
    [
        "_id",
        "email",
        "name",
        "deviceId",
        "role",
        'shayara'
                     ]



//admin LOGIN: 
//admin email found in DB, validation code send to that email and to client, token sent to client 
router.post('/admin/login', async (req, res) => {
    try {
        const email = _.pick(req.body, ["email"]);
        //console.log('@@@ admin LOGIN 1 email', email)
        const user = await User.findOne(email);
        //console.log('@@@ admin LOGIN 2 user', user)
        if (!user) {
            throw new Error('user not found')
        }
        //send email with code
        const validationCode = createValidationCode()
        await sendEmail(user.email, validationCode, user.name);
        
        
        
        res.send({status: 'OK', validationCode, ..._.pick(user, userOutputFields)});
    } catch (e) {
        res.status(200).send({error: e.message})
        console.log('e', e);
    }
})

//LOGIN - admin is validated - send token to client
router.post('/admin/validated/:id', async (req, res) => {
    try {
        let user = await User.findById(req.params.id);
        
        
        if (!user) {
            throw new Error('user not found')
        }
        
        const token = await user.generateAuthToken();
        user.tokens.token = token
        user.role = 'shayaraAdmin'

        await user.save()

        res.header("x-auth", token).send({..._.pick(user, userOutputFields)});
    } catch (e) {
        res.status(200).send({error: e.message})
        console.log('e', e);
    }
})

//UPDATE my user details
router.post(
    "/user/update",
    auth(['shayaraAdmin','driver']),
    async (req, res) => {
        try {
            const body = _.pick(req.body,
                ["name" , 'deviceId', 'phone', 'location']);
            let user = await User.findById(req.user._id);

            console.log('@@@  UPDATE my user details, user', user)

            if (!user) {
                throw new Error('user not found')
            }

           
            if (body.name) user.name = body.name;
            if (body.location) user.location = body.location;
            if (body.phone) user.phone = body.phone;
            if (body.deviceId) user.deviceId = body.deviceId ;

            const locationsArr = await User.find({shayara: user.shayara}, `_id location role`).exec()

            await user.save();

            res.send(
                {..._.pick(user, userOutputFields), locationsArr}
            );
        } catch (e) {
            res.status(200).send(error(e.message));
        }
    }
);

//UPDATE user role by admin 
router.post(
    "/admin/updateRole/:id",
    auth(['shayaraAdmin']),
    async (req, res) => {
        try {
            const body = _.pick(req.body,
                ["role"]);
            let user = await User.findById(req.params.id);

            if (!user) {
                throw new Error('user not found')
            }

           const deviceIdExist =  User.find({deviceId: body.deviceId})

           if (deviceIdExist) {
            throw new Error('user already exist')
            }

            if (body.name) user.name = body.name;
            if (body.phone) user.phone = body.phone;
            if (body.deviceId) user.deviceId = body.deviceId ;

            await user.save();

            res.send(
                _.pick(user, userOutputFields)
            );
        } catch (e) {
            res.status(200).send(error(e.message));
        }
    }
);

//user login to specific shayara
//server find the shayara and create token to user
//LOGIN

router.post("/user/login/:shayaraId", async (req, res) => {
    try {

        let shyara = await Shayara.findById(req.params.shayaraId);
        if (!shyara) {
            throw new Error('shyara not found')
        }
        
        let body = _.pick(req.body,
            ["name" , 'deviceId', 'phone']);

        body.shayara = req.params.shayaraId;
        const user = new User(body);

        const token = await user.generateAuthToken();

        res.header("x-auth", token).
            send(_.pick(user, userOutputFields));

    } catch (e) {
        res.status(200).send(error(e));
    }
});

//------------------------------------------------------------------//
//---------------------Shayara Routes--------------------------------//
//create shayara 
router.post(
    "/shayara/create",
    auth(['shayaraAdmin']),
    async (req, res) => {
        try {
            
            let body = _.pick(
                req.body, 
                ["shayaraName",  "shayaraLocationName", "startLocation", "startTime", "endTime"]
                );

            body.shayaraOwner = req.user._id
            
            const shayara = new Shayara(body);
            // const isExist = await Shayara.find({
            //     startTime: {
            //         $gt: shayara.startTime.getTime() - 30*60*1000,
            //         $lt: shayara.startTime.getTime() + 30*60*1000
            //     },
                
            //     startLocation: {
            //      $near: {
            //       $maxDistance: 100,
            //       $geometry: {
            //        type: "Point",
            //        coordinates: [shayara.startLocation.coordinates[0], shayara.startLocation.coordinates[1]]
            //       }
            //      }
            //     }
            //    }).find((error, results) => {
            //     if (error) console.log(error);
            //     console.log(JSON.stringify(results, 0, 2));
            //    });
            
            //    if (isExist.length !== 0) {
            //     console.log('@@@@ isExist', isExist);
            //     throw new Error('Shayara already exist')
            // }

            await shayara.save();

            await User.findByIdAndUpdate(req.user._id, {shayara: shayara._id})
            
            res.send({ shayaraId: shayara._id });
        } catch (e) {
            res.status(200).send(error(e.message));
        }
    });


    router.post(
        "/shayara/update/:shayaraId",
        auth(['shayaraAdmin']),
        async (req, res) => {
            try {
                
                let body = _.pick(
                    req.body, 
                    ["shayaraName",  "shayaraLocationName", "startLocation", "startTime", "endTime"]
                    );
                
                let shayara = await Shayara.findById(req.params.shayaraId)
    
                if (!shayara) {
                        throw new Error('convoy not found')
                    }

                const isOwner = shayara.shayaraOwner === req.user._id

                if (!isOwner) {
                    throw new Error('user is not convoy owner')
                }

                if (body.shayaraName) shayara.shayaraName = body.shayaraName;
                if (body.shayaraLocationName) shayara.shayaraLocationName = body.shayaraLocationName;
                if (body.startLocation) shayara.startLocation = body.startLocation;
                if (body.startTime) shayara.startTime = body.shayaraName;
                if (body.endTime) shayara.endTime = body.endTime; 
                
                await shayara.save();
                res.send(shayara);
            } catch (e) {
                res.status(200).send(error(e.message));
            }
        });

    //GET all shayara
router.get(
    "/shayara/getAll",
    auth(['shyaraAdmin']),
    async (req, res) => {
        try {
            const allShayarasDocs = await Shayara.find({shayaraOwner: req.user._id});
            if (!allShayarasDocs) {
                throw new Error("No convoyes found");
            }
            res.send({ allShayarasDocs });
        } catch (e) {
            res.status(200).send(error(e.message));
        }
    });

    //Remove my Shayara
router.get(
    "/shayara/remove",
    auth(['shyaraAdmin']),
    async (req, res) => {
        try {
            const shayara = await Shayara.findByIdAndRemove(req.user._id)

            if (!shayara) {
                throw new Error('Convoy not found')
            }

            res.send(shayara);
           
        } catch (e) {
            res.status(200).send(error(e.message));
        }
    }
)

    //

//----------------------User routes---------------------------------//

//GET all users
router.get(
    "/admin/allUsers/:shyaraId",
    auth(['shayaraAdmin']),
    async (req, res) => {
        try {
            const allUsersDocs = await User.find(
                {shayara: req.params.shyaraId},
                "email name  phone role location createdAt updatedAt"
            ).exec();
            if (!allUsersDocs) {
                throw new Error("6");
            }

            res.send({ allUsersDocs });
        } catch (e) {
            res.status(200).send(error(e.message));
        }
    });

    
    //Remove driver
router.get(
    "/user/remove/:id",
    auth(['shyaraAdmin']),
    async (req, res) => {
        try {
            const driver = await findById(req.params.id)

            const isOwner = req.user.shayara === driver.shayara

            if (!isOwner) {
                throw new Error('user is not the admin of the driver')
            }

            await User.deleteOne({id: req.params.id})

            res.send(driver);
           
        } catch (e) {
            res.status(200).send(error(e.message));
        }
    }
)



    //---------------------Recording Routes---------------------------------------//

//UPLOAD recording '.wav' message file and send notification to recipient
router.post('/post', auth(['shayaraAdmin', 'driver']),upload.single('recording'), async (req, res) => { //telling 'multer' to look for a file named 'recording' when the req comes in 
    
    const {senderId, senderPhoneNum,recepientDevId,senderName, recipientId} = req.body;

    console.log('@@@ /post senderId: ', senderId);
     const recording = req.file.buffer;
    const user = req.user
    const recepient = User.findOne({deviceId: recepientDevId})

     if (!recipientId) {
        if (user.role === 'shayaraAdmin') {
            post.recipientId = User.find({shayara: user.shayara})
        } else {
            throw new Error('no recepient id')
        }
     }

     if (user.role !== 'shayaraAdmin' && recepient.role !== 'shayaraAdmin') {
        throw new Error('messages can be sent only to admin')
     }

    const post = new Post({
        time: new Date,
        senderId,
        recording,
        recipientId
    });


    
    await post.save();
    
    // const message = new gcm.Message({
    //     data: { 
    //         postId:  post._id,
    //         senderId: senderId,
    //         senderPhoneNum: senderPhoneNum,
    //         senderName:senderName
    //         }
    //     // notification: {
    //     //     title: "handsoff",
    //     //     body: "notification on voice post for you"
    //     // }
    // });
    
    // const regTokens = [recepientDevId];
    
    // sender.send(message, { registrationTokens: regTokens }, function (err, response) {
    //     if (err) console.error('push notification error',err);
    //     else if (response.success === 1) 
    //         {
    //             //post.updateOne({status: 'received'});
    //             console.log(response);
    //         }
    //     }
    // );

    res.send({postId: post._id});
   
}, (error,req,res,next) => {
    if (error) {console.log('/post error',error)};
    const {errmsg: errmsg = 'error'} = error;
        res.send(JSON.stringify({errmsg}));
});

//GET recording
router.get ('/getRecord/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;
        const post = await Post.findById(postId);
        
        if (!post) {
            res.send('error: post not found');
        } 
            
            res.set('Content-Type', 'application/octet-stream');
            res.send(post.recording);
         
    } catch (e) {
        const {errmsg: errmsg = 'error'} = e;
        res.send(JSON.stringify({errmsg}));
    }
});

module.exports = router