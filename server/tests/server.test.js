const expect  =require('expect');
const request = require('supertest');
const {ObjectId} = require('mongodb');
const rewire = require('rewire');
const chai      = require('chai');
const sinon     = require('sinon');
const sinonChai = require('sinon-chai');
const check    = chai.expect;

const myServer = rewire('../server');
const {users, populateUsers,conversations,populateConversations,posts, populatePosts} = require('./seed/seed');
const {Conversation} = require('../models/conversation');
const {Post} = require('../models/post');
const path = require('path');

const app = myServer.app;

chai.use(sinonChai);

beforeEach(populateUsers);
beforeEach(populateConversations);
beforeEach(populatePosts);



describe ('Post /find-user', () => {
    let body = {
        phoneNum: users[0].phoneNum,
        MyId: users[1]._id
    };
    it ('Should find registered user', (done) => {
        
        request(app)
        .post('/find-user')
        .send(body)
        .expect(200)
        .expect((res) => {
            expect(res.body.user._id.toString()).toBe(users[0]._id.toString())
        })
        .end(done) 
    });
    it('Should find existing conversation', (done) => {

        request(app)
        .post('/find-user')
        .send(body)
        .expect(200)
        .expect((res) => {
            expect(res.body.conversation._id).toBe(conversations[0]._id.toString());
        })
        .end((err, res) => {
            if (err) {
                return done(err);
            }
            Conversation.find().then((conversations) => {
                expect(conversations.length).toBe(2);
                done();
            }).catch((e) => done(e));
        })
    });
    it('Should create a new conversation',(done) => {
        let body = {
            phoneNum: users[2].phoneNum,
            MyId: users[0]._id
        };

        request(app)
        .post('/find-user')
        .send(body)
        .expect(200)
        .end((err, res) => {
            if (err) {
                return done(err);
            }
            Conversation.find().then((conversations) => {
                expect(conversations.length).toBe(3);
                done();
            }).catch((e) => done(e));
        })
    });
});

describe('POST /post', () => {
    
    it ('Should create a new post and upload a file in in post', (done) => {

        const sender = {
            send: sinon.spy()
        }
        myServer.__set__('sender', sender);

        request(app)
        .post('/post')
        .set('Content-type', 'multipart/form-data')
        .attach('recording', path.join(__dirname, '../../upload-files/addf8-Alaw-GW.wav'))
        .field("conversationId", "5d9c69c5d2bb0e3d793e587a")
        .field("senderId", "456def")
        .field("senderPhoneNum", "0545633955")
        .field("senderName", "Tal")
        .field("recepientDevId", "e1vnoaAUNc0:APA91bGn5InMxxKRKj5oJa-q3fsBMq9oyMX2-wrjBlAknfOe4IC7bRBmN-6ZaurPaiUj8i4W7RsYcAYNctlv71B13g76tU_C_clWnxgvA2EGAj_ZxJ4biQqagK97TKdusw-RIShy6AUZ")
        .field("recipientId", "5d8b4d014da450326a366e47")
        .expect(200)
        .expect((res) => {
            expect(res.body).toBeDefined();
            check(sender.send).to.have.been.calledOnce;
        })
        .end((err, res) => {
            if (err) {
                return done(err);
            }
            Post.find().then((posts) => {
                expect(posts.length).toBe(3);
                done();
            }).catch((e) => done(e));
        });
    });
});

describe('POST /find-post', () => {
    it ('should find a post and update post status', (done) => {
        const body = {
            postId: posts[0]._id,
            recipientId: posts[0].recipientId
        }

        request(app)
        .post('/find-post')
        .send(body)
        .expect(200)
        .expect((res) => {
            expect(res.body).toBeDefined;
        })
        .end(() => {
            Post.findById(body.postId).then((post) => {
                expect(post.status).toBe('received');
                done();
            }).catch((e) => done(e));
        })
    })
});

describe('POST /post-status',()=> {
    it('Should update a post status and send notification to server', (done) => {
        const body = {
            postId: posts[1]._id,
            recipientId: posts[1].recipientId,
            status: 'played'
        }
        const sender = {
            send: sinon.spy()
        }
        myServer.__set__('sender', sender);

        request(app)
        .post('/post-status')
        .send(body)
        .expect(200)
        .expect((res) => {
            expect(res.body).toBeDefined();
            check(sender.send).to.have.been.calledOnce;
        })
        .end((err, res) => {
            if (err) {
                return done(err);
            }
            Post.findById(body.postId).then((post) => {
                expect(post.status).toBe(body.status);
                done();
            }).catch((e) => done(e));
        });
    });

    it('Should not update a post status if recipientId doesnt belong to post recipient', (done) => {
        const body = {
            postId: posts[1]._id,
            recipientId: posts[0].recipientId,
            status: 'played'
        }
        const sender = {
            send: sinon.spy()
        }
        myServer.__set__('sender', sender);

        request(app)
        .post('/post-status')
        .send(body)
        .expect(200)
        .expect((res) => {
            check(sender.send).not.to.have.been.called;
        })
        .end((err, res) => {
            if (err) {
                return done(err);
            }
            Post.findById(body.postId).then((post) => {
                expect(post.status).not.toBe(body.status);
                done();
            }).catch((e) => done(e));
        });
    });
});