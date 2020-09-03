var async = require("async");
var ejs = require("ejs");
var nodemailer = require('nodemailer');
var mg = require('nodemailer-mailgun-transport');
var sblue = require('nodemailer-sendinblue-transport');

exports = module.exports = function (req, res) {
    var locals = res.locals;
    var error = '';
    
    if(req.body.add_user == '1'){
        
        var first_name = req.body.first_name;
        var last_name = req.body.last_name;
        var username = req.body.username;
        var email = req.body.email;
        var phone = req.body.phone;
        
        var dbConn = require( '../db' );    
        var dbo = dbConn.getDb();
        
        dbo.collection("users").findOne( { $or: [ {"username" : username},{"email" : email},{"phone_number" : phone} ] } , function(err, result) {
            if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")){
                if(result.username == username){
                    error+= '<li>Username already exists</li>';
                }
                if(result.email == email){
                    error+= '<li>Email Address already exists</li>';
                }
                if(result.phone_number == phone){
                    error+= '<li>Phone number already exists</li>';
                }
                if(error != ''){
                    error = "<ul>"+error+"</ul>";
                }
                locals.err_msg =  error;
                locals.formData = req.body;
                res.render('add_user');
            } else {
                var inserted_id = '';
                // Create New Shopper
                async.waterfall([
                    function(next) {
                        dbo.collection("users").insertOne({ first_name: first_name,last_name: last_name,username: username, email: email, phone_number: phone, password: "", user_type: "shopper", active: "0", otp_send: "" },
                        function(err,inserted_id){
                            if(inserted_id.insertedId != '' && !err){
                                inserted_id = inserted_id.insertedId;
                                next(null,inserted_id);
                            } else {
                                locals.err_msg =  "Error in Processing. Try again later";
                                res.render('add_user');
                                return;
                            }
                        });
                    },function(inserted_id,next) {
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
                        } */else {
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
                            emailaddress: email,
                            usertype: "Shopper",
                            password_set_link: process.env.SERVER_URL+"/password_setup/"+inserted_id
                        }

                        var email_content = ejs.renderFile('views/emails/user_created.ejs',pass_template);
                        email_content.then(function (result_content) {
                            var options = {
                                from: {name: process.env.SITE_NAME, address: process.env.ADMIN_EMAIL},
                                to: email,
                                subject: 'New Account Created - '+process.env.SITE_NAME,
                                html: result_content,
                                text: '',
                                'o:tracking': 'no','o:tracking-clicks': 'no','o:tracking-opens': 'no'
                            };
                            transporter.sendMail(options, function (error, info) {
                                if (error) {
                                    locals.err_msg =  "Account created but email sending of password creation link failed.";
                                    res.render('add_user');
                                    return;
                                }
                                else {
                                    locals.succ_msg =  "Account created and email with password creation link sent successfully.";
                                    res.render('add_user');
                                    return;
                                }
                                ;
                            });
                        });
                    }
                ]);
            }
        });
    } else {
        res.render('add_user');
    }    
}