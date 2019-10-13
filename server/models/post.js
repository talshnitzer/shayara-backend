const mongoose = require('mongoose')

var PostSchema = new mongoose.Schema({
        conversationId: {
            type: String,
            required: true
        },
        time: {
            type: [Date]
        },
        senderId: {
            type: String,
            required: true
        },
        recipientId: {
            type: String,
            required: true
        },
        recording: {
            type: Buffer,
            required: true
        },
        status: {
            type: String,
            default: 'sent'
        }
});

const Post = mongoose.model('Post', PostSchema);

module.exports = {Post};