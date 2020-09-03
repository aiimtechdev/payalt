var async = require("async");

exports = module.exports = function (req, res) {
    //console.log(req.params);
    //console.log(req.query);
    if(typeof req.params.va_id != 'undefined' && req.params.va_id != '' && typeof req.params.trans_id != 'undefined' && req.params.trans_id != ''){
        var va_id = req.params.va_id;
        var trans_id = req.params.trans_id;
        
        var dbConn = require( '../db' );    
        var dbo = dbConn.getDb();
        var ObjectId = require('mongodb').ObjectId;
        
        var hex = /[0-9A-Fa-f]{6}/g;
        var usr_id = (hex.test(va_id))? ObjectId(va_id) : va_id;
        var trans_id = (hex.test(trans_id))? ObjectId(trans_id) : trans_id;        
        
        async.waterfall([
            function(next) {
                dbo.collection("users").findOne({"_id" : usr_id} , function(err, result) {
                    if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")){
                        next(null);
                    } else {
                        res.render('process_order',{"err" : "Invalid URL"});return;
                    }
                });
            },function(next) {
                dbo.collection("transaction").findOne({"_id" : trans_id} , function(err, result) {
                    if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")){
                        if(typeof result.va_id != 'undefined' && result.va_id != '' && result.va_id != null){
                            res.render('process_order',{"err" : "Order already assigned to a Virtual Assistant"});return;
                        } else {
                            next(null);
                        }
                    } else {
                        res.render('process_order',{"err" : "Invalid URL"});return;
                    }
                });
            },function(next) {
                dbo.collection("transaction").updateOne( {"_id" : trans_id },{ $set: {"va_id" : usr_id, "status" : "pending"} } , function(err, result) {
                    if(err){                        
                        res.render('process_order',{"err" : "Order assigning failed. Try again later"});
                        return;
                    } else {
                        req.session.logged_user_id = va_id.toString();
                        req.session.logged_user_type = "va";
                        
                        res.render('process_order',{"succ" : "Order assigned to your account"});
                        return;
                    }
                });
            }
        ]);
    } else {
        res.render('process_order',{"err" : "Invalid URL"});return;
    }
}