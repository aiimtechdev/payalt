$(function(){
    $(document).on("click","#shopnow",function(){
        $.ajax({
            type: "GET",
            url: "/shopnow"
        }).done(function(){

        });
    });
});