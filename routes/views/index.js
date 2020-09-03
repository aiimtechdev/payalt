exports = module.exports = function (req, res) {
    var locals = res.locals;
    if(typeof req.session.logged_user_id != 'undefined' && req.session.logged_user_id != '')
    {
        locals.logged = 1;
    }
    else
    {
        locals.logged = 0;
    }
    res.render('index');
}