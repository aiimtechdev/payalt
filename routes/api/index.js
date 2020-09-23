exports = module.exports = function (req, res, next) {
    var locals = res.locals;
    
    var bcrypt = require("bcryptjs");    
    var async = require("async");
    var dbConn = require( '../db' );
    var dbo = dbConn.getDb();
    var ObjectId = require('mongodb').ObjectId;
    var logged_user_id = req.session.logged_user_id;
    var logged_user_type = req.session.logged_user_type;
    var tbl = "users";
    if (logged_user_type == "admin") {
        tbl = "admin";
    }

    if (typeof req.params.action != 'undefined' && req.params.action != '') {
        var action = req.params.action;
    }

    // Nodejs encryption with CTR
    const crypto = require('crypto');
    const algorithm = 'aes-128-cbc';
    const key = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);

    function encrypt(text) {
        let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return { iv: iv.toString('hex'), key: key.toString('hex'), encryptedData: encrypted.toString('hex') };
    }

    function decrypt(text) {        
        let iv = Buffer.from(text.iv, 'hex');
        let key = Buffer.from(text.key, 'hex');
        let encryptedText = Buffer.from(text.encryptedData, 'hex');
        let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }

    function decrypt_remote(encryptedText,key,iv,algorithm) {
        let decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText,"hex","binary");
        decrypted += decipher.final('binary');
        return decrypted.toString();
    }
    
    function makeid(length) {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
           result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
    function passwordCode(length) {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
           result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    if (action == "update_profile") {
        if (req.body.update_profile == '1') {
            var firstname = req.body.firstname;
            var lastname = req.body.lastname;
            var phone = req.body.phone;
            var dob = req.body.dob;

            dbo.collection(tbl).updateOne({"_id": new ObjectId(logged_user_id)}, {$set: {"first_name": firstname, "last_name": lastname, "phone_number": phone,"dob": dob}}, function (err, result) {
                return res.send();
            });
        } else {
            return res.send();
        }
    }
    if (action == 'reset_password') {
        var record_id = req.query.id_value;
        var name = '',email = '';
        var password_reset_code = '';
        var nodemailer = require('nodemailer');
        var mg = require('nodemailer-mailgun-transport');
        var sblue = require('nodemailer-sendinblue-transport');
        var ejs = require("ejs");
        
        async.waterfall([
            function (next) {
               dbo.collection("users").findOne({"_id": new ObjectId(record_id)}, function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        name = result.first_name+" "+result.last_name;
                        email = result.email;
                        password_reset_code = makeid(20);
                        dbo.collection("users").updateOne({"_id": new ObjectId(record_id)}, {$set: {"password_reset_code": password_reset_code}}, function (err, result) {
                            next(null);
                        });
                    } else {
                        return res.send({"msg":"error","error_msg": "Reset Password process failed."});
                    }                    
               });
            }, function (next) {
                if(process.env.MAIL_PROVIDER == 'SENDINBLUE'){
                    var transporter = nodemailer.createTransport(sblue({
                        apiKey: process.env.SBLUE_APIKEY,
                        apiUrl: process.env.SBLUE_DOMAIN
                    }));
                } else {
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
                    name: name,
                    password_reset_link: process.env.SERVER_URL+"/password_reset/"+password_reset_code
                }
                
                var email_content = ejs.renderFile('views/emails/password_reset.ejs',pass_template);
                email_content.then(function (result_content) {
                    var options = {
                        from: {name: process.env.SITE_NAME, address: process.env.ADMIN_EMAIL},
                        to: email,
                        subject: 'Password Reset - '+process.env.SITE_NAME,
                        html: result_content,
                        text: '',
                        'o:tracking': 'no','o:tracking-clicks': 'no','o:tracking-opens': 'no'
                    };
                    transporter.sendMail(options, function (error, info) {
                        if (error) {
                            return res.send({"msg":"error","error_msg": "Reset Password email sending failed."});
                        }
                        else {
                            return res.send({"msg":"success","succ_msg" : "Email with password reset link sent successfully."});
                        }
                    });
                });
            }
        ]);
    }
    if (action == "update_billing") {
        if (req.body.update_billing == '1') {
            var address = req.body.address;
            var city = req.body.city;
            var state = req.body.state;
            var zipcode = req.body.zipcode;

            dbo.collection(tbl).updateOne({"_id": new ObjectId(logged_user_id)}, {$set: {"address": address, "city": city, "state": state, "zipcode": zipcode}}, function (err, result) {
                return res.send();
            });
        } else {
            return res.send();
        }
    }
    if (action == "password_set") {
        var bcrypt = require("bcryptjs");
        var password_user = req.body.current_password;
        var new_password = req.body.password;
        dbo.collection(tbl).findOne({"_id": new ObjectId(logged_user_id)}, function (err, result) {
            if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                bcrypt.compare(password_user, result.password, function (err, passres) {
                    if (passres === true) {
                        var salt = bcrypt.genSaltSync(10);
                        var password_hash = bcrypt.hashSync(new_password, salt);
                        dbo.collection(tbl).updateOne({"_id": new ObjectId(logged_user_id)}, {$set: {"password": password_hash}}, function (err, result) {
                            return res.send();
                        });
                    } else {
                        return res.send({error: "2"});
                    }
                });
            } else {
                return res.send({error: "1"});
            }
        });
    }
    if (action == "modal_view")
    {
        var send_content = "";
        var id_value = req.query.id_value;
        var ObjectId = require('mongodb').ObjectId;
        var condition = {_id: new ObjectId(id_value)};
        var logged_user_type = req.session.logged_user_type;
        dbo.collection("transaction").aggregate([{$lookup: {from: "users", localField: "shopper_id", foreignField: "_id", as: "shopper_data"}}, {$match: condition}, { $limit : 10 }]).toArray(function (err, result) {
            if (err)
                throw err;
            var count = 0, shopper_user_name_field, shopper_email_field, shopper_phone_field, platform_value, currency_value, screenshot_link;
            result.forEach(function (index, res) {
                if(typeof index == 'undefined'){
                    send_content = "<div><span><h3>No Details Found</h3></span></div>";
                } else {
                    if (typeof index.date == 'undefined') {
                        index.date = '-';
                    }
                    if (typeof index.platform == 'undefined') {
                        platform_value = '-';
                    }
                    else
                    {
                        platform_value = index.platform;
                    }
                    if (typeof index.currency == 'undefined') {
                        currency_value = '-';
                    }
                    else
                    {
                        currency_value = index.currency;
                    }
                    if (typeof index.status == 'undefined') {
                        status_value = '-';
                    }
                    else
                    {
                        status_value = index.status;
                    }
                    if (typeof index.page == 'undefined') {
                        index.page = '-';
                    }
                    if(index.shopper_data.length == 0 || typeof index.shopper_data[0] == "undefined")
                    {
                        shopper_user_name_field = "-";
                        shopper_email_field = "-";
                        shopper_phone_field = "-";
                    }
                    else
                    {
                        shopper_user_name_field = index.shopper_data[0].first_name + " " + index.shopper_data[0].last_name;
                        shopper_email_field = index.shopper_data[0].email;
                        shopper_phone_field = index.shopper_data[0].phone_number;
                    }
                    if (typeof index.bitcoin_sale_id == 'undefined') {
                        index.bitcoin_sale_id = '-';
                    }
                    
                    if(index.screenshot_link != '' && typeof index.screenshot_link !== "undefined"){
                        screenshot_link = '<a class="img_fancybox" style="display:block !important;" href="'+index.screenshot_link+'">View Image</a>';
                    } else {
                        screenshot_link = '-';
                    }
                    
                    var date_now = new Date(index.date);
                    send_content = "<div>" +
                        "<span>" +
                        "<h3>Transaction Details</h3>" +
                        "<table class='paleBlueRows' style='max-width:500px;'>" +
                        "<tr><td><b>Date Time: </b></td><td>" + (date_now.getMonth() + 1) + "/" + date_now.getDate() + "/" + date_now.getFullYear() + " " + date_now.getHours() + ":" + date_now.getMinutes() + ":" + date_now.getSeconds() + "</td></tr>" +
                        "<tr><td><b>Platform Purchase: </b></td><td>" + platform_value + "</td></tr>" +
                        "<tr><td><b>Transaction ID: </b></td><td> " + index.bitcoin_sale_id + " </td></tr>" +
                        "<tr><td><b>Payment Platform: </b></td><td> " + index.payment_platform + " </td></tr>" +
                        "<tr><td><b>Transaction amount: </b></td><td> $" + Number( parseFloat(index.transaction_amount).toFixed(2) ).toLocaleString() + "</td></tr>" +
                        "<tr><td><b>Transaction Status: </b></td><td style='text-transform:capitalize;'>" + status_value + "</td></tr>";
                    if(status_value == "completed"){
                        send_content += "<tr><td><b>Transaction Screenshot: </b></td><td>" + screenshot_link + "</td></tr>";
                    }
                    send_content += "</table>" +
                        "<h3 style='margin-top: 20px;'>Billing Details</h3>" +
                        "<table class='paleBlueRows' style='max-width:500px;'>" +
                        "<tr><td><b>Billing Name: </b></td><td> " + index.billing_details.first_name + " " + index.billing_details.last_name + " " + " </td></tr>" +
                        "<tr><td><b>Billing Address: </b></td><td>" + index.billing_details.street + ",<br>" + index.billing_details.city + ", " + index.billing_details.state + " - " + index.billing_details.zipcode + "</td></tr>" +
                            "</table>";
                    if(logged_user_type != 'shopper'){
                        send_content += "<h3 style='margin-top: 20px;'>Shopper Details</h3>" +
                            "<table class='paleBlueRows' style='max-width:500px;'>" +
                            "<tr><td><b>Name: </b></td><td> " + shopper_user_name_field + " </td></tr>" +
                            "<tr><td><b>Email Address: </b></td><td> " + shopper_email_field + " " + " </td></tr>" +
                            "<tr><td><b>Phone Number: </b></td><td>" + shopper_phone_field + "</td></tr>" +
                            "</table>";
                    }
                    send_content += "</span>" +
                        "</div>";
                }
            });
            res.send(send_content);
        });
    }
    if (action == "sortable_user_management")
    {
        var column_name, sort_type, send_contents = "", transaction_value, condition, type;
        var action = req.query.action;
        column_name = req.query.column_name;
        var sort = {};
        sort_type = req.query.sort_type;
        var page = req.query.page;
        var total_content = 10;
        var given_page_content = ((parseInt(page) * parseInt(total_content)) - total_content);
        if(given_page_content == '' || given_page_content <= 0 || isNaN(given_page_content))
        {
            given_page_content = 0;
        }
        var logged_user_id = req.session.logged_user_id;
        var logged_user_type = req.session.logged_user_type;
        
        if(column_name == "Name") column_name = "first_name";
        if (sort_type == 'asc' && column_name != "")
        {
            sort[column_name] = 1;
        }
        else if (sort_type == 'desc' && column_name != "")
        {
            sort[column_name] = -1;
        }
        else
        {
            sort['_id'] = -1;
        }
        dbo.collection("users").aggregate([{$sort: sort}, {$skip: given_page_content}, { $limit : total_content }]).toArray(function (err, result) {
            if (err)
                throw err;
            var count = 0;
            result.forEach(function (index, res) {
                count++;
                if (typeof index.first_name == 'undefined') {
                    index.first_name = '-';
                }
                if (typeof index.last_name == 'undefined') {
                    index.last_name = '-';
                }
                if (typeof index.phone_number == 'undefined') {
                    index.phone_number = '-';
                }
                if (typeof index.email == 'undefined') {
                    index.email = '-';
                }
                if (typeof index.user_type == 'undefined') {
                    index.user_type = '-';
                }
                
                send_contents += "<tr>" +
                        "<td class='checkbox_td'><div class='custom-control custom-checkbox'><input type='checkbox' class='custom-control-input' id='user_" + (given_page_content + count) + "' data-id='" + index._id + "'>" +
                        "<label class='custom-control-label' for='user_" + (given_page_content + count) + "'></label></div></td>" +
                        "<td class='username_td' data-title='User name: '>" + index.first_name + " " + index.last_name + "</td>" +
                        "<td class='email_td' data-title='Email address: '>" + index.email + "</td>" +
                        "<td class='phone_number_td' data-title='Phone number: '>" + index.phone_number + "</td>";
                send_contents += "<td class='user_status_td txtcenter'>" +
                        "<a class='status_update' rel='tooltip' data-toggle='tooltip' title='User Status' data-placement='top' data-id='" + index._id + "'>";
                if (index.active == 1) {
                    send_contents += "<div class='green'></div>";
                } else {
                    send_contents += "<div class='red'></div>";
                }
                send_contents += "</a>" +
                        "</td>" +
                        "<td class='password_td'><a class='chng_pass' data-toggle='modal' data-target='#password_change' data-id='" + index._id + "'>Change password</a></td>" +
                        "<td class='phone_number_update_td'><a class='chng_phne' data-toggle='modal' data-target='#phone_number_change' data-id='" + index._id + "'>Update Phone number</a></td>" +
                        "</tr>";
            });
            res.send(send_contents);
        });
    }
    if (action == "sortable_transactions")
    {
        var column_name, sort_type, send_contents = "", transaction_value, condition, type, va_name;
        var action = req.query.action;
        column_name = req.query.column_name;
        var sort = {};
        sort_type = req.query.sort_type;
        transaction_value = req.query.transaction_content;
        type = req.query.transaction_content;
        var page = req.query.page;
        var total_content = 5;
        var given_page_content = ((parseInt(page) * parseInt(total_content)) - total_content);
        if(given_page_content == '' || given_page_content <= 0 || isNaN(given_page_content))
        {
            given_page_content = 0;
        }
        var logged_user_id = req.session.logged_user_id;
        var logged_user_type = req.session.logged_user_type;
        if (type == 'Pending Transactions')
        {
            if (logged_user_type == "shopper")
            {
                condition = {$or: [{status: "pending"}, {status: ""}, {status: "recent"}, {status: "payment_pending"}, {status: "processed"}], shopper_id: ObjectId(logged_user_id)};
            }
            else
            {
                condition = {$or: [{status: "pending"}, {status: ""}, {status: "recent"}, {status: "payment_pending"}, {status: "processed"}]};
            }
        }
        else if (type == 'Failed or User Cancelled transactions')
        {
            if (logged_user_type == "shopper")
            {
                condition = {$or: [{status: "failed"}, {status: "cancelled"}], shopper_id: ObjectId(logged_user_id)};
            }
            else
            {
                condition = {$or: [{status: "failed"}, {status: "cancelled"}]};
            }
        }
        else
        {
            if (logged_user_type == "shopper")
            {
                condition = {status: "completed", shopper_id: ObjectId(logged_user_id)};
            }
            else
            {
                condition = {status: "completed"};
            }
        }
        if (sort_type == 'asc' && column_name != "")
        {
            sort[column_name] = 1;
        }
        else if (sort_type == 'desc' && column_name != "")
        {
            sort[column_name] = -1;
        }
        else
        {
            sort['_id'] = -1;
        }
        dbo.collection("transaction").aggregate([{$lookup: {from: "users", localField: "va_id", foreignField: "_id", as: "virtual_assistant_id"}}, {$match: condition}, {$sort: sort}, {$skip: given_page_content}, { $limit : total_content }]).toArray(function (err, result) {
            if (err)
                throw err;
            result.forEach(function (index, res) {
                if (typeof index.date == 'undefined') {
                    index.date = '-';
                }
                if (typeof index.platform == 'undefined') {
                    index.platform = '-';
                }
                if (typeof index.currency == 'undefined') {
                    index.currency = '-';
                }
                if (typeof index.page == 'undefined') {
                    index.page = '-';
                }
                if(typeof index.screenshot_link !== "undefined" && index.screenshot_link != '' && index.screenshot_link != null){
                    index.screenshot_link = '<a class="img_fancybox" style="display:block !important;" href="'+index.screenshot_link+'">View Image</a>';
                }else{
                    index.screenshot_link = 'No Image';
                }
                if (typeof index.bitcoin_sale_id == 'undefined') {
                    index.bitcoin_sale_id = '-';
                }
                var date_now = new Date(index.date);
                send_contents += "<tr>" +
                        "<td data-title='Date Time: '>" + (date_now.getMonth() + 1) + "/" + date_now.getDate() + "/" + date_now.getFullYear() + " " + date_now.getHours() + ":" + date_now.getMinutes() + ":" + date_now.getSeconds() + "</td>" +
                        "<td data-title='Platform Purchase: '>" + index.platform + "</td>" +
                        "<td data-title='Transaction ID: '>" + index.bitcoin_sale_id + "</td>";
                send_contents += "<td data-title='Amount: '> $" + Number( parseFloat(index.transaction_amount).toFixed(2)).toLocaleString() + "</td>";
                if (type == 'Pending Transactions')
                {
                    send_contents += "<td data-title='Action: '><a class='view_pending' data-id='" + index._id + "' data-toggle='modal' data-target='#pending_transaction'>View</a></td>";
                }
                else if (type == 'Failed or User Cancelled transactions')
                {
                    send_contents += "<td data-title='Action: '><a class='view_failed' data-id='" + index._id + "' data-toggle='modal' data-target='#failed_transaction'>View</a></td>";
                }
                else
                {
                    send_contents += "<td data-title='Action: '><a class='view_recent' data-id='" + index._id + "' data-toggle='modal' data-target='#recent_transaction'>View</a></td>";
                }
                send_contents += "</tr>";
            });
            res.send(send_contents);
        });
    }
    if(action == "canceltransaction"){
        var logged_user_id = req.body.logged_user_id;
        var transaction_id = req.body.transaction_id;
        
        var ObjectId = require('mongodb').ObjectId;
        var request = require('request');
        
        var aliantpay_api_token = '';
        var bitcoin_sale_id = '';
        
        async.waterfall([
            function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            aliantpay_api_token = resulteach.aliantpay_api_token;
                            next(null);
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    }
                });
            },function(next) {
                dbo.collection("transaction").findOne({"_id": new ObjectId(transaction_id)}, function (err, result) {
                    if(err){
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    } else {
                        if (typeof result != 'undefined' && result != null && result != "") {
                            bitcoin_sale_id  = result.bitcoin_sale_id;
                            next(null);
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    }
                });
            }, function(next) {
                request.delete({
                    headers: {'content-type' : 'application/json','Authorization': 'Bearer '+aliantpay_api_token},
                    url: "https://aliantpay.io/api/v2/Invoices/"+bitcoin_sale_id
                },function(error, resp, body){
                    dbo.collection("transaction").updateOne({"_id": new ObjectId(transaction_id)}, {$set: {"manual_cancel": "1","status": "cancelled"}}, function (err, result) {
                        return res.send({msg:"error",txt:"This transaction has been canceled. There have been no charges. In order to make a purchase, click \"Pay Now!\" again."});
                    });
                });
            }
        ]);
    }
    if (action == "paginate_orders")
    {
        var send_contents = "";
        var type = req.query.transaction_type;
        var page = req.query.page;
        var total_content = 10;
        var given_page_content = ((parseInt(page) * parseInt(total_content)) - total_content);
        if(given_page_content == '' || given_page_content <= 0 || isNaN(given_page_content))
        {
            given_page_content = 0;
        }

        var sort_name = req.query.sort_name;
        var sort_type = req.query.sort_type;
        var condition = "", sort_value = "";
        var sort = {};
        var page_type = "";

        if (sort_type == 'asc' && sort_name != "")
        {
            sort[sort_name] = 1;
        }
        else if (sort_type == 'desc' && sort_name != "")
        {
            sort[sort_name] = -1;
        }
        else
        {
            sort['_id'] = -1;
        }

        var logged_user_id = req.session.logged_user_id;

        if (type == 'Processed Orders')
        {
            condition = {status: "processed", va_id: new ObjectId(logged_user_id)};
            page_type = "processed";
        }
        else if (type == 'Failed or User Cancelled Orders')
        {
            condition = {status: "failed", va_id: new ObjectId(logged_user_id)};
            page_type = "failed";
        }
        else
        {
            condition = {status: "pending", va_id: new ObjectId(logged_user_id)};
            page_type = "pending";
        }
        dbo.collection("transaction").aggregate([
                {$lookup:{from:"virtual_assistant_transaction", localField: "_id", foreignField: "transaction_id", as: "virtual_assistant_trans"}},
                {$unwind: {"path":"$virtual_assistant_trans","preserveNullAndEmptyArrays": true}},
                {$match: condition},
                {$sort: sort},
                {$skip: given_page_content},
                {$limit: total_content}]).toArray(function (err, result) {
            if (err)
                throw err;
            result.forEach(function (index, res) {
                if (typeof index.date == 'undefined') {
                    index.date = '-';
                }
                if (typeof index.cc == 'undefined') {
                    index.cc = '-';
                }
                if (typeof index.billing_details.first_name == 'undefined') {
                    index.billing_details.first_name = '-';
                }
                if (typeof index.billing_details.last_name == 'undefined') {
                    index.billing_details.last_name = '';
                }
                if (typeof index.billing_details.street == 'undefined') {
                    index.billing_details.street = '';
                }
                if (typeof index.billing_details.city == 'undefined') {
                    index.billing_details.city = '';
                }
                if (typeof index.billing_details.state == 'undefined') {
                    index.billing_details.state = '';
                }
                if (typeof index.billing_details.zipcode == 'undefined') {
                    index.billing_details.zipcode = '';
                }
                
                var date_now = new Date(index.date);
                send_contents += "<tr>" +
                        "<td data-title='Date-Time:'>" + (date_now.getMonth() + 1) + "/" + date_now.getDate() + "/" + date_now.getFullYear() + " " + date_now.getHours() + ":" + date_now.getMinutes() + ":" + date_now.getSeconds() + "</td>" +
                        "<td data-title='CC:'>" + index.cc + "</td>" +
                        "<td data-title='Billing Details:'>" + index.billing_details.first_name + " " + index.billing_details.last_name + " " + index.billing_details.street + " " + index.billing_details.city + " " + index.billing_details.state + " " + index.billing_details.zipcode + "</td>";
                
                    if(page_type == "processed" || page_type == "failed"){
                        send_contents += "<td data-title='Created Date:'>";
                    }
                    
                    if(page_type == "processed" || page_type == "failed"){
                        if(typeof index.processed_date == "undefined"){
                            send_contents += "-";
                        } else {
                            var date_processed = new Date(index.processed_date);
                            send_contents += (date_processed.getMonth() + 1) + "/" + date_processed.getDate() + "/" + date_processed.getFullYear() + " " + date_processed.getHours() + ":" + date_processed.getMinutes() + ":" + date_processed.getSeconds();
                        }
                        send_contents += "</td>";
                    }                    
                    
                    send_contents += "<td data-title='Action:'>";
                    send_contents += '<a href="javascript:void(0);" class="alert alert-info view_order" data-id="'+index._id+'" data-toggle="modal" data-target="#view_order"><i class="fa fa-eye"></i> View</a> ';
                    send_contents += "</td>";
                send_contents += "</tr>";
            });
            return res.send(send_contents);
        });
    }

    if (action == "delete_operation")
    {
        var ObjectId = require('mongodb').ObjectId;
        var id_values = req.query.id_value;
        var count = 0;
        for (count = 0; count < id_values.length; count++)
        {
            dbo.collection("users").deleteOne({"_id": new ObjectId(id_values[count])});
        }
        res.send("Deleted");
    }
    if (action == "status_update")
    {
        var ObjectId = require('mongodb').ObjectId;
        dbo.collection("users").updateOne({"_id": new ObjectId(req.query.id_value)}, {$set: {"active": req.query.active_value}}, function (err, resultupdate) {
            res.send("Status Updated");
        });
    }
    if (action == "password_validation")
    {
        var bcrypt = require("bcryptjs");
        var ObjectId = require('mongodb').ObjectId;
        var password = req.query.old_password;
        dbo.collection("users").findOne({"_id": new ObjectId(req.query.id_value)}, function (err, result) {
            if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                bcrypt.compare(password, result.password, function (err, passres) {
                    if (err)
                        return;
                    if (passres === true) {
                        res.send("valid");
                    } else {
                        res.send("password_not_matched");
                    }
                });
            } else {
                res.send("not-valid");
            }
        });
    }
    if(action == 'shopnow_login'){
        var username = req.body.username;
        var password = req.body.password;
        if(username == '' || password == ''){
            return res.send({msg: "error",err_msg: "Invalid Username / Password"});
        } else {
            var bcrypt = require("bcryptjs");
            var dbConn = require( '../db' );    
            var dbo = dbConn.getDb();
            dbo.collection("users").findOne({username:username},function(err, result) {
                if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")){
                    bcrypt.compare(password, result.password, function(err, passres) {
                        if(passres === true){                            
                            var logged_usr_id = result._id.toString();
                            return res.send({msg: "success",logged_user_id: logged_usr_id});
                        } else {
                            return res.send({msg: "error",err_msg: "Invalid Password"});
                        }
                    });
                } else {
                    return res.send({msg: "error",err_msg: "Invalid Username"});
                }
            });
        }
    }
    if(action == "app_forgotpassword_set"){
        var forgot_id = req.body.forgot_id;
        var password_one = req.body.password_one;
        var password_two = req.body.password_two;
        if(password_one != password_two){
            return res.send({"msg":"error","err_msg": "Passwords don't match"});
        }
        var dbConn = require( '../db' );
        var dbo = dbConn.getDb();

        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(password_one, salt, function(err, hash) {
                // Store hash in database
                password_hash = hash;
                dbo.collection("users").updateOne({"_id": new ObjectId(forgot_id)}, {$set: {"password": password_hash}}, function (err, result) {
                    if(!err)
                        return res.send({"msg":"success","succ_msg": "Password reset done successfully"});
                    else 
                        return res.send({"msg":"error","err_msg": "Error in resetting password. Try again later"});
                });
            });
        });
    }
    if(action == "app_forgotpassword_check"){
        var forgot_id = req.body.forgot_id;
        var forgot_code = req.body.forgot_code;
        var dbConn = require( '../db' );
        var dbo = dbConn.getDb();
        dbo.collection("users").findOne({"_id" : new ObjectId(forgot_id)},function(err, result) {
            if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")){
                if(result.password_reset_code == forgot_code){
                    return res.send({"msg":"success"});
                } else {
                    return res.send({"msg":"error","err_msg": "Invalid reset code"});
                }
            } else {
                return res.send({"msg":"error","err_msg": "Invalid reset code"});
            }
        });
    }
    if(action == "app_forgotpassword"){
        var nodemailer = require('nodemailer');
        var mg = require('nodemailer-mailgun-transport');
        var sblue = require('nodemailer-sendinblue-transport');
        var ejs = require("ejs");

        var forgot_email = req.body.forgot_email;
        var dbConn = require( '../db' );
        var dbo = dbConn.getDb();
        var error = '', name = '', password_reset_code = '', record_id = '';
        dbo.collection("users").findOne({"email" : forgot_email},function(err, result) {
            if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")){
                async.waterfall([
                    function(next) {
                        record_id = result._id;
                        name = result.first_name+" "+result.last_name;
                        password_reset_code = passwordCode(6);
                        dbo.collection("users").updateOne({"_id": new ObjectId(record_id)}, {$set: {"password_reset_code": password_reset_code}}, function (err, result) {
                            next(null);
                        });
                    }, function(next) {
                        if(process.env.MAIL_PROVIDER == 'SENDINBLUE'){
                            var transporter = nodemailer.createTransport(sblue({
                                apiKey: process.env.SBLUE_APIKEY,
                                apiUrl: process.env.SBLUE_DOMAIN,
                                proxy: process.env.PROXY
                            }));
                        } else {
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
                            name: name,
                            password_reset_code: password_reset_code
                        }

                        var email_content = ejs.renderFile('views/emails/forgot_password.ejs',pass_template);
                        email_content.then(function (result_content) {
                            var options = {
                                from: {name: process.env.SITE_NAME, address: process.env.ADMIN_EMAIL},
                                to: forgot_email,
                                subject: 'Password Reset - '+process.env.SITE_NAME,
                                html: result_content,
                                text: '',
                                'o:tracking': 'no','o:tracking-clicks': 'no','o:tracking-opens': 'no'
                            };
                            transporter.sendMail(options, function (error, info) {
                                //console.log(error);
                                if (error) {
                                    return res.send({"msg":"error","err_msg": "Password reset process failed. Try again later"});
                                }
                                else {
                                    return res.send({"msg":"success","record_id" : record_id,"succ_msg" : "Email with password reset code has been sent to your email address."});
                                }
                            });
                        });
                    }
                ]);
            } else {
                error = 'Email Address not exists';
                return res.send({msg: "error",err_msg: error});
            }
        });
    }

    if(action == "app_registration"){
        var email = req.body.email_address,
        username = req.body.username,
        password = req.body.password,
        repassword = req.body.repassword,
        phone = req.body.phone;
        dob = req.body.birthday;
        
        first_name = req.body.first_name;
        last_name = req.body.last_name;
        address = req.body.address;
        city = req.body.city;
        state = req.body.state;
        zipcode = req.body.zipcode;
        
        var dbConn = require( '../db' );
        var dbo = dbConn.getDb();
        var error = '';
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
                    error = "<ul class='errListing'>"+error+"</ul>";
                }
                return res.send({msg: "error",err_msg: error});
            } else {
                var password_hash = '';
                async.waterfall([
                    function(next) {
                        bcrypt.genSalt(10, function(err, salt) {
                            bcrypt.hash(password, salt, function(err, hash) {
                                // Store hash in database
                                password_hash = hash;
                                next(null);
                            });
                        });
                    },function(next) {
                        dbo.collection("users").insertOne({ first_name: first_name, last_name: last_name, username: username, dob: dob, email: email, password: password_hash, phone_number: phone,address:address,city:city,state:state,zipcode:zipcode, user_type: "shopper", active: "1"}, 
                        function(err,inserted_id){
                            if(inserted_id.insertedId != '' && !err){
                                return res.send({msg: "success",logged_user_id: inserted_id.insertedId,succ_msg: "User created successfully. Logging you in..."});
                            } else {
                                return res.send({msg: "error",err_msg: "Error in registration. Try again later"});
                            }
                        });
                    }
                ]);
            }
        });
    }

    if(action == "get_download_link"){
        dbo.collection("download_link").find({}).toArray(function (err, result) {
            if (err){
                return res.send({links:''});
            } else {
                if(typeof result != "undefined" && result != null){
                    resulteach = result[0];
                    return res.send({links:resulteach});
                } else {
                    return res.send({links:''});
                }
            }
        });
    }
    if(action == "get_billing_info"){
        var logged_user_id = req.body.logged_user_id;
        dbo.collection("users").findOne({"_id": new ObjectId(logged_user_id)}, function (err, result) {
            if(err){
                return res.send({"msg": "error"});
            } else {
                if (typeof result != 'undefined' && result != null && result != "") {
                    return res.send({msg:"success",billing:result});
                } else {
                    return res.send({"msg": "error"});
                }
            }
        });
    }
    if(action == "mark_completed"){
        var logged_user_id = req.body.logged_user_id;
        var transaction_id = req.body.transaction_id;
        var date_today = new Date(Date.now()).toISOString();
        
        var ObjectId = require('mongodb').ObjectId;
        var session_data = '';
        dbo.collection("transaction").findOne({"_id": new ObjectId(transaction_id)}, function (err, result) {
            if(err){
                return res.send({"msg": "error"});
            } else {
                if (typeof result != 'undefined' && result != null && result != "") {                    
                    async.waterfall([
                        function(next) {
                            dbo.collection("transaction").updateOne({"_id": new ObjectId(transaction_id)}, {$set: {"status": "processed","processed_date": date_today}}, function (err, result) {
                                if(!err){
                                    return res.send({"msg":"success"});
                                } else {
                                    return res.send({"msg":"error"});
                                }
                            });
                        }
                    ]);
                } else {
                    return res.send({"msg": "error"});
                }
            }
        });
    }
    if (action == "order_modal_view")
    {
        var send_content = "";
        var id_value = req.query.id_value;
        var ObjectId = require('mongodb').ObjectId;
        var condition = {_id: new ObjectId(id_value)};
        var logged_user_type = req.session.logged_user_type;
        
        dbo.collection("transaction").aggregate([{$lookup: {from: "users", localField: "shopper_id", foreignField: "_id", as: "shopper_data"}}, {$match: condition}, { $limit : 10 }]).toArray(function (err, result) {
            if (err)
                throw err;
            var count = 0, shopper_user_name_field, shopper_email_field, shopper_phone_field, platform_value, currency_value, status_value;
            result.forEach(function (index, res) {
                if(typeof index == 'undefined'){
                    send_content = "<div><span><h3>No Details Found</h3></span></div>";
                } else {
                    if (typeof index.date == 'undefined') {
                        index.date = '-';
                    }
                    if (typeof index.platform == 'undefined') {
                        platform_value = '-';
                    }
                    else
                    {
                        platform_value = index.platform;
                    }
                    if (typeof index.currency == 'undefined') {
                        currency_value = '-';
                    }
                    else
                    {
                        currency_value = index.currency;
                    }
                    if (typeof index.status == 'undefined') {
                        status_value = '-';
                    }
                    else
                    {
                        status_value = index.status;
                    }
                    if (typeof index.page == 'undefined') {
                        index.page = '-';
                    }
                    
                    if(index.shopper_data.length == 0 || typeof index.shopper_data[0] == "undefined")
                    {
                        shopper_user_name_field = "-";
                        shopper_email_field = "-";
                        shopper_phone_field = "-";
                    }
                    else
                    {
                        shopper_user_name_field = index.shopper_data[0].first_name + " " + index.shopper_data[0].last_name;
                        shopper_email_field = index.shopper_data[0].email;
                        shopper_phone_field = index.shopper_data[0].phone_number;
                    }
                    if (typeof index.bitcoin_sale_id == 'undefined') {
                        index.bitcoin_sale_id = '-';
                    }
                    var date_now = new Date(index.date);
                    send_content = "<div>" +
                            "<span>" +
                            "<h3>Transaction Details</h3>" +
                            "<table class='paleBlueRows' style='max-width:500px;'>" +
                            "<tr><td><b>Transaction Date/Time: </b></td><td>" + (date_now.getMonth() + 1) + "/" + date_now.getDate() + "/" + date_now.getFullYear() + " " + date_now.getHours() + ":" + date_now.getMinutes() + ":" + date_now.getSeconds() + "</td></tr>" +
                            "<tr><td><b>Platform Purchase: </b></td><td>" + platform_value + "</td></tr>" +
                            "<tr><td><b>Payment Platform: </b></td><td> " + index.payment_platform + " </td></tr>" +
                            "<tr><td><b>Transaction ID: </b></td><td> " + index.bitcoin_sale_id + " </td></tr>" +
                            "<tr><td><b>Transaction amount: </b></td><td> $" + Number( parseFloat(index.transaction_amount).toFixed(2) ).toLocaleString() + "</td></tr>"+
                            "<tr><td><b>Transaction Status: </b></td><td style='text-transform:capitalize;'>" + status_value + "</td></tr>"+
                            "</table>";

                    send_content += "<h3 style='margin-top: 20px;'>Billing Details</h3>" +
                            "<table class='paleBlueRows' style='max-width:500px;'>" +
                            "<tr><td><b>Billing Name: </b></td><td> " + index.billing_details.first_name + " " + index.billing_details.last_name + " " + " </td></tr>" +
                            "<tr><td><b>Billing Address: </b></td><td>" + index.billing_details.street + ",<br>" + index.billing_details.city + ", " + index.billing_details.state + " - " + index.billing_details.zipcode + "</td></tr>" +
                            "</table>";

                    send_content += "<h3 style='margin-top: 20px;'>Shopper Details</h3>" +
                            "<table class='paleBlueRows' style='max-width:500px;'>" +
                            "<tr><td><b>Name: </b></td><td> " + shopper_user_name_field + " </td></tr>" +
                            "<tr><td><b>Email Address: </b></td><td> " + shopper_email_field + " " + " </td></tr>" +
                            "<tr><td><b>Phone Number: </b></td><td>" + shopper_phone_field + "</td></tr>" +
                            "</table>";

                    send_content += "</span>" +
                            "</div>";
                }
            });
            res.send(send_content);
        });
    }
    
    if(action == "mark_trans_finish"){
        var logged_user_id = req.body.logged_user_id;
        var transaction_id = req.body.transaction_id;
        var date_today = new Date(Date.now()).toISOString();
        
        var img = req.body.img;
        
        var ObjectId = require('mongodb').ObjectId;
        var session_data = '';
        
        async.waterfall([
            function(next) {
                if(img != '' && typeof img != 'undefined'){
                    var fs = require('fs');
                    var dir = './public/uploads';
                    if (!fs.existsSync(dir)){
                        fs.mkdirSync(dir);
                    }
                    
                    var dir = './public/uploads/'+logged_user_id;
                    if (!fs.existsSync(dir)){
                        fs.mkdirSync(dir);
                    }

                    var checkout_screen = dir+"/"+transaction_id+".png";
                    var db_save_folder = 'uploads/'+logged_user_id+'/'+transaction_id+'.png';
                    var base64Data = img.replace(/^data:image\/png;base64,/, "");
                    fs.writeFile(checkout_screen, base64Data, 'base64', function(err) {
                        if(!err){
                            dbo.collection("transaction").updateOne({"_id": new ObjectId(transaction_id)}, {$set: {"screenshot_link": db_save_folder}}, function (err, result) {
                                next(null);
                            });
                        } else {
                            next(null);
                        }
                    });
                } else {
                    next(null);
                }
            }, function(next) {
                dbo.collection("transaction").findOne({"_id": new ObjectId(transaction_id)}, function (err, result) {
                    if(err){
                        return res.send({"msg": "error"});
                    } else {
                        if (typeof result != 'undefined' && result != null && result != "") {                    
                            async.waterfall([
                                function(next) {
                                    dbo.collection("transaction").updateOne({"_id": new ObjectId(transaction_id)}, {$set: {"status": "completed","completed_date": date_today}}, function (err, result) {
                                        if(!err){
                                            return res.send({"msg":"success"});
                                        } else {
                                            return res.send({"msg":"error"});
                                        }
                                    });
                                }
                            ]);
                        } else {
                            return res.send({"msg": "error"});
                        }
                    }
                });
            }
        ]);
    }

    if(action == "newsletter_admin"){
        var nodemailer = require('nodemailer');
        var mg = require('nodemailer-mailgun-transport');
        var sblue = require('nodemailer-sendinblue-transport');
        var ejs = require("ejs");
        
        var email_addr = req.body.email_id;

        if(process.env.MAIL_PROVIDER == 'SENDINBLUE'){
            var transporter = nodemailer.createTransport(sblue({
                apiKey: process.env.SBLUE_APIKEY,
                apiUrl: process.env.SBLUE_DOMAIN
            }));
        } else {
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
            email_addr: email_addr
        }

        var email_content = ejs.renderFile('views/emails/newsletter_join.ejs',pass_template);
        email_content.then(function (result_content) {
            var options = {
                from: {name: process.env.SITE_NAME, address: process.env.ADMIN_EMAIL},
                to: process.env.ADMIN_EMAIL,
                subject: 'Join Request - '+process.env.SITE_NAME,
                html: result_content,
                text: '',
                'o:tracking': 'no','o:tracking-clicks': 'no','o:tracking-opens': 'no'
            };
            transporter.sendMail(options, function (error, info) {
                if(error){
                    return res.send({msg:"error"});
                }
                return res.send({msg:"success"});
            });
        });        
    }
    if(action == "user_address_details"){
        var shopper_id = req.body.logged_user_id;
        
        var request = require('request');
        var async = require('async');
        var sh_first_name = '',sh_last_name = '',sh_email='',sh_phone='',sh_address1 = '',sh_city = '',sh_state = '',sh_zipcode = '';
        
        var fillr_dev_key = '';
        var fillr_secret_key = '';
        
        async.waterfall([
            function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"failed"});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            fillr_dev_key = resulteach.fillr_dev_key;
                            fillr_secret_key = resulteach.fillr_secret_key;
                            next(null);
                        } else {
                            return res.send({msg:"failed"});
                        }
                    }
                });
            },function(next) {
                dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)},function(err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        var phone_number = result.phone_number;
                        phone_number = phone_number.replace("(","");
                        phone_number = phone_number.replace(")","");
                        phone_number = phone_number.replace(" ","");
                        phone_number = phone_number.replace("-","");
                        
                        var ProfileData = {
                            "ContactDetails.Emails.Email.Address":result.email,
                            "ContactDetails.CellPhones.CellPhone.Number":phone_number,
                            "PersonalDetails.FirstName":result.first_name,
                            "PersonalDetails.LastName":result.last_name,
                            
                            "AddressDetails.PostalAddress.AddressLine1":result.address,
                            "AddressDetails.PostalAddress.AdministrativeArea": result.state,
                            "AddressDetails.PostalAddress.Country":"United States",
                            "AddressDetails.PostalAddress.PostalCode":result.zipcode,
                            "AddressDetails.PostalAddress.Suburb":result.city,
                            "AddressDetails.PostalAddress.StreetName": "1656 Union Street",
                            
                            "AddressDetails.BillingAddress.AddressLine1":result.address,
                            "AddressDetails.BillingAddress.AdministrativeArea":result.state,
                            "AddressDetails.BillingAddress.Country":"United States",
                            "AddressDetails.BillingAddress.PostalCode":result.zipcode,
                            "AddressDetails.BillingAddress.Suburb":result.city,
                            "AddressDetails.BillingAddress.StreetName": result.address,
                            
                            "AddressDetails.WorkAddress.AddressLine1":result.address,
                            "AddressDetails.WorkAddress.AdministrativeArea":result.state,
                            "AddressDetails.WorkAddress.Country":"United States",
                            "AddressDetails.WorkAddress.PostalCode":result.zipcode,
                            "AddressDetails.WorkAddress.Suburb":result.city,
                            "AddressDetails.WorkAddress.StreetName": result.address,
                        };
                        var retarray = {"ProfileData":ProfileData};
                        retarray['fillr_dev_key'] = fillr_dev_key;
                        retarray['fillr_secret_key'] = fillr_secret_key;
                        retarray['fill_type'] = "address";
                        return res.send({msg:"success",retarray:retarray});
                    } else {
                        return res.send({msg:"failed"});
                    }
                });
            }
        ]);
    }
    if(action == "user_card_details"){
        var shopper_id = req.body.logged_user_id;
        
        var request = require('request');
        var async = require('async');
        var sh_first_name = '',sh_last_name = '',sh_email='',sh_phone='',sh_address1 = '',sh_city = '',sh_state = '',sh_zipcode = '';

        var fillr_dev_key = '';
        var fillr_secret_key = '';

        async.waterfall([
            function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"failed"});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            fillr_dev_key = resulteach.fillr_dev_key;
                            fillr_secret_key = resulteach.fillr_secret_key;
                            next(null);
                        } else {
                            return res.send({msg:"failed"});
                        }
                    }
                });
            },function(next) {
                dbo.collection("vcard").findOne({"shopper_id" : new ObjectId(shopper_id)}, function (err, result) {
                    if(err){
                        return res.send({msg:"failed"});
                    } else {
                        if (typeof result != 'undefined' && result != null && result != ""){
                            if(result.crdno != '' && result.expdt != ''){
                                result.crdno = decrypt(result.crdno);
                                result.expdt = decrypt(result.expdt);
                                result.cvv = decrypt(result.cvv);

                                paydet = result;
                                var datetime = paydet.expdt;
                                var datetm = new Date(datetime);
                                var ccMonth = datetm.getMonth() + 1;
                                var ccYear = datetm.getFullYear().toString();
                                var ProfileData = {
                                    "CreditCards.CreditCard.CCV":paydet.cvv,
                                    "CreditCards.CreditCard.Expiry":ccMonth+"-"+ccYear,
                                    "CreditCards.CreditCard.Expiry.Month":ccMonth,
                                    "CreditCards.CreditCard.Expiry.Year":ccYear,                                        
                                    "CreditCards.CreditCard.NameOnCard":paydet.first_name+" "+paydet.last_name,
                                    "CreditCards.CreditCard.Number":paydet.crdno
                                };
                                var retarray = {"ProfileData":ProfileData};
                                retarray['fillr_dev_key'] = fillr_dev_key;
                                retarray['fillr_secret_key'] = fillr_secret_key;
                                retarray['fill_type'] = "card";
                                return res.send({msg:"success",retarray:retarray});
                            } else {
                                return res.send({msg:"failed"});
                            }
                        } else {
                            return res.send({msg:"failed"});
                        }
                    }
                });
            }
        ]);
    }
        
    if(action == "update_bitcoin_address"){
        var ObjectId = require('mongodb').ObjectId;
        var trans_id = req.body.trans_id;
        var bitcoin_address = req.body.bitcoin_address;
        
        dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"bitcoin_address": bitcoin_address}}, function (err, result) {
            if(!err){
                return res.send({msg:"success"});
            } else {
                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
            }
        });
    }
    
    /** ALIANT PAY TRANSACTION CREATE **/
    if(action == 'bitcoin_pay'){
        //return res.send({msg:"success",aliantpay_sale_id:"102888",invoice_url:"https://aliantpay.io/invoice/?i=102888"});
        
        var ObjectId = require('mongodb').ObjectId;
        
        var shopper_id = req.body.shopper_id;
        var billing_amount= req.body.billing_amount;
        var checkout_amount= req.body.checkout_amount;
        var charge_amount= req.body.charge_amount;
        
        billing_amount = billing_amount * 1.10;
        
        var billing_first_name= req.body.billing_first_name;
        var billing_last_name= req.body.billing_last_name;
        var billing_street= req.body.billing_street;
        var billing_city= req.body.billing_city;
        var billing_state= req.body.billing_state;
        var billing_zipcode= req.body.billing_zipcode;
        var date_today= req.body.date_today;
        
        var billing_email = '',billing_phone = '';
        
        var session_data = req.body.sess_data;
        var tab_url = req.body.tab_url;
        
        var img = req.body.img;
        
        var domain_url = tab_url.replace('http://','').replace('https://','').replace('www.','').split(/[/?#]/)[0];
        var platform_name = '';
        var parts = domain_url.split('.');
        if(parts.length >=3){
            platform_name = parts[1];
        } else {
            platform_name = parts[0];
        }

        platform_name = (platform_name.charAt(0).toUpperCase() + platform_name.slice(1));
        var transaction_type = "CHECKOUT";
        if(session_data == 'preloadcard'){
            transaction_type = "PRELOADCARD";
        }
        
        var request = require('request');
        var api_url = '';
        var invoice_url = '';
        var aliant_authorization = '';
        var bitcoin_sale_id = '';
        var trans_id = '';
        
        var aliantpay_sandbox = '';                
        var aliantpay_cust_id = '';
        var aliantpay_api_token = '';
        async.waterfall([
            function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            settings_tbl_id = resulteach._id;
                            api_url = resulteach.aliantpay_api_url;
                            invoice_url = resulteach.aliantpay_invoice_url;
                            aliant_authorization = resulteach.aliantpay_authorization;
                            aliantpay_sandbox = resulteach.aliantpay_sandbox;
                            aliantpay_api_token = resulteach.aliantpay_api_token;
                            next(null);                            
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    }
                });
            },function(next) {
                dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)}, function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        billing_email = result.email;
                        billing_phone = result.phone_number;
                        aliantpay_cust_id = result.aliantpay_cust_id;
                        next(null);
                    } else {
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    }
                });
            },function(next) {
                if(typeof aliantpay_cust_id !== "undefined" && aliantpay_cust_id != ''){
                    next(null);
                } else {
                    if(aliantpay_sandbox == 'true'){
                        next(null);
                    } else {
                        var cust_req = {
                            "fullname": billing_first_name+' '+billing_last_name,
                            "email": billing_email,
                            "phone": billing_phone,
                            "address": billing_street,
                            "city": billing_city,
                            "state": billing_state,
                            "zipCode": billing_zipcode,
                            "country": "US"
                        };

                        request.post({
                            headers: {'content-type' : 'application/json','Authorization': 'Bearer '+aliantpay_api_token},
                            url: "https://aliantpay.io/api/v2/customers",
                            body: JSON.stringify(cust_req)
                        },function(error, resp, body){
                            if (error){
                                //console.log(error);
                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                            }
                            if(body != ''){
                                ret_data = JSON.parse(body);
                                console.log("NEW CUSTOMER");
                                console.log(ret_data);
                                console.log("/NEW CUSTOMER");
                                if(typeof ret_data.id != 'undefined'){
                                    aliantpay_cust_id = ret_data.id;
                                    dbo.collection("users").updateOne({"_id": new ObjectId(shopper_id)}, {$set: {"aliantpay_cust_id": aliantpay_cust_id}}, function (err, resultupdate) {
                                        next(null);
                                    });
                                } else {
                                    return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                }
                            } else {
                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                            }
                        });
                    }
                }
            },function(next) {
                if(aliantpay_sandbox == 'true'){
                    bitcoin_sale_id = "12345678";
                    next(null);
                } else {
                    /** NEW V2 VERSION **/
                    var sale_req = {
                        "amount": billing_amount,
                        "customerId": aliantpay_cust_id,
                        "email": billing_email,
                        "emailIt": false,
                        "emailName": billing_first_name+' '+billing_last_name,
                        "sandbox": false
                    };
                    request.post({
                        headers: {'content-type' : 'application/json','Authorization': 'Bearer '+aliantpay_api_token},
                        url: "https://aliantpay.io/api/v2/Invoices",
                        body: JSON.stringify(sale_req)
                    },function(error, resp, body){
                        if(error){
                            console.log("Error in Creating Sales Transaction\n");
                            console.log(error);
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                        var ret_data = [];
                        if(body != ''){
                            ret_data = JSON.parse(body);
                            console.log("NEW SALE");
                            console.log(ret_data);
                            console.log("/NEW SALE");
                            if(typeof ret_data.id != 'undefined' && ret_data.id != ''){
                                bitcoin_sale_id = ret_data.id;
                                next(null);
                            } else {
                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                            }
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    });
                }
            },function(next) {
                dbo.collection("transaction").insertOne({ shopper_id: new ObjectId(shopper_id), va_id: "", date: date_today, transaction_type: transaction_type, bitcoin_sale_id: bitcoin_sale_id,payment_platform:"Aliant Pay", platform: platform_name, currency: '', 
                    status: "payment_pending", checkout_amount: checkout_amount, charge_amount: charge_amount, transaction_amount: billing_amount,screenshot_link: "",billing_details: {first_name : billing_first_name, last_name : billing_last_name, street: billing_street, city: billing_city, state: billing_state,
                    zipcode: billing_zipcode} },
                function(err,inserted_id){
                    if(inserted_id.insertedId != '' && !err){
                        trans_id = inserted_id.insertedId;
                        next(null);
                    } else {
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    }
                });
            },function(next) {
                if(aliantpay_sandbox == 'true'){
                    return res.send({msg:"sandbox",trans_id:trans_id,bitcoin_sale_id:bitcoin_sale_id,invoice_url:invoice_url+bitcoin_sale_id});
                } else {
                    return res.send({msg:"success",trans_id:trans_id,bitcoin_sale_id:bitcoin_sale_id,invoice_url:invoice_url+bitcoin_sale_id});
                }
            }
        ]);
    }
    /** ALIANT PAY TRANSACTION CREATE **/
    
    /** ALIANT PAY CHECK FOR COMPLETION **/
    if(action == "check_completed"){
        var bitcoin_sale_id = req.body.bitcoin_sale_id;
        var shopper_id = req.body.shopper_id;
        var transaction_id = req.body.trans_id;
        var transaction_status = '';
        
        var transaction_sandbox = '';
        var aliantpay_sandbox = '';
        
        var request = require('request');
        var api_url = '';
        var aliant_authorization = '';
        var aliantpay_api_token = '';
        var sale_status = '';
        async.waterfall([
            function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error"});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            api_url = resulteach.aliantpay_api_url;
                            aliant_authorization = resulteach.aliantpay_authorization;
                            aliantpay_sandbox = resulteach.aliantpay_sandbox;
                            aliantpay_api_token = resulteach.aliantpay_api_token;
                            transaction_sandbox = resulteach.transaction_sandbox;
                            next(null);
                        } else {
                            return res.send({msg:"error"});
                        }
                    }
                });
            },function(next) {
                dbo.collection("transaction").findOne({"_id": new ObjectId(transaction_id)}, function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        transaction_status  = result.status;
                        var manual_cancel = result.manual_cancel;
                        if(manual_cancel == "1"){
                            return res.send({msg:"manual_cancelled"});
                        } else {
                            if(transaction_status == 'processed'){
                                return res.send({msg:"stoploop"});
                            } else {
                                next(null);
                            }
                        }
                    } else {
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    }
                });
            },function(next) {
                if(aliantpay_sandbox == 'true'){
                    next(null);
                } else {
                    request.get({
                        headers: {'content-type' : 'application/json','Authorization': 'Bearer '+aliantpay_api_token},
                        url: "https://aliantpay.io/api/v2/Invoices/"+bitcoin_sale_id
                    },function(error, resp, body){
                        if(error){
                            console.log("Error in reading Transaction\n");
                            console.log(error);
                            return res.send({msg:"error"});
                        }
                        ret_data = JSON.parse(body);                        
                        if(typeof ret_data.id != 'undefined'){
                            sale_status = ret_data.status;
                            if(typeof sale_status != 'undefined') {
                                sale_status = sale_status.toString();
                                sale_status = sale_status.toLowerCase();
                            }
                            if(typeof sale_status != 'undefined' && (sale_status == 'completed' || sale_status == 'complete')){
                                console.log("SEE SALE");
                                console.log(ret_data);
                                console.log("/SEE SALE");
                                next(null);
                            } else if(typeof sale_status != 'undefined' && (sale_status == 'settled' || sale_status == 'finalized' || sale_status == 'confirmed')){
                                return res.send({msg:"processing"});
                            } else if(typeof sale_status != 'undefined' && (sale_status == 'pending')){ 
                                if(transaction_sandbox == 'true')
                                    next(null);
                                else
                                    return res.send({msg:"continue"});
                            } else if(typeof sale_status != 'undefined' && sale_status == 'expired'){ 
                                console.log("SEE SALE");
                                console.log(ret_data);
                                console.log("/SEE SALE");
                                dbo.collection("transaction").updateOne({"_id": new ObjectId(transaction_id)}, {$set: {"status": "cancelled"}}, function (err, result) {
                                    return res.send({msg:"expired",txt:"This transaction has been expired. There have been no charges. In order to make a purchase, click \"Pay Now!\" again."});
                                });
                            } else if(typeof sale_status != 'undefined' && (sale_status == 'cancelled' || sale_status == 'refunded')){
                                console.log("SEE SALE");
                                console.log(ret_data);
                                console.log("/SEE SALE");
                                dbo.collection("transaction").updateOne({"_id": new ObjectId(transaction_id)}, {$set: {"status": "cancelled"}}, function (err, result) {
                                    return res.send({msg:"cancelled",txt:"This transaction has been canceled. There have been no charges. In order to make a purchase, click \"Pay Now!\" again."});
                                });
                            } else {
                                return res.send({msg:"continue"});
                                /*if(transaction_sandbox == 'true')
                                    next(null);
                                else
                                    return res.send({msg:"continue"});*/
                            }
                        } else {
                            return res.send({msg:"error"});
                        }
                    });
                }
            },function(next) {
                dbo.collection("transaction").updateOne({"_id": new ObjectId(transaction_id)}, {$set: {status: "processed"}}, function (err, result) {
                    next(null);
                });
            }, function (next){
                return res.send({msg:"completed"});
            }
        ]);
    }
    if(action == "check_completed_new"){
        var bitcoin_sale_id = req.body.bitcoin_sale_id;
        var shopper_id = req.body.shopper_id;
        var transaction_id = req.body.trans_id;
        
        var transaction_sandbox = '';
        
        var bitcoin_address = '';
        
        var request = require('request');
        async.waterfall([
            function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error"});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            transaction_sandbox = resulteach.transaction_sandbox;
                            next(null);
                        } else {
                            return res.send({msg:"error"});
                        }
                    }
                });
            },function(next) {
                // Get Bitcoin Address used for the transaction.
                dbo.collection("transaction").findOne({"_id": new ObjectId(transaction_id)}, function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        bitcoin_address  = result.bitcoin_address;
                        next(null);
                    } else {
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    }
                });
            }, function(next) {
                if(transaction_sandbox == 'true'){
                    next(null);
                } else {
                    request.get({
                        headers: {'content-type' : 'application/json'},
                        url: "https://blockchain.info/q/getreceivedbyaddress/"+bitcoin_address+"?confirmations=1"
                    },function(error, resp, body){
                        if(!error){
                            if(resp.statusCode == 200){
                                if(body > 0){
                                    console.log("BLOCK CHAIN CONFIRMED");
                                    console.log(body);
                                    console.log("/BLOCK CHAIN CONFIRMED");
                                    next(null);
                                } else {
                                    return res.send({msg:"continue"});
                                }
                            } else if(resp.statusCode == 500){
                                console.log("BLOCK CHAIN ADDRESS INVALID");
                                console.log(resp.statusCode);
                                console.log("/BLOCK CHAIN ADDRESS INVALID");
                                return res.send({msg:"invalidaddress"});
                            } else {
                                return res.send({msg:"continue"});
                            }
                        } else {                            
                            return res.send({msg:"continue"});
                        }
                    });                    
                }
            },function(next) {
                dbo.collection("transaction").updateOne({"_id": new ObjectId(transaction_id)}, {$set: {status: "processed"}}, function (err, result) {
                    next(null);
                });
            }, function (next){
                return res.send({msg:"completed"});
            }
        ]);
    }
    /** ALIANT PAY CHECK FOR COMPLETION **/
    
    /** COINBASE TO COINBASE TRANSACTION **/
    if(action == 'coinbase_init'){
        var ObjectId = require('mongodb').ObjectId;
        var Client = require('coinbase').Client;
        var client_obj = '';
        
        var shopper_id = req.body.shopper_id;
        var billing_amount= req.body.billing_amount;
        var checkout_amount= req.body.checkout_amount;
        var charge_amount= req.body.charge_amount;
        
        billing_amount = billing_amount * 1.10;
        
        var billing_first_name= req.body.billing_first_name;
        var billing_last_name= req.body.billing_last_name;
        var billing_street= req.body.billing_street;
        var billing_city= req.body.billing_city;
        var billing_state= req.body.billing_state;
        var billing_zipcode= req.body.billing_zipcode;
        var date_today= req.body.date_today;
        
        var billing_email = '',billing_phone = '';
        
        var session_data = req.body.sess_data;
        var tab_url = req.body.tab_url;
        
        var img = req.body.img;
        
        var coin_type = req.body.coin_type;
        
        var domain_url = tab_url.replace('http://','').replace('https://','').replace('www.','').split(/[/?#]/)[0];
        var platform_name = '';
        var parts = domain_url.split('.');
        if(parts.length >=3){
            platform_name = parts[1];
        } else {
            platform_name = parts[0];
        }

        platform_name = (platform_name.charAt(0).toUpperCase() + platform_name.slice(1));
        var transaction_type = "CHECKOUT";
        if(session_data == 'preloadcard'){
            transaction_type = "PRELOADCARD";
        }
        
        var request = require('request');
        var coinbase_api_key = '';
        var coinbase_api_secret = '';
        var trans_id = '';
        var bitcoin_address = '';
        
        async.waterfall([
            function(next) {
                // Get Bitcoin Address for Selected Coin Type
                dbo.collection("bitcoin_address").find({}).toArray(function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        result.forEach(function (rescoin, resmsg) {
                            if(rescoin.code == coin_type){
                                bitcoin_address = rescoin.coin_address;
                            }
                        });
                        next(null);
                    } else {
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    }
                });
            }, /*function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        resulteach = result[0];
                        coinbase_api_key = resulteach.coinbase_api_key;
                        coinbase_api_secret = resulteach.coinbase_api_secret;
                        client_obj = new Client({'apiKey': coinbase_api_key,'apiSecret': coinbase_api_secret, strictSSL: false});
                        var coinbase_acc_id = '';
                        client_obj.getAccounts({}, function(err, accounts) {
                            if (typeof accounts != 'undefined' && accounts != null && accounts != "" && (err == null || err == "")) {
                                accounts.forEach(function(acct) {
                                    if(acct.primary == true){
                                        coinbase_acc_id = acct.id;
                                    }
                                });
                                if(coinbase_acc_id != ''){
                                    client_obj.getAccount(coinbase_acc_id, function(err, account) {
                                        account.createAddress(null, function(err, addr) {
                                            if (typeof addr != 'undefined' && addr != null && addr != "" && (err == null || err == "")) {
                                                bitcoin_address = addr.address;
                                                next(null);
                                            } else {
                                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                            }
                                        });
                                    });
                                } else {
                                    return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                }
                            } else {
                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                            }
                        });
                    } else {
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    }
                });
            },*/ function(next) {
                dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)}, function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        billing_email = result.email;
                        billing_phone = result.phone_number;
                        next(null);
                    } else {
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    }
                });
            },function(next) {
                dbo.collection("transaction").insertOne({ shopper_id: new ObjectId(shopper_id), va_id: "", date: date_today, transaction_type: transaction_type, payment_platform:"Coinbase", platform: platform_name, currency: coin_type, 
                    status: "payment_pending", checkout_amount: checkout_amount, charge_amount: charge_amount, transaction_amount: billing_amount,screenshot_link: "",billing_details: {first_name : billing_first_name, last_name : billing_last_name, street: billing_street, city: billing_city, state: billing_state,
                    zipcode: billing_zipcode, bitcoin_address: bitcoin_address} },
                function(err,inserted_id){
                    if(inserted_id.insertedId != '' && !err){
                        trans_id = inserted_id.insertedId;
                        next(null);
                    } else {
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    }
                });
            },function(next) {
                return res.send({msg:"success",trans_id:trans_id,bitcoin_address:bitcoin_address});
            }
        ]);
    }
    /** COINBASE TO COINBASE TRANSACTION **/
    
    /** COINBASE OAUTH START **/
    if(action == 'coinbase_oauth_init'){
        var logged_user_id = req.body.logged_user_id;
        var reauth = req.body.reauth;
        
        var ObjectId = require('mongodb').ObjectId;
        var oauth_url = '';
        
        async.waterfall([
            function(next) {
                if(reauth == "yes"){
                    next(null);
                } else {
                    dbo.collection("users").findOne({"_id": new ObjectId(logged_user_id)}, function (err, result) {
                        if(err){
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        } else {
                            if (typeof result != 'undefined' && result != null && result != "") {
                                var coinbase_access_token = result.coinbase_access_token;
                                if(typeof coinbase_access_token != 'undefined' && coinbase_access_token != null && coinbase_access_token != ''){
                                    return res.send({"msg": "success"});
                                } else {
                                    next(null);
                                }
                            } else {
                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                            }
                        }
                    });
                }
            },function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            coinbase_oauth_client_id = resulteach.coinbase_oauth_client_id;
                            coinbase_oauth_redirect_url = resulteach.coinbase_oauth_redirect_url;
                            coinbase_oauth_scope = resulteach.coinbase_oauth_scope;
                            transaction_sandbox = resulteach.transaction_sandbox;
                            billing_amount = 0;
                            random_string = makeid(20);
                            oauth_url = 'https://www.coinbase.com/oauth/authorize?client_id='+coinbase_oauth_client_id+'&redirect_uri='+coinbase_oauth_redirect_url+'&response_type=code&scope='+coinbase_oauth_scope+'&meta[send_limit_amount]='+billing_amount+'&meta[send_limit_currency]=USD&account=all&state='+random_string;
                            return res.send({"msg": "noaccount","oauth_url":oauth_url});
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    }
                });
            }
        ]);
    }
    /** COINBASE OAUTH START **/
    
    /** COINBASE SUCCESS AFTER OAUTH **/
    if(action == 'coinbase_oauth'){
        var request = require('request');
        var ObjectId = require('mongodb').ObjectId;
        var code = req.body.code;
        var logged_user_id = req.body.logged_user_id;
        
        var coinbase_oauth_client_id = '';
        var coinbase_oauth_client_secret = '';
        var coinbase_oauth_redirect_url = '';
        var coinbase_api_url = '';
        var coinbase_access_token = '';
        var primary_account_id = '';
        
        async.waterfall([
            function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            coinbase_oauth_client_id = resulteach.coinbase_oauth_client_id;
                            coinbase_oauth_client_secret = resulteach.coinbase_oauth_client_secret;
                            coinbase_oauth_redirect_url = resulteach.coinbase_oauth_redirect_url;
                            coinbase_api_url = resulteach.coinbase_api_url;
                            next(null);
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    }
                });
            },function(next) {
                // Access Token Getting Process
                var auth_req = {
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": coinbase_oauth_client_id,
                    "client_secret": coinbase_oauth_client_secret,
                    "redirect_uri": coinbase_oauth_redirect_url
                };            
                request.post({
                    headers: {'content-type' : 'application/json'},
                    url: coinbase_api_url+"/oauth/token",
                    body: JSON.stringify(auth_req)
                },function(error, response, body){
                    if (error){
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    } else {
                        var body = JSON.parse(body);
                        if(typeof body != "undefined" && body != null && typeof body.access_token != "undefined" && body.access_token != null && body.access_token != ''){
                            coinbase_access_token = body.access_token;
                            dbo.collection("users").updateOne({"_id": new ObjectId(logged_user_id)}, {$set: {"coinbase_access_token": body.access_token,"coinbase_refresh_token": body.refresh_token}}, function (err, resultupdate) {
                                next(null);
                            });
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    }
                });
            },function(next) {
                // Getting User Account from Access Token
                request.get({
                    headers: {'content-type' : 'application/json','Authorization' : 'Bearer '+coinbase_access_token},
                    url: coinbase_api_url+"/v2/accounts/"
                },function(error, response, body){
                    console.log(error);
                    var resp = JSON.parse(body);
                    var data_resp = resp.data;
                    if(typeof data_resp != "undefined"){
                        for (var i = 0; i < data_resp.length; ++i) {
                            var value = data_resp[i];
                            if(value.primary == true){
                                primary_account_id = value.id;break;
                            }
                        }
                        if(primary_account_id != ''){
                            dbo.collection("users").updateOne({"_id": new ObjectId(logged_user_id)}, {$set: {"coinbase_account_id": primary_account_id}}, function (err, resultupdate) {
                                return res.send({msg:"success"});
                            });
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    } else {
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    }
                });
            }
        ]);
    }
    /** COINBASE SUCCESS AFTER OAUTH **/
    
    /** COINBASE PAYMENT TO ALIANT **/
    if(action == 'exchange_coinbase_pay'){
        var ObjectId = require('mongodb').ObjectId;
        var request = require('request');
        
        var shopper_id = req.body.shopper_id;
        var trans_id = req.body.trans_id;
        var bitcoin_address = req.body.trans_bitcoin_address;
        var otp_coinbase = '';
        
        if(typeof req.body.otp != "undefined"){
            otp_coinbase = req.body.otp;
        }
        
        var billing_amount= '';
        var bitcoin_sale_id = '';
        
        var coin_type = 'USD';
                
        var coinbase_oauth_client_id = '';
        var coinbase_oauth_client_secret = '';
        var coinbase_api_url = '';
        
        var coinbase_access_token = '';
        var coinbase_refresh_token = '';
        var coinbase_account_id = '';
		
		var transaction_currency = '';// (BTC or ETH or ..)
        
        var aliantpay_api_token = '';
        
        var account_obj = '';
		var all_account_obj = '';
        var transaction_sandbox = '';
        
        if(trans_id != ''){
            async.waterfall([
                function(next) {
                    // Get Client ID Client Secret & API URL
                    dbo.collection("site_settings").find({}).toArray(function (err, result) {
                        if (err){
                            dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": "Site settings fetch error", "manual_cancel": "1","status": "cancelled"}}, function (err, result) {
                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                            });
                        } else {
                            if(typeof result != "undefined" && result != null){
                                resulteach = result[0];
                                coinbase_oauth_client_id  = resulteach.coinbase_oauth_client_id;
                                coinbase_oauth_client_secret  = resulteach.coinbase_oauth_client_secret;
                                coinbase_api_url = resulteach.coinbase_api_url;
                                transaction_sandbox = resulteach.transaction_sandbox;
                                aliantpay_api_token = resulteach.aliantpay_api_token;
                                next(null);
                            } else {
                                dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": "Site settings fetch error", "manual_cancel": "1","status": "cancelled"}}, function (err, result) {
                                    return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                });
                            }
                        }
                    });
                },function(next) {
                    // Get Users Access Token and Refresh Token and Coinbase Account ID
                    dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)}, function (err, result) {
                        if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                            coinbase_access_token  = result.coinbase_access_token;
                            coinbase_refresh_token  = result.coinbase_refresh_token;
                            //coinbase_account_id  = result.coinbase_account_id;
                            next(null);
                        } else {
                            dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": "User access token and refresh token fetch error", "manual_cancel": "1","status": "cancelled"}}, function (err, result) {
                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                            });
                        }
                    });
                },function(next) {
                    // Get Transaction Amount
                    dbo.collection("transaction").findOne({"_id": new ObjectId(trans_id)}, function (err, result) {
                        if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                            billing_amount  = result.transaction_amount;
							if(typeof result.bitcoin_sale_id != "undefined" && result.bitcoin_sale_id != '' && result.bitcoin_sale_id != null){
								bitcoin_sale_id = result.bitcoin_sale_id;
							}
							transaction_currency = result.currency;
                            next(null);
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    });
                },function(next) {
                    // Get All Accounts for fetching apt account for sending.
                    var Client = require('coinbase').Client;
                    var client = new Client({'accessToken': coinbase_access_token, 'refreshToken': coinbase_refresh_token,proxy: process.env.PROXY,strictSSL: false});

                    client.getAccounts({limit: 50}, function(err, accounts) {
                        if(err != null){
                            //console.log(err.statusCode);
                            var errMsg = err.message;
                            //console.log(err.message);
                            if(err.statusCode == "401"){
                                console.log("INSIDE Access Token Renew Process");
                                // Access Token Renew Process
                                var auth_req = {
                                    "grant_type": "refresh_token",
                                    "refresh_token": coinbase_refresh_token,
                                    "client_id": coinbase_oauth_client_id,
                                    "client_secret": coinbase_oauth_client_secret
                                };
                                request.post({
                                    headers: {'content-type' : 'application/json'},
                                    url: coinbase_api_url+"/oauth/token",
                                    body: JSON.stringify(auth_req)
                                },function(error, response, body){
                                    if (error){
                                        dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": "Token renew process failed", "manual_cancel": "1","status": "cancelled"}}, function (err, result) {
                                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                        });
                                    } else {
                                        var body = JSON.parse(body);
                                        if(typeof body != "undefined" && body != null && typeof body.access_token != "undefined" && body.access_token != null && body.access_token != ''){
                                            coinbase_access_token = body.access_token;
                                            coinbase_refresh_token = body.refresh_token;                                        
                                            dbo.collection("users").updateOne({"_id": new ObjectId(shopper_id)}, {$set: {"coinbase_access_token": body.access_token,"coinbase_refresh_token": body.refresh_token}}, function (err, resultupdate) {

                                                client = new Client({'accessToken': coinbase_access_token, 'refreshToken': coinbase_refresh_token,proxy: process.env.PROXY, strictSSL: false});
                                                client.getAccounts({limit: 50}, function(err, accounts) {
                                                    all_account_obj = accounts;
                                                    next(null);
                                                });

                                            });
                                        } else {
                                            dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": "Token renew process failed", "manual_cancel": "1","status": "cancelled"}}, function (err, result) {
                                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                            });
                                        }
                                    }
                                });
                            } else {
                                dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": errMsg, "manual_cancel": "1","status": "cancelled"}}, function (err, result) {
                                    return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                });
                            }
                        } else {
                            all_account_obj = accounts;
                            next(null);
                        }
                    });
                }, function(next) {
					/** GET SUITABLE WALLET ACCOUNT ID BY CURRENCY CODE **/
					if(all_account_obj != null && all_account_obj != ''){
						console.log(all_account_obj);
						all_account_obj.forEach(function(acct) {
							if(acct.currency.code == transaction_currency){
								coinbase_account_id = acct.id;
							}
						});
						if(coinbase_account_id != ''){
							console.log("COINBASE ACCOUNT ID FOR "+transaction_currency+" is "+coinbase_account_id);
							next(null);
						} else {
							console.log("NO SUITABLE WALLET ACCOUNT FOUND FOR COIN TYPE");
                            dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": "NO SUITABLE WALLET ACCOUNT FOUND FOR COIN TYPE", "manual_cancel": "1","status": "cancelled"}}, function (err, result) {
                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                            });
						}
					} else {
                        dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": "Coinbase Get all accounts return value is null", "manual_cancel": "1","status": "cancelled"}}, function (err, result) {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        });
					}
				}, function(next) {
                    // Get Account Object by Account ID for Sending Money.
                    var Client = require('coinbase').Client;
                    var client = new Client({'accessToken': coinbase_access_token, 'refreshToken': coinbase_refresh_token,proxy: process.env.PROXY,strictSSL: false});

                    client.getAccount(coinbase_account_id, function(err, account) {
                        if(err != null){
                            console.log(err.statusCode);
                            console.log(err.message);
                            var errMsg = err.message;
                            if(err.statusCode == "401"){
                                console.log("INSIDE Access Token Renew Process");
                                // Access Token Renew Process
                                var auth_req = {
                                    "grant_type": "refresh_token",
                                    "refresh_token": coinbase_refresh_token,
                                    "client_id": coinbase_oauth_client_id,
                                    "client_secret": coinbase_oauth_client_secret
                                };
                                request.post({
                                    headers: {'content-type' : 'application/json'},
                                    url: coinbase_api_url+"/oauth/token",
                                    body: JSON.stringify(auth_req)
                                },function(error, response, body){
                                    if (error){
                                        dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": "Token renew process failed", "manual_cancel": "1","status": "cancelled"}}, function (err, result) {
                                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                        });
                                    } else {
                                        var body = JSON.parse(body);
                                        if(typeof body != "undefined" && body != null && typeof body.access_token != "undefined" && body.access_token != null && body.access_token != ''){
                                            coinbase_access_token = body.access_token;
                                            coinbase_refresh_token = body.refresh_token;                                        
                                            dbo.collection("users").updateOne({"_id": new ObjectId(shopper_id)}, {$set: {"coinbase_access_token": body.access_token,"coinbase_refresh_token": body.refresh_token}}, function (err, resultupdate) {

                                                client = new Client({'accessToken': coinbase_access_token, 'refreshToken': coinbase_refresh_token,proxy: process.env.PROXY, strictSSL: false});
                                                client.getAccount(coinbase_account_id, function(err, account) {
                                                    account_obj = account;
                                                    next(null);
                                                });

                                            });
                                        } else {
                                            dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": "Token renew process failed", "manual_cancel": "1","status": "cancelled"}}, function (err, result) {
                                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                            });
                                        }
                                    }
                                });
                            } else {
                                dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": errMsg, "manual_cancel": "1","status": "cancelled"}}, function (err, result) {
                                    return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                });
                            }
                        } else {
                            account_obj = account;
                            next(null);
                        }
                    });
                },function(next) {
                    //console.log("ACCOUNT OBJECT OF THE PAYER");
					//console.log(account_obj);
					//return res.send({msg:"error",txt:"This transaction has been canceled. There have been no charges. In order to make a purchase, click \"Pay Now!\" again."});
                    
					if(account_obj != ''){
                        //console.log("BILLING AMOUNT "+billing_amount);
						//console.log("BITCOIN ADDRESS "+bitcoin_address);
                        billing_amount = Math.round(billing_amount,2);
                        account_obj.sendMoney({
							'type': "send",
							'to': bitcoin_address,
							'amount': billing_amount,
							'currency':coin_type,
							'idem': makeid(12)
						}, function(err, tx) {
                            if(err != null){
								//console.log(err);
                                console.log(err.statusCode);
                                console.log(err.message);
                                if(transaction_sandbox == 'true'){
                                    bitcoin_sale_id = '3434-4368-hj8eh3-43h8g3-4343';
                                    next(null);
                                } else {
                                    if(err.statusCode == '400'){
                                        var errmsg = err.message;
                                        if(errmsg.indexOf("Cannot send this amount without going over application limit") >= 0){
                                            return res.send({msg:"reauthenticate",txt:"Re-Authenticate Coinbase with amount greater than checkout amount."});
                                        } else if(errmsg.indexOf("code was invalid") >= 0){
                                            return res.send({msg:"reenterotp",txt:"OTP you entered was incorrect. Please enter the correct OTP received in your mobile and click \"Ok\" button to process the transaction."});
                                        } else if(errmsg.indexOf("enter a valid email or Bitcoin address") >= 0){
											if(bitcoin_sale_id != ''){
												request.delete({
													headers: {'content-type' : 'application/json','Authorization': 'Bearer '+aliantpay_api_token},
													url: "https://aliantpay.io/api/v2/Invoices/"+bitcoin_sale_id
												},function(error, resp, body){
													dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": errmsg,"manual_cancel": "1","status": "cancelled"}}, function (err, result) {
														return res.send({msg:"error",txt:"You do not have enough crypto for this purchase. Please choose another type of crypto or wallet. This transaction has been canceled. There have been no charges. In order to make a purchase, click \"Pay Now!\" again."});
													});
												});
											} else {
												dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": errmsg,"manual_cancel": "1","status": "cancelled"}}, function (err, result) {
													return res.send({msg:"error",txt:"You do not have enough crypto for this purchase. Please choose another type of crypto or wallet. This transaction has been canceled. There have been no charges. In order to make a purchase, click \"Pay Now!\" again."});
												});
											}
                                        } else if(errmsg.indexOf("don't have that much") >= 0){
											if(bitcoin_sale_id != ''){
												request.delete({
													headers: {'content-type' : 'application/json','Authorization': 'Bearer '+aliantpay_api_token},
													url: "https://aliantpay.io/api/v2/Invoices/"+bitcoin_sale_id
												},function(error, resp, body){
													dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": errmsg,"manual_cancel": "1","status": "cancelled"}}, function (err, result) {
														return res.send({msg:"error",txt:"You have insufficient balance in your coinbase account to pay for this transaction. This transaction has been canceled. There have been no charges. In order to make a purchase, click \"Pay Now!\" again."});
													});
												});
											} else {
												dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": errmsg,"manual_cancel": "1","status": "cancelled"}}, function (err, result) {
													return res.send({msg:"error",txt:"You have insufficient balance in your coinbase account to pay for this transaction. This transaction has been canceled. There have been no charges. In order to make a purchase, click \"Pay Now!\" again."});
												});
											}
                                        } else {
											if(bitcoin_sale_id != ''){
												request.delete({
													headers: {'content-type' : 'application/json','Authorization': 'Bearer '+aliantpay_api_token},
													url: "https://aliantpay.io/api/v2/Invoices/"+bitcoin_sale_id
												},function(error, resp, body){
													dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": errmsg,"manual_cancel": "1","status": "cancelled"}}, function (err, result) {
														return res.send({msg:"error",txt:"This transaction has been canceled. There have been no charges. In order to make a purchase, click \"Pay Now!\" again."});
													});
												});
											} else {
												dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": errmsg,"manual_cancel": "1","status": "cancelled"}}, function (err, result) {
													return res.send({msg:"error",txt:"This transaction has been canceled. There have been no charges. In order to make a purchase, click \"Pay Now!\" again."});
												});
											}
                                        }
                                    } else if(err.statusCode == '402'){
                                        return res.send({msg:"enterotp",txt:err.message});
                                    } else {
                                        var errmsg = err.message;
										if(bitcoin_sale_id != ''){
											request.delete({
												headers: {'content-type' : 'application/json','Authorization': 'Bearer '+aliantpay_api_token},
												url: "https://aliantpay.io/api/v2/Invoices/"+bitcoin_sale_id
											},function(error, resp, body){
												dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": errmsg,"manual_cancel": "1","status": "cancelled"}}, function (err, result) {
													return res.send({msg:"error",txt:"This transaction has been canceled. There have been no charges. In order to make a purchase, click \"Pay Now!\" again."});
												});
											});
										} else {
											dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": errmsg,"manual_cancel": "1","status": "cancelled"}}, function (err, result) {
												return res.send({msg:"error",txt:"This transaction has been canceled. There have been no charges. In order to make a purchase, click \"Pay Now!\" again."});
											});
										}
                                    }
                                }
                            } else {                            
                                var resp_tx = JSON.parse(tx);
                                console.log("COINBASE TRANSACTION");
                                console.log(resp_tx);
                                console.log("/COINBASE TRANSACTION");
                                if(typeof resp_tx.id != 'undefined' && resp_tx.id != ''){
                                    bitcoin_sale_id = resp_tx.id;
                                    next(null);
                                } else {
                                    dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": "Coinbase Payment failed"}}, function (err, result) {
                                        return res.send({msg:"error",txt:'Coinbase Payment Failed'});
                                    });
                                }
                            }
                        },otp_coinbase);
                    } else {
                        dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"err_msg": "Coinbase User account id is null", "manual_cancel": "1","status": "cancelled"}}, function (err, result) {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        });
                    }
                },function(next) {
                    dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {status: "processed","coinbase_sale_id": bitcoin_sale_id}}, function (err, result) {
                        if(!err){
                            next(null);
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    });
                },function(next) {
                    return res.send({msg:"success"});
                }
            ]);
        }
    }
    /** COINBASE PAYMENT TO ALIANT **/
    
    /** PEX CARD CREATE **/
    if(action == "create_virtual_card"){
        var shopper_id = req.body.logged_user_id;
        var trans_id = req.body.trans_id;
        var request = require('request');
        var async = require('async');
        var token = '';
        var vcard_username = '',vcard_password = '',vcard_encoded_upass = '',vcard_token = '',vcard_datahook_url = '',vcard_account_id = '', api_url = '',settings_tbl_id = '';
        
        var transaction_sandbox = '';
        var card_exists = '', vcard_tbl_id = '';
        async.waterfall([
            function(next) {
                dbo.collection("vcard").findOne({"shopper_id": new ObjectId(shopper_id)}, function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        if(result.crdno != '' && result.expdt != ''){
                            card_exists = '1';
                            vcard_tbl_id = result._id.toString();
                            vcard_account_id = result.account_id;
                            next(null);
                        } else {
                            dbo.collection("vcard").deleteOne({"shopper_id": new ObjectId(shopper_id)});
                            next(null);
                        }
                    } else {
                        next(null);
                    }
                });
            }, function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            settings_tbl_id = resulteach._id;
                            vcard_username = resulteach.vcard_username;
                            vcard_password = resulteach.vcard_password;
                            vcard_encoded_upass = resulteach.vcard_encoded_upass;
                            
                            vcard_token = resulteach.vcard_token;
                            api_url = resulteach.vcard_api_url;
                            vcard_datahook_url = resulteach.vcard_datahook_url;
                            transaction_sandbox = resulteach.transaction_sandbox;
                            next(null);
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    }
                });
            },function(next) {
                if(vcard_token != '' && vcard_token != null){
                    /**Token Details by API**/
                    request.get({
                        headers: {'content-type' : 'application/json', 'Authorization' : 'token '+vcard_token},
                        url: api_url+"/Token"
                    },function(error, response, body){
						console.log("ERROR 1");
						console.log(error);
                        if(error){
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                        console.log("TOKEN CHECK");
                        console.log(response.statusCode);
                        console.log("/TOKEN CHECK");
                        if(response.statusCode == '403' || response.statusCode == '401'){
                            /**New Token Generation by API**/
                            var auth_req = {
                                "Username": vcard_username,
                                "Password": vcard_password
                            };
                            var username_pass_encoded = vcard_encoded_upass;
                            request.post({
                                headers: {'content-type' : 'application/json', 'Authorization' : 'basic '+username_pass_encoded},
                                url: api_url+"/Token",
                                body: JSON.stringify(auth_req)
                            },function(error, response, body){
                                if(error){
                                    return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                } else {
                                    vcard_token = JSON.parse(body).Token;
                                    console.log("NEW TOKEN");
                                    console.log(vcard_token);
                                    console.log("/NEW TOKEN");
                                    dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                        next(null);
                                    });
                                }
                            });
                        } else if(response.statusCode == '200'){
                            next(null); //Token Not Expired
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    });
                } else {
                    /**New Token Generation by API**/
                    var auth_req = {
                        "Username": vcard_username,
                        "Password": vcard_password
                    };
                    var username_pass_encoded = vcard_encoded_upass;
                    request.post({
                        headers: {'content-type' : 'application/json', 'Authorization' : 'basic '+username_pass_encoded},
                        url: api_url+"/Token",
                        body: JSON.stringify(auth_req)
                    },function(error, response, body){
						console.log("ERROR 2");
						console.log(error);
                        if(error){
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        } else {
                            console.log(response.statusCode);
                            console.log(response.statusMessage);
                            if(response.statusCode == '201'){
                                vcard_token = JSON.parse(body).Token;
                                dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                    next(null);
                                });
                            } else {
                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                            }
                        }
                    });
                }
            },function(next) {
                var condition = {_id: new ObjectId(trans_id)};
                dbo.collection("transaction").findOne({"_id": new ObjectId(trans_id)}, function (err, result) {
                    if(err){
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    }
                    var sh_first_name = '',sh_last_name = '',sh_dob = '',sh_email = '',sh_phone = '',sh_address1 = '',sh_city = '',sh_state = '',sh_zipcode = '',trans_amount = 0,checkout_amount = 0,virtual_card_id = '';
                    if(typeof result != 'undefined' && result != ''){
                        var shopper_res = result;
                        sh_first_name = shopper_res.billing_details.first_name;
                        sh_last_name = shopper_res.billing_details.last_name;                        
                        sh_address1 = shopper_res.billing_details.street;
                        sh_city = shopper_res.billing_details.city;
                        sh_state = shopper_res.billing_details.state;
                        sh_zipcode = shopper_res.billing_details.zipcode;
                        trans_amount = shopper_res.transaction_amount;
                        checkout_amount = shopper_res.checkout_amount;
                        
                        //IF CARD ALREADY EXISTS FOR USER
                        if(card_exists == "1"){
                            var order_req = {
                                "Amount": checkout_amount
                            };

                            request.post({
                                headers: {'content-type' : 'application/json','Authorization':'token '+vcard_token},
                                url: api_url+"/Card/Fund/"+vcard_account_id,
                                body: JSON.stringify(order_req)
                            },function(error, response, body){
                                console.log("VCARD FUNDING");
                                console.log(error);
                                console.log(response.statusCode);
                                console.log("/VCARD FUNDING");

                                if(error){
                                    return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                }                    
                                if(response.statusCode == '200'){
                                    var card_resp = JSON.parse(body);
                                    //console.log(card_resp);
                                    var availableBalance = card_resp.AvailableBalance;
                                    dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"status": "processed"}}, function (err2, result2) {
                                        dbo.collection("vcard").findOne({"shopper_id": new ObjectId(shopper_id)}, function (crderr, crdresult) {
                                            if (typeof crdresult != 'undefined' && crdresult != null && crdresult != "") {
                                                crdresult.crdno = decrypt(crdresult.crdno);
                                                crdresult.expdt = decrypt(crdresult.expdt);
                                                crdresult.cvv = decrypt(crdresult.cvv);
                                            }
                                            
                                            var dataarray = {"billing": {"billing_details":shopper_res.billing_details,"shopper_data":{"email": shopper_res.email,"phone_number":shopper_res.phone_number}},"pymt":crdresult,"availableBalance":availableBalance};
                                            return res.send({msg:"success_existing",dataarray:dataarray});
                                        });
                                    });
                                } else if(response.statusCode == '403'){
									var pexErrMsg = JSON.parse(body).Message;
									if(pexErrMsg.indexOf("Insufficient funds on business") >= 0){
										pexErrMsg = "Insufficient funds in PEX business account. Contact Admin for more details!";
									}
                                    return res.send({msg:"error",txt:pexErrMsg});
                                } else {
                                    return res.send({msg:"error",txt:JSON.parse(body).Message});
                                }
                            });
                        } else {
                            dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)}, function (err, result2) {
                                if(err){
                                    return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                }
                                if(typeof result2 != 'undefined' && result2 != ''){
                                    sh_email = result2.email;
                                    sh_phone = result2.phone_number;
                                    sh_dob = result2.dob;
                                    sh_dob = sh_dob.toString().replace("/","-").replace("/","-");

                                    sh_phone = sh_phone.replace("(","");
                                    sh_phone = sh_phone.replace(")","");
                                    sh_phone = sh_phone.replace("-","");
                                    sh_phone = sh_phone.replace(" ","");

                                    if(transaction_sandbox == 'true'){
                                        checkout_amount = 0;
                                    }
                                    /**Virtual Card Creation by API**/
                                    var order_req = {
                                        "VirtualCards": [
                                          {
                                            "FirstName": sh_first_name,
                                            "LastName": sh_last_name,
                                            "DateOfBirth": sh_dob,
                                            "Phone": sh_phone,
                                            "Email": sh_email,
                                            "ProfileAddress": {
                                              "AddressLine1": sh_address1,
                                              "AddressLine2": "",
                                              "City": sh_city,
                                              "State": sh_state,
                                              "PostalCode": sh_zipcode,
                                              "Country": "US"
                                            },
                                            //"GroupId": 0,
                                            //"RulesetId": 0,
                                            "AutoActivation": true,
                                            "FundCardAmount": checkout_amount,
                                            "CardDataWebhookURL": vcard_datahook_url+"?trans_id="+trans_id+'&shopper_id='+shopper_id
                                          }
                                        ]
                                    };

                                    request.post({
                                        headers: {'content-type' : 'application/json','Authorization':'token '+vcard_token},
                                        url: api_url+"/VirtualCard/Order",
                                        body: JSON.stringify(order_req)
                                    },function(error, response, body){
                                        console.log("VCARD CREATION");
                                        console.log(error);
                                        console.log(response.statusCode);
                                        console.log("/VCARD CREATION");

                                        if(error){
                                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                        }
                                        if(response.statusCode == '200'){
                                            var card_resp = JSON.parse(body);
                                            virtual_card_id = card_resp.VirtualCardOrderId;
                                            dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"virtual_card_id": virtual_card_id}}, function (err, result) {
                                                return res.send({msg: "success"});
                                            });
                                        } else if(response.statusCode == '403'){
                                            if(transaction_sandbox == 'true'){
                                                virtual_card_id = '13232';

                                                var sample_hook_req = {
                                                    "CallbackTime": "2017-12-27T05:35:52.4142456-05:00",
                                                    "Data": {
                                                        "AccountId": 12343,
                                                        "AccountNumber": "10000000353902",
                                                        "FirstName": sh_first_name,
                                                        "LastName": sh_last_name,
                                                        "CardNumber": "4111111111111111",
                                                        "ExpirationDate": "2022-12-31T00:00:00",
                                                        "CVV2": "123",
                                                        "Status": "ACTIVE",
                                                        "Balance": 0.0,
                                                        "VirtualCardOrderId": 13232,
                                                        "OrderDateTime": "2017-12-27T05:35:25.847",
                                                        "Errors": [],
                                                        "Message": "Account Creation Successful"
                                                    }
                                                };

                                                request.post({
                                                    headers: {'content-type' : 'application/json'},
                                                    url: vcard_datahook_url+"?trans_id="+trans_id+'&shopper_id='+shopper_id,
                                                    body: JSON.stringify(sample_hook_req)
                                                }, function(error, response, body){
                                                    dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"virtual_card_id": virtual_card_id}}, function (err, result) {
                                                        return res.send({msg: "success"});
                                                    });
                                                });

                                            } else {
                                                return res.send({msg:"error",txt:JSON.parse(body).Message});
                                            }
                                        } else {
                                            return res.send({msg:"error",txt:JSON.parse(body).Message});
                                        }
                                    });

                                } else {
                                    return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                }
                            });
                        }
                    } else {
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    }
                });
            }
        ]);
    }
    /** PEX CARD CREATE **/
    
    /** PEX CARD CHECK AVAILABILITY **/
    if(action == "check_virtual_card"){
        var shopper_id = req.body.logged_user_id;
        var trans_id = req.body.trans_id;
        
        var request = require('request');
        var async = require('async');
        var sh_first_name = '',sh_last_name = '',sh_email='',sh_phone='',sh_address1 = '',sh_city = '',sh_state = '',sh_zipcode = '',platform_name = '';
        var paydet = '';        
        
        var availableBalance = 0;
        var vcard_username = '',vcard_password = '',vcard_encoded_upass = '',vcard_token = '',vcard_account_id = '',settings_tbl_id = '';
        async.waterfall([
            function(next) {
                dbo.collection("vcard").findOne({"shopper_id": new ObjectId(shopper_id)}, function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        if(result.crdno != '' && result.expdt != ''){
                            result.crdno = decrypt(result.crdno);
                            result.expdt = decrypt(result.expdt);
                            result.cvv = decrypt(result.cvv);
                            vcard_account_id = result.account_id;
                            
                            paydet = result;
                            next(null);
                        } else {
                            return res.send({msg:"failed"});
                        }
                    } else {
                        return res.send({msg:"failed"});
                    }
                });
            }, function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        resulteach = result[0];
                        settings_tbl_id = resulteach._id;
                        vcard_username = resulteach.vcard_username;
                        vcard_password = resulteach.vcard_password;
                        vcard_encoded_upass = resulteach.vcard_encoded_upass;

                        vcard_token = resulteach.vcard_token;
                        api_url = resulteach.vcard_api_url;
                        next(null);
                    } else {
                        return res.send({msg:"failed"});
                    }
                });
            }, function(next) {
                if(vcard_token != '' && vcard_token != null){
                    /**Token Details by API**/
                    request.get({
                        headers: {'content-type' : 'application/json', 'Authorization' : 'token '+vcard_token},
                        url: api_url+"/Token"
                    },function(error, response, body){
                        if(error){
                            return res.send({msg:"failed"});
                        }
                        if(response.statusCode == '403' || response.statusCode == '401'){
                            /**New Token Generation by API**/
                            var auth_req = {
                                "Username": vcard_username,
                                "Password": vcard_password
                            };
                            var username_pass_encoded = vcard_encoded_upass;
                            request.post({
                                headers: {'content-type' : 'application/json', 'Authorization' : 'basic '+username_pass_encoded},
                                url: api_url+"/Token",
                                body: JSON.stringify(auth_req)
                            },function(error, response, body){
                                if(error){
                                    return res.send({msg:"failed"});
                                } else {
                                    vcard_token = JSON.parse(body).Token;
                                    console.log("NEW TOKEN");
                                    console.log(vcard_token);
                                    console.log("/NEW TOKEN");
                                    dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                        next(null);
                                    });
                                }
                            });
                        } else if(response.statusCode == '200'){
                            next(null); //Token Not Expired
                        } else {
                            return res.send({msg:"failed"});
                        }
                    });
                } else {
                    /**New Token Generation by API**/
                    var auth_req = {
                        "Username": vcard_username,
                        "Password": vcard_password
                    };
                    var username_pass_encoded = vcard_encoded_upass;
                    request.post({
                        headers: {'content-type' : 'application/json', 'Authorization' : 'basic '+username_pass_encoded},
                        url: api_url+"/Token",
                        body: JSON.stringify(auth_req)
                    },function(error, response, body){
                        if(error){
                            return res.send({msg:"failed"});
                        } else {
                            if(response.statusCode == '201'){
                                vcard_token = JSON.parse(body).Token;
                                dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                    next(null);
                                });
                            } else {
                                return res.send({msg:"failed"});
                            }
                        }
                    });
                }
            }, function(next) {
                request.get({
                    headers: {'content-type' : 'application/json','Authorization':'token '+vcard_token},
                    url: api_url+"/Details/AccountDetails/"+vcard_account_id
                },function(error, response, body){
                    if(response.statusCode == "200"){
                        var accres = JSON.parse(body);
                        availableBalance = accres.AvailableBalance;
                    }
                    next(null);
                });
            },function(next) {
                var condition = {_id: new ObjectId(trans_id)};
                dbo.collection("transaction").aggregate([{$lookup: {from: "users", localField: "shopper_id", foreignField: "_id", as: "shopper_data"}}, {$match: condition}]).toArray(function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        result = result[0];
                        var dataarray = {"billing":result,"pymt":paydet,"availableBalance": availableBalance};
                        return res.send({msg:"success",dataarray:dataarray});
                    } else {
                        //return res.send({msg:"failed"});
                        dbo.collection("transaction").findOne({"_id": new ObjectId(trans_id)}, function (err3, result3) {
                            var dataarray = {"billing": {"billing_details":result3.billing_details,"shopper_data":{"email": result3.email,"phone_number":result3.phone_number}},"pymt":paydet,"availableBalance": availableBalance};
                            return res.send({msg:"success",dataarray:dataarray});
                        });
                    }
                });
            }
        ]);
    }
    /** PEX CARD CHECK AVAILABILITY **/
    
    /** PEX CARD CHECK USER BALANCE **/
    if(action == "check_user_balance"){
        var shopper_id = req.body.logged_user_id;
        
        var request = require('request');
        var async = require('async');
        
        var availableBalance = 0;
        var vcard_username = '',vcard_password = '',vcard_encoded_upass = '',vcard_token = '',vcard_account_id = '',settings_tbl_id = '';
        async.waterfall([
            function(next) {
                dbo.collection("vcard").findOne({"shopper_id": new ObjectId(shopper_id)}, function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        if(result.account_id != ''){
                            vcard_account_id = result.account_id;
                            next(null);
                        } else {
                            return res.send({msg:"failed"});
                        }
                    } else {
                        return res.send({msg:"nocard"});
                    }
                });
            }, function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        resulteach = result[0];
                        settings_tbl_id = resulteach._id;
                        vcard_username = resulteach.vcard_username;
                        vcard_password = resulteach.vcard_password;
                        vcard_encoded_upass = resulteach.vcard_encoded_upass;

                        vcard_token = resulteach.vcard_token;
                        api_url = resulteach.vcard_api_url;
                        next(null);
                    } else {
                        return res.send({msg:"failed"});
                    }
                });
            }, function(next) {
                if(vcard_token != '' && vcard_token != null){
                    /**Token Details by API**/
                    request.get({
                        headers: {'content-type' : 'application/json', 'Authorization' : 'token '+vcard_token},
                        url: api_url+"/Token"
                    },function(error, response, body){
                        if(error){
                            return res.send({msg:"failed"});
                        }
                        if(response.statusCode == '403' || response.statusCode == '401'){
                            /**New Token Generation by API**/
                            var auth_req = {
                                "Username": vcard_username,
                                "Password": vcard_password
                            };
                            var username_pass_encoded = vcard_encoded_upass;
                            request.post({
                                headers: {'content-type' : 'application/json', 'Authorization' : 'basic '+username_pass_encoded},
                                url: api_url+"/Token",
                                body: JSON.stringify(auth_req)
                            },function(error, response, body){
                                if(error){
                                    return res.send({msg:"failed"});
                                } else {
                                    vcard_token = JSON.parse(body).Token;
                                    console.log("NEW TOKEN");
                                    console.log(vcard_token);
                                    console.log("/NEW TOKEN");
                                    dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                        next(null);
                                    });
                                }
                            });
                        } else if(response.statusCode == '200'){
                            next(null); //Token Not Expired
                        } else {
                            return res.send({msg:"failed"});
                        }
                    });
                } else {
                    /**New Token Generation by API**/
                    var auth_req = {
                        "Username": vcard_username,
                        "Password": vcard_password
                    };
                    var username_pass_encoded = vcard_encoded_upass;
                    request.post({
                        headers: {'content-type' : 'application/json', 'Authorization' : 'basic '+username_pass_encoded},
                        url: api_url+"/Token",
                        body: JSON.stringify(auth_req)
                    },function(error, response, body){
                        if(error){
                            return res.send({msg:"failed"});
                        } else {
                            if(response.statusCode == '201'){
                                vcard_token = JSON.parse(body).Token;
                                dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                    next(null);
                                });
                            } else {
                                return res.send({msg:"failed"});
                            }
                        }
                    });
                }
            }, function(next) {
                request.get({
                    headers: {'content-type' : 'application/json','Authorization':'token '+vcard_token},
                    url: api_url+"/Details/AccountDetails/"+vcard_account_id
                },function(error, response, body){
                    if(response.statusCode == "200"){
                        var accres = JSON.parse(body);
                        availableBalance = accres.AvailableBalance;
                        return res.send({msg:"success","availableBalance": availableBalance});
                    } else {
                        return res.send({msg:"failed"});
                    }
                });
            }
        ]);
    }
    /** PEX CARD CHECK USER BALANCE **/
    
    /** PEX CARD RECEIVE FROM SOMIWORKS **/
    if(action == "receive_virtual_card"){
        if(typeof req.body.Data != 'undefined' && req.body.Data != ''){
            var trans_id = req.body.trans_id;
            var shopper_id = req.body.shopper_id;
            var key_rmt = req.body.ky;
            var iv_rmt = req.body.iv;
            
            var account_id = req.body.Data.AccountId;
            var account_number = req.body.Data.AccountNumber;
            
            var first_name = req.body.Data.FirstName;
            var last_name = req.body.Data.LastName;
            var crdno = req.body.Data.CardNumber;
            if(crdno != ''){
                crdno = decrypt_remote(crdno,key_rmt,iv_rmt,algorithm);
            }
            var expdt = req.body.Data.ExpirationDate;
            if(expdt != ''){
                expdt = decrypt_remote(expdt,key_rmt,iv_rmt,algorithm);
            }
            var cvv = req.body.Data.CVV2;
            if(cvv != ''){
                cvv = decrypt_remote(cvv,key_rmt,iv_rmt,algorithm);
            }
            var status = req.body.Data.Status;
            var order_time = req.body.Data.OrderDateTime;
            
            var vcard_order_no = req.body.Data.VirtualCardOrderId;
            vcard_order_no = vcard_order_no.toString();
            
            var balance = req.body.Data.Balance;
            
            crdno = encrypt(crdno);
            expdt = encrypt(expdt);
            cvv = encrypt(cvv);
            
            var request = require('request');
            var async = require('async');
            var nodemailer = require('nodemailer');
            var mg = require('nodemailer-mailgun-transport');
            var sblue = require('nodemailer-sendinblue-transport');
            var ejs = require("ejs");
            var name = '', email = '';
            
            async.waterfall([
                function (next) {
                    dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)}, function (err, result) {
                         if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                             name = result.first_name+" "+result.last_name;
                             email = result.email;
                         }
                         next(null);
                    });
                }, function(next) {
                    dbo.collection("vcard").findOne({"shopper_id" : new ObjectId(shopper_id)}, function (err, result) {
                        if(err){
                            return res.send();
                        } else {
                            if (typeof result != 'undefined' && result != null && result != ""){
                                return res.send();
                            } else {
                                dbo.collection("vcard").insertOne({"shopper_id": new ObjectId(shopper_id), "account_id": account_id, "account_number": account_number, "first_name": first_name, "last_name": last_name, "crdno": crdno, "expdt": expdt, "cvv": cvv, "status": status, "vcard_order_no": vcard_order_no, "order_time": order_time}, function (err, result) {
                                    next(null);
                                });
                            }
                        }
                    });
                }, function(next) {
                    if(email != ''){
                        if(process.env.MAIL_PROVIDER == 'SENDINBLUE'){
                            var transporter = nodemailer.createTransport(sblue({
                                apiKey: process.env.SBLUE_APIKEY,
                                apiUrl: process.env.SBLUE_DOMAIN
                            }));
                        } else {
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
                            name: name,
                        }
                        var email_content = ejs.renderFile('views/emails/card_ready.ejs',pass_template);
                        email_content.then(function (result_content) {
                            var options = {
                                from: {name: process.env.SITE_NAME, address: process.env.ADMIN_EMAIL},
                                to: email,
                                subject: 'Crypto Credit Card - '+process.env.SITE_NAME,
                                html: result_content,
                                text: '',
                                'o:tracking': 'no','o:tracking-clicks': 'no','o:tracking-opens': 'no'
                            };
                            transporter.sendMail(options, function (error, info) {
                                if (error) {
                                    return res.send();
                                }
                                else {
                                    return res.send();
                                }
                            });
                        });
                    } else {
                        return res.send();
                    }
                }
            ]);
        } else {
            return res.send();
        }
    }
    /** PEX CARD RECEIVE FROM SOMIWORKS **/
    
    /** CHECK CRYPTO CREDIT CARD AVAILABLE FOR USER **/
    if(action == "check_crypto_card"){
        var shopper_id = req.body.logged_user_id;
        var request = require('request');
        var async = require('async');
        if(typeof shopper_id != 'undefined' && shopper_id != '' && shopper_id != null){
            async.waterfall([
                function(next) {
                    dbo.collection("vcard").findOne({"shopper_id": new ObjectId(shopper_id)}, function (err, result) {
                        if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                            if(result.crdno != '' && result.expdt != ''){
                                return res.send({msg:"available"});
                            } else {
                                dbo.collection("vcard").deleteOne({"shopper_id": new ObjectId(shopper_id)});
                                return res.send({msg:"nocard"});
                            }
                        } else {
                            return res.send({msg:"nocard"});
                        }
                    });
                }
            ]);
        } else {
            return res.send({msg:"nouser"});
        }
    }
    /** CHECK CRYPTO CREDIT CARD AVAILABLE FOR USER **/
    
    /** LOAD CRYPTO CREDIT CARD **/
    if(action == "load_crypto_card"){
        var shopper_id = req.body.logged_user_id;
        var request = require('request');
        var async = require('async');
        var sh_first_name = '',sh_last_name = '',sh_email='',sh_phone='',sh_address1 = '',sh_city = '',sh_state = '',sh_zipcode = '',platform_name = '';
        var paydet = '';
        var availableBalance = 0;
        var vcard_username = '',vcard_password = '',vcard_encoded_upass = '',vcard_token = '',vcard_account_id = '',settings_tbl_id = '';
        async.waterfall([
            function(next) {
                dbo.collection("vcard").findOne({"shopper_id": new ObjectId(shopper_id)}, function (err, result) {
                    if(err){
                        return res.send({msg:"failed",txt:"Error in loading your Crypto Credit Card."});
                    }
                    if (typeof result != 'undefined' && result != null && result != "") {
                        result.crdno = decrypt(result.crdno);
                        result.expdt = decrypt(result.expdt);
                        result.cvv = decrypt(result.cvv);
                        vcard_account_id = result.account_id;
                        
                        paydet = result;
                        next(null);
                    } else {
                        return res.send({msg:"failed",txt:"No Crypto Credit Card available for your account."});
                    }
                });
            }, function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if(typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        resulteach = result[0];
                        settings_tbl_id = resulteach._id;
                        vcard_username = resulteach.vcard_username;
                        vcard_password = resulteach.vcard_password;
                        vcard_encoded_upass = resulteach.vcard_encoded_upass;

                        vcard_token = resulteach.vcard_token;
                        api_url = resulteach.vcard_api_url;
                        next(null);
                    } else {
                        return res.send({msg:"failed",txt:"Error in loading your Crypto Credit Card."});
                    }
                });
            }, function(next) {
                if(vcard_token != '' && vcard_token != null){
                    /**Token Details by API**/
                    request.get({
                        headers: {'content-type' : 'application/json', 'Authorization' : 'token '+vcard_token},
                        url: api_url+"/Token"
                    },function(error, response, body){
                        if(error){
                            return res.send({msg:"failed",txt:"Error in loading your Crypto Credit Card."});
                        }
                        if(response.statusCode == '403' || response.statusCode == '401'){
                            /**New Token Generation by API**/
                            var auth_req = {
                                "Username": vcard_username,
                                "Password": vcard_password
                            };
                            var username_pass_encoded = vcard_encoded_upass;
                            request.post({
                                headers: {'content-type' : 'application/json', 'Authorization' : 'basic '+username_pass_encoded},
                                url: api_url+"/Token",
                                body: JSON.stringify(auth_req)
                            },function(error, response, body){
                                if(error){
                                    return res.send({msg:"failed",txt:"Error in loading your Crypto Credit Card."});
                                } else {
                                    vcard_token = JSON.parse(body).Token;
                                    console.log("NEW TOKEN");
                                    console.log(vcard_token);
                                    console.log("/NEW TOKEN");
                                    dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                        next(null);
                                    });
                                }
                            });
                        } else if(response.statusCode == '200'){
                            next(null); //Token Not Expired
                        } else {
                            return res.send({msg:"failed",txt:"Error in loading your Crypto Credit Card."});
                        }
                    });
                } else {
                    /**New Token Generation by API**/
                    var auth_req = {
                        "Username": vcard_username,
                        "Password": vcard_password
                    };
                    var username_pass_encoded = vcard_encoded_upass;
                    request.post({
                        headers: {'content-type' : 'application/json', 'Authorization' : 'basic '+username_pass_encoded},
                        url: api_url+"/Token",
                        body: JSON.stringify(auth_req)
                    },function(error, response, body){
                        if(error){
                            return res.send({msg:"failed",txt:"Error in loading your Crypto Credit Card."});
                        } else {
                            if(response.statusCode == '201'){
                                vcard_token = JSON.parse(body).Token;
                                dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                    next(null);
                                });
                            } else {
                                return res.send({msg:"failed",txt:"Error in loading your Crypto Credit Card."});
                            }
                        }
                    });
                }
            }, function(next) {
                request.get({
                    headers: {'content-type' : 'application/json','Authorization':'token '+vcard_token},
                    url: api_url+"/Details/AccountDetails/"+vcard_account_id
                },function(error, response, body){
                    if(response.statusCode == "200"){
                        var accres = JSON.parse(body);
                        availableBalance = accres.AvailableBalance;
                    }
                    next(null);
                });
            }, function(next) {
                dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)}, function (err3, result3) {
                    if (typeof result3 != 'undefined' && result3 != null && result3 != "" && (err3 == null || err3 == "")) {
                        var dataarray = {"billing": {"billing_details":{"first_name": result3.first_name,"last_name": result3.last_name,"street": result3.address,"city": result3.city,"state": result3.state,"zipcode": result3.zipcode},"shopper_data":{"email": result3.email,"phone_number":result3.phone_number}},"pymt":paydet,"availableBalance":availableBalance};
                        return res.send({msg:"success",dataarray:dataarray});
                    } else {
                        return res.send({msg:"failed",txt:"Error in loading your Crypto Credit Card."});
                    }
                });
            }
        ]);
    }
    /** LOAD CRYPTO CREDIT CARD **/
    
    /** CHECK COMPLETED CRON **/
    if(action == "check_completed_cron"){
        var transaction_status = '';
        
        var request = require('request');
        var api_url = '';
        var aliantpay_api_token = '';
        var sale_status = '';
        var completed_transactions = [];
        
        var token = '';
        var vcard_username = '',vcard_password = '',vcard_encoded_upass = '',vcard_token = '',vcard_datahook_url = '',vcard_account_id = '',settings_tbl_id = '';
        
        function aliantPayCall(result, index){
            var res = result[index];
            var bitcoin_sale_id = res.bitcoin_sale_id;
            request.get({
                headers: {'content-type' : 'application/json','Authorization': 'Bearer '+aliantpay_api_token},
                url: "https://aliantpay.io/api/v2/Invoices/"+bitcoin_sale_id
            },function(error, resp, body){
                index++;
                ret_data = JSON.parse(body);
                if(typeof ret_data.id != 'undefined'){
                    sale_status = ret_data.status;
                    if(typeof sale_status != 'undefined') {
                        sale_status = sale_status.toString();
                        sale_status = sale_status.toLowerCase();
                    }
                    if(typeof sale_status != 'undefined' && (sale_status == 'completed' || sale_status == 'complete')){
                        completed_transactions.push(res._id);
                    }
                }
                if(index < result.length){
                    aliantPayCall(result, index);
                } else {
                    transStatusChange();
                }
            });
        }
        function transStatusChange(){
            //console.log(completed_transactions);
            if(completed_transactions.length > 0){
                dbo.collection("transaction").updateMany(
                    { _id: { $in: completed_transactions } },
                    { $set: { "status" : "processed" } },
                    { multi: true }, function(err, result){
                        createCardCron(completed_transactions,0);
                    });
            } else {
                return res.send({msg:"completed"});
            }
        }
        function createCardCron(completed_transactions, index){
            var trans_id = completed_transactions[index];
            var shopper_id = '';
            var card_exists = '', vcard_tbl_id = '', vcard_account_id = '';
            var name = '', email = '';
            var sh_first_name = '',sh_last_name = '',sh_dob = '',sh_email = '',sh_phone = '',sh_address1 = '',sh_city = '',sh_state = '',sh_zipcode = '',trans_amount = 0,checkout_amount = 0,virtual_card_id = '';
            async.waterfall([
                function(next) {
                    var condition = {_id: new ObjectId(trans_id)};
                    dbo.collection("transaction").findOne({"_id": new ObjectId(trans_id)}, function (err, result) {
                        if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                            var shopper_res = result;
                            shopper_id = shopper_res.shopper_id;
                            sh_first_name = shopper_res.billing_details.first_name;
                            sh_last_name = shopper_res.billing_details.last_name;
                            sh_address1 = shopper_res.billing_details.street;
                            sh_city = shopper_res.billing_details.city;
                            sh_state = shopper_res.billing_details.state;
                            sh_zipcode = shopper_res.billing_details.zipcode;
                            trans_amount = shopper_res.transaction_amount;
                            checkout_amount = shopper_res.checkout_amount;
                            next(null);
                        } else {
                            index++;
                            if(index < completed_transactions.length){
                                createCardCron(completed_transactions, index);
                            } else {
                                finishCron();
                            }
                        }
                    });
                },function (next) {
                    dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)}, function (err, result) {
                         if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                             name = result.first_name+" "+result.last_name;
                             email = result.email;
                         }
                         next(null);
                    });
                }, function(next) {
                    dbo.collection("vcard").findOne({"shopper_id": new ObjectId(shopper_id)}, function (err, result) {
                        if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                            if(result.crdno != '' && result.expdt != ''){
                                card_exists = '1';
                                vcard_tbl_id = result._id.toString();
                                vcard_account_id = result.account_id;
                                next(null);
                            } else {
                                dbo.collection("vcard").deleteOne({"shopper_id": new ObjectId(shopper_id)});
                                next(null);
                            }
                        } else {
                            next(null);
                        }
                    });
                } ,function(next) {
                    //IF CARD ALREADY EXISTS FOR USER
                    if(card_exists == "1"){
                        var order_req = {
                            "Amount": checkout_amount
                        };

                        request.post({
                            headers: {'content-type' : 'application/json','Authorization':'token '+vcard_token},
                            url: api_url+"/Card/Fund/"+vcard_account_id,
                            body: JSON.stringify(order_req)
                        },function(error, response, body){
                            console.log("VCARD FUNDING");
                            console.log(error);
                            console.log(response.statusCode);
                            console.log("/VCARD FUNDING");

                            if(error){
                                index++;
                                if(index < completed_transactions.length){
                                    createCardCron(completed_transactions, index);
                                } else {
                                    finishCron();
                                }
                            }                    
                            if(response.statusCode == '200'){
                                var card_resp = JSON.parse(body);
                                //console.log(card_resp);
                                dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"status": "processed"}}, function (err2, result2) {
                                    
                                    /* EMAIL SENDING FOR FUND CARD PROCESS */
                                    if(email != ''){
                                        if(process.env.MAIL_PROVIDER == 'SENDINBLUE'){
                                            var transporter = nodemailer.createTransport(sblue({
                                                apiKey: process.env.SBLUE_APIKEY,
                                                apiUrl: process.env.SBLUE_DOMAIN
                                            }));
                                        } else {
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
                                            name: name,
                                        }
                                        var email_content = ejs.renderFile('views/emails/card_ready.ejs',pass_template);
                                        email_content.then(function (result_content) {
                                            var options = {
                                                from: {name: process.env.SITE_NAME, address: process.env.ADMIN_EMAIL},
                                                to: email,
                                                subject: 'Crypto Credit Card - '+process.env.SITE_NAME,
                                                html: result_content,
                                                text: '',
                                                'o:tracking': 'no','o:tracking-clicks': 'no','o:tracking-opens': 'no'
                                            };
                                            transporter.sendMail(options, function (error, info) {
                                                index++;
                                                if(index < completed_transactions.length){
                                                    createCardCron(completed_transactions, index);
                                                } else {
                                                    finishCron();
                                                }
                                            });
                                        });
                                    } else {
                                        index++;
                                        if(index < completed_transactions.length){
                                            createCardCron(completed_transactions, index);
                                        } else {
                                            finishCron();
                                        }
                                    }
                                    /* EMAIL SENDING FOR FUND CARD PROCESS */
                                });
                            } else {
                                index++;
                                if(index < completed_transactions.length){
                                    createCardCron(completed_transactions, index);
                                } else {
                                    finishCron();
                                }
                            }
                        });
                    } else {
                        dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)}, function (err, result2) {
                            if(typeof result2 != 'undefined' && result2 != '' && (err == null || err == '')){
                                sh_email = result2.email;
                                sh_phone = result2.phone_number;
                                sh_dob = result2.dob;
                                sh_dob = sh_dob.toString().replace("/","-").replace("/","-");

                                sh_phone = sh_phone.replace("(","");
                                sh_phone = sh_phone.replace(")","");
                                sh_phone = sh_phone.replace("-","");
                                sh_phone = sh_phone.replace(" ","");

                                /**Virtual Card Creation by API**/
                                var order_req = {
                                    "VirtualCards": [
                                      {
                                        "FirstName": sh_first_name,
                                        "LastName": sh_last_name,
                                        "DateOfBirth": sh_dob,
                                        "Phone": sh_phone,
                                        "Email": sh_email,
                                        "ProfileAddress": {
                                          "AddressLine1": sh_address1,
                                          "AddressLine2": "",
                                          "City": sh_city,
                                          "State": sh_state,
                                          "PostalCode": sh_zipcode,
                                          "Country": "US"
                                        },
                                        "AutoActivation": true,
                                        "FundCardAmount": checkout_amount,
                                        "CardDataWebhookURL": vcard_datahook_url+"?trans_id="+trans_id+'&shopper_id='+shopper_id
                                      }
                                    ]
                                };

                                request.post({
                                    headers: {'content-type' : 'application/json','Authorization':'token '+vcard_token},
                                    url: api_url+"/VirtualCard/Order",
                                    body: JSON.stringify(order_req)
                                },function(error, response, body){
                                    console.log("VCARD CREATION");
                                    console.log(error);
                                    console.log(response.statusCode);
                                    console.log("/VCARD CREATION");

                                    if(error){
                                        index++;
                                        if(index < completed_transactions.length){
                                            createCardCron(completed_transactions, index);
                                        } else {
                                            finishCron();
                                        }
                                    }
                                    if(response.statusCode == '200'){
                                        var card_resp = JSON.parse(body);
                                        virtual_card_id = card_resp.VirtualCardOrderId;
                                        dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"virtual_card_id": virtual_card_id}}, function (err, result) {
                                            index++;
                                            if(index < completed_transactions.length){
                                                createCardCron(completed_transactions, index);
                                            } else {
                                                finishCron();
                                            }
                                        });
                                    } else {
                                        index++;
                                        if(index < completed_transactions.length){
                                            createCardCron(completed_transactions, index);
                                        } else {
                                            finishCron();
                                        }
                                    }
                                });
                            } else {
                                index++;
                                if(index < completed_transactions.length){
                                    createCardCron(completed_transactions, index);
                                } else {
                                    finishCron();
                                }
                            }
                        });
                    }
                }
            ]);
        }
        
        function finishCron(){
            return res.send({msg:"completed"});
        }
        
        async.waterfall([
            function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error"});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            aliantpay_api_token = resulteach.aliantpay_api_token;
                            
                            settings_tbl_id = resulteach._id;
                            vcard_username = resulteach.vcard_username;
                            vcard_password = resulteach.vcard_password;
                            vcard_encoded_upass = resulteach.vcard_encoded_upass;
                            
                            vcard_token = resulteach.vcard_token;
                            api_url = resulteach.vcard_api_url;
                            vcard_datahook_url = resulteach.vcard_datahook_url;
                            next(null);
                        } else {
                            return res.send({msg:"error"});
                        }
                    }
                });
            }, function(next) {
                    if(vcard_token != '' && vcard_token != null){
                        /**Token Details by API**/
                        request.get({
                            headers: {'content-type' : 'application/json', 'Authorization' : 'token '+vcard_token},
                            url: api_url+"/Token"
                        },function(error, response, body){
                            if(error){
                                return res.send({msg:"error"});
                            }
                            if(response.statusCode == '403' || response.statusCode == '401'){
                                /**New Token Generation by API**/
                                var auth_req = {
                                    "Username": vcard_username,
                                    "Password": vcard_password
                                };
                                var username_pass_encoded = vcard_encoded_upass;
                                request.post({
                                    headers: {'content-type' : 'application/json', 'Authorization' : 'basic '+username_pass_encoded},
                                    url: api_url+"/Token",
                                    body: JSON.stringify(auth_req)
                                },function(error, response, body){
                                    if(error){
                                        return res.send({msg:"error"});
                                    } else {
                                        vcard_token = JSON.parse(body).Token;
                                        console.log("NEW TOKEN");
                                        console.log(vcard_token);
                                        console.log("/NEW TOKEN");
                                        dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                            next(null);
                                        });
                                    }
                                });
                            } else if(response.statusCode == '200'){
                                next(null); //Token Not Expired
                            } else {
                                return res.send({msg:"error"});
                            }
                        });
                    } else {
                        /**New Token Generation by API**/
                        var auth_req = {
                            "Username": vcard_username,
                            "Password": vcard_password
                        };
                        var username_pass_encoded = vcard_encoded_upass;
                        request.post({
                            headers: {'content-type' : 'application/json', 'Authorization' : 'basic '+username_pass_encoded},
                            url: api_url+"/Token",
                            body: JSON.stringify(auth_req)
                        },function(error, response, body){
                            if(error){
                                return res.send({msg:"error"});
                            } else {
                                if(response.statusCode == '201'){
                                    vcard_token = JSON.parse(body).Token;
                                    dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                        next(null);
                                    });
                                } else {
                                    return res.send({msg:"error"});
                                }
                            }
                        });
                    }
                },function(next) {
                var condition = {$and: [{ bitcoin_sale_id: { $ne: null }},{status: "payment_pending"} ]};
                dbo.collection("transaction").find(condition).toArray(function (err, result) {
                    if(typeof result != "undefined" && result != null){
                        aliantPayCall(result, 0);
                    } else {
                        return res.send({msg:"error"});
                    }
                });
            }
        ]);
    }
    /** CHECK COMPLETED CRON **/
    
    /** GET COINBASE EXCHANGE RATE **/
    if(action == 'get_exchange_rate'){
        var coin_type = "USD";
        var Client = require('coinbase').Client;
        var checkout_amount = req.body.checkout_amount;
        checkout_amount = checkout_amount * 1.10;
        crypto_coin_type = req.body.coin_type;
        crypto_coin_name = req.body.coin_name;
        
        async.waterfall([
            function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        resulteach = result[0];
                        coinbase_api_key = resulteach.coinbase_api_key;
                        coinbase_api_secret = resulteach.coinbase_api_secret;
                        client_obj = new Client({'apiKey': coinbase_api_key,'apiSecret': coinbase_api_secret, strictSSL: false});
                        
                        client_obj.getExchangeRates({'currency': coin_type}, function(err, rates) {
                            if(err){
                                console.log(err);
                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                            }
                            if(rates == '' || rates == null){
                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                            } else if(typeof rates.data.rates[crypto_coin_type] != 'undefined' && rates.data.rates[crypto_coin_type] != ''){
                                var coin_rate = rates.data.rates[crypto_coin_type];
                                var final_amount = (coin_rate * checkout_amount);
                                
                                var exchangeContent = '<div>'+crypto_coin_name+' to Pay: <span style="font-size: 20px;font-weight: bold;display: block;">'+coin_rate+'</span></div>';
                                
                                return res.send({msg: "success",rate: coin_rate, final_amount: final_amount, exchangeContent: exchangeContent});
                            } else {
                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                            }
                        });
                    } else {
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    }
                });
            }
        ]);
    }
    /** GET COINBASE EXCHANGE RATE **/
    
    /** GET ALL CRYPTO COINS **/
    if(action == 'get_all_cryptocoins'){
        async.waterfall([
            function(next) {
                dbo.collection("bitcoin_address").find({}).toArray(function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        /*var dropDown = '<div class="cus-select"><select name="coin_type" id="coin_type" style="width:250px;" required><option value="">Select Coin Type</option>';
                        result.forEach(function (rescoin, resmsg) {
                            if(rescoin.active == "1"){
                                dropDown += '<option value="'+rescoin.code+'">'+rescoin.name+'</option>';
                            }
                        });
                        dropDown += '</select></div>';*/
						var dropDown = '', count = 0, firstCode = '';
						result.forEach(function (rescoin, resmsg) {
							var code = rescoin.code;
							if(count == 0){
								firstCode = code;
							}
							if(rescoin.active == "1"){
                                dropDown += '<div id="'+code+'" class="coinlst mr-2 mb-3 '+(count == 0 ? "active" : "")+'"><img src="'+process.env.SERVER_URL+'/images/cryptocurrency/'+code+'.png"></div>';
                            }
							count++;
                        });
						dropDown += '<input type="hidden" name="coin_type" id="coin_type" value="'+firstCode+'"/>';
                        return res.send({msg:"success",dropDown: dropDown});
                    } else {
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    }
                });
            }
        ]);
    }
    /** GET ALL CRYPTO COINS **/    
    
    /** CHECK CARD BALANCE WITH CHECKOUT AMOUNT **/
    if(action == 'check_card_balance'){
        
        var shopper_id = req.body.logged_user_id;
        var pay_value = req.body.pay_value;
        var request = require('request');
        var async = require('async');
        var token = '';
        var vcard_username = '',vcard_password = '',vcard_encoded_upass = '',vcard_token = '',vcard_datahook_url = '',vcard_account_id = '', api_url = '',settings_tbl_id = '';
        
        var transaction_sandbox = '';
        var card_exists = '', vcard_tbl_id = '', availableBalance = 0;
        async.waterfall([
            function(next) {
                dbo.collection("vcard").findOne({"shopper_id": new ObjectId(shopper_id)}, function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        if(result.crdno != '' && result.expdt != ''){
                            vcard_account_id = result.account_id;
                            next(null);
                        } else {
                            dbo.collection("vcard").deleteOne({"shopper_id": new ObjectId(shopper_id)});
                            return res.send({msg:"nocard"});
                        }
                    } else {
                        return res.send({msg:"nocard"});
                    }
                });
            }, function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            settings_tbl_id = resulteach._id;
                            vcard_username = resulteach.vcard_username;
                            vcard_password = resulteach.vcard_password;
                            vcard_encoded_upass = resulteach.vcard_encoded_upass;
                            
                            vcard_token = resulteach.vcard_token;
                            api_url = resulteach.vcard_api_url;
                            vcard_datahook_url = resulteach.vcard_datahook_url;
                            transaction_sandbox = resulteach.transaction_sandbox;
                            next(null);
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    }
                });
            },function(next) {
                if(vcard_token != '' && vcard_token != null){
                    /**Token Details by API**/
                    request.get({
                        headers: {'content-type' : 'application/json', 'Authorization' : 'token '+vcard_token},
                        url: api_url+"/Token"
                    },function(error, response, body){
                        if(error){
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                        //console.log("TOKEN CHECK");
                        //console.log(response.statusCode);
                        //console.log("/TOKEN CHECK");
                        if(response.statusCode == '403' || response.statusCode == '401'){
                            /**New Token Generation by API**/
                            var auth_req = {
                                "Username": vcard_username,
                                "Password": vcard_password
                            };
                            var username_pass_encoded = vcard_encoded_upass;
                            request.post({
                                headers: {'content-type' : 'application/json', 'Authorization' : 'basic '+username_pass_encoded},
                                url: api_url+"/Token",
                                body: JSON.stringify(auth_req)
                            },function(error, response, body){
                                if(error){
                                    return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                                } else {
                                    vcard_token = JSON.parse(body).Token;
                                    //console.log("NEW TOKEN");
                                    //console.log(vcard_token);
                                    //console.log("/NEW TOKEN");
                                    dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                        next(null);
                                    });
                                }
                            });
                        } else if(response.statusCode == '200'){
                            next(null); //Token Not Expired
                        } else {
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        }
                    });
                } else {
                    /**New Token Generation by API**/
                    var auth_req = {
                        "Username": vcard_username,
                        "Password": vcard_password
                    };
                    var username_pass_encoded = vcard_encoded_upass;
                    request.post({
                        headers: {'content-type' : 'application/json', 'Authorization' : 'basic '+username_pass_encoded},
                        url: api_url+"/Token",
                        body: JSON.stringify(auth_req)
                    },function(error, response, body){
                        if(error){
                            return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                        } else {
                            console.log(response.statusCode);
                            console.log(response.statusMessage);
                            if(response.statusCode == '201'){
                                vcard_token = JSON.parse(body).Token;
                                dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                    next(null);
                                });
                            } else {
                                return res.send({msg:"error",txt:'Error in processing.  Try again later'});
                            }
                        }
                    });
                }
            }, function(next){
                request.get({
                    headers: {'content-type' : 'application/json','Authorization':'token '+vcard_token},
                    url: api_url+"/Details/AccountDetails/"+vcard_account_id
                },function(error, response, body){
                    if(response.statusCode == "200"){
                        var accres = JSON.parse(body);
                        availableBalance = accres.AvailableBalance;
                        pay_value = parseFloat(pay_value).toFixed(2);
                        //console.log(availableBalance);
                        //console.log(pay_value);
                        if(pay_value > availableBalance){
                            return res.send({msg:"reconvert"});
                        } else {
                            return res.send({msg:"continue"});
                        }
                    } else {
                        return res.send({msg:"nocard"});
                    }
                });
            }
        ]);
    }
    /** CHECK CARD BALANCE WITH CHECKOUT AMOUNT **/

    /** GET USER TRANSACTIONS **/
    if(action == "get_user_transactions"){
        var shopper_id = req.body.logged_user_id;
        var condition = {shopper_id: ObjectId(shopper_id),status:"processed"};

        dbo.collection("transaction").find(condition, {"sort": ['_id', 'desc']}).skip(0).limit(5).toArray(function (err, result) {
            var send_contents = '';
            if (!err){
                if(result.length > 0){
                    send_contents += '<table>';
                    result.forEach(function (index, res) {
                        send_contents += '<tr><td style="width:10%;"><span class="transaction_circle">'+index.platform[0]+'</span><!--<img src="images/ebay.png"/>--></td>'+
                        '<td style="font-size: 12px;width: 70%;text-align: left;" class="bold_font lineafter">'+index.platform+'</td>'+
                        '<td style="font-size: 12px;width: 20%" class="bold_font">$'+index.checkout_amount+'</td>'+
                        '</tr>';
                    });
                    send_contents += '</table><a class="viewallpurchase">View all purchases</a>';
                } else {
                    send_contents = '<div style="font-size:14px;padding: 20px;" class="italic">No Transactions Found</div>';
                }
            } else {
                send_contents = '<div style="font-size:14px;padding: 20px;" class="italic">No Transactions Found</div>';
            }
            res.send({content: send_contents});
        });
    }
	if(action == "custom_check"){
		var coinbase_oauth_client_id = '';
        var coinbase_oauth_client_secret = '';
        var coinbase_api_url = '';
        
        var coinbase_access_token = '';
        var coinbase_refresh_token = '';
        var coinbase_account_id = '';
		
		var transaction_currency = 'BTC';// (BTC or ETH or ..)
		var shopper_id = '5dc1a93697ac771845af564c';
		
		var request = require('request');
		
        async.waterfall([
			function(next) {
				// Get Client ID Client Secret & API URL
				dbo.collection("site_settings").find({}).toArray(function (err, result) {
					if (err){
						return res.send({msg:"error",txt:'Error in processing.  Try again later'});
					} else {
						if(typeof result != "undefined" && result != null){
							resulteach = result[0];
							coinbase_oauth_client_id  = resulteach.coinbase_oauth_client_id;
							coinbase_oauth_client_secret  = resulteach.coinbase_oauth_client_secret;
							coinbase_api_url = resulteach.coinbase_api_url;
							next(null);
						} else {
							return res.send({msg:"error",txt:'Error in processing.  Try again later'});
						}
					}
				});
			},function(next) {
				// Get Users Access Token and Refresh Token and Coinbase Account ID
				dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)}, function (err, result) {
					if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
						coinbase_access_token  = result.coinbase_access_token;
						coinbase_refresh_token  = result.coinbase_refresh_token;
						next(null);
					} else {
						return res.send({msg:"error",txt:'Error in processing.  Try again later'});
					}
				});
			},function(next) {
				// Get All Accounts for fetching apt account for sending.
				var Client = require('coinbase').Client;
				var client = new Client({'accessToken': coinbase_access_token, 'refreshToken': coinbase_refresh_token,proxy: process.env.PROXY,strictSSL: false});

				client.getAccounts({limit: 50}, function(err, accounts, pagination) {
					//console.log(pagination);
					if(err != null){
						//console.log(err.statusCode);
						//console.log(err.message);
						if(err.statusCode == "401"){
							console.log("INSIDE Access Token Renew Process");
							// Access Token Renew Process
							var auth_req = {
								"grant_type": "refresh_token",
								"refresh_token": coinbase_refresh_token,
								"client_id": coinbase_oauth_client_id,
								"client_secret": coinbase_oauth_client_secret
							};
							request.post({
								headers: {'content-type' : 'application/json'},
								url: coinbase_api_url+"/oauth/token",
								body: JSON.stringify(auth_req)
							},function(error, response, body){
								if (error){
									return res.send({msg:"error",txt:'Error in processing.  Try again later'});
								} else {
									var body = JSON.parse(body);
									if(typeof body != "undefined" && body != null && typeof body.access_token != "undefined" && body.access_token != null && body.access_token != ''){
										coinbase_access_token = body.access_token;
										coinbase_refresh_token = body.refresh_token;                                        
										dbo.collection("users").updateOne({"_id": new ObjectId(shopper_id)}, {$set: {"coinbase_access_token": body.access_token,"coinbase_refresh_token": body.refresh_token}}, function (err, resultupdate) {

											client = new Client({'accessToken': coinbase_access_token, 'refreshToken': coinbase_refresh_token,proxy: process.env.PROXY, strictSSL: false});
											client.getAccounts({limit: 50}, function(err, accounts, pagination) {
												//console.log(pagination);
												all_account_obj = accounts;
												next(null);
											});

										});
									} else {
										return res.send({msg:"error",txt:'Error in processing.  Try again later'});
									}
								}
							});
						} else {
							return res.send({msg:"error",txt:'Error in processing.  Try again later'});
						}
					} else {
						all_account_obj = accounts;
						next(null);
					}
				});
			}, function(next) {
				/** GET SUITABLE WALLET ACCOUNT ID BY CURRENCY CODE **/
				if(all_account_obj != null && all_account_obj != ''){
					//console.log(all_account_obj);
					all_account_obj.forEach(function(acct) {
						if(acct.currency.code == transaction_currency){
							coinbase_account_id = acct.id;
						}
					});
					if(coinbase_account_id != ''){
						console.log("COINBASE ACCOUNT ID FOR "+transaction_currency+" is "+coinbase_account_id);
						next(null);
					} else {
						console.log("NO SUITABLE WALLET ACCOUNT FOUND FOR COIN TYPE");
						return res.send({msg:"error",txt:'Error in processing.  Try again later'});
					}
				} else {
					return res.send({msg:"error",txt:'Error in processing.  Try again later'});
				}
			}, function(next) {
				// Get Account Object by Account ID for Sending Money.
				var Client = require('coinbase').Client;
				var client = new Client({'accessToken': coinbase_access_token, 'refreshToken': coinbase_refresh_token,proxy: process.env.PROXY,strictSSL: false});

				client.getAccount(coinbase_account_id, function(err, account) {
					if(err != null){
						console.log(err.statusCode);
						console.log(err.message);
						if(err.statusCode == "401"){
							console.log("INSIDE Access Token Renew Process");
							// Access Token Renew Process
							var auth_req = {
								"grant_type": "refresh_token",
								"refresh_token": coinbase_refresh_token,
								"client_id": coinbase_oauth_client_id,
								"client_secret": coinbase_oauth_client_secret
							};
							request.post({
								headers: {'content-type' : 'application/json'},
								url: coinbase_api_url+"/oauth/token",
								body: JSON.stringify(auth_req)
							},function(error, response, body){
								if (error){
									return res.send({msg:"error",txt:'Error in processing.  Try again later'});
								} else {
									var body = JSON.parse(body);
									if(typeof body != "undefined" && body != null && typeof body.access_token != "undefined" && body.access_token != null && body.access_token != ''){
										coinbase_access_token = body.access_token;
										coinbase_refresh_token = body.refresh_token;                                        
										dbo.collection("users").updateOne({"_id": new ObjectId(shopper_id)}, {$set: {"coinbase_access_token": body.access_token,"coinbase_refresh_token": body.refresh_token}}, function (err, resultupdate) {

											client = new Client({'accessToken': coinbase_access_token, 'refreshToken': coinbase_refresh_token,proxy: process.env.PROXY, strictSSL: false});
											client.getAccount(coinbase_account_id, function(err, account) {
												account_obj = account;
												next(null);
											});

										});
									} else {
										return res.send({msg:"error",txt:'Error in processing.  Try again later'});
									}
								}
							});
						} else {
							return res.send({msg:"error",txt:'Error in processing.  Try again later'});
						}
					} else {
						account_obj = account;
						next(null);
					}
				});
			},function(next) {
				console.log("ACCOUNT OBJECT OF THE PAYER");
				console.log(account_obj);
				return res.send({msg:"error",txt:"This transaction has been canceled. There have been no charges. In order to make a purchase, click \"Pay Now!\" again."});
			}
		]);
    }
}