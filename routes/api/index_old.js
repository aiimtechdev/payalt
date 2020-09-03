exports = module.exports = function (req, res, next) {
    var locals = res.locals;
    
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
        //console.log(iv+"__"+key+"__"+encryptedText);
        let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        //console.log(decrypted.toString());
        return decrypted.toString();
    }

    function decrypt_remote(encryptedText,key,iv,algorithm) {
        let decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText,"hex","binary");
        decrypted += decipher.final('binary');
        return decrypted.toString();
    }

    function getAutomationData(result,paydet,tab_url){
        sh_first_name = result.billing_details.first_name;
        sh_last_name = result.billing_details.last_name;
        sh_address1 = result.billing_details.street;
        sh_city = result.billing_details.city;
        sh_state = result.billing_details.state;
        sh_zipcode = result.billing_details.zipcode;
        if(result.shopper_data.length == 0 || typeof result.shopper_data[0] == "undefined"){} else {
            sh_email = result.shopper_data[0].email;
            sh_phone = result.shopper_data[0].phone_number;
            sh_phone = sh_phone.replace("(","");
            sh_phone = sh_phone.replace(")","");
            sh_phone = sh_phone.replace(" ","");
            sh_phone = sh_phone.replace("-","");
        }
        var datetime = paydet.expdt;
        var datetm = new Date(datetime);
        var ccMonth = datetm.getMonth() + 1;
        var ccYear = datetm.getFullYear().toString();
        var platfrm_name = result.platform.toString().toLowerCase();
        var retarray = '';
        
        
        var ProfileData = {
            "ContactDetails.Emails.Email.Address":sh_email,
            "ContactDetails.CellPhones.CellPhone.Number":sh_phone,
            "PersonalDetails.FirstName":sh_first_name,
            "PersonalDetails.LastName":sh_last_name,
            
            "AddressDetails.PostalAddress.AddressLine1":sh_address1,
            "AddressDetails.PostalAddress.Country":"United States",
            "AddressDetails.PostalAddress.PostalCode":sh_zipcode,
            "AddressDetails.PostalAddress.Suburb":sh_city,
            "AddressDetails.PostalAddress.StreetName": sh_address1,
            "AddressDetails.PostalAddress.AdministrativeArea": sh_state,
            
            "AddressDetails.BillingAddress.AddressLine1":sh_address1,
            "AddressDetails.BillingAddress.Country":"United States",
            "AddressDetails.BillingAddress.PostalCode":sh_zipcode,
            "AddressDetails.BillingAddress.Suburb":sh_city,
            "AddressDetails.BillingAddress.StreetName": sh_address1,
            "AddressDetails.BillingAddress.AdministrativeArea":sh_state,
            
            "CreditCards.CreditCard.CCV":paydet.cvv,
            "CreditCards.CreditCard.Expiry.Month":ccMonth,
            "CreditCards.CreditCard.Expiry.Year":ccYear,
            "CreditCards.CreditCard.NameOnCard":paydet.first_name+" "+paydet.last_name,
            "CreditCards.CreditCard.Number":paydet.crdno
        };
            
        /*if(platfrm_name == 'amazon'){
            retarray = {"platform_name":platfrm_name,"tab_url":tab_url, "billing":{"#enterAddressFullName":sh_first_name+" "+sh_last_name, "#enterAddressAddressLine1":sh_address1, "#enterAddressCity":sh_city,
                "#enterAddressStateOrRegion":sh_state, "#enterAddressPostalCode":sh_zipcode,"#enterAddressPhoneNumber":sh_phone},
                "pymt":{"#ccName":paydet.first_name+" "+paydet.last_name, "#ccMonth":ccMonth, "#ccYear":ccYear, "#addCreditCardNumber":paydet.crdno}
            };
        } else if(platfrm_name == 'ebay'){
            retarray = {"platform_name":platfrm_name,"tab_url":tab_url, "billing":{"#firstName":sh_first_name,"#lastName":sh_last_name, "#addressLine1":sh_address1, "#city":sh_city,
                "#stateOrProvince":sh_state, "#postalCode":sh_zipcode,"#email":sh_email,"#emailConfirm":sh_email,"#phoneNumber":sh_phone},
                "pymt":{"#cardHolderFirstName":paydet.first_name, "#cardHolderLastName":paydet.last_name, "#cardExpiryDate":ccMonth+"/"+ccYear, "#securityCode": paydet.cvv,"#cardNumber":paydet.crdno}
            };
        } else if(platfrm_name == 'bestbuy'){
            retarray = {"platform_name":platfrm_name,"tab_url":tab_url,"billing":{"first_name":sh_first_name,"last_name":sh_last_name, "address":sh_address1, "city":sh_city,
                "state":sh_state, "zipcode":sh_zipcode,"email":sh_email,"phone":sh_phone},
                "pymt":{"first_name":paydet.first_name, "last_name":paydet.last_name, "exp_month":ccMonth,"exp_year":ccYear, "cvv": paydet.cvv,"crdno":paydet.crdno}
            };
        } else if(platfrm_name == 'walmart'){
            retarray = {"platform_name":platfrm_name,"tab_url":tab_url,"billing":{"first_name":sh_first_name,"last_name":sh_last_name, "address":sh_address1, "city":sh_city,
                "state":sh_state, "zipcode":sh_zipcode,"email":sh_email,"phone":sh_phone},
                "pymt":{"first_name":paydet.first_name, "last_name":paydet.last_name, "exp_month":ccMonth,"exp_year":ccYear, "cvv": paydet.cvv,"crdno":paydet.crdno}
            };
        } else if(platfrm_name == 'kohls'){
            retarray = {"platform_name":platfrm_name,"tab_url":tab_url,"billing":{"first_name":sh_first_name,"last_name":sh_last_name, "address":sh_address1, "city":sh_city,
                "state":sh_state, "zipcode":sh_zipcode,"email":sh_email,"phone":sh_phone},
                "pymt":{"first_name":paydet.first_name, "last_name":paydet.last_name, "exp_month":ccMonth,"exp_year":ccYear, "cvv": paydet.cvv,"crdno":paydet.crdno}
            };
        }*/
        
        retarray = {"platform_name":platfrm_name,"tab_url":tab_url, "ProfileData":ProfileData};
        return retarray;
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
//        dbo.collection("transaction").find(condition).toArray(function (err, result) {
        dbo.collection("transaction").aggregate([{$lookup: {from: "users", localField: "shopper_id", foreignField: "_id", as: "shopper_data"}}, {$match: condition}, { $limit : 10 }]).toArray(function (err, result) {
            if (err)
                throw err;
            var count = 0, shopper_user_name_field, shopper_email_field, shopper_phone_field, platform_value, currency_value;
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
                        "<tr><td><b>Date Time: </b></td><td>" + (date_now.getMonth() + 1) + "/" + date_now.getDate() + "/" + date_now.getFullYear() + " " + date_now.getHours() + ":" + date_now.getMinutes() + ":" + date_now.getSeconds() + "</td></tr>" +
                        "<tr><td><b>Platform Purchase: </b></td><td>" + platform_value + "</td></tr>" +
                        "<tr><td><b>Transaction ID: </b></td><td> " + index.bitcoin_sale_id + " </td></tr>" +
                        "<tr><td><b>Payment Platform: </b></td><td> " + index.payment_platform + " </td></tr>" +
                            "<tr><td><b>Transaction amount: </b></td><td> $" + Number( parseFloat(index.transaction_amount).toFixed(2) ).toLocaleString() + "</td></tr>" +
                            "<tr><td><b>Transaction Status: </b></td><td style='text-transform:capitalize;'>" + status_value + "</td></tr>";
                        /*if (logged_user_type != "shopper")
                        {
                            send_content += "<tr><td><b>Assigned Virtual Assistant: </b></td><td> " + virtual_user_name_field + " </td></tr>";
                        }*/
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
                        /*send_contents += "<td class='user_type_td' data-title='User type: '>";
                            if(index.user_type == 'va'){
                                send_contents += "VA";
                            } else {
                                send_contents += index.user_type;
                            }
                        send_contents += "</td>";*/
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
//                console.log(send_contents);
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
                    //index.screenshot_link = '<a class="img_fancybox" rel="group" href="'+index.screenshot_link+'"><div style="background-image:url('+index.screenshot_link+');background-repeat:no-repeat;background-size:contain;height: 100px;background-position: center center;"></div></a>';
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
						
                        //send_contents += "<td data-title='Screenshot Page: '>" + index.screenshot_link + "</td>";
                /*if(logged_user_type!='shopper')
                {
                    if (index.virtual_assistant_id.length == 0) {
                        va_name = '-';
                    }
                    else
                    {
                        va_name = index.virtual_assistant_id[0].first_name + " " + index.virtual_assistant_id[0].last_name;
                    }
                    send_contents += "<td data-title='Virtual Assistant User: '>" + va_name + "</td>";
                }*/
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
                    }/* else {
                        send_contents += "<td data-title='Date Time:'>";
                    }*/
                    
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
                    if(page_type == "pending"){
                        /*if(typeof index.virtual_assistant_trans != 'undefined'){
                            send_contents += '<a href="javascript:void(0);" class="alert alert-success processing_payment" id="'+index._id+'"><i class="fa fa-spinner fa-spin"></i> In Process</a>';
                        } else {
                            send_contents += '<a href="javascript:void(0);" class="alert alert-warning process_payment" id="'+index._id+'"><i class="fa fa-gears"></i> Process</a>';
                        }*/
                    }
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
        //console.log(req.query.id_value);
        //console.log(id_values.length);
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
                //console.log(password);
                //console.log(result.password);
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
    /*if(action == 'get_exchange_rate'){
        var coin_type = req.body.coin_type;
        var Client = require('coinbase').Client;
        var client = new Client({'apiKey': process.env.COINBASE_API_KEY, 'apiSecret': process.env.COINBASE_API_SECRET,'strictSSL': false,proxy: process.env.PROXY});
        client.getExchangeRates({'currency': coin_type}, function(err, rates) {
            if(err){
                return res.send({msg:"error"});
            }
            if(rates == '' || rates == null){
                return res.send({msg:"error"});
            } else if(typeof rates.data.rates.USD != 'undefined' && rates.data.rates.USD != ''){
                return res.send({msg: "success",rate: rates.data.rates.USD});
            } else {
                return res.send({msg:"error"});
            }
        });
    }*/
    if(action == 'save_browser_session'){
        var session_data = req.body.session_data;
        var logged_user_id = req.body.logged_user_id;
        var transaction_id = req.body.transaction_id;
        var tab_url = req.body.tab_url;
        
        var ObjectId = require('mongodb').ObjectId;
        dbo.collection("cookies_page").insertOne({"shopper_id": new ObjectId(logged_user_id),"transaction_id": new ObjectId(transaction_id) ,"session_data" : session_data,"tab_url" : tab_url,"status" : "open"} , function(err,inserted_id) {
            return res.send();
        });
    }
    if(action == 'get_browser_session_single'){
        var logged_user_id = req.body.logged_user_id;
        var ObjectId = require('mongodb').ObjectId;
        var session_data = '';
        dbo.collection("virtual_assistant_transaction").findOne({"va_id": new ObjectId(logged_user_id)}, function (err, result) {
            if(err){
                return res.send({"msg": "error"});
            } else {
                if (typeof result != 'undefined' && result != null && result != "" && result.transaction_id != '' && result.transaction_id != null) {
                    var trans_id = result.transaction_id;
                    dbo.collection("cookies_page").findOne({"transaction_id": new ObjectId(trans_id)} , function(err2, result2) {                        
                        if (typeof result2 != 'undefined' && result2 != null && result2 != "" && (err2 == null || err2 == "")) {
                            session_data = result2.session_data;
                            
                            dbo.collection("transaction").findOne({"_id": new ObjectId(trans_id)}, function (err3, result3) {
                                return res.send({"msg": "success","session_data" : session_data,"checkout_details": result3,"tab_url" : result2.tab_url,"trans_id": trans_id});
                            });                            
                        } else {
                            return res.send({"msg": "error"});
                        }
                    });
                } else {
                    return res.send({"msg": "notrans"});
                }
            }
        });
    }
    if(action == 'get_browser_session'){
        var logged_user_id = req.body.logged_user_id;
        var ObjectId = require('mongodb').ObjectId;
        var session_data = '';
        dbo.collection("virtual_assistant_transaction").findOne({"va_id": new ObjectId(logged_user_id)}, function (err, result) {
            if(err){
                return res.send({"msg": "error"});
            } else {
                if (typeof result != 'undefined' && result != null && result != "" && result.transaction_id != '' && result.transaction_id != null) {
                    var trans_id = result.transaction_id;
                    dbo.collection("cookies_page").findOne({"shopper_id" : new ObjectId(logged_user_id),"transaction_id": new ObjectId(trans_id)} , function(err2, result2) {
                        if (typeof result2 != 'undefined' && result2 != null && result2 != "" && (err2 == null || err2 == "")) {
                            session_data = result2.session_data;
                            
                            dbo.collection("transaction").findOne({"_id": new ObjectId(trans_id)}, function (err3, result3) {
                                return res.send({"msg": "success","session_data" : session_data,"billing_details": result3,"tab_url" : result2.tab_url,"trans_id": trans_id});
                            });                            
                        } else {
                            return res.send({"msg": "error"});
                        }
                    });
                } else {
                    return res.send({"msg": "notrans"});
                }
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
    if(action == 'create_transaction'){
        //console.log("INSIDE HERE TRANS");
        //return;
        var ObjectId = require('mongodb').ObjectId;
        
        //var cloudinary = require('cloudinary');
        
        var shopper_id = req.body.shopper_id;
        var currency_selected= req.body.currency_selected;
        var billing_amount= req.body.billing_amount;
        var billing_first_name= req.body.billing_first_name;
        var billing_last_name= req.body.billing_last_name;
        var billing_street= req.body.billing_street;
        var billing_city= req.body.billing_city;
        var billing_state= req.body.billing_state;
        var billing_zipcode= req.body.billing_zipcode;
        var date_today= req.body.date_today;
        
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
        
        /*var cloudinary_name = '';
        var cloudinary_key = '';
        var cloudinary_secret = '';*/
        
        var trans_id = '';
        async.waterfall([
            /*function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        next(null);
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            cloudinary_name = resulteach.cloudinary_name;
                            cloudinary_key = resulteach.cloudinary_key;
                            cloudinary_secret = resulteach.cloudinary_secret;
                            cloudinary.config({
                                cloud_name: cloudinary_name,
                                api_key: cloudinary_key,
                                api_secret: cloudinary_secret
                            });
                            next(null);
                        } else {
                            next(null);
                        }
                    }
                });
            },*/function(next) {
                dbo.collection("transaction").insertOne({ shopper_id: new ObjectId(shopper_id), va_id: "", date: date_today, platform: platform_name, currency: currency_selected, 
                    status: "recent", transaction_amount: billing_amount,screenshot_link: "",billing_details: {first_name : billing_first_name, last_name : billing_last_name, street: billing_street, city: billing_city, state: billing_state,
                    zipcode: billing_zipcode} },
                function(err,inserted_id){
                    if(inserted_id.insertedId != '' && !err){
                        trans_id = inserted_id.insertedId;
                        next(null);
                    } else {
                        res.send("error");return;
                    }
                });
            },function(next) {
                dbo.collection("cookies_page").insertOne({"shopper_id": new ObjectId(shopper_id),"transaction_id": new ObjectId(trans_id) ,"session_data" : session_data,"tab_url" : tab_url,"status" : "open"} , function(err,inserted_id) {
                    if(inserted_id.insertedId != '' && !err){
                        pagelog_id = inserted_id.insertedId;
                        
                        /*var ProxyAgent = require('proxy-agent');
                        var proxyUri = process.env.PROXY;
                        
                        cloudinary.v2.uploader.upload(img, {
                            overwrite: true,
                            invalidate: true,
                            agent: new ProxyAgent(proxyUri)
                        },function (error, result) {
                            if(!error){
                                var img_url = result.secure_url;
                                dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {screenshot_link: img_url}}, function (err, result) {
                                    next(null);
                                });
                            } else {
                                next(null);
                            }
                        });*/
						next(null);
                    } else {
                        dbo.collection("transaction").deleteOne({"_id": new ObjectId(trans_id)});
                        res.send("error");return;
                    }
                });
            },function(next) {
                next(null);
                /*//console.log("INSIDE HERE 5");
                var dbo = dbConn.getDb();
                dbo.collection("users").find({user_type : "va"}).toArray(function (err, result) {
                    if (err){
                        //swal("","Error in sending notification to VA's.","error");
                        next(null);
                    }

                    var environment = process.env.ENVIRONMENT;
                    if(environment == 'sandbox'){
                        next(null);
                    } else {
                        const accountSid = process.env.TWILIO_SID;
                        const authToken = process.env.TWILIO_TOKEN;
                        const twilio_client = require('twilio')(accountSid, authToken);

                        var total_va = result.length;
                        var va_inc = 0;
                        if(typeof result != "undefined" && result != null){
                            result.forEach(function(resulteach, index) {
                                //console.log(resulteach);
                                if(typeof resulteach.phone_number != 'undefined' && resulteach.phone_number != '' && resulteach.phone_number != null){
                                    var va_id = resulteach._id;
                                    phone = resulteach.phone_number;
                                    phone = phone.replace("(","");
                                    phone = phone.replace(")","");
                                    phone = phone.replace(" ","");

                                    var server_url = process.env.SERVER_URL;
                                    var site_name = process.env.SITE_NAME;

                                    process_link = server_url+"/process_order/"+va_id+"/"+trans_id;
                                    //console.log(process_link);
                                    var twilio_from = process.env.TWILIO_FROM;
                                    var twilio_countrycode = process.env.TWILIO_COUNTRYCODE;
                                    
                                    twilio_client.messages.create({
                                        body: 'New Order has been placed in '+site_name+'. Click the link to process it. '+process_link,
                                        from: twilio_from,
                                        to: twilio_countrycode+phone
                                    }).then((message)=>{
                                        va_inc++;
                                        if(va_inc == total_va){
                                            next(null);
                                        }
                                    }).catch((error)=>{
                                        va_inc++;
                                        if(va_inc == total_va){
                                            next(null);
                                        }
                                    });
                                }                                            
                            });
                        }
                    }
                });*/
            },function(next) {
                //console.log("INSIDE HERE 6");
                res.send("success");return;                
            }
        ]);
    }
    if(action == 'bitcoin_pay'){
        //console.log("INSIDE HERE TRANS");
        //return;
        var ObjectId = require('mongodb').ObjectId;
        
        /*var cloudinary = require('cloudinary');*/
        
        var shopper_id = req.body.shopper_id;
        var billing_amount= req.body.billing_amount;
        var checkout_amount= req.body.checkout_amount;
        var charge_amount= req.body.charge_amount;
        
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
        
        var request = require('request');
        var api_url = '';
        var invoice_url = '';
        var aliant_authorization = '';
        var bitcoin_sale_id = '';
        var trans_id = '';
        
        /*var cloudinary_name = '';
        var cloudinary_key = '';
        var cloudinary_secret = '';*/
        
        var aliantpay_sandbox = '';
        
        async.waterfall([
            function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            settings_tbl_id = resulteach._id;
                            api_url = resulteach.aliantpay_api_url;
                            invoice_url = resulteach.aliantpay_invoice_url;
                            aliant_authorization = resulteach.aliantpay_authorization;
                            aliantpay_sandbox = resulteach.aliantpay_sandbox;
                            
                            /*cloudinary_name = resulteach.cloudinary_name;
                            cloudinary_key = resulteach.cloudinary_key;
                            cloudinary_secret = resulteach.cloudinary_secret;
                            cloudinary.config({
                                cloud_name: cloudinary_name,
                                api_key: cloudinary_key,
                                api_secret: cloudinary_secret
                            });*/
                            
                            next(null);
                        } else {
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        }
                    }
                });
            },function(next) {
                dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)}, function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        billing_email = result.email;
                        billing_phone = result.phone_number;
                        next(null);
                    } else {
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    }
                });
            },function(next) {
                if(aliantpay_sandbox == 'true'){
                    bitcoin_sale_id = "12345678";
                    next(null);
                } else {
                    //New Sale Transaction by API
                    var sale_req = {
                        "amount": billing_amount,
                        "name": billing_first_name+' '+billing_last_name,
                        "email": billing_email,
                        "phone": billing_phone,
                        "address": billing_street,
                        "city": billing_city,
                        "state": billing_state,
                        "zipcode": billing_zipcode,
                        "email_it": false,
                        "sandbox": false
                    };

                    //console.log("SALE REQUEST");
                    //console.log(sale_req);

                    var auth_req = {
                        "authorization": aliant_authorization,
                        "json": JSON.stringify(sale_req)
                    };            
                    request.post({
                        headers: {'content-type' : 'application/json'},
                        url: api_url+"/NewSale",
                        body: JSON.stringify(auth_req)
                    },function(error, response, body){
                        if(error){
                            console.log("Error in Creating Sales Transaction\n");
                            console.log(error);
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        }
                        var ret_data = [];
                        if(body != ''){
                            console.log(body);
                            ret_data = JSON.parse(body);
                            if(typeof ret_data.d != 'undefined'){
                                var sale_data = JSON.parse(ret_data.d);
                                if(typeof sale_data.sale_id != 'undefined' && sale_data.sale_id != ''){
                                    bitcoin_sale_id = sale_data.sale_id;
                                    next(null);
                                } else {
                                    return res.send({msg:"error",txt:'Error in processing. Try again later'});
                                }
                            } else {
                                return res.send({msg:"error",txt:'Error in processing. Try again later'});
                            }
                        } else {
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        }
                    });
                }
            },function(next) {
                dbo.collection("transaction").insertOne({ shopper_id: new ObjectId(shopper_id), va_id: "", date: date_today, bitcoin_sale_id: bitcoin_sale_id,payment_platform:"Aliant Pay", platform: platform_name, currency: '', 
                    status: "pending_payment", checkout_amount: checkout_amount, charge_amount: charge_amount, transaction_amount: billing_amount,screenshot_link: "",billing_details: {first_name : billing_first_name, last_name : billing_last_name, street: billing_street, city: billing_city, state: billing_state,
                    zipcode: billing_zipcode} },
                function(err,inserted_id){
                    if(inserted_id.insertedId != '' && !err){
                        trans_id = inserted_id.insertedId;
                        next(null);
                    } else {
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    }
                });
            },function(next) {
                dbo.collection("cookies_page").insertOne({"shopper_id": new ObjectId(shopper_id),"transaction_id": new ObjectId(trans_id) ,"session_data" : session_data,"tab_url" : tab_url,"status" : "open"} , function(err,inserted_id) {
                    if(inserted_id.insertedId != '' && !err){
                        pagelog_id = inserted_id.insertedId;
                        
                        /*var ProxyAgent = require('proxy-agent');
                        var proxyUri = process.env.PROXY;
                        
                        cloudinary.v2.uploader.upload(img, {
                            overwrite: true,
                            invalidate: true,
                            agent: new ProxyAgent(proxyUri)
                        },function (error, result) {
                            if(!error){
                                var img_url = result.secure_url;
                                dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {screenshot_link: img_url}}, function (err, result) {
                                    next(null);
                                });
                            } else {
                                next(null);
                            }
                        });*/
                        next(null);
                    } else {
                        dbo.collection("transaction").deleteOne({"_id": new ObjectId(trans_id)});
                        var sale_req = {
                            "saleid": bitcoin_sale_id
                        };

                        var auth_req = {
                            "authorization": aliant_authorization,
                            "json": JSON.stringify(sale_req)
                        };
                        request.post({
                            headers: {'content-type' : 'application/json'},
                            url: api_url+"/CancelSale",
                            body: JSON.stringify(auth_req)
                        },function(error, response, body){
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        });                        
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
    if(action == "check_completed"){
        var bitcoin_sale_id = req.body.bitcoin_sale_id;
        var shopper_id = req.body.shopper_id;
        var transaction_id = req.body.trans_id;
        
        var transaction_sandbox = '';
        var aliantpay_sandbox = '';
        
        var request = require('request');
        var api_url = '';
        var aliant_authorization = '';
        
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
                            
                            transaction_sandbox = resulteach.transaction_sandbox;
                            next(null);
                        } else {
                            return res.send({msg:"error"});
                        }
                    }
                });
            },function(next) {
                if(aliantpay_sandbox == 'true'){
                    next(null);
                } else {
                    var auth_req = {
                        "authorization": aliant_authorization,
                        "transactionid": bitcoin_sale_id
                    };
                    request.post({
                        headers: {'content-type' : 'application/json'},
                        url: api_url+"/SeeSale",
                        body: JSON.stringify(auth_req)
                    },function(error, response, body){
                        if(error){
                            console.log("Error in reading Transaction\n");
                            console.log(error);
                            return res.send({msg:"error"});
                        }
                        ret_data = JSON.parse(body);
                        if(typeof ret_data.d != 'undefined'){
                            var sale_data = JSON.parse(ret_data.d);
                            if(typeof sale_data.error != "undefined"){
                                dbo.collection("transaction").updateOne({"_id": new ObjectId(transaction_id)}, {$set: {"status": "cancelled"}}, function (err, result) {
                                    return res.send({msg:"expired"});
                                });
                            } else if(typeof sale_data.status != 'undefined' && (sale_data.status == 'Completed' || sale_data.status == 'Settled' || sale_data.status == 'Finalized' || sale_data.status == 'Refunded')){
                                next(null);
                            } else if(typeof sale_data.status != 'undefined' && (sale_data.status == 'Pending' || sale_data.status == 'Confirmed')){ 
                                if(transaction_sandbox == 'true')
                                    next(null);
                                else
                                    return res.send({msg:"processing"});
                            } else if(typeof sale_data.status != 'undefined' && sale_data.status == 'Expired'){ 
                                dbo.collection("transaction").updateOne({"_id": new ObjectId(transaction_id)}, {$set: {"status": "cancelled"}}, function (err, result) {
                                    return res.send({msg:"expired"});
                                });
                            } else if(typeof sale_data.status != 'undefined' && sale_data.status == 'Cancelled'){
                                dbo.collection("transaction").updateOne({"_id": new ObjectId(transaction_id)}, {$set: {"status": "cancelled"}}, function (err, result) {
                                    return res.send({msg:"cancelled"});
                                });
                            } else {
                                if(transaction_sandbox == 'true')
                                    next(null);
                                else
                                    return res.send({msg:"continue"});
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
                /*dbo.collection("users").find({user_type : "va"}).toArray(function (err, result) {
                    if (err){
                        next(null);
                    }

                    var environment = process.env.ENVIRONMENT;
                    if(environment == 'sandbox'){
                        next(null);
                    } else {
                        const accountSid = process.env.TWILIO_SID;
                        const authToken = process.env.TWILIO_TOKEN;
                        const twilio_client = require('twilio')(accountSid, authToken);

                        var total_va = result.length;
                        var va_inc = 0;
                        if(typeof result != "undefined" && result != null){
                            result.forEach(function(resulteach, index) {
                                //console.log(resulteach);
                                if(typeof resulteach.phone_number != 'undefined' && resulteach.phone_number != '' && resulteach.phone_number != null){
                                    var va_id = resulteach._id;
                                    phone = resulteach.phone_number;
                                    phone = phone.replace("(","");
                                    phone = phone.replace(")","");
                                    phone = phone.replace(" ","");

                                    var server_url = process.env.SERVER_URL;
                                    var site_name = process.env.SITE_NAME;

                                    process_link = server_url+"/process_order/"+va_id+"/"+trans_id;
                                    //console.log(process_link);
                                    var twilio_from = process.env.TWILIO_FROM;
                                    var twilio_countrycode = process.env.TWILIO_COUNTRYCODE;
                                    
                                    twilio_client.messages.create({
                                        body: 'New Order has been placed in '+site_name+'. Click the link to process it. '+process_link,
                                        from: twilio_from,
                                        to: twilio_countrycode+phone
                                    }).then((message)=>{
                                        va_inc++;
                                        if(va_inc == total_va){
                                            next(null);
                                        }
                                    }).catch((error)=>{
                                        va_inc++;
                                        if(va_inc == total_va){
                                            next(null);
                                        }
                                    });
                                }                                            
                            });
                        }
                    }
                });*/
            }, function (next){
                return res.send({msg:"completed"});
            }
        ]);
    }
    if(action == "check_coinbase_completed"){
        var bitcoin_sale_id = req.body.bitcoin_sale_id;
        var transaction_id = req.body.trans_id;
        var shopper_id = req.body.shopper_id;
        
        var request = require('request');
        var coinbase_access_token = '';
        var coinbase_refresh_token = '';
        var coinbase_account_id = '';
        var coinbase_oauth_client_id = '';
        var coinbase_oauth_client_secret = '';
        var coinbase_api_url = '';
        var account_obj = '';
        
        var transaction_sandbox = '';
        
        async.waterfall([
            function(next) {
                // Get Client ID Client Secret & API URL
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            coinbase_oauth_client_id  = resulteach.coinbase_oauth_client_id;
                            coinbase_oauth_client_secret  = resulteach.coinbase_oauth_client_secret;
                            coinbase_api_url = resulteach.coinbase_api_url;
                            
                            transaction_sandbox = resulteach.transaction_sandbox;
                            
                            next(null);
                        } else {
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        }
                    }
                });
            },function(next) {
                dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)},function (err, result) {
                    if (err){
                        return res.send({msg:"error"});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            coinbase_access_token = result.coinbase_access_token;
                            coinbase_refresh_token = result.coinbase_refresh_token;
                            coinbase_account_id = result.coinbase_account_id;
                            next(null);
                        } else {
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        }
                    }
                });
            },function(next) {                
                var Client = require('coinbase').Client;
                var client = new Client({'accessToken': coinbase_access_token, 'refreshToken': coinbase_refresh_token,proxy: process.env.PROXY});

                client.getAccount(coinbase_account_id, function(err, account) {
                    console.log(err);
                    if(err != null){
                        if(err.statusCode == "401"){
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
                                    return res.send({msg:"error",txt:'Error in processing. Try again later'});
                                } else {
                                    var body = JSON.parse(body);
                                    console.log(body);
                                    if(typeof body != "undefined" && body != null && typeof body.access_token != "undefined" && body.access_token != null && body.access_token != ''){
                                        coinbase_access_token = body.access_token;
                                        coinbase_refresh_token = body.refresh_token;
                                        dbo.collection("users").updateOne({"_id": new ObjectId(shopper_id)}, {$set: {"coinbase_access_token": body.access_token,"coinbase_refresh_token": body.refresh_token}}, function (err, resultupdate) {
                                            
                                            client = new Client({'accessToken': coinbase_access_token, 'refreshToken': coinbase_refresh_token,proxy: process.env.PROXY});
                                            client.getAccount(coinbase_account_id, function(err, account) {
                                                account_obj = account;
                                                next(null);
                                            });
                                            
                                        });
                                    } else {
                                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                                    }
                                }
                            });
                        }  else {
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        }
                    } else {
                        account_obj = account;
                        next(null);
                    }
                });                
            },function(next) {
                if(account_obj != ''){
                    console.log(account_obj);
                    account_obj.getTransaction(bitcoin_sale_id, function(err, tx) {
                        console.log(err);
                        console.log(tx);
                        console.log("TRANSACTION SANDBOX "+transaction_sandbox);
                        if(err != ''){
                            if(transaction_sandbox == 'true'){
                                next(null);
                            } else {
                                return res.send({msg:"continue"});
                            }               
                        } else {
                            trans_status = tx.status;
                            if(trans_status == "completed"){
                                next(null);
                            } else if(trans_status == "failed" || trans_status == "expired" || trans_status == "canceled"){
                                dbo.collection("transaction").updateOne({"_id": new ObjectId(transaction_id)}, {$set: {status: "failed"}}, function (err, result) {
                                    return res.send({msg:trans_status});
                                });                                
                            } else {
                                return res.send({msg:"continue"});
                            }
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
    if(action == "check_checkout_page"){
        var tab_url = req.body.tab_url;
        var checkout_page = '';
        dbo.collection("checkout_page_keywords").find({}).toArray(function (err, result) {
            if (err){
                return res.send({checkout_page:checkout_page});
            } else {
                if(typeof result != "undefined" && result != null){
                    //console.log(result);
                    for(var tmp=0;tmp<result.length;tmp++){
                        var single_key = result[tmp].keyword;
                        var site_checkout = result[tmp].site;
                        //console.log(single_key+"__"+site_checkout);
                        if(tab_url.indexOf(single_key) !== -1 && tab_url.indexOf(site_checkout) !== -1){
                            checkout_page = '1';break;
                        }
                        
                    }                    
                }
                return res.send({checkout_page:checkout_page});
            }
        });        
    }    
    if(action == "scrap_amount_data"){
        var html_contents = req.body.html_contents;
        var cheerio = require("cheerio");
        const parse = cheerio.load(html_contents);
        var parse_body = parse("body").html();
        var purchaseTotal = '';
        
        var price_data = '';
        //console.log(html_contents);
                
        dbo.collection("pricing_rules").find({}).toArray(function (err, result) {
            if (err){
                return res.send({purchaseTotal:purchaseTotal});
            } else {
                if(typeof result != "undefined" && result != null){
                    var inc = 0;
                    var length = result.length;
                    var site_name = '';
                    //console.log(length);
                    //result.forEach(function(resulteach, index) {
                    for(var tmp=0;tmp<result.length;tmp++){
                        resulteach = result[tmp];
                        parse(resulteach.search_string).filter(function() {
                            eval(resulteach.search_coding);
                        });
                        inc++;
                        //console.log(resulteach.search_string+"__"+purchaseTotal);
                        site_name = resulteach.site_name;
                        if((purchaseTotal != '' && purchaseTotal != '0') || (inc >= length)){
                            break;
                        }
                    }
                    if((purchaseTotal != '' && purchaseTotal != '0') || (inc >= length)){
                        return res.send({platform: site_name,purchaseTotal:purchaseTotal});
                    }
                } else {
                    return res.send({purchaseTotal:purchaseTotal});
                }
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
                                    next(null);
                                } else {
                                    return res.send({"msg":"error"});
                                }
                            });
                        },
                        function(next) {
                            dbo.collection("virtual_assistant_transaction").updateOne({"va_id": new ObjectId(logged_user_id)}, {$set: {"transaction_id": ""}}, function (err, result) {
                                if(!err){
                                    next(null);
                                } else {
                                    return res.send({"msg":"error"});
                                }
                            });
                        },
                        function(next) {
                            dbo.collection("cookies_page").updateOne({"transaction_id": new ObjectId(transaction_id)}, {$set: {"status": "processed"}}, function (err, result) {
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
    if(action == "overwrite_process_trans"){
        var trans_id = req.query.trans_id;
        dbo.collection("virtual_assistant_transaction").updateOne({"va_id": new ObjectId(logged_user_id)}, {$set: {"transaction_id": new ObjectId(trans_id)}}, function (err, result) {
            if(!err){
                return res.send({"code":"success"});
            } else {
                return res.send({"code":"error"});
            }
        });
    }
    if(action == "process_trans"){
        var trans_id = req.query.trans_id;
        //console.log(req.query);
        //console.log(req.body);
        dbo.collection("virtual_assistant_transaction").findOne({"transaction_id": new ObjectId(trans_id),"va_id": new ObjectId(logged_user_id)}, function (err, result) {
            if(err){
                return res.send({"code":"error"});
            } else {
                if (typeof result != 'undefined' && result != null && result != "") {
                    return res.send({"code":"already_processing"});
                } else {
                    dbo.collection("virtual_assistant_transaction").findOne({"va_id": new ObjectId(logged_user_id)}, function (err1, result1) {
                        if(err1){
                            return res.send({"code":"error"});
                        } else {
                            if (typeof result1 != 'undefined' && result1 != null && result1 != "") {
                                //console.log(result1);
                                var existing_tbl_id = result1._id;
                                var existing_trans_id = result1.transaction_id;
                                //console.log(existing_trans_id);
                                if(existing_trans_id != ''){
                                    dbo.collection("transaction").findOne({"_id": new ObjectId(existing_trans_id)}, function (err2, result2) {
                                        //console.log(err2);
                                        //console.log(result2);
                                        if (typeof result2 != 'undefined' && result2 != null && result2 != "" && (err2 == null || err2 == "")) {
                                            var status = result2.status;
                                            if(status == "processed"){
                                                dbo.collection("virtual_assistant_transaction").updateOne({"_id": new ObjectId(existing_tbl_id)}, {$set: {"transaction_id": new ObjectId(trans_id)}}, function (err, result) {
                                                    if(!err){
                                                        return res.send({"code":"success"});
                                                    } else {
                                                        return res.send({"code":"error"});
                                                    }
                                                });
                                            } else {
                                                return res.send({"code":"another_processing"});
                                            }
                                        } else {
                                            return res.send({"code":"error"});
                                        }
                                    });
                                } else {
                                    dbo.collection("virtual_assistant_transaction").updateOne({"_id": new ObjectId(existing_tbl_id)}, {$set: {"transaction_id": new ObjectId(trans_id)}}, function (err, result) {
                                        if(!err){
                                            return res.send({"code":"success"});
                                        } else {
                                            return res.send({"code":"error"});
                                        }
                                    });
                                }
                            } else {
                                dbo.collection("virtual_assistant_transaction").insertOne({"va_id": new ObjectId(logged_user_id),"transaction_id": new ObjectId(trans_id)} , function(err,inserted_id) {
                                    if(inserted_id.insertedId != '' && !err){
                                        return res.send({"code":"success"});
                                    } else {
                                        return res.send({"code":"error"});
                                    }
                                });
                            }
                        }
                    });
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
    if(action == "create_virtual_card"){
        var shopper_id = req.body.logged_user_id;
        var trans_id = req.body.trans_id;
        var request = require('request');
        var async = require('async');
        var token = '';
        var vcard_username = '',vcard_password = '',vcard_encoded_upass = '',vcard_token = '',vcard_datahook_url = '',api_url = '',settings_tbl_id = '';                
        
        var transaction_sandbox = '';
        async.waterfall([
            function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            console.log(resulteach);
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
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        }
                    }
                });
            },function(next) {
                if(vcard_token != '' && vcard_token != null){
                    /**Token Details by API**/
                    request.get({
                        headers: {'content-type' : 'application/json', 'Authorization' : 'token '+vcard_token},
                        url: api_url+"/Token",
                        //proxy: process.env.PROXY
                    },function(error, response, body){
                        if(error){
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
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
                                body: JSON.stringify(auth_req),
                                //proxy: process.env.PROXY
                            },function(error, response, body){
                                if(error){
                                    return res.send({msg:"error",txt:'Error in processing. Try again later'});
                                } else {
                                    vcard_token = JSON.parse(body).Token;
                                    dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                        next(null);
                                    });
                                }
                                //console.log(error);
                                //console.log(response);
                                console.log(body);
                            });
                        } else if(response.statusCode == '200'){
                            console.log(body);
                            next(null); //Token Not Expired
                        } else {
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
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
                        body: JSON.stringify(auth_req),
                        //proxy: process.env.PROXY
                    },function(error, response, body){
                        if(error){
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        } else {
                            console.log(response.statusCode);
                            console.log(response.statusMessage);
                            if(response.statusCode == '201'){
                                vcard_token = JSON.parse(body).Token;
                                dbo.collection("site_settings").updateOne({"_id": new ObjectId(settings_tbl_id)}, {$set: {"vcard_token": vcard_token}}, function (err, result) {
                                    next(null);
                                });
                            } else {
                                return res.send({msg:"error",txt:'Error in processing. Try again later'});
                            }
                        }
                        //console.log(error);
                        //console.log(response);
                        console.log(body);                    
                    });
                }
            },function(next) {                
                var condition = {_id: new ObjectId(trans_id)};
                dbo.collection("transaction").findOne({"_id": new ObjectId(trans_id)}, function (err, result) {
                    if(err){
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
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
                        
                        dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)}, function (err, result2) {
                            if(err){
                                return res.send({msg:"error",txt:'Error in processing. Try again later'});
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
                                //console.log(order_req);

                                request.post({
                                    headers: {'content-type' : 'application/json','Authorization':'token '+vcard_token},
                                    url: api_url+"/VirtualCard/Order",
                                    body: JSON.stringify(order_req),
                                    //proxy: process.env.PROXY
                                },function(error, response, body){
                                    console.log(error);
                                    console.log(response.statusCode);
                                    console.log(JSON.parse(body).Message);
                                    
                                    if(error){
                                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                                    }
                                    if(response.statusCode == '200'){
                                        virtual_card_id = response.VirtualCardOrderId;
                                        dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {"virtual_card_id": virtual_card_id}}, function (err, result) {
                                            return res.send({msg: "success"});
                                        });
                                    } else if(response.statusCode == '403'){
                                        if(transaction_sandbox == 'true'){
                                            virtual_card_id = '13232';
                                            
                                            var sample_hook_req = {
                                                "CallbackTime": "2017-12-27T05:35:52.4142456-05:00",
                                                "Data": [
                                                {
                                                    "AccountId": 12343,
                                                    "AccountNumber": "10000000353902",
                                                    "FirstName": sh_first_name,
                                                    "LastName": sh_last_name,
                                                    "CardNumber": "4111111111111111",
                                                    "ExpirationDate": "2020-12-31T00:00:00",
                                                    "CVV2": "123",
                                                    "Status": "ACTIVE",
                                                    "Balance": 400.0,
                                                    "VirtualCardOrderId": 13232,
                                                    "OrderDateTime": "2017-12-27T05:35:25.847",
                                                    "Errors": [],
                                                    "Message": "Account Creation Successful"
                                                }]
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
                                return res.send({msg:"error",txt:'Error in processing. Try again later'});
                            }
                        });
                    } else {
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    }
                });
            }
        ]);
    }
    if(action == "check_virtual_card"){
        var shopper_id = req.body.logged_user_id;
        var trans_id = req.body.trans_id;
        var tab_url = req.body.tab_url;
        
        var request = require('request');
        var async = require('async');
        var sh_first_name = '',sh_last_name = '',sh_email='',sh_phone='',sh_address1 = '',sh_city = '',sh_state = '',sh_zipcode = '',platform_name = '';
        var paydet = '';
        var trans_result = '';
        
        var fillr_dev_key = '';
        var fillr_secret_key = '';
        var crd_type = '';
        
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
                dbo.collection("vcard").findOne({"shopper_id": new ObjectId(shopper_id),"trans_id":new ObjectId(trans_id)}, function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        if(result.crdno != '' && result.expdt != ''){
                            result.crdno = decrypt(result.crdno);
                            result.expdt = decrypt(result.expdt);
                            result.cvv = decrypt(result.cvv);
                            
                            paydet = result;
                            next(null);
                        } else {
                            return res.send({msg:"failed"});
                        }
                    } else {
                        return res.send({msg:"failed"});
                    }
                });
            },function(next) {
                var condition = {_id: new ObjectId(trans_id)};
                dbo.collection("transaction").aggregate([{$lookup: {from: "users", localField: "shopper_id", foreignField: "_id", as: "shopper_data"}}, {$match: condition}]).toArray(function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        result = result[0];
                        trans_result = result;
                        platform_name = result.platform;
                        var retarray = getAutomationData(result,paydet,tab_url);
                        retarray['fillr_dev_key'] = fillr_dev_key;
                        retarray['fillr_secret_key'] = fillr_secret_key;
                        
                        var dataarray = {"billing":result,"pymt":paydet};
                        if(retarray != ''){                            
                            return res.send({msg:"success",retarray:retarray,dataarray:dataarray});
                        } else {
                            next(null);
                        }
                    } else {
                        /*var retarray = {"platform_name":"amazon","tab_url":tab_url, "billing":{"#enterAddressFullName":"Mitchell", "#enterAddressAddressLine1":"1656 Union Street", "#enterAddressCity":"Eureka",
                    "#enterAddressStateOrRegion":"CA", "#enterAddressPostalCode":"95502","#enterAddressPhoneNumber":"8794787879"},
                    "pymt":{"#ccName":"Mitchell", "#ccMonth":"4", "#ccYear":"2025", "#addCreditCardNumber":"4111111111111111"}};
                        retarray['fillr_dev_key'] = fillr_dev_key;
                        retarray['fillr_secret_key'] = fillr_secret_key;
                        dbo.collection("transaction").findOne({"_id": new ObjectId(trans_id)}, function (err3, result3) {
                            var dataarray = {"billing":result3,"pymt":paydet};
                            return res.send({msg:"success",retarray:retarray,dataarray:dataarray});
                        });*/
                        var ProfileData = {
                            "ContactDetails.Emails.Email.Address":"jamesw999@gmail.com",
                            "ContactDetails.CellPhones.CellPhone.Number":"4152364521",
                            "PersonalDetails.FirstName":"John",
                            "PersonalDetails.LastName":"Wick",
                            
                            "AddressDetails.PostalAddress.AddressLine1":"1656 Union Street",
                            "AddressDetails.PostalAddress.AdministrativeArea": "CA",
                            "AddressDetails.PostalAddress.Country":"United States",
                            "AddressDetails.PostalAddress.PostalCode":"95501",
                            "AddressDetails.PostalAddress.Suburb":"Eureka",
                            "AddressDetails.PostalAddress.StreetName": "1656 Union Street",
                            
                            "AddressDetails.BillingAddress.AddressLine1":"1656 Union Street",
                            "AddressDetails.BillingAddress.AdministrativeArea":"CA",
                            "AddressDetails.BillingAddress.Country":"United States",
                            "AddressDetails.BillingAddress.PostalCode":"95501",
                            "AddressDetails.BillingAddress.Suburb":"Eureka",
                            "AddressDetails.BillingAddress.StreetName": "1656 Union Street",
                            
                            "AddressDetails.WorkAddress.AddressLine1":"1656 Union Street",
                            "AddressDetails.WorkAddress.AdministrativeArea":"CA",
                            "AddressDetails.WorkAddress.Country":"United States",
                            "AddressDetails.WorkAddress.PostalCode":"95501",
                            "AddressDetails.WorkAddress.Suburb":"Eureka",
                            "AddressDetails.WorkAddress.StreetName": "1656 Union Street",
                            
                            "CreditCards.CreditCard.CCV":"123",
                            "CreditCards.CreditCard.Expiry":"06-2020",
                            "CreditCards.CreditCard.Expiry.Month":"06",
                            "CreditCards.CreditCard.Expiry.Year":"2020",
                            "CreditCards.CreditCard.NameOnCard":"James Williams",
                            "CreditCards.CreditCard.Number":"4111111111111111",
                            "CreditCards.CreditCard.Type":"VISA"
                        };
                        var retarray = {"platform_name":"amazon","tab_url":tab_url, "ProfileData":ProfileData};
                        retarray['fillr_dev_key'] = fillr_dev_key;
                        retarray['fillr_secret_key'] = fillr_secret_key;
                        dbo.collection("transaction").findOne({"_id": new ObjectId(trans_id)}, function (err3, result3) {
                            //result3 = result3[0];
                            var dataarray = {"billing":result3,"pymt":paydet};
                            return res.send({msg:"success",retarray:retarray,dataarray:dataarray});
                        });
                        //return res.send({msg:"failed"});
                    }
                });
            }, function(next){
                var nodemailer = require('nodemailer');
                var mg = require('nodemailer-mailgun-transport');
                var sblue = require('nodemailer-sendinblue-transport');
                var ejs = require("ejs");
                
                var dataarray = {"billing":trans_result,"pymt":paydet};

                async.waterfall([
                    function(next2) {
                        dbo.collection("no_automation_urls").insertOne({"url":tab_url,"platform":platform_name,"shopper_id": new ObjectId(shopper_id),"transaction_id": new ObjectId(trans_id)}, function (err, result) {
                            if(!err){
                                next2(null);
                            } else {
                                return res.send({msg:"success",dataarray:dataarray});
                            }
                        });
                    },
                    function(next2) {
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
                            url_link: tab_url,
                            platform_name: platform_name
                        }

                        var email_content = ejs.renderFile('views/emails/automation_failure.ejs',pass_template);
                        email_content.then(function (result_content) {
                            var options = {
                                from: process.env.ADMIN_EMAIL,
                                to: process.env.ADMIN_EMAIL,
                                subject: 'Automation Failure - '+process.env.SITE_NAME,
                                html: result_content,
                                text: '',
                                'o:tracking': 'no','o:tracking-clicks': 'no','o:tracking-opens': 'no'
                            };
                            transporter.sendMail(options, function (error, info) {
                                return res.send({msg:"success",dataarray:dataarray});
                            });
                        });
                    }
                ]);
            }
        ]);
    }
    if(action == "receive_virtual_card"){
        console.log(req.body);
        if(typeof req.body.Data != 'undefined' && req.body.Data != ''){
            var trans_id = req.body.trans_id;
            var shopper_id = req.body.shopper_id;
            var key_rmt = req.body.ky;
            var iv_rmt = req.body.iv;
            
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
            
            crdno = encrypt(crdno);
            expdt = encrypt(expdt);
            cvv = encrypt(cvv);
            
            dbo.collection("vcard").findOne({"shopper_id" : new ObjectId(shopper_id),"trans_id": new ObjectId(trans_id)}, function (err, result) {
                if(err){
                    return res.send();
                } else {
                    if (typeof result != 'undefined' && result != null && result != ""){
                        return res.send();
                    } else {
                        dbo.collection("vcard").insertOne({"shopper_id": new ObjectId(shopper_id), "trans_id": new ObjectId(trans_id), "first_name": first_name, "last_name": last_name,"crdno": crdno, "expdt": expdt, "cvv": cvv, "status": status, "order_time": order_time}, function (err, result) {
                            return res.send();
                        });
                    }
                }
            });
        } else {
            return res.send();
        }
    }
    if(action == "mark_trans_finish"){
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
                            dbo.collection("transaction").updateOne({"_id": new ObjectId(transaction_id)}, {$set: {"status": "completed","completed_date": date_today}}, function (err, result) {
                                if(!err){
                                    next(null);
                                } else {
                                    return res.send({"msg":"error"});
                                }
                            });
                        },
                        function(next) {
                            dbo.collection("cookies_page").updateOne({"transaction_id": new ObjectId(transaction_id)}, {$set: {"status": "completed"}}, function (err, result) {
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
    if(action == "no_automation_alert"){
        var nodemailer = require('nodemailer');
        var mg = require('nodemailer-mailgun-transport');
        var sblue = require('nodemailer-sendinblue-transport');
        var ejs = require("ejs");
        
        //console.log(req.body.info);
        var info = req.body.info;
        var platform_name = info.data.platform_name;
        var tab_url = info.data.tab_url;
        
        async.waterfall([
            function(next) {
                dbo.collection("no_automation_urls").insertOne({"url":info.tab_url,"platform":info.platform_name,"shopper_id": new ObjectId(shopper_id),"transaction_id": new ObjectId(transaction_id)}, function (err, result) {
                    if(!err){
                        next(null);
                    } else {
                        return res.send({"msg":"error"});
                    }
                });
            },
            function(next) {
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
                    url_link: tab_url,
                    platform_name: platform_name
                }

                var email_content = ejs.renderFile('views/emails/automation_failure.ejs',pass_template);
                email_content.then(function (result_content) {
                    var options = {
                        from: process.env.ADMIN_EMAIL,
                        to: process.env.ADMIN_EMAIL,
                        subject: 'Automation Failure - '+process.env.SITE_NAME,
                        html: result_content,
                        text: '',
                        'o:tracking': 'no','o:tracking-clicks': 'no','o:tracking-opens': 'no'
                    };
                    transporter.sendMail(options, function (error, info) {
                        return res.send();
                    });
                });
            }
        ]);
    }
    if(action == 'init_coinbase_payment'){
        var logged_user_id = req.body.logged_user_id;
        var billing_amount = req.body.billing_amount;
        var checkout_amount = req.body.checkout_amount;
        var charge_amount = req.body.charge_amount;
        
        var ObjectId = require('mongodb').ObjectId;
        var oauth_url = '';
        
        async.waterfall([
            function(next) {
                dbo.collection("users").findOne({"_id": new ObjectId(logged_user_id)}, function (err, result) {
                    if(err){
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    } else {
                        if (typeof result != 'undefined' && result != null && result != "") {
                            var coinbase_account_id = result.coinbase_account_id;
                            if(typeof coinbase_account_id != 'undefined' && coinbase_account_id != null && coinbase_account_id != ''){
                                return res.send({"msg": "success"});
                            } else {
                                next(null);
                            }
                        } else {
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        }
                    }
                });
            },function(next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            coinbase_oauth_client_id = resulteach.coinbase_oauth_client_id;
                            coinbase_oauth_redirect_url = resulteach.coinbase_oauth_redirect_url;
                            coinbase_oauth_scope = resulteach.coinbase_oauth_scope;
                            transaction_sandbox = resulteach.transaction_sandbox;
                            if(billing_amount == ''){
                                billing_amount = 1;
                            }
                            if(transaction_sandbox == 'true'){
                                billing_amount = 1;
                            }
                            
                            oauth_url = 'https://www.coinbase.com/oauth/authorize?client_id='+coinbase_oauth_client_id+'&redirect_uri='+coinbase_oauth_redirect_url+'&response_type=code&scope='+coinbase_oauth_scope+'&meta[send_limit_amount]='+billing_amount+'&meta[send_limit_currency]=USD';
                            return res.send({"msg": "noaccount","oauth_url":oauth_url});
                        } else {
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        }
                    }
                });
            }
        ]);
        
        
        /*var Client = require('coinbase').Client;
        var client = new Client({'apiKey': process.env.COINBASE_API_KEY, 'apiSecret': process.env.COINBASE_API_SECRET,'strictSSL': false,proxy: process.env.PROXY});
        client.getAccounts({}, function(err, accounts) {
            if(err){
                console.log(err);
                return res.send({msg:"error"});
            }
            console.log(accounts);
            return res.send();
        });*/
    }
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
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            coinbase_oauth_client_id = resulteach.coinbase_oauth_client_id;
                            coinbase_oauth_client_secret = resulteach.coinbase_oauth_client_secret;
                            coinbase_oauth_redirect_url = resulteach.coinbase_oauth_redirect_url;
                            coinbase_api_url = resulteach.coinbase_api_url;
                            next(null);
                        } else {
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
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
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    } else {
                        var body = JSON.parse(body);
                        console.log(body);
                        if(typeof body != "undefined" && body != null && typeof body.access_token != "undefined" && body.access_token != null && body.access_token != ''){
                            coinbase_access_token = body.access_token;
                            dbo.collection("users").updateOne({"_id": new ObjectId(logged_user_id)}, {$set: {"coinbase_access_token": body.access_token,"coinbase_refresh_token": body.refresh_token}}, function (err, resultupdate) {
                                next(null);
                            });
                        } else {
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
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
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        }
                    } else {
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    }
                });
            }
        ]);
    }
    if(action == 'coinbase_pay'){
        //console.log("INSIDE HERE TRANS");
        //return;
        var ObjectId = require('mongodb').ObjectId;
        
        //var cloudinary = require('cloudinary');
        
        var shopper_id = req.body.shopper_id;
        var billing_amount= req.body.billing_amount;
        var checkout_amount= req.body.checkout_amount;
        var charge_amount= req.body.charge_amount;
        
        var billing_first_name= req.body.billing_first_name;
        var billing_last_name= req.body.billing_last_name;
        var billing_street= req.body.billing_street;
        var billing_city= req.body.billing_city;
        var billing_state= req.body.billing_state;
        var billing_zipcode= req.body.billing_zipcode;
        var date_today= req.body.date_today;
        
        var coin_type = req.body.coin_type;
        
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
        
        var request = require('request');
        var api_url = '';
        var bitcoin_address = '';
        
        var coinbase_oauth_client_id = '';
        var coinbase_oauth_client_secret = '';
        var coinbase_api_url = '';
        
        var coinbase_access_token = '';
        var coinbase_refresh_token = '';
        var coinbase_account_id = '';
        var trans_id = '';
        
        /*var cloudinary_name = '';
        var cloudinary_key = '';
        var cloudinary_secret = '';*/
        
        var bitcoin_sale_id = '';
        
        var account_object = '';
        
        var transaction_sandbox = '';
        
        async.waterfall([
            function(next) {
                // Get Client ID Client Secret & API URL
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            coinbase_oauth_client_id  = resulteach.coinbase_oauth_client_id;
                            coinbase_oauth_client_secret  = resulteach.coinbase_oauth_client_secret;
                            coinbase_api_url = resulteach.coinbase_api_url;
                            
                            transaction_sandbox = resulteach.transaction_sandbox;
                            
                            /*cloudinary_name = resulteach.cloudinary_name;
                            cloudinary_key = resulteach.cloudinary_key;
                            cloudinary_secret = resulteach.cloudinary_secret;
                            cloudinary.config({
                                cloud_name: cloudinary_name,
                                api_key: cloudinary_key,
                                api_secret: cloudinary_secret
                            });*/
                            
                            next(null);
                        } else {
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        }
                    }
                });
            },function(next) {
                // Get Bitcoin Address for Selected Coin Type
                dbo.collection("bitcoin_address").find({}).toArray(function (err, result) {
                    if (err){
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    } else {
                        if(typeof result != "undefined" && result != null){
                            resulteach = result[0];
                            if(coin_type == "BTC") {
                                bitcoin_address = resulteach.btc_address;next(null);
                            } else if(coin_type == "LTC") {
                                bitcoin_address = resulteach.ltc_address;next(null);
                            } else if(coin_type == "ETH") {
                                bitcoin_address = resulteach.eth_address;next(null);
                            } else {
                                return res.send({msg:"error",txt:'Coin type you have selected is not supported'});
                            }
                        } else {
                            return res.send({msg:"error",txt:'Coin type you have selected is not supported'});
                        }
                    }
                });
            },function(next) {
                // Get Users Access Token and Refresh Token and Coinbase Account ID
                dbo.collection("users").findOne({"_id": new ObjectId(shopper_id)}, function (err, result) {
                    if (typeof result != 'undefined' && result != null && result != "" && (err == null || err == "")) {
                        billing_email = result.email;
                        billing_phone = result.phone_number;                        
                        coinbase_access_token  = result.coinbase_access_token;
                        coinbase_refresh_token  = result.coinbase_refresh_token;
                        coinbase_account_id  = result.coinbase_account_id;
                        next(null);
                    } else {
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    }
                });
            },function(next) {
                // Get Account Object by Account ID for Sending Money.
                var Client = require('coinbase').Client;
                var client = new Client({'accessToken': coinbase_access_token, 'refreshToken': coinbase_refresh_token,proxy: process.env.PROXY});

                client.getAccount(coinbase_account_id, function(err, account) {
                    console.log(err);
                    if(err != null){
                        if(err.statusCode == "401"){
                            console.log("INSIDE Access Token Renew Process");
                            // Access Token Renew Process
                            var auth_req = {
                                "grant_type": "refresh_token",
                                "refresh_token": coinbase_refresh_token,
                                "client_id": coinbase_oauth_client_id,
                                "client_secret": coinbase_oauth_client_secret
                            };
                            //console.log(auth_req);
                            request.post({
                                headers: {'content-type' : 'application/json'},
                                url: coinbase_api_url+"/oauth/token",
                                body: JSON.stringify(auth_req)
                            },function(error, response, body){
                                if (error){
                                    return res.send({msg:"error",txt:'Error in processing. Try again later'});
                                } else {
                                    var body = JSON.parse(body);
                                    //console.log(body);
                                    if(typeof body != "undefined" && body != null && typeof body.access_token != "undefined" && body.access_token != null && body.access_token != ''){
                                        coinbase_access_token = body.access_token;
                                        coinbase_refresh_token = body.refresh_token;                                        
                                        dbo.collection("users").updateOne({"_id": new ObjectId(shopper_id)}, {$set: {"coinbase_access_token": body.access_token,"coinbase_refresh_token": body.refresh_token}}, function (err, resultupdate) {
                                            
                                            client = new Client({'accessToken': coinbase_access_token, 'refreshToken': coinbase_refresh_token,proxy: process.env.PROXY});
                                            client.getAccount(coinbase_account_id, function(err, account) {
                                                account_obj = account;
                                                next(null);
                                            });
                                            
                                        });
                                    } else {
                                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                                    }
                                }
                            });
                        } else {
                            return res.send({msg:"error",txt:'Error in processing. Try again later'});
                        }
                    } else {
                        account_obj = account;
                        next(null);
                    }
                });
            },function(next) {
                if(account_obj != ''){
                    //console.log(account_obj);
                    account_obj.sendMoney({'to': bitcoin_address,'amount': billing_amount,'currency':coin_type}, function(err, tx) {
                        if(err != ''){
                            if(transaction_sandbox == 'true'){
                                bitcoin_sale_id = '3434-4368-hj8eh3-43h8g3-4343';
                                next(null);
                            } else {
                                return res.send({msg:"error",txt:err.message});
                            }
                        } else {
                            bitcoin_sale_id = tx.id;
                            next(null);
                        }
                    });
                }
            },function(next) {
                dbo.collection("transaction").insertOne({ shopper_id: new ObjectId(shopper_id), va_id: "", date: date_today, bitcoin_sale_id: bitcoin_sale_id, payment_platform: "Coinbase", platform: platform_name, currency: coin_type, 
                    status: "pending_payment", checkout_amount: checkout_amount, charge_amount: charge_amount, transaction_amount: billing_amount,screenshot_link: "",billing_details: {first_name : billing_first_name, last_name : billing_last_name, street: billing_street, city: billing_city, state: billing_state,
                    zipcode: billing_zipcode} },
                function(err,inserted_id){
                    if(inserted_id.insertedId != '' && !err){
                        trans_id = inserted_id.insertedId;
                        next(null);
                    } else {
                        return res.send({msg:"error",txt:'Error in processing. Try again later'});
                    }
                });
            },function(next) {
                dbo.collection("cookies_page").insertOne({"shopper_id": new ObjectId(shopper_id),"transaction_id": new ObjectId(trans_id) ,"session_data" : session_data,"tab_url" : tab_url,"status" : "open"} , function(err,inserted_id) {
                    if(inserted_id.insertedId != '' && !err){
                        pagelog_id = inserted_id.insertedId;
                        
                        /*var ProxyAgent = require('proxy-agent');
                        var proxyUri = process.env.PROXY;
                        
                        cloudinary.v2.uploader.upload(img, {
                            overwrite: true,
                            invalidate: true,
                            agent: new ProxyAgent(proxyUri)
                        },function (error, result) {
                            if(!error){
                                var img_url = result.secure_url;
                                dbo.collection("transaction").updateOne({"_id": new ObjectId(trans_id)}, {$set: {screenshot_link: img_url}}, function (err, result) {
                                    next(null);
                                });
                            } else {
                                next(null);
                            }
                        });*/
                        next(null);
                    } else {
                        next(null);
                    }
                });
            },function(next) {
                return res.send({msg:"success",trans_id:trans_id,bitcoin_sale_id:bitcoin_sale_id});
            }
        ]);
    }
    if(action == "post_somi"){
        
        var vcard_datahook_url = 'https://somiworks.com/receive_pexcard.php';
        /**Virtual Card Creation by API**/
        var order_req = {
            "VirtualCards": [
              {
                "FirstName": "Shopper",
                "LastName": "User",
                "DateOfBirth": "01-31-1970",
                "Phone": "2125551212",
                "Email": "ed-developer@edsoftwaredevelopment.com",
                "ProfileAddress": {
                  "AddressLine1": "111 Grand Ave",
                  "AddressLine2": "",
                  "City": "Oakland",
                  "State": "CA",
                  "PostalCode": "95502",
                  "Country": "US"
                },
                "GroupId": 0,
                "RulesetId": 0,
                "AutoActivation": true,
                "FundCardAmount": "0",
                "CardDataWebhookURL": vcard_datahook_url+"?trans_id=5d358e95df97b04719a1c962&shopper_id=5d31dd9e2b89215d22f45b16"
              }
            ]
        };
        
        var api_url = 'https://sandbox-coreapi.pexcard.com/V4';
        var request = require('request');
        //var vcard_token = '6BF468B2769146979E5752BF6AE8CCF2';
        var vcard_token = 'f600c7301555453b96f5476928f242d2';
        request.post({
            headers: {'content-type' : 'application/json','Authorization':'token '+vcard_token},
            url: api_url+"/VirtualCard/Order",
            body: JSON.stringify(order_req)
        },function(error, response, body){
            console.log(error);
            console.log(response.statusCode);
            console.log(JSON.parse(body).Message);
        });
        
        /*var request = require('request');
        var sample_hook_req = {
            "CallbackTime": "2017-12-27T05:35:52.4142456-05:00",
            "Data": [
            {
                "AccountId": 12343,
                "AccountNumber": "10000000353902",
                "FirstName": "Shopper",
                "LastName": "User",
                "CardNumber": "4111111111111111",
                "ExpirationDate": "2020-12-31T00:00:00",
                "CVV2": "123",
                "Status": "ACTIVE",
                "Balance": 400.0,
                "VirtualCardOrderId": 13232,
                "OrderDateTime": "2017-12-27T05:35:25.847",
                "Errors": [],
                "Message": "Account Creation Successful"
            }]
        };
        var vcard_datahook_url = 'https://somi.edclientdev.com/receive_pexcard.php';
        //var vcard_datahook_url = 'http://horsepower/global/chromium_phpback/receive_pexcard.php';
        
        request.post({
            headers: {'content-type' : 'application/json'},
            url: vcard_datahook_url+"?trans_id=5d32fcda5a26555d4ea1d87b&shopper_id=5d31dd9e2b89215d22f45b16",
            body: JSON.stringify(sample_hook_req)
        }, function(error, response, body){
            console.log(error);
            return res.send({msg:"success"});
        });*/
    }
    if(action == "newsletter_admin"){
        var nodemailer = require('nodemailer');
        var mg = require('nodemailer-mailgun-transport');
        var sblue = require('nodemailer-sendinblue-transport');
        var ejs = require("ejs");
        
        var email_addr = req.body.email_id;
        //console.log(email_addr);

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
            email_addr: email_addr
        }

        var email_content = ejs.renderFile('views/emails/newsletter_join.ejs',pass_template);
        email_content.then(function (result_content) {
            var options = {
                from: process.env.ADMIN_EMAIL,
                to: process.env.ADMIN_EMAIL,
                subject: 'Join Request - '+process.env.SITE_NAME,
                html: result_content,
                text: '',
                'o:tracking': 'no','o:tracking-clicks': 'no','o:tracking-opens': 'no'
            };
            transporter.sendMail(options, function (error, info) {
                //console.log(error);
                if(error){
                    return res.send({msg:"error"});
                }
                return res.send({msg:"success"});
            });
        });        
    }
}