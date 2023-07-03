require('./config/config.js');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');


const routes = require('./routes/routes')



const app = express();
const corsOptions = {
    exposedHeaders: ['Content-Range','x-auth']
  }
app.use(cors(corsOptions));
const port = process.env.PORT ;
app.use(bodyParser.json()); //convert the request body from json to an object
app.use(routes);



app.listen(port, () => {  
    console.log(`Started up at port ${port}`);
});

module.exports = {app};