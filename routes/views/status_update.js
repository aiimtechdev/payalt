exports = module.exports = function (req, res) {
    var dbConn = require('../db');
    var dbo = dbConn.getDb();
    var ObjectId = require('mongodb').ObjectId;
    dbo.collection("users").updateOne( {"_id" : new ObjectId(req.query.id_value) },{ $set: {"active" : req.query.active_value} } , function(err, resultupdate) {
        res.send("Status Updated");
    });
}
