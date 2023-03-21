const express = require('express');
const app = express();
const loginRouter = require('./api/login/login.router');
const schoolYearRouter = require('./api/maintenance/schoolyear/schoolyear.router');
const subjectRouter = require('./api/maintenance/subjects/subjects.router');
const roomRouter = require('./api/maintenance/rooms/rooms.router');


app.use(express.json());
var bodyParser = require('body-parser')
app.use(bodyParser.json());

var cors = require('cors');
require('dotenv').config()
var morgan = require('morgan');

app.use(morgan('combined'))
app.use(express.static('client'));

app.use(cors());


app.use('/api/user', loginRouter);
app.use('/api/schoolyear', schoolYearRouter);
app.use('/api/subjects', subjectRouter);
app.use('api/room', roomRouter);


app.listen(process.env.PORT || '3000', () => {
    console.log(`Server is running on port: ${process.env.PORT || '3000'}`);
});