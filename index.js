const express = require('express');
const app = express();

app.use(express.json());
var bodyParser = require('body-parser')
app.use(bodyParser.json());

var cors = require('cors');
require('dotenv').config()
var morgan = require('morgan');

app.use(morgan('combined'))
app.use(express.static('client'));

app.use(cors());


app.listen(process.env.PORT || '3000', () => {
    console.log(`Server is running on port: ${process.env.PORT || '3000'}`);
});