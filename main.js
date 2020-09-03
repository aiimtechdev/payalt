require('dotenv').load();

const express = require('express')
const siteapp = express()

const bodyParser = require('body-parser')
const session = require('express-session')

var MongoDBStore = require('connect-mongodb-session')(session);
var store = new MongoDBStore({
    //uri: process.env.MONGO_URI + '/' + process.env.MONGO_DB,
    uri: process.env.MONGO_URI,
    databaseName: process.env.MONGO_DB,
    collection: 'siteSessions'
});

siteapp.set('trust proxy', 1) // trust first proxy

siteapp.use(session({
    secret: 'npdsh0pp1ng',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    },
    store: store
}))

siteapp.get('/', function(req, res) {
    res.locals.sessionval = req.session;
    res.render('index_new');
});

siteapp.use(function (req, res, next) {
    res.locals.sessionval = req.session;
    next();
});

siteapp.use(express.static('public'))

siteapp.set('view engine', 'ejs')
// Tell the bodyparser middleware to accept more data
siteapp.use(bodyParser.json({limit: '50mb'}));
siteapp.use(bodyParser.urlencoded({limit: '50mb',extended: true}))

var mainRoutes = require('./routes');
siteapp.use(mainRoutes);

var dbConn = require('./routes/db');
dbConn.connectToServer(function (err) {
    //console.log(err);
    // start the rest of your app here
});

siteapp.listen(8080, function () {
    console.log('Server Started on Port 8080');
});