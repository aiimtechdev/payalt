var logged_user_id = localStorage.getItem('logged_user_id');
var site_url = getUrlParameter("siteurl");
var automatic_prefill = '';
var automatic_prefill_payment = '';
var automatic_completion = '';
var automatic_failure = '';
var pay_details = '';
var trans_id = '';

var autofill_address = '';
var autofill_card = '';
var trans_bitcoin_address = '';

var timeout_aliantpay = '';
var interval_timer = '';

if(typeof logged_user_id != 'undefined' && logged_user_id != '' && logged_user_id != null){
    $("#show_logged_users").css("visibility","visible");
    loadBalance(logged_user_id);
}else{
    $("#show_logged_users").css("visibility","hidden");
    $("#login_box").show();
}
function isNumber(evt) {
    evt = (evt) ? evt : window.event;
    var charCode = (evt.which) ? evt.which : evt.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        return false;
    }
    return true;
}
function numberWithCommas(x) {
    x = parseFloat(x).toFixed(2);
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    var ret = parts.join(".");
    return ret;
}
function scrapAgain(){
    var webview = document.getElementById('view');
    webview.send("re-scrap", "Re-Scrap");
}

// Get the modal
var billing_popup = document.getElementById('billing_popup');
var crypto_popup = document.getElementById('crypto_popup');
var cryptoselect_popup = document.getElementById('cryptoselect_popup');
var processing_popup = document.getElementById('processing_popup');
var payment_popup = document.getElementById('payment_popup');
var oauth_popup = document.getElementById('oauth_popup');
var payselection_popup = document.getElementById('payselection_popup');
var preload_amount_popup = document.getElementById('preload_amount_popup');

// Get the <span> element that closes the modal
var billing_popup_span = document.getElementsByClassName("billing_popup_close")[0];
billing_popup_span.onclick = function() {
    billing_popup.style.display = "none";
}

var crypto_popup_span = document.getElementsByClassName("crypto_popup_close")[0];
crypto_popup_span.onclick = function() {
    crypto_popup.style.display = "none";
}

var cryptoselect_popup_span = document.getElementsByClassName("cryptoselect_popup_close")[0];
cryptoselect_popup_span.onclick = function() {
	$("#cryptoselect_popup").modal("hide");
    //cryptoselect_popup.style.display = "none";
}

var payselection_popup_span = document.getElementsByClassName("payselection_popup_close")[0];
payselection_popup_span.onclick = function() {
    payselection_popup.style.display = "none";
}

var preload_amount_popup_span = document.getElementsByClassName("preload_amount_popup_close")[0];
preload_amount_popup_span.onclick = function() {
    preload_amount_popup.style.display = "none";
}

var processing_popup_span = document.getElementsByClassName("processing_popup_close")[0];
processing_popup_span.onclick = function() {
    processing_popup.style.display = "none";
    payment_popup.style.display = "none";
    swal("","If you have already manually sent crypto to the wallet address provided, it will take up to 3 hours to process. We will email you when your crypto credit card is ready. Do not click \"Pay Now!\" again otherwise you may be charged a second time. If you did not send the original amount asked, click \"Pay Now!\" again.","warning");
}

var payment_popup_span = document.getElementsByClassName("payment_popup_close")[0];
payment_popup_span.onclick = function() {
    if(trans_id != ''){
        $(".overlayloading,.overlaymain").show();
        $.ajax({
            url: site_url+'/trans/canceltransaction',
            data: {logged_user_id: logged_user_id, transaction_id: trans_id},
            type: 'POST',
            success: function (data) {
                $(".overlayloading,.overlaymain").hide();
                payment_popup.style.display = "none";
                if(typeof interval_timer !== "undefined"){
                    clearInterval(interval_timer);
                    $("#payment_popup .modal-footer").css("display","none");
                    $("#payment_popup .modal-footer").html('');
                }
            },
            error: function (err) {
                $(".overlayloading,.overlaymain").hide();
                payment_popup.style.display = "none";
                if(typeof interval_timer !== "undefined"){
                    clearInterval(interval_timer);
                    $("#payment_popup .modal-footer").css("display","none");
                    $("#payment_popup .modal-footer").html('');
                }
            }
        });
    } else {
        payment_popup.style.display = "none";
        if(typeof interval_timer !== "undefined"){
            clearInterval(interval_timer);
            $("#payment_popup .modal-footer").css("display","none");
            $("#payment_popup .modal-footer").html('');
        }
    }
}

var oauth_popup_span = document.getElementsByClassName("oauth_popup_close")[0];
oauth_popup_span.onclick = function() {
    if(trans_id != ''){
        $(".overlayloading,.overlaymain").show();
        $.ajax({
            url: site_url+'/trans/canceltransaction',
            data: {logged_user_id: logged_user_id, transaction_id: trans_id},
            type: 'POST',
            success: function (data) {
                $(".overlayloading,.overlaymain").hide();
                swal("",data.txt,"error");
                var oauth_view = document.getElementById('oauth_view');
                oauth_view.remove();
				
				$("#oauth_popup").modal("hide");
                //oauth_popup.style.display = "none";
                payment_popup.style.display = "none";
            },
            error: function (err) {
                $(".overlayloading,.overlaymain").hide();
                var oauth_view = document.getElementById('oauth_view');
                oauth_view.remove();
				$("#oauth_popup").modal("hide");
                //oauth_popup.style.display = "none";
                payment_popup.style.display = "none";
            }
        });
    } else {
        var oauth_view = document.getElementById('oauth_view');
        oauth_view.remove();
		$("#oauth_popup").modal("hide");
        //oauth_popup.style.display = "none";
        payment_popup.style.display = "none";
    }
}

function show_loading_animation()
{
    $(".overlaymain,.overlayloading").show();
}

function hide_loading_animation()
{
    $(".overlaymain,.overlayloading").hide();
}

webview.addEventListener('new-window', (e) => {
    webview.loadURL(e.url);
});
function getUserTransactions(){
    $(".overlaymain,.overlayloading").show();
    $.ajax({
        url: site_url+'/trans/get_user_transactions',
        data: {logged_user_id: logged_user_id},
        dataType: 'json',
        type: 'POST',
        success: function (data) {
            $(".overlaymain,.overlayloading").hide();
            $("#latestPurchasesTable").html(data.content);
        }, error: function(data) {
            $(".overlaymain,.overlayloading").hide();
            $("#latestPurchasesTable").html('<div style="font-size:14px;padding: 20px;" class="italic">No Transactions Found</div>');
        }
    });
}
async function captureCurrPage(){
	var webview = document.getElementById('view');
	var capture = await webview.capturePage();
	var pr = capture.toDataURL();
	return pr;
}
$(document).ready(function(){
	if(logged_user_id != '' && logged_user_id != null){
        getUserTransactions();
    }
    webview.addEventListener("dom-ready", event => {
        webview.blur();
        webview.focus();
        //webview.openDevTools();
    });
    $("a.billing_dollar").html('<i class="fa fa-credit-card"></i>').css({"font-size": "2.5em","padding": "20px","line-height": "45px"});
    $("#login_box .modal-title").html("Login to start shopping with crypto.");
    $('#currency_form').validate({
        ignore: [],
    });
    setTimeout(function(){
        $(".overlaybck").hide();
    },3000);
    $(document).on("click",".closesrch",function(){
        $(".overlaybck").hide();
    });
});

$(document).on("click",".socio_button",function(e){
    e.preventDefault();
    e.stopImmediatePropagation();
    var link = $(this).attr("href");
    var id = $(this).attr("id");
    if(id == "fb_link"){
        link = 'https://www.facebook.com/sharer/sharer.php?u=payalt.com&quote=I joined PayAlt and can now shop with crypto anywhere online for free!';
    } else if(id == "twitter_link"){
        link = 'https://twitter.com/intent/tweet?url=https%3A%2F%2Fpayalt.com&text=I%20joined%20PayAlt%20and%20can%20now%20shop%20with%20crypto%20anywhere%20online%20for%20free!';
    } else if(id == "linkedin_link"){
        link = 'http://www.linkedin.com/shareArticle?mini=true&url=https%3A%2F%2Fpayalt.com&title=I%20joined%20PayAlt%20and%20can%20now%20shop%20with%20crypto%20anywhere%20online%20for%20free!';
    } else if(id == "tumblr_link"){
        link = 'http://www.tumblr.com/share?v=3&u=https%3A%2F%2Fpayalt.com&t=I%20joined%20PayAlt%20and%20can%20now%20shop%20with%20crypto%20anywhere%20online%20for%20free!';
    } else if(id == "pinterest_link"){
        link = 'http://pinterest.com/pin/create/button/?url=https%3A%2F%2Fpayalt.com&media=&description=I%20joined%20PayAlt%20and%20can%20now%20shop%20with%20crypto%20anywhere%20online%20for%20free!';
    } else if(id == "reddit_link"){
        link = 'https://www.reddit.com/submit?url=payalt.com&title=I joined PayAlt and can now shop with crypto anywhere online for free!';
    }
    window.open(link,'PayAlt','toolbar=0,status=0,width=700,height=700');
});

$(document).on("click","#pop_close",function(e) {
    swal.close();
});

$(document).on("click",".coinbase_authorize_ip", function(){
    var confrm_url = $("#coinbase_confirmation_url").val();
    if(confrm_url == ""){
        $("#coinbase_confirmation_url").addClass("error");
    } else {
        $("#coinbase_confirmation_url").removeClass("error");
        if($("#coinbase_confirm").length > 0){
            $("#coinbase_confirm").html('');
            $("#coinbase_confirm").html('<webview id="coinbase_confirm_view" class="coinbase_confirm_page" src="'+confrm_url+'" autosize="on" allowpopups="on"></webview>');
            $("#coinbase_confirmation_url").val("");
        }
    }
});

/*$(document).on("click", ".pymt_select", function(){
    var thiss = $(this);
    $(".pymt_select").removeClass("active");
    thiss.addClass("active");
    
    const wrapper = document.createElement('div');
    wrapper.innerHTML = "<div style='width:100%;display:table-cell;vertical-align:middle;'>Are you sure you want to select this payment method?</div>";
    
    swal({
        title: "Confirmation",
        content: wrapper,
        buttons: {
            confirm: {
                text: "YES",
                value: true,
                confirm: true
            },cancelbutton: {
                text: "NO",
                value: false,
                cancel: true
            }
        },
        dangerMode: true,
    }).then((willDelete) => {
        if (willDelete) {
            var value = thiss.data("value");
            if(value == 'aliantpay'){
                if(typeof logged_user_id != 'undefined' && logged_user_id != '' && logged_user_id != null){
                    crypto_popup.style.display = "none";
                    $(".overlaymain,.overlayloading").show();
                    bitcoin_transaction("","");
                }
            }
        } else {
            $(".pymt_select").removeClass("active");
        }
    });
});*/

$(document).on("click", "#logout", function(){
    localStorage.setItem('logged_user_id',"");
    if(typeof localStorage.logged_user_id != "undefined"){
        localStorage.removeItem("logged_user_id");
    }
    window.location.reload();
});

$(document).on("submit", "#login_form", function(e){
    e.preventDefault();
    var valid = $("#login_form").valid();
    if(valid == true){
        $(".overlayloading,.overlaymain").show();
        $.ajax({
            url: site_url+'/trans/shopnow_login',
            data: $("#login_form").serialize(),
            type: 'POST',
            success: function (data) {
                $(".overlayloading,.overlaymain").hide();
                if(data.msg == "success"){
                    $(".login_err_msg").html("");
                    localStorage.setItem('logged_user_id',data.logged_user_id);
                    window.location.reload();
                }else if(data.msg == "error"){
                    $(".login_err_msg").html(data.err_msg);
                    $(".login_err_msg").show();
                }
            },
            error: function (err) {
                $(".overlayloading,.overlaymain").hide();
                swal("","Error in login.  Try again later","error");
            }
        });
    }
});
$(document).on("click", "#forcecheckout", function(){
    $("#paywithcryto").addClass("paywithcrytoactive");
});

$(document).on("click", "a#paywithcryto", function(){
    $(this).addClass("paywithcrytoactive");
    //paynowPopup();
    
    $(".overlayloading,.overlaymain").show();
    $.ajax({
        url: site_url+'/trans/check_crypto_card',
        data: {logged_user_id: logged_user_id},
        type: 'POST',
        success: function (data) {
            $(".overlayloading,.overlaymain").hide();
            if(data.msg == "nouser"){
                swal("","You need to login first","error");
            } else if(data.msg == "available"){
                const wrapper_confirm = document.createElement('div');
                wrapper_confirm.innerHTML = "To load a crypto credit card, click \"Add Funds\". After adding funds, to see your crypto credit card number, click \"Card Info\"";
                swal({
                    title: "",
                    content: wrapper_confirm,
                    icon: "warning",
                    buttons: {
                        confirm: {
                            text: "ADD FUNDS",
                            confirm: true,
                            value: "addfunds"
                        },
                        manualenter: {
                            text: "CARD INFO",
                            value: "load"
                        }
                    },
                }).then((value) => {
                    if(value == "addfunds") {
                        $("#preload_amount_popup").modal("show");
                    } else if(value == "load") {
                        $(".overlayloading,.overlaymain").show();
                        $.ajax({
                            url: site_url+'/trans/load_crypto_card',
                            data: {logged_user_id: logged_user_id},
                            type: 'POST',
                            success: function (data) {
                                $(".overlayloading,.overlaymain").hide();
                                if(data.msg == "success"){
                                    data_details = data.dataarray;
                                    if(typeof data_details.billing != "undefined" && data.billing != ""){
                                        var datetime = data_details.pymt.expdt;
                                        var datetm = new Date(datetime);
                                        var ccMonth = datetm.getMonth() + 1;
                                        var ccYear = datetm.getFullYear().toString().substr(-2);

                                        var html_popup = '';
                                        html_popup += '<div style="padding: 15px;line-height:25px;">';
                                        html_popup += '<div><span style="font-weight: bold;">CC#:</span> '+data_details.pymt.crdno+'</div>';
                                        html_popup += '<div><span style="font-weight: bold;">Exp:</span> '+ccMonth+'/'+ccYear+'</div>';
                                        html_popup += '<div><span style="font-weight: bold;">CVV:</span> '+data_details.pymt.cvv+'</div>';

                                        html_popup += '<div style="font-weight: bold;font-size: 20px;">Billing Details</div>';
                                        html_popup += '<div><span style="font-weight: bold;">First Name:</span> '+data_details.billing.billing_details.first_name+'</div>';
                                        html_popup += '<div><span style="font-weight: bold;">Last Name:</span> '+data_details.billing.billing_details.last_name+'</div>';
                                        html_popup += '<div><span style="font-weight: bold;">Street:</span> '+data_details.billing.billing_details.street+'</div>';
                                        html_popup += '<div><span style="font-weight: bold;">City / State:</span> '+data_details.billing.billing_details.city+'/'+data_details.billing.billing_details.state+'</div>';
                                        html_popup += '<div><span style="font-weight: bold;">Zipcode:</span> '+data_details.billing.billing_details.zipcode+'</div>';
                                        if(data_details.billing.shopper_data.length > 0 && typeof data_details.billing.shopper_data[0] != "undefined"){
                                            sh_email = data_details.billing.shopper_data[0].email;
                                            sh_phone = data_details.billing.shopper_data[0].phone_number;
                                            html_popup += '<div><span style="font-weight: bold;">Email:</span> '+sh_email+'</div>';
                                            html_popup += '<div><span style="font-weight: bold;">Phone:</span> '+sh_phone+'</div>';
                                        }
                                        html_popup += '</div>';

                                        $(".billing_dollar").show();
                                        $("#paywithcryto span").html('$'+numberWithCommas(data_details.availableBalance));
                                        
                                        var spantxt = document.createElement("span");
                                        spantxt.innerHTML = "Click the <i class='fa fa-credit-card'></i> (\"credit card icon\") to the right to see your card number. You can use the credit card number anywhere VISA is accepted.";
                                        swal({
                                            html: true,
                                            title: "",
                                            content: spantxt,
                                            type: "success",
                                            icon: "success"
                                        });
                                        
                                        $('[data-toggle=popover]').popover({
                                            html : true,
                                            placement: "right",
                                            content: function() {
                                                return html_popup;
                                            }
                                        });
                                        
                                        /** AUTOFILL ADDED ADDITIONAL FOR CARD **/
                                        $.ajax({
                                            url: site_url+'/trans/user_card_details',
                                            data: {logged_user_id: logged_user_id},
                                            type: 'POST',
                                            success: function (data) {
                                                if(data.msg == "success"){
                                                    addr_details = data.retarray;
                                                    var webview = document.getElementById('view');
                                                    autofill_card = "";
                                                    webview.send("autofill-info", addr_details);
                                                }
                                            }
                                        });
                                        /** AUTOFILL ADDED ADDITIONAL FOR CARD **/
                                    }
                                } else if(data.msg == "error"){
                                    swal("",data.txt,"error");
                                }
                            }
                        });
                    }
                });
            } else {
                $("#preload_amount_popup").modal("show");
            }
        }
    });
});

/*$(document).on("click", "a.paywithcrytoactive", function(){
    paynowPopup();
});*/

$(document).on("click", "#custom_payment_amount", function(){
    var valid = $("#pymt_amt_form").valid();
    if(valid){
        var value = $("#payment_amount_set").val();
        const wrapper = document.createElement('div');
        wrapper.innerHTML = "<div><div style='width:100%;display:table-cell;vertical-align:middle;'>Are you sure that the amount that you entered, <b>$"+numberWithCommas(value)+"</b>, is the amount that you would like to submit?</div></div>";

        swal({
            title: "Confirmation",
            content: wrapper,
            buttons: {
                cancelbutton: {
                    text: "EDIT",
                    value: false,
                    cancel: true
                },
                confirm: {
                    text: "SUBMIT",
                    value: true,
                    confirm: true
                }
            },
            dangerMode: true,
        }).then((willDelete) => {
            if (willDelete) {
                var value = $("#payment_amount_set").val();

                var add_fees = value * 0;
                add_fees = add_fees.toFixed(2);
                var total_amt = parseFloat(value) + parseFloat(add_fees);
                total_amt = total_amt.toFixed(2);
                
                $("#payment_amount_set_two").val(total_amt);
                $(".chk_amt_disp").html('$'+numberWithCommas(total_amt));
                //getExchangeRate(total_amt);
                $("#payment_amt_disp").html('<div style="font-size: 14px;text-align: left;margin-bottom: 15px;">Total Amount: $'+numberWithCommas(total_amt)+'</div>');
                $("#payment_amount").val(total_amt);
                $("#checkout_amount").val(value);
                $("#charge_amount").val(add_fees);

                $("#custom_amount_popup").modal("hide");
            }
        });
    }
});

/*$(document).on("click", "#mark_completed", function(){
    const wrapper = document.createElement('div');
    wrapper.innerHTML = "<div style='width:100%;display:table-cell;vertical-align:middle;'>Are you sure you want to mark this transaction as completed?</div>";
    
    swal({
        title: "Confirmation",
        content: wrapper,
        buttons: {
            confirm: {
                text: "YES",
                value: true,
                confirm: true
            },
            cancelbutton: {
                text: "NO",
                value: false,
                cancel: true
            }            
        },
        dangerMode: true,
    }).then((willDelete) => {
        if (willDelete) {
            $(".overlayloading,.overlaymain").show();
            webview.getWebContents().capturePage((img) => {
                img = img.toDataURL();
                $.ajax({
                    url: site_url+'/trans/mark_trans_finish',
                    data: {logged_user_id: logged_user_id, transaction_id: trans_id, img: img},
                    type: 'POST',
                    success: function (data) {
                        automatic_prefill = '';
                        automatic_prefill_payment = '';
                        automatic_completion = '';
                        automatic_failure = '';

                        $(".overlayloading,.overlaymain").hide();
                        if(data.msg == "success"){
                            swal("","Transaction Completed Successfully","success");
                            setTimeout(function(){
                                window.location.reload();
                            },3000);
                        }else if(data.msg == "error"){
                            swal("","Error in Processing.  Try again later","error");
                        }
                    },
                    error: function (err) {
                        automatic_prefill = '';
                        automatic_prefill_payment = '';
                        automatic_completion = '';
                        automatic_failure = '';

                        $(".overlayloading,.overlaymain").hide();
                        swal("","Error in Processing.  Try again later","error");
                    }
                });
            });
        }
    });
});*/

$(document).on("click", ".manual_select", function(){
    payselection_popup.style.display = "none";
    
    $("#payment_popup .modal-footer").css("display","inline-block");
    $("#payment_popup .modal-footer").html('<div class="row">\n\
        <div class="col-md-8 col-sm-8 col-xs-8" style="vertical-align: middle;">Scan QR code or send using Wallet Address. <a href="javascript:void(0);" style="text-decoration:underline;color: #fff;">Click Here</a> to login to your Exchange and manually send crypto.</div>\n\
        <div class="col-md-4 col-sm-4 col-xs-4">\n\
            <div style="margin: 5px auto 0 auto;font-weight:bold;">\n\
                <div id="timer-count" style="margin: 0 auto;display: inline;font-weight: bold;font-size: 30px;">15:00</div> <div style="display: inline;vertical-align: text-bottom;padding-left: 5px;"> minutes</div>\n\
            </div>\n\
        </div>\n\
    </div>');
    
    var duration = 900, display = $('#timer-count');
    var timer = duration, seconds;
    interval_timer = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);
        
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        display.html(minutes + ":" + seconds);
        
        if (--timer < 0) {
            clearInterval(interval_timer);
            $("#payment_popup .modal-footer").html("");
            $("#payment_popup .modal-footer").css("display","none");
            processing_popup.style.display = "block";
        }
    }, 1000);
});
$(document).on("click", ".exchange_select", function(){
    var id = $(this).attr("id");
    if(id == "coinbase"){
        if(trans_bitcoin_address != ''){
            payselection_popup.style.display = "none";
            coinbase_oauth("");
        } else {
            $(".overlayloading,.overlaymain").hide();
            swal("","Unable to get bitcoin address for the transaction","error");
        }
    }
});

function coinbase_oauth(reauth){
    //swal("",trans_bitcoin_address,"success");
    //return;

    $(".overlayloading,.overlaymain").show();
    $.ajax({
        url: site_url+'/trans/coinbase_oauth_init',
        data: {logged_user_id: logged_user_id,reauth: reauth},
        type: 'POST',
        success: function (data) {
            $(".overlayloading,.overlaymain").hide();
            if(data.msg == "success"){
                exchange_coinbase_transaction();
            }else if(data.msg == "noaccount"){
                if(data.oauth_url != ''){
					$("#oauth_popup").modal("show");
                    //oauth_popup.style.display = "block";
                    oauth_url = data.oauth_url;
                    
                    $("#oauth_views").html('');
                    $("#oauth_views").html('<webview id="oauth_view" class="oauth_page" src="'+oauth_url+'" autosize="on" allowpopups="on"></webview>');

                    var oauth_views = document.getElementById('oauth_view');
                    oauth_views.addEventListener('did-finish-load', function(){
                        oauth_webview_url = oauth_views.getURL();
                        let url = new URL(oauth_webview_url);
                        let searchParams = new URLSearchParams(url.search);
                        if(searchParams.get('code') != '' && searchParams.get('code') != null){
                            $("#oauth_popup").modal("hide");
							//oauth_popup.style.display = "none";
                            oauth_views.remove();
                            $(".overlayloading,.overlaymain").show();
                            var code = searchParams.get('code');
                            $.ajax({
                                url: site_url+'/trans/coinbase_oauth',
                                data: {logged_user_id: logged_user_id,code:code},
                                type: 'POST',
                                success: function (data) {
                                    $(".overlayloading,.overlaymain").hide();
                                    if(data.msg == "success"){
                                        exchange_coinbase_transaction();
                                    } else if(data.msg == "error"){
                                        swal("",data.txt,"error");
                                    }
                                }
                            });
                        }
                    });
                } else {
                    swal("","Error in authentication.  Try again later","error");
                }
            }else if(data.msg == "error"){
                swal("",data.txt,"error");
            }
        },
        error: function (err) {
            $(".overlayloading,.overlaymain").hide();
            swal("","Error in login.  Try again later","error");
        }
    });
}
function createVirtualCard(logged_user_id,trans_id){
    $.ajax({
        url: site_url+'/trans/create_virtual_card',
        data: {logged_user_id: logged_user_id,trans_id:trans_id},
        type: 'POST',
        success: function (data) {
            if(data.msg == "success"){
                setTimeout(function(){
                    checkCardCreated(logged_user_id,trans_id);
                },10000);
            } else if(data.msg == "success_existing"){
                markFinishTrans(logged_user_id,trans_id,data,"existing");
            } else if(data.msg == "error"){
                //$(".overlaycardcreation,.overlaymain").hide();
                $(".overlaycardcreation").modal('hide');
                $(".overlaymain").hide();
                swal("",data.txt,"error");
            }
        }
    });
}
function checkCardCreated(logged_user_id,trans_id){
    tab_url = webview.getURL();
    $.ajax({
        url: site_url+'/trans/check_virtual_card',
        data: {logged_user_id: logged_user_id,trans_id:trans_id,tab_url:tab_url},
        type: 'POST',
        success: function (data) {
            if(data.msg == 'failed'){
                setTimeout(function(){
                    checkCardCreated(logged_user_id,trans_id);
                },10000);
            } else if(data.msg == 'success') {
                markFinishTrans(logged_user_id,trans_id,data,"new");
                loadBalance(logged_user_id); //For Loading Card Balance in top at 5 sec interval
            }
        }, error: function (data) {
            setTimeout(function(){
                checkCardCreated(logged_user_id,trans_id);
            },10000);
        }
    });
}
function markFinishTrans(logged_user_id,trans_id,datares,cardtyp){
	var img = captureCurrPage();
    $.ajax({
		url: site_url+'/trans/mark_trans_finish',
		data: {logged_user_id: logged_user_id, transaction_id: trans_id, img: img},
		type: 'POST',
		success: function (dataret) {
			//$(".overlaycardcreation,.overlaymain").hide();
			$(".overlaycardcreation").modal("hide");
			$(".overlaymain").hide();

			data_details = datares.dataarray;
			if(typeof data_details.billing != "undefined" && datares.billing != ""){
				var datetime = data_details.pymt.expdt;
				var datetm = new Date(datetime);
				var ccMonth = datetm.getMonth() + 1;
				var ccYear = datetm.getFullYear().toString().substr(-2);

				var html_popup = '';
				html_popup += '<div style="padding: 15px;line-height:25px;">';
				html_popup += '<div><span style="font-weight: bold;">CC#:</span> '+data_details.pymt.crdno+'</div>';
				html_popup += '<div><span style="font-weight: bold;">Exp:</span> '+ccMonth+'/'+ccYear+'</div>';
				html_popup += '<div><span style="font-weight: bold;">CVV:</span> '+data_details.pymt.cvv+'</div>';

				html_popup += '<div style="font-weight: bold;font-size: 20px;">Billing Details</div>';
				html_popup += '<div><span style="font-weight: bold;">First Name:</span> '+data_details.billing.billing_details.first_name+'</div>';
				html_popup += '<div><span style="font-weight: bold;">Last Name:</span> '+data_details.billing.billing_details.last_name+'</div>';
				html_popup += '<div><span style="font-weight: bold;">Street:</span> '+data_details.billing.billing_details.street+'</div>';
				html_popup += '<div><span style="font-weight: bold;">City / State:</span> '+data_details.billing.billing_details.city+'/'+data_details.billing.billing_details.state+'</div>';
				html_popup += '<div><span style="font-weight: bold;">Zipcode:</span> '+data_details.billing.billing_details.zipcode+'</div>';
				if(data_details.billing.shopper_data.length > 0 && typeof data_details.billing.shopper_data[0] != "undefined"){
					sh_email = data_details.billing.shopper_data[0].email;
					sh_phone = data_details.billing.shopper_data[0].phone_number;
					html_popup += '<div><span style="font-weight: bold;">Email:</span> '+sh_email+'</div>';
					html_popup += '<div><span style="font-weight: bold;">Phone:</span> '+sh_phone+'</div>';
				}
				html_popup += '</div>';

				$(".billing_dollar").show();
				$("#paywithcryto span").html('$'+numberWithCommas(data_details.availableBalance));
				/*if(cardtyp == "existing"){
					swal("","Your crypto has been converted and your money has been loaded to a new crypto credit card. You are ready to pay! Click \"OK\", review and place your order. If your credit card number hasn't been automatically entered into the website, you can manually do so by clicking the \"$\" button on the left to view your card information.","success");
				} else {
					swal("","Your crypto has been converted and your money has been loaded to a new crypto credit card. You are ready to pay! Click \"OK\", review and place your order. If your credit card number hasn't been automatically entered into the website, you can manually do so by clicking the \"$\" button on the left to view your card information.","success");
				}*/
				var spantxt = document.createElement("span");
				spantxt.innerHTML = "Congratulations, you just added money to a crypto credit card and it's ready to use. Click the <i class='fa fa-credit-card'></i> (\"credit card icon\") to the right to see your card number. You can use the credit card number anywhere VISA is accepted.";
				swal({
					html: true,
					title: "",
					content: spantxt,
					type: "success",
					icon: "success"
				});
				
				$('[data-toggle=popover]').popover({
					html : true,
					placement: "right",
					content: function() {
						return html_popup;
					}
				});

				/** AUTOFILL ADDED ADDITIONAL FOR CARD **/
				$.ajax({
					url: site_url+'/trans/user_card_details',
					data: {logged_user_id: logged_user_id},
					type: 'POST',
					success: function (data) {
						if(data.msg == "success"){
							addr_details = data.retarray;
							var webview = document.getElementById('view');
							autofill_card = "";
							webview.send("autofill-info", addr_details);
						}
					}
				});
				/** AUTOFILL ADDED ADDITIONAL FOR CARD **/
			}
		}
	});
}
function checkTransactionCompleted(trans_id,bitcoin_sale_id){
    
    if(typeof logged_user_id != 'undefined' && logged_user_id != '' && logged_user_id != null){
        shopper_id = logged_user_id;
    }
    $.ajax({
        url: site_url+'/trans/check_completed',
        data: {shopper_id:shopper_id,trans_id:trans_id,bitcoin_sale_id: bitcoin_sale_id},
        dataType: 'json',
        type: 'POST',
        success: function (data) {
            if(data.msg == "completed"){
                payment_popup.style.display = "none";
                processing_popup.style.display = "none";
                //$(".overlaycardcreation,.overlaymain").show();
                $(".overlaycardcreation").modal({backdrop: 'static',keyboard: false});
                $(".overlaymain").show();
                createVirtualCard(shopper_id,trans_id);
            } else if(data.msg == "processing"){
                processing_popup.style.display = "block";
                setTimeout(function(){
                    checkTransactionCompleted(trans_id,bitcoin_sale_id);
                },10000);
            } else if(data.msg == "failed" || data.msg == "expired" || data.msg == "cancelled"){
                /*payment_popup.style.display = "none";
                processing_popup.style.display = "none";
                if(typeof data.txt != "undefined" && data.txt != ''){
                    swal("",data.txt,"error");
                } else {
                    swal("","Error in processing transaction.","error");
                }*/
            } else if(data.msg == "manual_cancelled") {
                
            } else if(data.msg == "stoploop"){
                
            } else {
                setTimeout(function(){
                    checkTransactionCompleted(trans_id,bitcoin_sale_id);
                },10000);
            }
        },
        error: function (err) {
            setTimeout(function(){
                checkTransactionCompleted(trans_id,bitcoin_sale_id);
            },10000);
        }
    });
}
function checkTransactionCompletedNew(trans_id,bitcoin_sale_id){
    if(typeof logged_user_id != 'undefined' && logged_user_id != '' && logged_user_id != null){
        shopper_id = logged_user_id;
    }
    $.ajax({
        url: site_url+'/trans/check_completed_new',
        data: {shopper_id:shopper_id,trans_id:trans_id,bitcoin_sale_id: bitcoin_sale_id},
        dataType: 'json',
        type: 'POST',
        success: function (data) {
            if(data.msg == "completed"){
                payment_popup.style.display = "none";
                processing_popup.style.display = "none";
                //$(".overlaycardcreation,.overlaymain").show();
                $(".overlaycardcreation").modal({backdrop: 'static',keyboard: false});
                $(".overlaymain").show();
                createVirtualCard(shopper_id,trans_id);
            } else if(data.msg == "invalidaddress"){
                checkTransactionCompleted(trans_id,bitcoin_sale_id);
            } else {
                setTimeout(function(){
                    checkTransactionCompletedNew(trans_id,bitcoin_sale_id);
                },10000);
            }
        },
        error: function (err) {
            setTimeout(function(){
                checkTransactionCompletedNew(trans_id,bitcoin_sale_id);
            },10000);
        }
    });
}

function bitcoin_transaction(sess_data,img){
    var shopper_id = '';
    if(typeof logged_user_id != 'undefined' && logged_user_id != '' && logged_user_id != null){
        shopper_id = logged_user_id;
    }
    var billing_amount = $("#billing_form #payment_amount").val();
    billing_amount = billing_amount.replace(/,/g, '');
    
    var checkout_amount = $("#billing_form #checkout_amount").val();
    checkout_amount = checkout_amount.replace(/,/g, '');
    
    var charge_amount = $("#billing_form #charge_amount").val();
    charge_amount = charge_amount.replace(/,/g, '');
    
    var billing_first_name = $("#billing_form #first_name").val();
    var billing_last_name = $("#billing_form #last_name").val();
    var billing_street = $("#billing_form #street").val();
    var billing_city = $("#billing_form #city").val();
    var billing_state = $("#billing_form #state").val();
    var billing_zipcode = $("#billing_form #zipcode").val();
    var date_today = new Date(Date.now()).toISOString();
    
    var bitcoin_sale_id = '';

    tab_url = webview.getURL();
    $(".overlaymain,.overlayloading").show();
    $.ajax({
        url: site_url+'/trans/bitcoin_pay',
        data: {shopper_id: shopper_id, billing_amount: billing_amount, checkout_amount: checkout_amount, charge_amount: charge_amount, billing_first_name: billing_first_name, billing_last_name: billing_last_name,
billing_street: billing_street, billing_city: billing_city, billing_state: billing_state, billing_zipcode: billing_zipcode, date_today: date_today, sess_data: sess_data, tab_url: tab_url, img: img},
        dataType: 'json',
        type: 'POST',
        success: function (data) {
            $(".overlaymain,.overlayloading").hide();
            if(data.msg == "sandbox"){
                trans_id = data.trans_id;
                checkTransactionCompleted(data.trans_id,data.bitcoin_sale_id);
            } else if(data.msg == "success"){
                var invoice_url = data.invoice_url;
                trans_id = data.trans_id;
                bitcoin_sale_id = data.bitcoin_sale_id;
                
                payment_popup.style.display = "block";
                
                var path_name = window.location.pathname;
                path_name = path_name.replace("/index.html","");
                var preload_path = 'file://'+path_name+"/js/preloader_aliant.js";

                $("#pymt_views").html('');
                $("#pymt_views").html('<webview id="pymt_view" class="pymt_page" src="'+invoice_url+'" preload="'+preload_path+'" autosize="on" allowpopups="on"></webview>');

                var logo_url = site_url+"/images/logo.png";
                var chk_out_amt = '$'+billing_amount;
                
                var pymt_views = document.getElementById('pymt_view');
                
                /*pymt_views.addEventListener("dom-ready", event => {
                    pymt_views.openDevTools();
                });*/
                
                pymt_views.addEventListener('did-finish-load', function(){
                    /*pymt_views.send("scroll-to-view",'BaseTemplatePlaceholder_AppViewport_m_PayInvoice_m_Description');
                    
                    pymt_views.send("change-logo",'if(document.getElementById("BaseTemplatePlaceholder_AppViewport_m_PayInvoice_m_Logo") != null) {document.getElementById("BaseTemplatePlaceholder_AppViewport_m_PayInvoice_m_Logo").src = "'+logo_url+'";}');
                    pymt_views.send("change-amount",'if(document.getElementById("BaseTemplatePlaceholder_AppViewport_m_PayInvoice_m_TotalLabel") != null) {document.getElementById("BaseTemplatePlaceholder_AppViewport_m_PayInvoice_m_TotalLabel").innerHTML = "'+chk_out_amt+'";}');
                    pymt_views.send("change-name",'if(document.getElementById("BaseTemplatePlaceholder_AppViewport_m_PayInvoice_m_MerchantName") != null) {document.getElementById("BaseTemplatePlaceholder_AppViewport_m_PayInvoice_m_MerchantName").innerHTML = "PayAlt";}');
                    pymt_views.send("change-button-color",'if(document.getElementById("BaseTemplatePlaceholder_AppViewport_m_PayInvoice_m_NextButton") != null) {document.getElementById("BaseTemplatePlaceholder_AppViewport_m_PayInvoice_m_NextButton").style.background = "#fff800";document.getElementById("BaseTemplatePlaceholder_AppViewport_m_PayInvoice_m_NextButton").style.color = "#000000";}');
                    
                    pymt_views.send("get-bitcoin-address","BaseTemplatePlaceholder_AppViewport_m_PayInvoice_m_CurrencyAddress");*/
                    
                    pymt_views.send("scroll-to-view",'if(document.querySelector(".card .card-body div.row:nth-of-type(3)") != null) {document.querySelector(".card .card-body div.row:nth-of-type(4)").scrollIntoView();}');
                    
                    pymt_views.send("change-logo",'if(document.querySelector(".card .card-header img") != null) {document.querySelector(".card .card-header img").src = "'+logo_url+'";}');
                    pymt_views.send("change-amount",'if(document.querySelector(".card .card-body div.row:nth-of-type(4) span") != null) {document.querySelector(".card .card-body div.row:nth-of-type(4) span").innerHTML = "'+chk_out_amt+'";}');
                    pymt_views.send("change-name",'if(document.querySelector(".card .card-body div.row:nth-of-type(1) span") != null) {document.querySelector(".card .card-body div.row:nth-of-type(1) span").innerHTML = "PayAlt";}');
                    pymt_views.send("change-button-color",'if(document.querySelector(".card .card-body div button.btn.btn-primary") != null) {document.querySelector(".card .card-body div button.btn.btn-primary").style.background = "#fff800";document.querySelector(".card .card-body div button.btn.btn-primary").style.color = "#000000";}');
                    
                    pymt_views.send("get-bitcoin-address","var bitcoin_address = '';interval_bitcoinaddress = setInterval(function(){if(document.querySelector(\".card .card-body div div.row:nth-of-type(2) span\") != null) {bitcoin_address = document.querySelector(\".card .card-body div div.row:nth-of-type(2) span\").innerHTML;ipcRenderer.sendToHost('aliant-bitcoin-address' , bitcoin_address);}},3000);");
                });
                pymt_views.addEventListener("ipc-message", function (e) {
                    if (e.channel === "aliant-bitcoin-address") {
                        console.log("INSIDE BITCOIN ADDRESS");
                        console.log(e.args[0]);
                        trans_bitcoin_address = e.args[0];
                        $(".overlaymain,.overlayloading").show();
                        pymt_views.send("cancel-bitcoin-address-interval","if(typeof interval_bitcoinaddress != 'undefined'){\n\
                            clearInterval(interval_bitcoinaddress);\n\
                            ipcRenderer.sendToHost('bitcoin-address-interval-canceled' , \"\");\n\
                        }");
                    }
                    if (e.channel === "bitcoin-address-interval-canceled") {
                        $(".overlaymain,.overlayloading").show();
                        $.ajax({
                            url: site_url+'/trans/update_bitcoin_address',
                            data: {trans_id: trans_id, bitcoin_address: trans_bitcoin_address},
                            dataType: 'json',
                            type: 'POST',
                            success: function (data2) {
                                $(".overlaymain,.overlayloading").hide();
                                payselection_popup.style.display = "block";
                            }
                        });
                    }
                });
                
                setTimeout(function(){
                    checkTransactionCompleted(trans_id,bitcoin_sale_id);
                    //checkTransactionCompletedNew(trans_id,bitcoin_sale_id);
                },30000);
            }
            else if(data.msg == "error"){swal("",data.txt,"error");}
        },
        error: function (err) {
            $(".overlaymain,.overlayloading").hide();
            swal("","Error in Processing.  Try again later","error");
        }
    });
}

/** COINBASE TO COINBASE TRANSACTION **/
function coinbase_trans(sess_data,img,coin_type){
    var shopper_id = '';
    if(typeof logged_user_id != 'undefined' && logged_user_id != '' && logged_user_id != null){
        shopper_id = logged_user_id;
    }
    var billing_amount = $("#billing_form #payment_amount").val();
    billing_amount = billing_amount.replace(/,/g, '');
    
    var checkout_amount = $("#billing_form #checkout_amount").val();
    checkout_amount = checkout_amount.replace(/,/g, '');
    
    var charge_amount = $("#billing_form #charge_amount").val();
    charge_amount = charge_amount.replace(/,/g, '');
    
    var billing_first_name = $("#billing_form #first_name").val();
    var billing_last_name = $("#billing_form #last_name").val();
    var billing_street = $("#billing_form #street").val();
    var billing_city = $("#billing_form #city").val();
    var billing_state = $("#billing_form #state").val();
    var billing_zipcode = $("#billing_form #zipcode").val();
    var date_today = new Date(Date.now()).toISOString();
    
    var bitcoin_sale_id = '';

    tab_url = webview.getURL();
    $(".overlaymain,.overlayloading").show();
    $.ajax({
        url: site_url+'/trans/coinbase_init',
        data: {shopper_id: shopper_id, billing_amount: billing_amount, checkout_amount: checkout_amount, charge_amount: charge_amount, billing_first_name: billing_first_name, billing_last_name: billing_last_name,
billing_street: billing_street, billing_city: billing_city, billing_state: billing_state, billing_zipcode: billing_zipcode, date_today: date_today, sess_data: sess_data, tab_url: tab_url, img: img, coin_type: coin_type},
        dataType: 'json',
        type: 'POST',
        success: function (data) {
            $(".overlaymain,.overlayloading").hide();
            if(data.msg == "success"){
                trans_id = data.trans_id;
                trans_bitcoin_address = data.bitcoin_address;
                payselection_popup.style.display = "none";
                coinbase_oauth("");
            }
            else if(data.msg == "error"){
                swal("",data.txt,"error");
            }
        },
        error: function (err) {
            $(".overlaymain,.overlayloading").hide();
            swal("","Error in Processing.  Try again later","error");
        }
    });
}
/** COINBASE TO COINBASE TRANSACTION **/

function prompt_otp(){
    timeout_aliantpay = setTimeout(function(){
        swal.close();
        payment_popup.style.display = "none";
    },900000); //15minutes
    
    $(".overlaymain,.overlayloading").hide();    
    swal({
        title: "Enter verification code texted to you from Coinbase",
        closeOnClickOutside: false,
        content: {
            element: "input",
            attributes: {
                placeholder: "Coinbase Verification Code",type: "text",class: "newtxtbox"
            }
        }
    }).then((value) => {
        if(value == null){
            clearTimeout(timeout_aliantpay);
            if(trans_id != ''){
                $(".overlayloading,.overlaymain").show();
                $.ajax({
                    url: site_url+'/trans/canceltransaction',
                    data: {logged_user_id: logged_user_id, transaction_id: trans_id},
                    type: 'POST',
                    success: function (data) {
                        $(".overlayloading,.overlaymain").hide();
                        swal("",data.txt,"error");
                        payment_popup.style.display = "none";
                    },
                    error: function (err) {
                        $(".overlayloading,.overlaymain").hide();
                        payment_popup.style.display = "none";
                    }
                });
            } else {
                payment_popup.style.display = "none";
            }
        } else {
            if(value != ''){
                $(".overlaymain,.overlayloading").show();
                $.ajax({
                    url: site_url+'/trans/exchange_coinbase_pay',
                    data: {shopper_id: logged_user_id, trans_id: trans_id, trans_bitcoin_address: trans_bitcoin_address,otp:value},
                    dataType: 'json',
                    type: 'POST',
                    success: function (data) {
                        clearTimeout(timeout_aliantpay);
                        $(".overlaymain,.overlayloading").hide();
                        if(data.msg == "success"){
                            swal("","Coinbase Payment Completed.","success");
                            payment_popup.style.display = "none";
                            processing_popup.style.display = "none";
                            //$(".overlaycardcreation,.overlaymain").show();
                            $(".overlaycardcreation").modal({backdrop: 'static',keyboard: false});
                            $(".overlaymain").show();
                            createVirtualCard(logged_user_id,trans_id);
                        } else if(data.msg == "reauthenticate"){
                            swal("",data.txt,"warning");
                            coinbase_oauth("yes");
                        } else if(data.msg == "reenterotp" || data.msg == "enterotp"){
                            const wrapper_otp = document.createElement('div');
                            if(data.msg == "enterotp"){
                                wrapper_otp.innerHTML = "The Coinbase verification code you entered was incorrect. Please enter the correct verification code texted to you by Coinbase and click \"OK\" to complete the transaction.";
                            } else {
                                wrapper_otp.innerHTML = data.txt;
                            }
                            swal({
                                title: "",
                                content: wrapper_otp,
                                icon: "warning",
                                buttons: {
                                    confirm: {
                                        text: "Ok",
                                        confirm: true,
                                        value: "confirm"
                                    }
                                },
                            }).then((value) => {
                                if(value == null){
                                    if(trans_id != ''){
                                        $(".overlayloading,.overlaymain").show();
                                        $.ajax({
                                            url: site_url+'/trans/canceltransaction',
                                            data: {logged_user_id: logged_user_id, transaction_id: trans_id},
                                            type: 'POST',
                                            success: function (data) {
                                                $(".overlayloading,.overlaymain").hide();
                                                swal("",data.txt,"error");
                                                
                                                payment_popup.style.display = "none";
                                            },
                                            error: function (err) {
                                                $(".overlayloading,.overlaymain").hide();
                                                payment_popup.style.display = "none";
                                            }
                                        });
                                    } else {
                                        payment_popup.style.display = "none";
                                    }
                                } else {
                                    if(value == "confirm") {
                                        prompt_otp();
                                    }
                                }
                            });
                        } else if(data.msg == "error"){
                            swal("",data.txt,"error");
                            payment_popup.style.display = "none";
                            processing_popup.style.display = "none";
                        }
                    }
                });
            }
        }
    });
}
function exchange_coinbase_transaction(){
    $(".overlaymain,.overlayloading").show();
    if(trans_id != ''){
        $.ajax({
            url: site_url+'/trans/exchange_coinbase_pay',
            data: {shopper_id: logged_user_id, trans_id: trans_id, trans_bitcoin_address: trans_bitcoin_address},
            dataType: 'json',
            type: 'POST',
            success: function (data) {
                $(".overlaymain,.overlayloading").hide();
				console.log(data);
                if(data.msg == "success"){
                    swal("","Coinbase Payment Completed.","success");
                    payment_popup.style.display = "none";
                    processing_popup.style.display = "none";
                    //$(".overlaycardcreation,.overlaymain").show();
                    $(".overlaycardcreation").modal({backdrop: 'static',keyboard: false});
                    $(".overlaymain").show();
                    createVirtualCard(logged_user_id,trans_id);
                } else if(data.msg == "reauthenticate"){
                    swal("",data.txt,"warning");
                    coinbase_oauth("yes");
                } else if(data.msg == "enterotp"){
                    prompt_otp();
                } else if(data.msg == "error"){
                    swal("",data.txt,"error");
                    payment_popup.style.display = "none";
                    processing_popup.style.display = "none";
                }
            },
            error: function (err) {
				console.log(err);
                $(".overlaymain,.overlayloading").hide();
                swal("","Error in Processing.  Try again later","error");
            }
        });
    } else {
        $(".overlaymain,.overlayloading").hide();
        swal("","Error in Processing.  Try again later","error");
    }
}

/** NEW CODING ADDED **/
$(".top_naviga_share").mouseover(function () {
    $(this).css("background-color", "#fff800");
    $(this).css("color", " #000");
    $(this).css("font-family", "Montserrat-Bold");
    $(".button_socio").show();
});
$(".top_naviga_share").mouseout(function () {
    $(this).css("background-color", "transparent");
    $(this).css("color", " #FFF");
    $(this).css("font-family", "Montserrat-Regular");
    $(".button_socio").hide();
});

$(".button_socio").mouseover(function () {
    $(".top_naviga_share").trigger('mouseover');
});
$(".button_socio").mouseout(function () {
    $(".top_naviga_share").trigger('mouseout');
});

/*Image content Logo design*/
$(".image_content_logo").mouseover(function () {
    $(".extra_content").show();
});
$(".image_content_logo").mouseout(function () {
    $(".extra_content").hide();
});
$(".extra_content").mouseover(function () {
    $(".image_content_logo").trigger('mouseover');
});
$(".extra_content").mouseout(function () {
    $(".image_content_logo").trigger('mouseout');
});

$(document).on("click", "#custom_payment_amount_two", function(){
    var valid = $("#pymt_amt_form_two").valid();
    if(valid){
        var value = $("#payment_amount_set_two").val();
        var add_fees = value * 0;
        add_fees = add_fees.toFixed(2);
        var total_amt = parseFloat(value) + parseFloat(add_fees);
        total_amt = total_amt.toFixed(2);
        
        $(".chk_amt_disp").html('$'+numberWithCommas(total_amt));
        //getExchangeRate(total_amt);
        $("#payment_amt_disp").html('<div style="font-size: 14px;text-align: left;margin-bottom: 15px;">Total Amount: $'+numberWithCommas(total_amt)+'</div>');
        $("#payment_amount_set").val(total_amt);
        $("#payment_amount").val(total_amt);
        $("#checkout_amount").val(value);
        $("#charge_amount").val(add_fees);
        
        if($("#chkamtval").length > 0){
            $("#chkamtval").html("$"+numberWithCommas(total_amt));
        }
        $("#custom_amount_popup_two").modal("hide");
        if($("#custom_amount_callback").length > 0){
            if($("#custom_amount_callback").val() == "paynow") {
                paynowPopup();
            }
        }
    }
});
$(document).on("click", "#preload_payment_amount", function(){
    var valid = $("#preload_amt_form").valid();
    if(valid){
        var value = $("#payment_amount_preload").val();
        value = value.replace(/,/g, '');
        value = parseFloat(value).toFixed(2);
        
        var add_fees = value * 0;
        add_fees = add_fees.toFixed(2);
        var total_amt = parseFloat(value) + parseFloat(add_fees);
        total_amt = total_amt.toFixed(2);
        
        $("#payment_amount_set").val(total_amt);
        $("#payment_amount").val(total_amt);
        $("#checkout_amount").val(value);
        $("#charge_amount").val(add_fees);
                
        var date_today = new Date(Date.now()).toISOString();
        
        $("#payment_amount_preload").val("");
        $("#preload_amount_popup").modal("hide");
        $("#preloadHid").val("preloadcard");
        
        $(".overlayloading,.overlaymain").show();
        $.ajax({
            url: site_url+'/trans/get_all_cryptocoins',
            data: {},
            type: 'POST',
            success: function (data) {
                $(".overlayloading,.overlaymain").hide();
                if(data.msg == "success"){
                    $(".coins_dropdown").html(data.dropDown);
                    //callSelectPicker();
                    //cryptoselect_popup.style.display = "block";
					$("#cryptoselect_popup").modal("show");
                } else{
                    swal("",data.txt,"error");
                }
            }
        });
    }
});

$(document).on("click",".pay_now",function(){
    paynowPopup();
    /*const wrapper_confirm = document.createElement('div');
    wrapper_confirm.innerHTML = "If you just sent crypto manually, it will take up to 2-3 hours. If you convert again, you will be charged again. If you did not send the original amount asked, feel free to convert again and click \"Continue\"";
    swal({
        title: "",
        content: wrapper_confirm,
        icon: "warning",
        buttons: {
            manualenter: {
                text: "Close",
                value: "close"
            },
            confirm: {
                text: "Continue",
                confirm: true,
                value: "confirm"
            }
        },
    }).then((value) => {
        if(value == "confirm") {
            paynowPopup();
        } else if(value == "close") {
            swal.close();
        }
    });*/
});

function paynowPopup(){
    $("#custom_amount_callback").val("");
    var pay_value = $("#payment_amount_set").val();
    if(pay_value == ''){pay_value = 0;}

    pay_value = parseFloat(pay_value);
    pay_value = pay_value.toFixed(2);
    scrap_title = "Checkout Payment";
	
	var info_icon = "images/info_icon.png";
    
    scrap_txt = '<div class="row"><div class="col-3"><div class="infoIconClass"></div></div><div class="col-9"><div class="txtleft" style="font-size: 16px;">Let\'s convert your crypto to a credit card! Is the payment amount correct? If so, click "Convert". If not, click "Edit" and enter the correct amount.</div>';
    scrap_txt += '<div class="chkamt_txt" style="margin-top: 20px;">'+
        '<div class="bold_font" style="font-size: 16px;text-align: left;margin-bottom: 15px;">Total Payment: <span style="margin-left: 20px;" id="chkamtval">$'+numberWithCommas(pay_value)+'</span></div>'+
    '</div></div>';
    button_array = {
        manualenter: {
            text: "EDIT",
            value: "manualenter",
			className: "cancel_button"
        },
        confirm: {
            text: "CONVERT",
            confirm: true,
            value: "confirm",
			className: "swal_buttons"
        }
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = scrap_txt;
    swal({
        title: scrap_title,
        content: wrapper,
        buttons: button_array,
    }).then((value) => {
        if(value == "manualenter") {
            $("#custom_amount_callback").val("paynow");
            $("#custom_amount_popup_two").modal("show");
        } else if(value == "confirm") {
            $(".overlayloading,.overlaymain").show();
            /** CHECK CARD BALANCE AVAILABLE **/
            $.ajax({
                url: site_url+'/trans/check_card_balance',
                data: {logged_user_id: logged_user_id, pay_value: pay_value},
                type: 'POST',
                success: function (data) {
                    var reconvert = 1;
                    if(data.msg == "continue"){
                        reconvert = 0;
                    }
                    var preloaded = $(".billing_dollar").css("display");
                    if(preloaded == "none" || reconvert == 1){
                        $("#preloadHid").val("");
                        //$(".overlayloading,.overlaymain").show();
                        $.ajax({
                            url: site_url+'/trans/get_all_cryptocoins',
                            data: {},
                            type: 'POST',
                            success: function (data) {
                                $(".overlayloading,.overlaymain").hide();
                                if(data.msg == "success"){
                                    $(".coins_dropdown").html(data.dropDown);
                                    //callSelectPicker();
									$("#cryptoselect_popup").modal("show");
                                    //cryptoselect_popup.style.display = "block";
                                } else{
                                    swal("",data.txt,"error");
                                }
                            }
                        });
                    } else {
                        if(reconvert == 0){
                            /** AUTOFILL ADDED ADDITIONAL FOR CARD **/
                            $.ajax({
                                url: site_url+'/trans/user_card_details',
                                data: {logged_user_id: logged_user_id},
                                type: 'POST',
                                success: function (data) {
									$(".overlayloading,.overlaymain").hide();
                                    if(data.msg == "success"){
                                        addr_details = data.retarray;
                                        var webview = document.getElementById('view');
                                        autofill_card = "";
                                        webview.send("autofill-info", addr_details);
                                    }
                                }
                            });
                            /** AUTOFILL ADDED ADDITIONAL FOR CARD **/
                        }
                    }
                }
            });
            /** CHECK CARD BALANCE AVAILABLE **/
        }
    });
}

function loadBalance(logged_user_id){
    $.ajax({
        url: site_url+'/trans/check_user_balance',
        data: {logged_user_id: logged_user_id},
        type: 'POST',
        success: function (data) {
            if(data.msg == "success"){
                if(data.availableBalance > 0){
                    $("#paywithcryto span").html('$'+numberWithCommas(data.availableBalance));
                } else {
                    $("#paywithcryto span").html('PRELOAD CREDIT CARD');
                }
            }
            if(data.msg != "nocard"){
                setTimeout(function(){
                    loadBalance(logged_user_id);
                },5000);
            }
        }, error: function (data) {
            setTimeout(function(){
                loadBalance(logged_user_id);
            },5000);
        }
    });
    
}
function getExchangeRate(checkout_amount){
    $(".overlayloading,.overlaymain").show();
    $.ajax({
        url: site_url+'/trans/get_exchange_rate',
        data: {checkout_amount: checkout_amount},
        type: 'POST',
        success: function (data) {
            $(".overlayloading,.overlaymain").hide();
            if(data.msg == "success"){
                $(".footer_box").addClass("btcshow");
                $(".bitcoin_rate_disp").html(data.final_amount);
            }
        }
    });
}

webview.addEventListener("ipc-message", function (e) {
    if(e.channel === "autofill-completed-address") {
        if(autofill_address == ""){
            autofill_address = "1";
        }
    } else if(e.channel === "autofill-completed-card") {
        if(autofill_card == ""){
            autofill_card = "1";
        }
    } else if (e.channel === "cart-detect-completed") {
        //console.log("INSIDE CART DETECTION");
        $(".overlayloading,.overlaymain").hide();
        var cart_data = e.args[0];
        var cart_total = cart_data.cart_total;
        var cart_currency = cart_data.currency;
        cart_total = parseInt(cart_total);
        cart_total_final = cart_total / 100;
        
        cart_total_final = parseFloat(cart_total_final);
        if(cart_total_final != null){
            var add_fees = cart_total_final * 0;
            add_fees = add_fees.toFixed(2);

            var total_amt = parseFloat(cart_total_final) + parseFloat(add_fees);
            total_amt = total_amt.toFixed(2);
            
            $(".chk_amt_disp").html('$'+numberWithCommas(total_amt));
            //getExchangeRate(total_amt);
            $("#payment_amt_disp").html('<div style="font-size: 14px;text-align: left;margin-bottom: 15px;">Total Amount: $'+numberWithCommas(total_amt)+'</div>');
            $("#payment_amount").val(total_amt);
            $("#checkout_amount").val(cart_total_final);
            $("#charge_amount").val(add_fees);
            $("#payment_amount_set").val(cart_total_final);
            $("#payment_amount_set_two").val(cart_total_final);
            
        }        
    }
});
/** NEW CODING ADDED **/

/** MULTIPLE TAB ADDED **/
$(document).on("click", ".tab-single .close" ,function(){
    var closestid = $(this).parent(".tab-single").attr("id");
    //console.log(closestid);
    var split = closestid.split("_");
    
    document.getElementById("view_"+split[1]).removeEventListener('did-finish-load',function(){});
    document.getElementById("view_"+split[1]).removeEventListener('new-window',function(){});
    
    setTimeout(function(){
        var tab_id = $("#tab_"+split[1]).remove();
        var view_id = $("#view_"+split[1]).remove();

        $("#tabs .tab-single").removeClass("tab-active");    
        $("#views webview").css("display","none");
        setTimeout(function(){
            $("#tab").addClass("tab-active");
            $("#views webview#view").css("display","flex");
            document.getElementById("url").value = $("#views webview#view").attr("src");
        });
    });
});

$(document).on("click", ".tab-single" ,function(){
    var thiss = $(this);
    var closestid = $(this).attr("id");
    var split = closestid.split("_");
    $("#tabs .tab-single").removeClass("tab-active");
    $(thiss).addClass("tab-active");
    
    $("#views webview").css("display","none");
    if(typeof split[1] != 'undefined'){
        $("#views webview#view_"+split[1]).css("display","flex");
        document.getElementById("url").value = $("#views webview#view_"+split[1]).attr("src");
    } else {
        $("#views webview#view").css("display","flex");
        document.getElementById("url").value = $("#views webview#view").attr("src");
    }
});
/** MULTIPLE TAB ADDED **/

/** SELECT CURRENCY **/
$(document).on("change", "#coin_type", function(){
    var val = $(this).val();
    var sel_text = $("#coin_type option:selected").text();
    if(val != ''){
        var total_amt = $("#payment_amount_set").val();
        $(".overlayloading,.overlaymain").show();
        $.ajax({
            url: site_url+'/trans/get_exchange_rate',
            data: {checkout_amount: total_amt,coin_type: val,coin_name: sel_text},
            type: 'POST',
            success: function (data) {
                $(".overlayloading,.overlaymain").hide();
                if(data.msg == "success"){
                    $(".exchange_details").html(data.exchangeContent);
                    $(".exchange_details").show();
                } else{
                    $(".exchange_details").html("");
                    $(".exchange_details").hide();
                }
            }
        });
    }
});

$(document).on("click", "#currencyselect_payment", function(e){
    var coin_type = $("#coin_type").val();
    var valid = $("#currency_form").valid();
    if(valid && coin_type != ''){
        $(".overlayloading,.overlaymain").show();
        $.ajax({
            url: site_url+'/trans/get_billing_info',
            data: {logged_user_id: logged_user_id},
            type: 'POST',
            success: function (data) {
                $(".overlayloading,.overlaymain").hide();
                if(data.msg == "success"){
                    $("#billing_popup #first_name").val(data.billing.first_name);
                    $("#billing_popup #last_name").val(data.billing.last_name);
                    $("#billing_popup #street").val(data.billing.address);
                    $("#billing_popup #city").val(data.billing.city);
                    $("#billing_popup #state").val(data.billing.state);
                    $("#billing_popup .select-selected").html(data.billing.state);
                    $("#billing_popup #zipcode").val(data.billing.zipcode);
                }
                
                var preloadHid = $("#preloadHid").val();
                $("#preloadHid").val("");
                billing_popup.style.display = "none";
                crypto_popup.style.display = "none";
				$("#cryptoselect_popup").modal("hide");
                //cryptoselect_popup.style.display = "none";
                $(".overlaymain,.overlayloading").show();
                //bitcoin_transaction("","");   //Aliant Pay Commented
                coinbase_trans(preloadHid,"",coin_type);
            }
        });
    }
});
/** SELECT CURRENCY **/

/*COIN SELECTION SCRIPT **/
$(document).on("click", ".coinlst", function(e){
	e.stopImmediatePropagation();
	var thiss = $(this);
	$(".coinlst").removeClass("active");
	thiss.addClass("active");
	var sel = thiss.attr("id");
	$("input[type='hidden']#coin_type").val(sel);
});
$(document).on("click", "#oauth_back", function(e){
    e.stopImmediatePropagation();
    var oauth_view = document.getElementById('oauth_view');
    oauth_view.remove();
    $("#oauth_popup").modal("hide");
    $("#cryptoselect_popup").modal("show");
});
$(document).on("click", "#currencyselect_payment_back", function(e){
	e.stopImmediatePropagation();

    var preloadHid = $("#preloadHid").val();    
	$("#cryptoselect_popup").modal("hide");
    if(preloadHid == "preloadcard"){
        $("#preload_amount_popup").modal("show");
    } else {
	   paynowPopup();
    }
});
$(document).on("click", ".fullscreen", function(e){
    toggleFullScreen();
});
function toggleFullScreen() {
  if ((document.fullScreenElement && document.fullScreenElement !== null) ||    
   (!document.mozFullScreen && !document.webkitIsFullScreen)) {
    if (document.documentElement.requestFullScreen) {  
      document.documentElement.requestFullScreen();  
    } else if (document.documentElement.mozRequestFullScreen) {  
      document.documentElement.mozRequestFullScreen();  
    } else if (document.documentElement.webkitRequestFullScreen) {  
      document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);  
    }  
  } else {  
    if (document.cancelFullScreen) {  
      document.cancelFullScreen();  
    } else if (document.mozCancelFullScreen) {  
      document.mozCancelFullScreen();  
    } else if (document.webkitCancelFullScreen) {  
      document.webkitCancelFullScreen();  
    }  
  }  
}