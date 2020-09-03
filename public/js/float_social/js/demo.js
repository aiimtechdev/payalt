/*!
 * Contact Buttons Plugin Demo 0.1.0
 * https://github.com/joege/contact-buttons-plugin
 *
 * Copyright 2015, José Gonçalves
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */
 
// Google Fonts
WebFontConfig = {
  google: { families: [ 'Lato:400,700,300:latin' ] }
};
(function() {
  var wf = document.createElement('script');
  wf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
    '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
  wf.type = 'text/javascript';
  wf.async = 'true';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(wf, s);
})();

// Initialize Share-Buttons
$.contactButtons({
//  effect  : 'slide-on-scroll',
  buttons : {
    'facebook':   { class: 'facebook', use: true, link: 'https://www.facebook.com/sharer/sharer.php?u=payalt.com', extras: 'target="_blank"' },
    'twitter':    { class: 'twitter',    use: true, link: 'https://www.twitter.com/intent/tweet?text=PayAlt&url=payalt.com&via=PayAlt', extras: 'target="_blank"' },
    'linkedin':   { class: 'linkedin', use: true, link: 'https://www.linkedin.com/shareArticle?mini=true&url=payalt.com&title=PayAlt&summary=Use any crypto wallet like a debit card&source=payalt.com', extras: 'target="_blank"' },
    'tumblr':     { class: 'tumblr',    use: true, link: 'http://www.tumblr.com/share/link?url=payalt.com&description=Use any crypto wallet like a debit card', icon: 'tumblr', extras: 'target="_blank"' },
    'mybutton':   { class: 'git',      use: true, link: 'http://github.com', icon: 'github', title: 'My title for the button', extras: 'target="_blank"' },
    'pinterest':  { class: 'pinterest', use: true, link: 'https://pinterest.com/pin/create/button/?url=payalt.com&description=Use any crypto wallet like a debit card&media=SRC', icon:'pinterest', extras: 'target="_blank"' },
    'reddit':     { class: 'reddit',    use: true, link: 'https://www.reddit.com/submit?url=payalt.com&title=PayAlt', icon:'reddit', extras: 'target="_blank"' }
  }
});

$(".show-hide-contact-bar").trigger("click");
