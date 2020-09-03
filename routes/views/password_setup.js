var async = require("async");
var bcrypt = require("bcryptjs");

exports = module.exports = function (req, res) {
    //console.log(req.params);
    //console.log(req.query);
    var locals = res.locals;
    if(typeof req.params.id != 'undefined' && req.params.id != ''){
        var usr_id = req.params.id;
        var dbConn = require( '../db' );    
        var dbo = dbConn.getDb();
        var ObjectId = require('mongodb').ObjectId;
        
        var hex = /[0-9A-Fa-f]{6}/g;
        var usr_id = (hex.test(usr_id))? ObjectId(usr_id) : usr_id;
        
        dbo.collection("users").findOne({"_id" : usr_id} , function(err, result) {
            console.log(err);
            if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")){
                if(result.password == '' || result.password == null){
                    if(req.body.password_setup == '1'){
                        
                        var password_user = req.body.password;
                        var salt = bcrypt.genSaltSync(10);
                        var password_hash = bcrypt.hashSync(password_user, salt);

                        dbo.collection("users").updateOne( {"_id" : usr_id },{ $set: {"password": password_hash, "active" : "1", "otp_send" : ""} } , function(err, result) {
                            if(err){
                                locals.err_msg =  "Error in setting password. Try again later";
                                res.render('password_setup');
                                return;
                            } else {
                                req.session.succ_msg =  "Password setted successfully";
                                res.redirect('/login');return;
                            }
                        });

                    } else {
                        res.render('password_setup');
                    }
                } else {
                    req.session.err_msg =  "Password setup link expired";
                    res.redirect('/login');return;
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