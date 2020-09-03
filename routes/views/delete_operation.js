exports = module.exports = function (req, res) {
    var dbConn = require('../db');
    var dbo = dbConn.getDb();
    var ObjectId = require('mongodb').ObjectId;
//    dbo.collection("users").deleteMany({});
    var id_values = req.query.id_value;
    console.log(req.query.id_value);
    console.log(id_values.length);
    var count = 0;
    for(count = 0; count < id_values.length; count++)
    {
        dbo.collection("users").deleteOne({ "_id" : new ObjectId(id_values[count]) });
    }
    res.send("Deleted");
}
