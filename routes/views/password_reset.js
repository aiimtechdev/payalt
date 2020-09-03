var async = require("async");
var bcrypt = require("bcryptjs");

exports = module.exports = function (req, res) {
    //console.log(req.params);
    //console.log(req.query);
    var locals = res.locals;
    if(typeof req.params.id != 'undefined' && req.params.id != ''){
        var password_reset_code = req.params.id;
        var dbConn = require( '../db' );    
        var dbo = dbConn.getDb();
        var ObjectId = require('mongodb').ObjectId;        
        
        dbo.collection("users").findOne({"password_reset_code" : password_reset_code} , function(err, result) {
            if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")){
                var usr_id = result._id.toString();
                if(req.body.password_reset == '1'){
                    var password_user = req.body.password;
                    var salt = bcrypt.genSaltSync(10);
                    var password_hash = bcrypt.hashSync(password_user, salt);

                    dbo.collection("users").updateOne( {"_id" : new ObjectId(usr_id) },{ $set: {"password": password_hash,"password_reset_code":""} } , function(err, result) {
                        if(err){
                            locals.err_msg =  "Error in resetting password. Try again later";
                            res.render('password_reset');
                            return;
                        } else {
                            req.session.succ_msg =  "Password resetted successfully";
                            res.redirect('/login');return;
                        }
                    });

                } else {
                    res.render('password_reset');
                }
            } else {
                res.redirect('/');return;
            }
        });
    } else {
        res.redirect('/');
        return;
    }
}