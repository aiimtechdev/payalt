var async = require("async");
exports = module.exports = function (req, res) {
    var dbConn = require('../db');
    var dbo = dbConn.getDb();
    var user_data;
    var ObjectId = require('mongodb').ObjectId;
    var column_name = "date";
    var sort_type = "desc";
    //, {"sort" : [column_name, sort_type]}

    res.locals.content_type = "";
    //console.log(req.params.type);
    var type = req.params.type;
    var condition = {};
    var sort = {};
    var logged_user_id = req.session.logged_user_id;
    var page_type = '';
    if (type == 'processed')
    {
        res.locals.content_type = "Processed Orders";
        condition = {status: "processed", va_id: new ObjectId(logged_user_id)};
        page_type = 'processed';
    }
    else if (type == 'failed')
    {
        res.locals.content_type = "Failed or User Cancelled Orders";
        condition = {status: "failed", va_id: new ObjectId(logged_user_id)};
        page_type = 'failed';
    }
    else
    {
        res.locals.content_type = "Recent Orders";
        condition = {status: "pending", va_id: new ObjectId(logged_user_id)};
        page_type = 'pending';
    }
    sort['_id'] = -1;
    async.waterfall([
        function (next) {
            dbo.collection("transaction").find(condition).count().then(function (numItems) {
                if (numItems == 'undefined')
                {
                    res.locals.recent_count = 0;
                }
                else
                {
                    res.locals.recent_count = numItems;
                }
                //console.log(res.locals.recent_count);
                next(null);
            });
        }, function (next) {
            dbo.collection("transaction").aggregate([
                {$lookup:{from:"virtual_assistant_transaction", localField: "_id", foreignField: "transaction_id", as: "virtual_assistant_trans"}}, 
                {$unwind: {"path":"$virtual_assistant_trans","preserveNullAndEmptyArrays": true}},
                {$match : condition},
                {$sort : sort},
                {$skip : 0},
                {$limit : 10}]).toArray(function(err, result) {
                if (err)
                    throw err;         
                //console.log(result[0]);
                res.locals.user_data = result;
                res.locals.transaction_data = result;
                res.locals.page = "orders";
                res.render('orders',{page_type:page_type});
                return;
            });
        }
    ]);
}
