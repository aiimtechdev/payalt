var async = require("async");
exports = module.exports = function (req, res) {
    var dbConn = require('../db');
    var dbo = dbConn.getDb();
    var user_data;
    var locals = res.locals;
    var queryArr = [];
    var sort = {};
    var ObjectId = require('mongodb').ObjectId;
    locals.usertype = "admin";
    locals.page = "user_management";
    locals.update_process = 0;

    if (req.body.form_value == 'password_change') {
        //console.log("Update Password");
        var current_password = req.body.current_password;
        var new_password = req.body.password;

        var record_id = req.body.form_record_id_pass;
        async.waterfall([
            function (next) {
                dbo.collection("users").find({}).count().then(function (numItems) {
                    if (numItems == 'undefined')
                    {
                        locals.user_data_count = 0;
                    }
                    else
                    {
                        locals.user_data_count = numItems;
                    }
                    //console.log(locals.user_data_count);
                    next(null);
                });
            }, function (next) {
                dbo.collection("users").find({}).skip(0).limit(10).toArray(function (err, result) {
                    if (err)
                        throw err;
                    locals.user_data = result;
                    res.render('user_management');
                    return;
                });
            }
        ]);
    } else if (req.body.form_value == 'phone_number_change') {
        //console.log("Update Phone number");
        var new_phone_number = req.body.new_phone_number;
        var record_id = req.body.form_record_id_phone;
        //console.log(new_phone_number);
        //console.log(record_id);
        dbo.collection("users").updateOne({"_id": new ObjectId(record_id)}, {$set: {"phone_number": new_phone_number}}, function (err, resultupdate) {
            async.waterfall([
                function (next) {
                    dbo.collection("users").find({}).count().then(function (numItems) {
                        if (numItems == 'undefined')
                        {
                            locals.user_data_count = 0;
                        }
                        else
                        {
                            locals.user_data_count = numItems;
                        }
                        //console.log(locals.user_data_count);
                        next(null);
                    });
                }, function (next) {
                    dbo.collection("users").find({}).skip(0).limit(10).toArray(function (err, result) {
                        if (err)
                            throw err;
                        locals.user_data = result;
                        locals.update_process = 1;
                        res.render('user_management');
                        return;
                    });
                }
            ]);
            
        });
    }
    else
    {
        async.waterfall([
            function (next) {
                dbo.collection("users").find({}).count().then(function (numItems) {
                    if (numItems == 'undefined')
                    {
                        locals.user_data_count = 0;
                    }
                    else
                    {
                        locals.user_data_count = numItems;
                    }
                    //console.log(locals.user_data_count);
                    next(null);
                });
            }, function (next) {
                sort['_id'] = -1;
                //dbo.collection("users").aggregate([{$lookup: {from: "users", localField: "va_id", foreignField: "_id", as: "virtual_assistant_id"}}, {$sort: sort}, {$skip: 0}, {$limit: 10}]).toArray(function (err, result) {
                dbo.collection("users").find({}).skip(0).limit(10).toArray(function (err, result) {
                    if (err)
                        throw err;
                    //console.log(result);
                    locals.user_data = result;
                    res.render('user_management');
                    return;
                });
            }
        ]);
    }
}