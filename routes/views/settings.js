exports = module.exports = function (req, res, next) {
    var locals = res.locals;    
    
    var dbConn = require( '../db' );
    var dbo = dbConn.getDb();
    var ObjectId = require('mongodb').ObjectId;
    var async = require("async");
    
    if(req.body.update_link == '1'){
        var windows_32_bit = req.body.windows_32_bit;
        var windows_64_bit = req.body.windows_64_bit;
        var linux_32_bit = req.body.linux_32_bit;
        var linux_64_bit = req.body.linux_64_bit;
        var mac_64_bit = req.body.mac_64_bit;
        
        dbo.collection("download_link").find({}).toArray(function (err, result) {
            if (err){
                return res.redirect('settings');
            } else {
                if(typeof result != "undefined" && result != null){
                    var resulteach = result[0];
                    var tbl_id = resulteach._id;
                    dbo.collection("download_link").updateOne({"_id": new ObjectId(tbl_id)}, {$set: {"windows_32_bit": windows_32_bit, "windows_64_bit": windows_64_bit, "linux_32_bit": linux_32_bit, "linux_64_bit": linux_64_bit, "mac_64_bit": mac_64_bit}}, function (err, result) {
                        return res.redirect('settings');
                    });
                } else {
                    dbo.collection("download_link").insertOne({"windows_32_bit": windows_32_bit, "windows_64_bit": windows_64_bit, "linux_32_bit": linux_32_bit, "linux_64_bit": linux_64_bit, "mac_64_bit": mac_64_bit}, function (err, inserted_id) {
                        return res.redirect('settings');
                    });
                }
            }
        });        
    } else if(req.body.update_bitcoin == '1'){
        var btc_address = req.body.btc_address;
        var ltc_address = req.body.ltc_address;
        var eth_address = req.body.eth_address;
        
        dbo.collection("bitcoin_address").find({}).toArray(function (err, result) {
            if (err){
                return res.redirect('settings');
            } else {
                //console.log(result.length);
                if(typeof result != "undefined" && result != null && result.length > 0){
                    var resulteach = result[0];
                    var tbl_id = resulteach._id;
                    dbo.collection("bitcoin_address").updateOne({"_id": new ObjectId(tbl_id)}, {$set: {"btc_address": btc_address, "ltc_address": ltc_address, "eth_address": eth_address}}, function (err, result) {
                        return res.redirect('settings');
                    });
                } else {
                    dbo.collection("bitcoin_address").insertOne({"btc_address": btc_address, "ltc_address": ltc_address, "eth_address": eth_address}, function (err, inserted_id) {
                        return res.redirect('settings');
                    });
                }
            }
        });        
    } else if(req.body.update_settings == '1'){        
        var aliantpay_sandbox = req.body.aliantpay_sandbox;
        var aliantpay_api_url = req.body.aliantpay_api_url;
        var aliantpay_invoice_url = req.body.aliantpay_invoice_url;
        var aliantpay_authorization = req.body.aliantpay_authorization;
        var aliantpay_api_token = req.body.aliantpay_api_token;
        
        var vcard_username = req.body.vcard_username;
        var vcard_password = req.body.vcard_password;
        var vcard_encoded_upass = req.body.vcard_encoded_upass;
        var vcard_api_url = req.body.vcard_api_url;
        var vcard_datahook_url = req.body.vcard_datahook_url;
        
        var coinbase_api_url = req.body.coinbase_api_url;
        var coinbase_api_key = req.body.coinbase_api_key;
        var coinbase_api_secret = req.body.coinbase_api_secret;
        var coinbase_oauth_client_id = req.body.coinbase_oauth_client_id;
        var coinbase_oauth_client_secret = req.body.coinbase_oauth_client_secret;
        var coinbase_oauth_redirect_url = req.body.coinbase_oauth_redirect_url;
        var coinbase_oauth_scope = req.body.coinbase_oauth_scope;
        
        var twilio_sandbox = req.body.twilio_sandbox;
        var twilio_sid = req.body.twilio_sid;
        var twilio_token = req.body.twilio_token;
        var twilio_from = req.body.twilio_from;
        var twilio_countrycode = req.body.twilio_countrycode;
        
        var cloudinary_name = req.body.cloudinary_name;
        var cloudinary_key = req.body.cloudinary_key;
        var cloudinary_secret = req.body.cloudinary_secret;
        
        var transaction_sandbox = req.body.transaction_sandbox;
        
        dbo.collection("site_settings").find({}).toArray(function (err, result) {
            if (err){
                return res.redirect('settings');
            } else {
                //console.log(result.length);
                if(typeof result != "undefined" && result != null && result.length > 0){
                    var resulteach = result[0];
                    var tbl_id = resulteach._id;
                    dbo.collection("site_settings").updateOne({"_id": new ObjectId(tbl_id)}, {$set: {
                        "aliantpay_sandbox": aliantpay_sandbox, "aliantpay_api_url": aliantpay_api_url, "aliantpay_invoice_url": aliantpay_invoice_url, "aliantpay_authorization": aliantpay_authorization, "aliantpay_api_token": aliantpay_api_token
                        , "vcard_username": vcard_username, "vcard_password": vcard_password, "vcard_encoded_upass": vcard_encoded_upass, "vcard_api_url": vcard_api_url, "vcard_datahook_url": vcard_datahook_url
                        , "coinbase_api_url": coinbase_api_url, "coinbase_api_key": coinbase_api_key, "coinbase_api_secret": coinbase_api_secret, "coinbase_oauth_client_id": coinbase_oauth_client_id
                        , "coinbase_oauth_client_secret": coinbase_oauth_client_secret, "coinbase_oauth_redirect_url": coinbase_oauth_redirect_url, "coinbase_oauth_scope": coinbase_oauth_scope
                        ,"twilio_sandbox": twilio_sandbox,"twilio_sid": twilio_sid,"twilio_token": twilio_token,"twilio_from": twilio_from,"twilio_countrycode": twilio_countrycode
                        ,"cloudinary_name": cloudinary_name,"cloudinary_key": cloudinary_key,"cloudinary_secret": cloudinary_secret
                        ,"transaction_sandbox": transaction_sandbox
                    }}, function (err, result) {
                        return res.redirect('settings');
                    });
                } else {
                    dbo.collection("site_settings").insertOne({
                        "aliantpay_sandbox": aliantpay_sandbox, "aliantpay_api_url": aliantpay_api_url, "aliantpay_invoice_url": aliantpay_invoice_url, "aliantpay_authorization": aliantpay_authorization, "aliantpay_api_token": aliantpay_api_token
                        , "vcard_username": vcard_username, "vcard_password": vcard_password, "vcard_encoded_upass": vcard_encoded_upass, "vcard_api_url": vcard_api_url
                        , "coinbase_api_url": coinbase_api_url, "coinbase_api_key": coinbase_api_key, "coinbase_api_secret": coinbase_api_secret, "coinbase_oauth_client_id": coinbase_oauth_client_id
                        , "coinbase_oauth_client_secret": coinbase_oauth_client_secret, "coinbase_oauth_redirect_url": coinbase_oauth_redirect_url, "coinbase_oauth_scope": coinbase_oauth_scope
                        ,"twilio_sandbox": twilio_sandbox,"twilio_sid": twilio_sid,"twilio_token": twilio_token,"twilio_from": twilio_from,"twilio_countrycode": twilio_countrycode
                        ,"cloudinary_name": cloudinary_name,"cloudinary_key": cloudinary_key,"cloudinary_secret": cloudinary_secret
                        ,"transaction_sandbox": transaction_sandbox
                    }, function (err, inserted_id) {
                        return res.redirect('settings');
                    });
                }
            }
        });        
    } else {
        async.waterfall([
            function (next) {
                dbo.collection("download_link").find({}).toArray(function (err, result) {
                    if (err){
                        locals.links = '';
                        next(null);
                    } else {
                        if(typeof result != "undefined" && result != null){
                            var resulteach = result[0];
                            locals.links = resulteach;
                            next(null);
                        } else {                    
                            locals.links = '';
                            next(null);
                        }
                    }
                });
            }, function (next) {
                dbo.collection("bitcoin_address").find({}).toArray(function (err, result) {
                    if (err){
                        locals.bitcoin = '';
                        next(null);
                    } else {
                        if(typeof result != "undefined" && result != null){
                            var resulteach = result[0];
                            locals.bitcoin = resulteach;
                            next(null);
                        } else {                    
                            locals.bitcoin = '';
                            next(null);
                        }
                    }
                });
            }, function (next) {
                dbo.collection("site_settings").find({}).toArray(function (err, result) {
                    if (err){
                        locals.site_settings = '';
                        res.render('settings');
                    } else {
                        if(typeof result != "undefined" && result != null){
                            var resulteach = result[0];
                            locals.site_settings = resulteach;
                            res.render('settings');
                        } else {
                            locals.site_settings = '';
                            res.render('settings');
                        }
                    }
                });
            }
        ]);
    }
}