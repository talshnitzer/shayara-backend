const mongoose = require('mongoose')

var PostSchema = new mongoose.Schema({
        
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
        }
},{
    timestamps: true
});

const Post = mongoose.model('Post', PostSchema);

module.exports = {Post};