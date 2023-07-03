const mongoose = require('mongoose')

var MessageSchema = new mongoose.Schema({
        
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

const Message = mongoose.model('Message', MessageSchema);

module.exports = {Message};