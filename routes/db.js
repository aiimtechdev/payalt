var MongoClient = require('mongodb').MongoClient;
var _db;
module.exports = {
    connectToServer: function (callback) {
        console.log("INSIDE CONNECT");
        MongoClient.connect(process.env.MONGO_URI, {useNewUrlParser: true }, function (err, client) {
		if(err){
		    console.error('An error occurred connecting to MongoDB: ', err);
		}
		_db = client.db(process.env.MONGO_DB);
	         return callback(err);
        });
    },
    getDb: function () {
        return _db;
    }
};
