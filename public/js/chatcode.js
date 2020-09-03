(function () {
    var content = '<a class="float addClass"><span class="fa fa-comment my-float"></span></a>';
        
    content += '<div class="popup-box chat-popup" id="qnimate" style="display: none;">\n\
        <div class="chat_loading" style="text-align: center;display:none;"><img src="images/ajax-loader.gif" width="75" height="75" style="margin-top: 50%;"></div>\n\
        <webview id="chat_view" class="pymt_page" src="https://tawk.to/chat/5cb413c8d6e05b735b428f1a/default" autosize="on" allowpopups="on"></webview>\n\
    </div>';
    
    $("body").append(content);
    var chat_viewloaded = '';
    setTimeout(function(){        
        var chat_webview = document.getElementById('chat_view');
        chat_webview.addEventListener('did-finish-load', function () {
            //console.log("CHAT WEBVIEW LOADED");
            chat_viewloaded = '1';
        });
    },1000);
    $(document).on("click", ".addClass", function () {
        $(this).find("span").removeClass("fa-comment").addClass("fa-close");
        $(this).removeClass("addClass").addClass("removeClass");
        $('#qnimate').addClass('popup-box-on');
        if (chat_viewloaded == '') {
            $(".chat_loading").show();
        } else {
            $(".chat_loading").hide();
        }
    });

    $(document).on("click", ".removeClass", function () {
        $(this).find("span").removeClass("fa-close").addClass("fa-comment");
        $(this).removeClass("removeClass").addClass("addClass");
        $('#qnimate').removeClass('popup-box-on');
    });
})();