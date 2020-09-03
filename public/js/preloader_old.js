/*var ipcRenderer = require('electron').ipcRenderer;
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM CONTENT LOADED");
    setTimeout(function(){
        ipcRenderer.sendToHost('billing-html-content' , document.body.innerHTML);
    ),4000};
});*/
/*document.addEventListener("DOMContentLoaded", function(event) {
    var script = document.createElement("script");
    script.src = "https://code.jquery.com/jquery-3.2.1.min.js";
    script.onload = script.onreadystatechange = function() {
        
    };
    document.body.appendChild(script);
});*/

//var FillrController = require('fillr-extension/fillr-controller');
var FillrController = require('@fillr_letspop/desktop-autofill');

var { ProfileDataInterface } = FillrController;

function setNativeValue(element, value) {
    let lastValue = element.value;
    element.value = value;
    let event = new Event("input", { target: element, bubbles: true });
    // React 15
    event.simulated = true;
    // React 16
    let tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }
    element.dispatchEvent(event);
}
function setNativeValueSelect(element, value) {
    let lastValue = element.value;
    element.value = value;
    let event = new Event("change", { target: element, bubbles: true });
    // React 15
    event.simulated = true;
    // React 16
    let tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }
    element.dispatchEvent(event);
}

var ipcRenderer = require('electron').ipcRenderer;
ipcRenderer.on("re-scrap",function(event,data){
    ipcRenderer.sendToHost('html-content' , document.body.innerHTML);
});

//To set the billing address
ipcRenderer.on("set-bill-addr-amazon",function(event, data2){
    let intervalCount = 0;
    
    // Waiting for document readystate to be complete...
    const interval = setInterval(() => {
        intervalCount++;
        if (document && document.readyState === "complete" || intervalCount == 10) {
            clearInterval(interval);
            
            //ipcRenderer.sendToHost('billing-html-content' , "Amazon Address page loaded");
            
            var timeout = 100;
            var ele = document.getElementsByClassName("change-address-popover-link")[2];
            if(ele != null){
                timeout = 3000;
                document.getElementsByClassName("change-address-popover-link")[2].click();
            }
            setTimeout(function(){
                if(ele != null){
                    document.getElementsByClassName("add-address-button")[4].click();
                }

                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key

                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);

                    document.getElementsByClassName("submit-button-with-name")[0].click();
                    ipcRenderer.sendToHost('automation-completed-amazon' , 1);
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);

                /*for (var key in data2.billing) {
                    var obj = data2.billing[key];
                    key = key.replace("#","");
                    if(key != '' && document.getElementById(key) != null){
                        document.getElementById(key).value = obj;
                    }
                }
                document.getElementsByClassName("submit-button-with-name")[0].click();
                ipcRenderer.sendToHost('automation-completed-amazon' , 1);*/
            },timeout);
        }
    },1000);
});

ipcRenderer.on("set-pay-amazon",function(event, data2){
    let intervalCount = 0;
    
    // Waiting for document readystate to be complete...
    const interval = setInterval(() => {
        intervalCount++;
        if (document && document.readyState === "complete" || intervalCount == 10) {
            clearInterval(interval);
            
            //ipcRenderer.sendToHost('billing-html-content' , document.body.innerHTML);
            document.getElementsByClassName("a-link-expander")[0].click();
            var ProfileData = data2.ProfileData;    
            var devKey = data2.fillr_dev_key;// Set your dev key
            var secretKey = data2.fillr_secret_key; // Set your secret key

            var profileDataHandler = new ProfileDataInterface((mappings) => {
                mappings.profile = ProfileData; // Set your profile data
                fillr.performFill(mappings);

                //$("#ccMonth").val(ProfileData["CreditCards.CreditCard.Expiry.Month"]);
                //$("#ccYear").val(ProfileData["CreditCards.CreditCard.Expiry.Year"]);

                if(document.querySelectorAll("input[id='ccAddCard']").length > 0){
                    document.getElementById("ccAddCard").click();
                    setTimeout(function(){
                        if(document.querySelectorAll("input[id='continue-top']").length > 0){
                            document.getElementById("continue-top").click();
                        } else {
                            ipcRenderer.sendToHost('automation-failed-payment-amazon' , 1);
                        }
                        ipcRenderer.sendToHost('automation-completed-payment-amazon' , 1);
                    },3000);
                } else {
                    ipcRenderer.sendToHost('automation-failed-payment-amazon' , 1);
                }
            });
            var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);

            /*for (var key in data2.pymt) {
                var obj = data2.pymt[key];
                key = key.replace("#","");
                if(key != '' && document.getElementById(key) != null){
                    document.getElementById(key).value = obj;
                }
            }*/
        }
    },1000);
});

//To set the card information
ipcRenderer.on("set-billing",function(event, data2){
    let intervalCount = 0;
    
    // Waiting for document readystate to be complete...
    const interval = setInterval(() => {
        intervalCount++;
        if (document && document.readyState === "complete" || intervalCount == 10) {
            clearInterval(interval);
            
            ipcRenderer.sendToHost('billing-html-content' , data2.platform_name);
            /** LOGIC PER SHOPPING SITE **/
            if(data2.platform_name == "amazon"){
                
                document.getElementById("payment-change-link").click();

            } else if(data2.platform_name == "ebay"){

                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key

                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);

                    document.querySelector(".ADD_ADDRESS_SUBMIT button").click();
                    setTimeout(function(){
                        if(document.querySelectorAll(".provided-address .address-action button").length > 0){
                            document.querySelector(".provided-address .address-action button").click();
                        }

                        setTimeout(function(){

                            document.querySelector(".payment-entry--CC input[type='radio']").click();
                            setTimeout(function(){
                                document.querySelector(".ADD_CARD button").click();

                                setTimeout(function(){
                                    document.querySelector(".ADD_CARD button").click(); // Click same button again to avoid exp date error in ebay
                                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                                },2000);

                            },3000);

                        },8000);

                    },4000);
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);

            } else if(data2.platform_name == "bestbuy"){
                //React JS Site

                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key

                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);

                    setTimeout(function(){                
                        ipcRenderer.sendToHost('automation-completion-other' , '1');
                    },1000);
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);

            } else if(data2.platform_name == "walmart"){
                //React JS Site

                var continue_button = document.getElementsByClassName('cxo-continue-btn');
                if (continue_button.length > 0) {
                    document.querySelector('.cxo-continue-btn').click();
                }

                var addressLineTwo = document.querySelectorAll("[id='addressLineTwo']").length;
                ipcRenderer.sendToHost('billing-html-content' , addressLineTwo);
                if(addressLineTwo > 0){            
                    var ProfileData = data2.ProfileData;
                    var devKey = data2.fillr_dev_key;// Set your dev key
                    var secretKey = data2.fillr_secret_key; // Set your secret key

                    var profileDataHandler = new ProfileDataInterface((mappings) => {
                        mappings.profile = ProfileData; // Set your profile data
                        fillr.performFill(mappings);

                        document.querySelectorAll("button[data-automation-id='address-book-action-buttons-on-continue']")[0].click();
                        setTimeout(function(){
                            document.querySelector(".use-address-validation.use-address").click();
                        },1500);
                        setTimeout(function(){
                            if(document.querySelectorAll("button[data-automation-id='address-book-action-buttons-on-continue']").length > 0){
                                document.querySelectorAll("button[data-automation-id='address-book-action-buttons-on-continue']")[0].click();
                            }
                        },5000);
                        
                    });
                    var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
                }

                if(document.getElementById("creditCard") != null){

                    var ProfileData = data2.ProfileData;
                    var devKey = data2.fillr_dev_key;// Set your dev key
                    var secretKey = data2.fillr_secret_key; // Set your secret key

                    var profileDataHandler = new ProfileDataInterface((mappings) => {
                        mappings.profile = ProfileData; // Set your profile data
                        fillr.performFill(mappings);

                        document.querySelectorAll("button[data-automation-id='save-cc']")[0].click();

                        ipcRenderer.sendToHost('automation-completion-other' , '1');
                    });
                    var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
                    }

            } else if(data2.platform_name == "kohls"){

                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key

                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);

                    if(document.querySelectorAll("div.button_continueto_review_order").length > 0){
                        document.querySelector("div.button_continueto_review_order").click();
                    }
                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
                
            } else if(data2.platform_name == "zappos"){
                
                if(document.querySelector("input[id='addressLine1']") != null){
                    var ProfileData = data2.ProfileData;
                    var devKey = data2.fillr_dev_key;// Set your dev key
                    var secretKey = data2.fillr_secret_key; // Set your secret key
                    var profileDataHandler = new ProfileDataInterface((mappings) => {
                        mappings.profile = ProfileData; // Set your profile data
                        fillr.performFill(mappings);

                        document.querySelector("button#add-bill-address").click();
                        ipcRenderer.sendToHost('automation-completion-other' , '1');
                    });
                    var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
                } else {
                    var ProfileData = data2.ProfileData;
                    var devKey = data2.fillr_dev_key;// Set your dev key
                    var secretKey = data2.fillr_secret_key; // Set your secret key
                    var profileDataHandler = new ProfileDataInterface((mappings) => {
                        mappings.profile = ProfileData; // Set your profile data
                        fillr.performFill(mappings);

                        document.querySelector("button#add-new-payment").click();

                        setTimeout(function(){
                            document.querySelector('a[data-te="TE_CHECKOUT_AL_GO_TO_ADD_NEW_BIL"]').click();
                        },3000);
                    });
                    var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
                }
                
            } else if(data2.platform_name == "newegg"){

                var ProfileData = data2.ProfileData;

                var x = ProfileData["ContactDetails.CellPhones.CellPhone.Number"].replace(/\D/g, '').match(/(\d{3})(\d{3})(\d{4})/);
                var masked_phone_number = '(' + x[1] + ') ' + x[2] + '-' + x[3];

                //document.querySelector("input[name='paymentmethod'][id='creditcard']").click();
                document.querySelector("input[name='IsBilling'][id='billingsameaddress']").click();        

                document.querySelector("input[id='Card_HolderNameNew']").value = ProfileData["CreditCards.CreditCard.NameOnCard"];
                document.querySelector("input[id='Card_CCNUMBERNEW']").value = ProfileData["CreditCards.CreditCard.Number"];
                document.querySelector("select[id='Card_exp_monthNew']").value = ProfileData["CreditCards.CreditCard.Expiry.Month"];
                document.querySelector("select[id='Card_exp_yearNew']").value = ProfileData["CreditCards.CreditCard.Expiry.Year"];
                document.querySelector("input[id='cvv2code']").value = ProfileData["CreditCards.CreditCard.CCV"];

                document.querySelector("input[id='SAddress1']").value = ProfileData["AddressDetails.BillingAddress.AddressLine1"];
                document.querySelector("input[id='SCity']").value = ProfileData["AddressDetails.BillingAddress.Suburb"];
                document.querySelector("select[id='SState_Option_USA']").value = ProfileData["AddressDetails.BillingAddress.AdministrativeArea"];
                document.querySelector("input[id='SZip']").value = ProfileData["AddressDetails.BillingAddress.PostalCode"];
                document.querySelector("input[id='ShippingPhone']").value = masked_phone_number;

                /** CUSTOM AUTOMATION **/
                var el = document.querySelector("input[id='SAddress1']");
                setNativeValue( el, ProfileData["AddressDetails.BillingAddress.AddressLine1"] );

                var el = document.querySelector("input[id='SCity']");
                setNativeValue( el, ProfileData["AddressDetails.BillingAddress.Suburb"] );

                var el = document.querySelector("select[id='SState_Option_USA']");
                setNativeValue( el, ProfileData["AddressDetails.BillingAddress.AdministrativeArea"] );

                var el = document.querySelector("input[id='SZip']");
                setNativeValue( el, ProfileData["AddressDetails.BillingAddress.PostalCode"] );

                var el = document.querySelector("input[id='ShippingPhone']");
                setNativeValue( el, masked_phone_number);

                document.querySelector("div.call-to-action-checkout div[id='btnCreditCard'] a").click();
                ipcRenderer.sendToHost('automation-completion-other' , '1');
                /** CUSTOM AUTOMATION **/

                document.querySelector("div.call-to-action-checkout div[id='btnCreditCard'] a").click();
                ipcRenderer.sendToHost('automation-completion-other' , '1');
                
            }/* else if(data2.platform_name == "etsy"){
                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);

                    document.querySelector(".new-buyer-payment-form input#cc-address").click();

                    document.querySelector("button[name='payment_submit']").click();

                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            }*/ else if(data2.platform_name == "modcloth"){
                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);

                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            } else if(data2.platform_name == "homedepot"){
                var month_arr = {"01":"01 - January","02":"02 - February","03":"03 - March","04":"04 - April","05":"05 - May","06":"06 - June","07":"07 - July",
                    "08":"08 - August","09":"09 - September","10":"10 - October","11":"11 - November","12":"12 - December"};

                var ProfileData = data2.ProfileData;
                document.querySelector("input[type='checkbox'][id='hdCheckBox_1']").click();

                var el = document.querySelector("payment input[id='cardNumber']");
                setNativeValue( el, ProfileData["CreditCards.CreditCard.Number"] );

                var month_from_arr = month_arr[ProfileData["CreditCards.CreditCard.Expiry.Month"]];
                var month_val = document.querySelector("payment select[id='ccMonth'] option[label='"+month_from_arr+"']").value;
                ipcRenderer.sendToHost('billing-html-content' , month_val);

                var year_val = document.querySelector("payment select[id='ccYear'] option[label='"+ProfileData["CreditCards.CreditCard.Expiry.Year"]+"']").value;
                ipcRenderer.sendToHost('billing-html-content' , year_val);

                var el = document.querySelector("payment select[id='ccMonth']");
                setNativeValue( el, month_val );

                var el = document.querySelector("payment select[id='ccYear']");
                setNativeValue( el, year_val );

                var el = document.querySelector("payment input[id='cvv']");
                setNativeValue( el, ProfileData["CreditCards.CreditCard.CCV"] );

                var el = document.querySelector("payment input[id='shippingAddress']");
                setNativeValue( el, ProfileData["AddressDetails.BillingAddress.AddressLine1"] );

                var el = document.querySelector("payment input[name='zip']");
                setNativeValue( el, ProfileData["AddressDetails.BillingAddress.PostalCode"] );

                ipcRenderer.sendToHost('automation-completion-other' , '1');
            } else if(data2.platform_name == "target"){

                var ProfileData = data2.ProfileData;

                document.querySelector('div[data-test="payment-credit-card-section"] button[data-test="add-new-payment-address-button"]').click();
                document.querySelector('div[data-test="payment-credit-card-section"] button[data-test="add-new-credit-card-button"]').click();

                setTimeout(function(){
                    var el = document.querySelector("input[id='creditCardInput-cardNumber']");
                    setNativeValue( el, ProfileData["CreditCards.CreditCard.Number"] );

                    var el = document.querySelector("input[id='creditCardInput-expiration']");
                    setNativeValue( el, ProfileData["CreditCards.CreditCard.Expiry.Month"]+"/"+ProfileData["CreditCards.CreditCard.Expiry.Year"] );

                    var el = document.querySelector("input[id='creditCardInput-cvv']");
                    setNativeValue( el, ProfileData["CreditCards.CreditCard.CCV"] );

                    var el = document.querySelector("input[id='creditCardInput-cardName']");
                    setNativeValue( el, ProfileData["CreditCards.CreditCard.NameOnCard"] );

                    var el = document.querySelector("input[id='addressFormInput-addressLine1']");
                    setNativeValue( el, ProfileData["AddressDetails.BillingAddress.AddressLine1"] );

                    var el = document.querySelector("input[id='addressFormInput-zipCode']");
                    setNativeValue( el, ProfileData["AddressDetails.BillingAddress.PostalCode"] );

                    var el = document.querySelector("input[id='addressFormInput-city']");
                    setNativeValue( el, ProfileData["AddressDetails.BillingAddress.Suburb"] );

                    var el = document.querySelector("select[id='addressFormInput-state']");
                    setNativeValue( el, ProfileData["AddressDetails.BillingAddress.AdministrativeArea"] );

                    var x = ProfileData["ContactDetails.CellPhones.CellPhone.Number"].replace(/\D/g, '').match(/(\d{3})(\d{3})(\d{4})/);
                    var masked_phone_number = '(' + x[1] + ') ' + x[2] + '-' + x[3];
                    var el = document.querySelector("input[id='addressFormInput-mobile']");
                    //el.value = masked_phone_number;
                    setNativeValue( el, masked_phone_number );

                    document.querySelector('div[data-test="payment-credit-card-section"] button[data-test="save-and-continue-button"]').click();

                    setTimeout(function(){
                        document.querySelector('div[data-test="payment-credit-card-section"] button[data-test="save-and-continue-button"]').click(); //Clicking same button for overcoming state required error.
                        ipcRenderer.sendToHost('automation-completion-other' , '1');
                    },2000);            
                },2000);

            }/* else if(data2.platform_name == "aliexpress"){

                var iframe = document.getElementById("poplay-order");
                //var elmnt = iframe.contentWindow.document.querySelector("div.switch-to-full a").click();

                iframe.contentWindow.document.querySelector("div.payment-info button.next-btn").click();
                iframe.contentWindow.document.querySelector("label.save-billing-title input[type='checkbox'][class='next-checkbox-input']").click();

                var el = iframe.contentWindow.document.querySelector("div.pay-detail div.new-card input#cardNo");
                setNativeValue( el, ProfileData["CreditCards.CreditCard.Number"] );

                var el = iframe.contentWindow.document.querySelector("div.pay-detail div.new-card input#cardHolder");
                setNativeValue( el, ProfileData["CreditCards.CreditCard.NameOnCard"] );

                var el = iframe.contentWindow.document.querySelector("div.pay-detail div.new-card input#expire");
                setNativeValue( el, ProfileData["CreditCards.CreditCard.Expiry.Month"]+"/"+ProfileData["CreditCards.CreditCard.Expiry.Year"] );

                var el = iframe.contentWindow.document.querySelector("div.pay-detail div.new-card input#cvc");
                setNativeValue( el, ProfileData["CreditCards.CreditCard.CCV"] );
            }*/ else if(data2.platform_name == "costco"){
                document.querySelector("div.payment-radio input#radio-credit-card").click();

                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);

                    /*var iframe = document.querySelector("div#cc-payment-block iframe.gw-proxy-number");
                    //ipcRenderer.sendToHost('billing-html-content' , iframe);
                    //iframe.contentWindow.document.querySelector("input[type='tel']").value = ProfileData["CreditCards.CreditCard.Number"];

                    var el = iframe.contentWindow.document.querySelector("input[type='tel']");
                    setNativeValue( el, ProfileData["CreditCards.CreditCard.Number"] );

                    //ipcRenderer.sendToHost('billing-html-content' , iframe.contentWindow.document.querySelector("input[type='tel']").length);

                    document.querySelector("input[name='place-order']").click();*/
                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            } else if(data2.platform_name == "sears"){
                document.querySelector("div.credit-card-selection div.add-new-address a.add-new-addr").click();

                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);
                    document.querySelector("div.address-buttons button[link-name='Submit Address']").click();
                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            } else if(data2.platform_name == "overstock"){
                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);
                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            } else if(data2.platform_name == "groupon"){
                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);
                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            } else if(data2.platform_name == "walgreens"){
                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);

                    document.querySelector("div.wag-ship-address-text button.wag-cac-pay-btn").click();
                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            } else if(data2.platform_name == "macys"){
                document.querySelector("input#rc-use-shipping").click();
                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);
                    //document.querySelector("button#rc-payment-continue").click();
                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            } else if(data2.platform_name == "lowes"){
                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);
                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            } else if(data2.platform_name == "staples"){
                ipcRenderer.sendToHost('billing-html-content' , "INSIDE STAPLES");
                ipcRenderer.sendToHost('automation-completion-other' , '1');

                /*var el = document.querySelector("input[name='isBillingAddressSameAsShipping']");
                setNativeValue( el, false );*/

                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);

                /*//document.querySelector(".shipping-tile__labelLinkName").click();
                var iframe = document.getElementById("paymentGuest");
                ipcRenderer.sendToHost('billing-html-content' , iframe.contentWindow.document.body.innerHTML);

                iframe.contentWindow.document.querySelector('input[id="cardNum"]').value = ProfileData["CreditCards.CreditCard.Number"];

                iframe.contentWindow.document.querySelector('input[id="expDate"]').value = ProfileData["CreditCards.CreditCard.Expiry.Month"]+"/"+ProfileData["CreditCards.CreditCard.Expiry.Year"];

                iframe.contentWindow.document.querySelector('input[id="secCode"]').value = ProfileData["CreditCards.CreditCard.CCV"];
                //ipcRenderer.sendToHost('automation-completion-other' , '1');*/
            } else if(data2.platform_name == "bhphotovideo") {

                document.querySelector("span.change-billing").click();
                document.querySelector("div.addNewAddress").click();

                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);

                    var el = document.querySelector('input[name="zip"]');
                    setNativeValue( el, ProfileData["AddressDetails.BillingAddress.PostalCode"] );

                    document.querySelector('button[data-selenium="saveAddress"]').click();
                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            } else if(data2.platform_name == "barnesandnoble") {

                document.querySelector("input[type='checkbox']#useShippingAddress").click();

                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);

                    var el = document.querySelector('select[id="ccMonth"]');
                    var exp_month = ProfileData["CreditCards.CreditCard.Expiry.Month"];
                    exp_month = exp_month.replace(/^0+/, '');
                    setNativeValue( el, exp_month );

                    var el = document.querySelector('select[id="ccYear"]');
                    setNativeValue( el, ProfileData["CreditCards.CreditCard.Expiry.Year"] );

                    document.querySelector('button.order-summary__btn--checkout').click();
                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            } else if(data2.platform_name == 'petsmart') {
                document.querySelector("input#billing-address").click();
                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);

                    document.querySelector('button#payment-Btn').click();
                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            } else if(data2.platform_name == '1800flowers') {
                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);
                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            } else if(data2.platform_name == 'ralphlauren') {
                document.querySelector("input#dwfrm_singleshipping_shippingAddress_useAsBillingAddress").click();

                var ProfileData = data2.ProfileData;
                var devKey = data2.fillr_dev_key;// Set your dev key
                var secretKey = data2.fillr_secret_key; // Set your secret key
                var profileDataHandler = new ProfileDataInterface((mappings) => {
                    mappings.profile = ProfileData; // Set your profile data
                    fillr.performFill(mappings);

                    document.querySelector('div.summary button.mini-summary-btn').click();

                    ipcRenderer.sendToHost('automation-completion-other' , '1');
                });
                var fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            }
            
        }
    },1000);
});