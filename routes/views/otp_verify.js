var async = require("async");
var ejs = require("ejs");
var nodemailer = require('nodemailer');
var mg = require('nodemailer-mailgun-transport');
var sblue = require('nodemailer-sendinblue-transport');

exports = module.exports = function (req, res) {
    if(typeof req.session.registered_id != 'undefined' && req.session.registered_id != ''){
        var reg_id = req.session.registered_id;
        
        var error = '';
        var locals = res.locals;
        if(req.body.otp_verify == '1'){
            var otp_code = req.body.otp_code;
            
            var dbConn = require( '../db' );    
            var dbo = dbConn.getDb();
            //console.log(otp_code);
            //console.log(reg_id);
            
            var ObjectId = require('mongodb').ObjectId;
            dbo.collection("users").findOne({"otp_send" : otp_code, "_id" : new ObjectId(reg_id)} , function(err, result) {
                //console.log(err);
                //console.log(result);
                if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")){
                    dbo.collection("users").updateOne( {"_id" : new ObjectId(reg_id) },{ $set: {"active" : "1", "otp_send" : ""} } , function(err, resultupdate) {
                        if(!err){
                            var user_email = result.email;
                            var username = result.username;
                            var phone = result.phone_number;
                            
                            /*req.session.logged_user_id = req.session.registered_id;
                            req.session.logged_user_type = req.session.registered_usertype;*/
                            req.session.registered_id  = '';
                            
                            if(process.env.MAIL_PROVIDER == 'SENDINBLUE'){
                                var transporter = nodemailer.createTransport(sblue({
                                    apiKey: process.env.SBLUE_APIKEY,
                                    apiUrl: process.env.SBLUE_DOMAIN
                                }));
                            } /*else if(process.env.MAIL_PROVIDER == 'MAILGUN'){
                                var transporter = nodemailer.createTransport(mg({
                                    service:  'Mailgun',
                                    auth: {
                                        api_key: process.env.MAILGUN_APIKEY,
                                        domain: process.env.MAILGUN_DOMAIN
                                    },
                                    proxy: process.env.PROXY
                                }));
                            }*/ else {
                                var transporter = nodemailer.createTransport({
                                    host: process.env.GMAIL_HOST,
                                    port: process.env.GMAIL_PORT,
                                    secure: true, // use TLS
                                    auth: {
                                      user: process.env.GMAIL_USERNAME,
                                      pass: process.env.GMAIL_PASSWORD
                                    },
                                    proxy: process.env.PROXY
                                });
                            }

                            var pass_template = {
                                siteurl: process.env.SERVER_URL,
                                sitename:process.env.SITE_NAME,
                                username: username,
                                emailaddress: user_email,
                                phone: phone,
                                usertype: "Shopper",
                                login_link: process.env.SERVER_URL+"/login"
                            }

                            var email_content = ejs.renderFile('views/emails/welcome_shopper.ejs',pass_template);
                            email_content.then(function (result_content) {
                                var options = {
                                    from: {name: process.env.SITE_NAME, address: process.env.ADMIN_EMAIL},
                                    to: user_email,
                                    subject: 'New Account Created - '+process.env.SITE_NAME,
                                    html: result_content,
                                    text: '',
                                    'o:tracking': 'no','o:tracking-clicks': 'no','o:tracking-opens': 'no'
                                };
                                transporter.sendMail(options, function (error, info) {
                                    res.redirect('/thank-you');return;
                                });
                            });
                            
                        } else {
                            locals.err_msg =  "<ul><li>Error in Processing. Try again later</li></ul>";
                            res.render('otp_verify');
                        }
                    });
                } else {
                    locals.err_msg =  "<ul><li>Invalid 6 Digit Code</li></ul>";
                    res.render('otp_verify');
                }
            })
        } else {
            res.render('otp_verify');
        }        
    } else {
        res.redirect('/register');
        return;
    }
}