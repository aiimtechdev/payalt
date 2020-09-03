var async = require("async");
var bcrypt = require("bcryptjs");

exports = module.exports = function (req, res, next) {
    var error = '';    
    var locals = res.locals;
    locals.formData = {};
    if(typeof req.session.logged_user_id != 'undefined' && req.session.logged_user_id != ''){
        res.redirect('/my_account');
        return;
    } else {
        locals.us_states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
        if(req.body.submit_form_register == '1'){
            var email = req.body.email,
            username = req.body.username,
            password = req.body.password,
            repassword = req.body.repassword,
            phone = req.body.phone;
            dob = req.body.dob;
            
            first_name = req.body.first_name;
            last_name = req.body.last_name;
            address = req.body.address;
            city = req.body.city;
            state = req.body.state;
            zipcode = req.body.zipcode;
            

            var dbConn = require( '../db' );
            var dbo = dbConn.getDb();
            
            var twilio_sandbox = '';
            var twilio_sid = '';
            var twilio_token = '';
            var twilio_from = '';
            var twilio_countrycode = '';
            
            //dbo.collection("users").findOne({"username" : username,"email" : email,"phone_number" : phone}, function(err, result) {
            dbo.collection("users").findOne( { $or: [ {"username" : username},{"email" : email},{"phone_number" : phone} ] } , function(err, result) {
                if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")){
                    /*result.forEach(function(index, res) {
                        console.log(index);
                        console.log(res);
                    });*/                
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
                    //console.log("INSIDE 2");
                    res.render('signup');
                } else {
                    var password_hash = '';
                    var otp_send = '';
                    // Create New Shopper
                    async.waterfall([
                        function(next) {
                            dbo.collection("site_settings").find({}).toArray(function (err, result) {
                                if (err){
                                    locals.formData = req.body;
                                    locals.err_msg =  "<ul><li>Error in sending OTP. Try again later</li></ul>";
                                    res.render('signup');
                                    return;
                                } else {
                                    if(typeof result != "undefined" && result != null){
                                        resulteach = result[0];
                                        twilio_sandbox = resulteach.twilio_sandbox;
                                        twilio_sid = resulteach.twilio_sid;
                                        twilio_token = resulteach.twilio_token;
                                        twilio_from = resulteach.twilio_from;
                                        twilio_countrycode = resulteach.twilio_countrycode;
                                        next(null);
                                    } else {
                                        locals.formData = req.body;
                                        locals.err_msg =  "<ul><li>Error in sending OTP. Try again later</li></ul>";
                                        res.render('signup');
                                        return;
                                    }
                                }
                            });
                        },function(next) {
                            //console.log("REG 1");
                            bcrypt.genSalt(10, function(err, salt) {
                                bcrypt.hash(password, salt, function(err, hash) {
                                    // Store hash in database
                                    password_hash = hash;
                                    //console.log(password_hash);
                                    next(null);
                                });
                            });
                        },function(next) {
                            //console.log("REG 2");
                            if(twilio_sandbox == 'true'){
                                otp_send = '123456';
                            } else {
                                otp_send = Math.floor(100000 + Math.random() * 900000).toString();
                            }
                            //console.log(otp_send);
                            dbo.collection("users").insertOne({ first_name: first_name, last_name: last_name, username: username, dob: dob, email: email, password: password_hash, phone_number: phone,address:address,city:city,state:state,zipcode:zipcode, user_type: "shopper", active: "0", otp_send: otp_send }, 
                            function(err,inserted_id){
                                if(inserted_id.insertedId != '' && !err){
                                    //console.log(typeof inserted_id.insertedId);
                                    
                                    req.session.registered_id = inserted_id.insertedId;
                                    req.session.registered_usertype = "shopper";
                                    
                                    next(null);
                                } else {
                                    //console.log("REG 3");
                                    locals.err_msg =  "<ul><li>Error in Processing. Try again later</li></ul>";
                                    res.render('signup');
                                    return;
                                }
                            });
                        }, function(next){
                            if(twilio_sandbox == 'true'){
                                res.redirect('/otp_verify');
                                return;
                            } else {
                                phone = phone.replace("(","");
                                phone = phone.replace(")","");
                                phone = phone.replace(" ","");
                                
                                const accountSid = twilio_sid;
                                const authToken = twilio_token;
                                const client = require('twilio')(accountSid, authToken);
                                
                                client.messages.create({
                                    body: 'Your OTP for '+process.env.SITE_NAME+' registration is '+otp_send,
                                    from: twilio_from,
                                    to: twilio_countrycode+phone
                                }).then((message) => {
                                    //console.log(message);
                                    res.redirect('/otp_verify');
                                    return;
                                }).catch((error) => {
                                    var ObjectId = require('mongodb').ObjectId;
                                    dbo.collection("users").deleteOne({
                                        "_id" : ObjectId(req.session.registered_id)
                                    },function(err, result) {
                                        locals.formData = req.body;
                                        locals.err_msg =  "<ul><li>Error in sending OTP. Try again later</li></ul>";
                                        res.render('signup');
                                        return;
                                    });
                                });
                            }
                        }
                    ]);
                }
            });
        } else {
            locals.formData.email = req.query.email_id;
            //console.log(req.query.email_id);
            res.render('signup');
        }
    }
}