var async = require("async");
exports = module.exports = function (req, res) {
    var dbConn = require('../db');
    var dbo = dbConn.getDb();
    var user_data;
    var column_name = "date";
    var sort_type = "desc";
    var ObjectId = require('mongodb').ObjectId;
    res.locals.content_type = "";
    var logged_user_id = req.session.logged_user_id;
    var logged_user_type = req.session.logged_user_type;
    var add_extra_condition = "";
    var sort = {};
    var condition = {};
    async.waterfall([
        function (next) {
            if (logged_user_type == "shopper")
            {
                condition = {$or: [{status: "pending"}, {status: ""}, {status: "recent"}, {status: "payment_pending"}, {status: "processed"}], shopper_id: new ObjectId(logged_user_id)};
            }
            else
            {
                condition = {$or: [{status: "pending"}, {status: ""}, {status: "recent"}, {status: "payment_pending"}, {status: "processed"}]};
            }
            sort['_id'] = -1;
            async.waterfall([
                function (inner_next) {
                    var numItems;
                    dbo.collection("transaction").find(condition).count().then(function (numItems) {
                        res.locals.pending_count = numItems;
                        inner_next(null);
                    });
                },
                function (inner_next) {
//                    dbo.collection("transaction").find(condition).skip(0).limit(2).toArray(function (err, result) {
                        dbo.collection("transaction").aggregate([{$lookup:{from:"users", localField: "va_id", foreignField: "_id", as: "virtual_assistant_id"}}, { $match : condition }, { $sort : sort }, { $skip : 0 }, { $limit : 5 }]).toArray(function(err, result) {
                            if (err)
                                throw err;
                            res.locals.user_data = result;
                            res.locals.pending_transaction_data = result;
                            next(null);
                        });
//                    });
                }
            ]);
        }, function (next) {
            if (logged_user_type == "shopper")
            {
                condition = {$or: [{status: "failed"}, {status: "cancelled"}], shopper_id: ObjectId(logged_user_id)};
            }
            else
            {
                condition = {$or: [{status: "failed"}, {status: "cancelled"}]};
            }
            sort['_id'] = -1;
            async.waterfall([
                function (inner_next1) {
                    dbo.collection("transaction").find(condition).count().then(function (numItems) {
                        res.locals.failed_count = numItems;
                        inner_next1(null);
                    });
                }, function (inner_next1) {
//                    dbo.collection("transaction").find(condition).skip(0).limit(2).toArray(function (err, result) {
                        dbo.collection("transaction").aggregate([{$lookup:{from:"users", localField: "va_id", foreignField: "_id", as: "virtual_assistant_id"}}, { $match : condition }, { $sort : sort }, { $skip : 0 }, { $limit : 5 }]).toArray(function(err, result) {
                            if (err)
                                throw err;
                            res.locals.user_data = result;
                            res.locals.failed_transaction_data = result;
                            next(null);
                        });
//                    });
                }
            ]);
        }, function (next) {
            if (logged_user_type == "shopper")
            {
                condition = {status: "completed", shopper_id: new ObjectId(logged_user_id)};
            }
            else
            {
                condition = {status: "completed"};
            }
            sort['_id'] = -1;
            async.waterfall([

                function (inner_next2) {
                    dbo.collection("transaction").find(condition).count().then(function (numItems) {
                        if (numItems == 'undefined')
                        {
                            res.locals.recent_count = 0;
                        }
                        else
                        {
                            res.locals.recent_count = numItems;
                        }
                        inner_next2(null);
                    });
                }, function (inner_next2) {
//                    dbo.collection("transaction").find(condition).skip(0).limit(2).toArray(function (err, result) {
                    dbo.collection("transaction").aggregate([{$lookup:{from:"users", localField: "va_id", foreignField: "_id", as: "virtual_assistant_id"}}, { $match : condition }, {$sort: sort }, { $skip : 0 }, { $limit : 5 }]).toArray(function(err, result) {
                        if (err)
                            return;
                        res.locals.user_data = result;
                        res.locals.recent_transaction_data = result;
                        res.locals.page = "transactions";
                        res.locals.user_type = logged_user_type;
                        res.render('transactions');
                        return;
                    });
                }
            ]);
        }
    ]);
}
