const {ObjectId} = require('mongodb');
const {User} = require('../../models/user');
const {Conversation} = require('../../models/conversation');
const {Post} = require('../../models/post');

const userOneId = new ObjectId();
const userTwoId = new ObjectId();
const userThreeId = new ObjectId();

const converstaionOneId = new ObjectId();
const converstaionTwoId = new ObjectId();
const converstaionThreeId = new ObjectId();

const postOneId = new ObjectId();
const postTwoId = new ObjectId();
const postThreeId = new ObjectId();

const users = [{
    _id: userOneId,
    deviceId: '1',
    name: 'Tal Snitzer',
    phoneNum: '12121212'
    },
    {
        _id: userTwoId,
        deviceId: '2',
        name: 'Shimon',
        phoneNum: '343434343434'
    },
    {
        _id: userThreeId,
        deviceId: '3',
        name: 'Yosef Mango',
        phoneNum: '5656565656'
    } ];

    const conversations = [
        {
            _id: converstaionOneId,
            participants: [userOneId, userTwoId]
        },
        {
            _id: converstaionTwoId,
            participants: [userTwoId, userThreeId]
        }
    ];

    const posts = [
        {
            _id: postOneId,
            conversationId: conversations[0]._id,
            time: new Date,
            senderId: users[0]._id,
            recipientId: users[1]._id,
            recording: Buffer.alloc(8),
            status: 'sent'            
        },
        {
            _id: postTwoId,
            conversationId: conversations[1]._id,
            time: new Date,
            senderId: users[1]._id,
            recipientId: users[2]._id,
            recording: Buffer.alloc(8),
            status: 'sent' 
        },
    ]

const populateUsers = (done) => {
    User.remove({}).then(() => {
        const userOne = new User(users[0]).save();
        const userTwo = new User(users[1]).save();
        const userThree = new User(users[2]).save();

        return Promise.all([userOne, userTwo, userThree]);
    }).then(() => done());
};

const populateConversations = (done) => {
    Conversation.remove({}).then(() => {
        return Conversation.insertMany(conversations);
    }).then(() => done());
}

const populatePosts = (done) => {
    Post.remove({}).then(() => {
        return Post.insertMany(posts);
    }).then(() => done());
}

module.exports = {users, populateUsers, conversations, populateConversations, posts, populatePosts}