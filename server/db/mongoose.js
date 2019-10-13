var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI,{ useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    if (err) {
        return console.log('Unable to connect to MongoDB server', process.env.MONGODB_URI);
    }
    console.log('Connected to MongoDB server');
});

module.exports = {mongoose};