require('../server/config/config.js');

const {mongoose} = require('./db/mongoose.js');
const _ = require('lodash');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const hbs = require('hbs');
const {User} = require('./models/user');
const {Conversation} = require('./models/conversation');
const {Post} = require('./models/post');
const multer = require('multer');
const gcm = require('node-gcm');

const app = express();
const port = process.env.PORT;

//Define paths for Express config
const viewsPath = path.join(__dirname, '../templates/views') ;
const partialsPath = path.join(__dirname, '../templates/partials');

//upload files
const upload = multer({});

// Set up the sender with your GCM/FCM API key (declare this once for multiple messages)
const sender = new gcm.Sender(process.env.FCM_SERVER_KEY);


//Setup handlebars engine and views location
app.set('view engine', 'hbs');                         //set allows to set a value for a given express setting.'key'-the setting name, 'value'
                                                        //with hbs (handlebars) we can serve dynamic pages to browser
app.set('views',viewsPath) ;                            //customise the views directory
hbs.registerPartials(partialsPath);

// Setup static directory to serve
app.use(express.static(path.join(__dirname, '.. /public'))); //serve static pages to the browswe


app.use(bodyParser.json());

//SIGN UP
app.post('/signup',async (req,res) =>{
    try {
        console.log('enter signup');
        const body = _.pick(req.body, ['name','deviceId','phoneNum']);
        const user = new User(body);
        await user.save();
        res.send(user);
    } catch (e) {
        console.log('error',e);
        res.send(`error: ${e.message}`);
    }
});

//Find a user by phoneNum and create new conversation between users, if there isn't.
app.post('/find-user',async (req,res) => {
    try {
        const body = req.body;
        const user = await  User.findOne({
            phoneNum: body.phoneNum
        });
        if (!user) {
            console.log('user not found');
            res.send('error: user not found');
        } else {
            let conversation = await Conversation.findOne({
                $and: [
                    {
                    participants: user._id,
                    participants: body.MyId
                    }
                ]
            });
            if (!conversation) {
                conversation = new Conversation({participants: [user.id, body.MyId]});
                await conversation.save();
            }
            const response = {user,conversation};
            res.send(response);
        }     
    } catch (e) {
        console.log('error',e);
        
        res.send(`error: ${e.message}`)
    }
});

//UPLOAD recording '.wav' message file and send notification to recipient
app.post('/post', upload.single('recording'), async (req, res) => { //telling 'multer' to look for a file named 'recording' when the req comes in 
    const {conversationId,senderId, senderPhoneNum,recepientDevId,senderName, recipientId} = req.body;
    const recording = req.file.buffer;

    const post = new Post({
        conversationId,
        time: new Date,
        senderId,
        recording,
        recipientId
    });

    await post.save();
    
    const message = new gcm.Message({
        data: { 
            postId:  post._id,
            senderId: senderId,
            senderPhoneNum: senderPhoneNum,
            senderName:senderName
            },
        notification: {
            title: "handsoff",
            body: "notification on voice post for you"
        }
    });
    
    const regTokens = [recepientDevId];
    
    sender.send(message, { registrationTokens: regTokens }, function (err, response) {
        if (err) console.error('push error',err);
        else if (response.success === 1) 
            {
                post.updateOne({status: 'received'});
                console.log(response);
            }
        }
    );

    res.send(post._id);
}, (error,req,res,next) => {
    res.send(`error: ${error.message}`);
});

//Find post and update post status
app.post ('/find-post', async (req, res) => {
    try {
        const {postId, recipientId} = req.body;
        const post = await Post.findById(postId);
        if (!post) {
            res.send('error: post not found');
        } else {
            if (recipientId === post.recipientId) {
                post.updateOne({status: 'received'});
            }
            res.set('Content-Type', 'application/octet-stream');
            res.send(post.recording);
        }
        
    } catch (e) {
        console.log('error: ',e);
        res.send(`error: ${e.message}`);
    }
});

//RCV the post status from recipient, update status and send notification to server
app.post('/post-status',async (req, res) => {
    try {
        const {postId, recipientId, status} = req.body;
        const post = await Post.findOneAndUpdate({_id: postId, recipientId}, {status},{new: true});
        const senderUser = await User.findById(post.senderId);
        const regTokens =   senderUser.deviceId;  
        const message = new gcm.Message({
            data: { 
                postId:  post._id,
                recipientId: post.recipientId
                },
            notification: {
                title: "handsoff",
                body: "message you sent, has been played by recipient"
            }
        });
    
        sender.send(message, { registrationTokens: regTokens }, function (err, response) {
            if (err) console.error('push error',err);
            console.log(response);
            }
        );
        res.send();
    } catch (e) {
        res.send(`error: ${e.message}`);
    }
    
});

app.listen(port,() =>{
    console.log(`Started up at port ${port}`);
});

module.exports = {app};