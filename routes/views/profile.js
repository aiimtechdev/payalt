exports = module.exports = function (req, res, next) {
    var locals = res.locals;    
    
    var dbConn = require( '../db' );
    var dbo = dbConn.getDb();
    var ObjectId = require('mongodb').ObjectId;
    
    var logged_user_id = req.session.logged_user_id;
    var logged_user_type = req.session.logged_user_type;
    var tbl = "users";
    if(logged_user_type == "admin"){
        tbl = "admin";
    }
    
    locals.us_states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    if(req.body.update_profile == '1'){
        var username = req.body.username;
        var email = req.body.email;
        var phone = req.body.phone;
        
        var dbConn = require( '../db' );    
        var dbo = dbConn.getDb();
    } else {
        dbo.collection(tbl).findOne({"_id" : new ObjectId(logged_user_id)} , function(err, result) {
            locals.result = result;
            res.render('profile');
        });
    }
}