const mongoose = require('mongoose');

var ConversationSchema = new mongoose.Schema({
    participants: {
        type: [String],
        require: true
    }
});

var Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports = {Conversation};