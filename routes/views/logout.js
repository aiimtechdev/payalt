exports = module.exports = function (req, res) {
    var locals = res.locals;
    var error = '';
    
    if(typeof req.session.logged_user_id != "undefined" && req.session.logged_user_id != ""){
        delete req.session.logged_user_id;
        delete req.session.logged_user_type;
    }
    res.redirect('/login');return;
}