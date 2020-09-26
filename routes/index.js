// Load Routes
const router = require('express').Router();

function requireRole (logged, role) {
    return function (req, res, next) {
        //return next();
        if(logged == false){
            if(typeof req.session.logged_user_id == "undefined" || req.session.logged_user_id == ""){
                return next();
            } else {
                return res.redirect("/profile");
            }
        } else if(logged == true){
            if (req.session.logged_user_id && role == 'all') {
                return next();
            } else if (req.session.logged_user_id && role != 'all' && req.session.logged_user_type === role) {
                return next();
            } else {
                return res.redirect("/");
            }
        } else {
            return next();
        }
    }
}

//router.all('/', require('./views/index'));
router.all('/', require('./views/index_new'));
//router.all('/home', require('./views/index'));
router.all('/home', require('./views/index_new'));
router.all('/home-2', require('./views/index_new'));
router.all('/logout', require('./views/logout'));
router.all('/admin', require('./views/admin'));
router.all('/mainpage', require('./views/mainpage'));
router.all('/password_setup/:id', require('./views/password_setup'));
router.all('/password_reset/:id', require('./views/password_reset'));
router.all('/terms_conditions', require('./views/terms_conditions'));
router.all('/privacy_policy', require('./views/privacy_policy'));
router.all('/legal', require('./views/copyright_policy'));
router.all('/about', require('./views/about'));
router.all('/chatcode', require('./views/chatcode'));
router.all('/coinbase_oauth', require('./views/coinbase_oauth'));
router.all('/coinbase_check', require('./views/coinbase_check'));
router.all('/forgot_password', require('./views/forgot_password'));

router.all('/business', require('./views/business'));
router.all('/faq', require('./views/faq'));
router.all('/contact', require('./views/contact'));
router.all('/how-payalt-works', require('./views/howpayalt'));
router.all('/thank-you', require('./views/thankyou'));

router.all('/trans/:action', require('./api/index'));

router.all('/register', requireRole(false,""), require('./views/register'));
router.all('/login', requireRole(false,""), require('./views/login'));
router.all('/otp_verify', requireRole(false,""), require('./views/otp_verify'));

router.all('/user_management', requireRole(true,"admin"), require('./views/user_management'));
//router.all('/content_management', requireRole(true,"admin"), require('./views/content_management'));
router.all('/add_user', requireRole(true,"admin"), require('./views/add_user'));
router.all('/settings', requireRole(true,"admin"), require('./views/settings'));

router.all('/transactions', requireRole(true,"all"), require('./views/transactions'));
router.all('/transactions/:type', requireRole(true,"all"), require('./views/transactions'));
router.all('/orders', requireRole(true,"va"), require('./views/orders'));
router.all('/orders/:type', requireRole(true,"va"), require('./views/orders'));

router.all('/profile', requireRole(true,"all"), require('./views/profile'));

router.all('/api/:action', requireRole(true,"all"), require('./api/index'));

router.all('/process_order/:va_id/:trans_id', require('./views/process_order'));

router.all('/shopnow', require('./views/shopnow'));

router.all('/clickable_sorting', requireRole(true,"all"), require('./views/clickable_sort'));

module.exports = router;