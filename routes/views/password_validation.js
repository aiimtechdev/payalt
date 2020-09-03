var bcrypt = require("bcryptjs");
exports = module.exports = function (req, res) {
    var dbConn = require('../db');
    var dbo = dbConn.getDb();
    var ObjectId = require('mongodb').ObjectId;
    var password = req.query.old_password;
    dbo.collection("users").findOne({"_id" : new ObjectId(req.query.id_value)}, function (err, result) {
        if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
            bcrypt.compare(password, result.password, function (err, passres) {
                if (passres === true) {
                    res.send("valid");
                } else {
                    res.send("password_not_matched");
                }
            });
        } else {
            res.send("not-valid");
        }
    });
}
