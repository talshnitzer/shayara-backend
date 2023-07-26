
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

            //console.log('@@@  UPDATE my user details, user', user)

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

            if (body.role) user.role = body.role;

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

        let shayara = await Shayara.findById(req.params.shayaraId);
        if (!shayara) {
            throw new Error('shayara not found')
        }
        
        let body = _.pick(req.body,
            ["name" , 'deviceId', 'phone']);

        let user = await User.findOne({deviceId: body.deviceId, shayara: shayara._id})

        body.shayara = req.params.shayaraId;

        if (!user) {
            user = new User(body);
            //user.save()
        } 
        

        const token = await user.generateAuthToken();

        const userOutput = _.pick(user, userOutputFields)
        
        //console.log('@@@ user/login/ shayara', shayara);
        const shayaraOutput = _.pick(shayara, ["shayaraName","shayaraOwner", "shayaraLocationName", "startLocation", "startTime", "endTime"])
        
        const output = {...userOutput, ...shayaraOutput}

        //console.log("@@@@ user login output", output);

        res.header("x-auth", token).
            send(output);

    } catch (e) {
        res.status(200).send(error(e.message));
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

            const isOwner = await Shayara.findOne({shayaraOwner: req.user._id})

            if (isOwner) {
                throw new Error('user can admin only 1 convoy')
            }
            
            const shayara = new Shayara(body);

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

                    //console.log("@@@  /shayara/update/:shayaraId  shayara.shayaraOwner , req.user._id", shayara.shayaraOwner, req.user._id);

                const isOwner = toString(shayara.shayaraOwner) === toString(req.user._id)

                if (!isOwner) {
                    throw new Error('user is not convoy owner')
                }

                if (body.shayaraName) shayara.shayaraName = body.shayaraName;
                if (body.shayaraLocationName) shayara.shayaraLocationName = body.shayaraLocationName;
                if (body.startLocation) shayara.startLocation.coordinates = body.startLocation.coordinates;
                if (body.startTime) shayara.startTime = body.startTime;
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
    auth(['shayaraAdmin']),
    async (req, res) => {
        try {
            let shayarasDoc = await Shayara.findOne({shayaraOwner: req.user._id});
            
            if (!shayarasDoc) {
                throw new Error("No convoys found");
            }

            const allUsersDocs = await User.find(
                {shayara: shayarasDoc._id},
                "_id name  phone role"
            ).exec();

            //console.log('@@@ allUsersDocs', allUsersDocs);

            shayarasDoc = {shayarasDoc, drivers: allUsersDocs}

            //console.log('@@@ shayarasDoc', shayarasDoc);

            res.send(shayarasDoc);
        } catch (e) {
            res.status(200).send(error(e.message));
        }
    });

    //Remove my Shayara
router.get(
    "/shayara/remove",
    auth(['shayaraAdmin']),
    async (req, res) => {
        try {


            const shayara = await Shayara.findOne({shayaraOwner: req.user._id})

            if (!shayara) {
                throw new Error('Convoy not found')
            }

            await User.deleteMany({shayara: shayara._id, role: {$ne: "shayaraAdmin"}})

            await shayara.remove()

            res.send(shayara);
           
        } catch (e) {
            res.status(200).send(error(e.message));
        }
    }
)

    //

//----------------------User routes---------------------------------//

//GET user
router.get(
    "/admin/getUserDetails/:_id",
    auth(['shayaraAdmin']),
    async (req, res) => {
        try {
            const user = await User.findOne(
                 {_id: req.params._id, shayara: req.user.shayara},
                "email name  phone role location"
            ).exec();
            if (!user) {
                throw new Error("user not found");
            }

            res.send(user);
        } catch (e) {
            res.status(200).send(error(e.message));
        }
    });

    
    //Remove driver
router.get(
    "/user/remove/:id",
    auth(['shayaraAdmin']),
    async (req, res) => {
        try {
            const driver = await User.findById(req.params.id)

            const isOwner = toString(req.user.shayara)  === toString(driver.shayara) 

            if (!isOwner) {
                throw new Error('user is not the admin of the driver')
            }

            await driver.remove()

            res.send(driver);
           
        } catch (e) {
            res.status(200).send(error(e.message));
        }
    }
)



    //---------------------Recording Routes---------------------------------------//

//UPLOAD recording '.wav' message file and send notification to recipient
router.post(
    '/post',
    auth(['shayaraAdmin', 'driver']),
    upload.single('recording'), 
    async (req, res) => { //telling 'multer' to look for a file named 'recording' when the req comes in 
    
    const { senderId, senderName, recipientId} = req.body;

    //console.log('@@@ /post senderId: ', senderId);
    //console.log('@@@ /post req: ', req.file.buffer);
     const recording = req.file.buffer;
    
    const user = req.user
    //console.log('@@@ post user role', user.role, user.role.includes('shayaraAdmin'));
    
    //console.log('@@@ /post multDeviceId: ', multDeviceId);
    //console.log('@@@ /post deviceId: ', deviceId);

     if (!recipientId) {
        if (!user.role.includes('shayaraAdmin')  ) {
            
            throw new Error('no recepient id')
        } 
    }

    let deviceId = '';
    if (recipientId) {
        deviceId = await User.findById(recipientId, "deviceId") 
        //console.log('@@@@ post deviceId-1', deviceId);
        deviceId = deviceId.deviceId
        //console.log('@@@@ post deviceId-2', deviceId);
    }
    
    const  result = await User.find({shayara: user.shayara}, "deviceId")
    const multDeviceId = result.map(a => a.deviceId)

    const post = new Post({
        time: new Date,
        senderId,
        recording,
        recipientId
    });


    
    await post.save();
    
    const message = new gcm.Message({
        "notification":
		{
            title: "Convoys",
            body : 'You have a new voice message'
		},	
	"data":{
        postId:  post._id,
        senderId: senderId,
        senderName:senderName
    },
	
	
    });
    
//console.log('@@@@@@ /post message: ', message);

    const registrationIds = !recipientId ? multDeviceId : [deviceId];

    //console.log('@@@@@@ /post registrationIds: ', registrationIds);
    
    sender.send(message, {registrationIds: registrationIds}, function (err, response) {
       console.log('@@@ sender.send');
        if (err) console.error('push notification error',err);
        //else if (response.success >= 1) 
        else if (response) 
            {
                //post.updateOne({status: 'received'});
                console.log('notification response',response);
            }
        }
    );

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