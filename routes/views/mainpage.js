exports = module.exports = function (req, res) {
    var async = require("async");
    var bcrypt = require("bcryptjs");
    var locals = res.locals;
    locals.logged_user_id = req.session.logged_user_id;
    if(typeof req.session.logged_user_id != 'undefined' && req.session.logged_user_id != ''){
        locals.logged_in = 1;
    } else {
        locals.logged_in = 0;
    }
    
    locals.dir_name = __dirname;
    
    if(typeof req.body.logout_process != 'undefined' && req.body.logout_process == 1){
        if(typeof req.session.logged_user_id != "undefined" && req.session.logged_user_id != ""){
            delete req.session.logged_user_id;
            delete req.session.logged_user_type;
            locals.logged_in = 0;
        }
        res.redirect('/mainpage');
    } else if(typeof req.body.login_process != 'undefined' && req.body.login_process == 1){
        var username = req.body.username;
        var password = req.body.password;
        if(username == '' || password == ''){
            locals.login_err_msg = 'Invalid Username / Password';
            res.redirect('/mainpage');
        } else {
            var dbConn = require( '../db' );    
            var dbo = dbConn.getDb();
            dbo.collection("users").findOne({username:username},function(err, result) {
                if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")){
                    bcrypt.compare(password, result.password, function(err, passres) {
                        if(passres === true){
                            req.session.logged_user_id = result._id.toString();
                            req.session.logged_user_type = result.user_type;
                            locals.logged_in = 1;
                            res.redirect('/mainpage');
                        } else {
                            locals.login_err_msg =  "Invalid Password";
                            res.redirect('/mainpage');
                        }
                    });
                } else {
                    locals.login_err_msg =  "Invalid Username";
                    res.redirect('/mainpage');
                }
            });
        }
    } else {
        res.render('main');
    }
    
    
    
    /*const electron = require('electron')
    // Module to control application life.
    const app = electron.app
    // Module to create native browser window.
    const BrowserWindow = electron.BrowserWindow
    var Window = new BrowserWindow({ width: 600, height: 400, show: false, frame: false });
    Window.loadURL('http://google.com');
    Window.webContents.on('did-finish-load', function() {
        Window.show();
    });*/
}