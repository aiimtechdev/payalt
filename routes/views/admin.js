var bcrypt = require("bcryptjs");
exports = module.exports = function (req, res) {
    var locals = res.locals;
    var error = '';
    if(typeof req.session.err_msg != "undefined" && req.session.err_msg != ''){
        locals.err_msg = req.session.err_msg;
        delete req.session.err_msg;
    }
    if(typeof req.session.succ_msg != "undefined" && req.session.succ_msg != ''){
        locals.succ_msg = req.session.succ_msg;
        delete req.session.succ_msg;
    }
    if(req.body.open_brow == '1'){
        var username = req.body.username;
        var password = req.body.password;
        if(username == '' || password == ''){
            locals.err_msg = 'Invalid Username / Password';
            res.render('admin');
        } else {
            var dbConn = require( '../db' );    
            var dbo = dbConn.getDb();
            dbo.collection("admin").findOne({username:username},function(err, result) {
                if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")){
                    bcrypt.compare(password, result.password, function(err, passres) {
                        if(passres === true){
                            req.session.logged_user_id = result._id.toString();
                            req.session.logged_user_type = "admin";
                            
                            res.redirect('/profile');
                            return;
                        } else {
                            locals.err_msg =  "Invalid Password";
                            res.render('admin');
                        }
                    });
                } else {
                    locals.err_msg =  "Invalid Username";
                    res.render('admin');
                }
            });
        }
    } else {
        res.render('admin');
    }    
}