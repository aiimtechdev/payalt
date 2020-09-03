var async = require("async");
var ejs = require("ejs");
var nodemailer = require('nodemailer');
var mg = require('nodemailer-mailgun-transport');
var sblue = require('nodemailer-sendinblue-transport');

exports = module.exports = function (req, res) {
    var locals = res.locals;
    
    if(req.body.contact_submit == '1'){
        var user_name = req.body.contactnameval;
        var user_email = req.body.contactemailval;
        var subject = req.body.contactsubjectval;
        var message = req.body.contactmessageval;

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
            username: user_name,
            emailaddress: user_email,
            subject: subject,
            message: message
        }

        var email_content = ejs.renderFile('views/emails/contact_admin.ejs',pass_template);
        email_content.then(function (result_content) {
            var options = {
                from: {name: process.env.SITE_NAME, address: process.env.ADMIN_EMAIL},
                to: "compliance@payalt.com",
                subject: 'Contact Message from '+process.env.SITE_NAME,
                html: result_content,
                text: '',
                'o:tracking': 'no','o:tracking-clicks': 'no','o:tracking-opens': 'no'
            };
            transporter.sendMail(options, function (error, info) {
                console.log(error);
                console.log(info);
                locals.succ_msg =  "1";
                res.render('contact');
            });
        });
        
    } else {
        res.render('contact');
    }
}