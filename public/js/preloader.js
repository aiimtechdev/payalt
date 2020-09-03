var ipcRenderer = require('electron').ipcRenderer;

let intervalCount = 0;
// Waiting for document readystate to be complete...
const interval = setInterval(() => {
    intervalCount++;
    if (document && document.readyState === "complete" || intervalCount == 10) {
        clearInterval(interval);
        
        const FillrScraper = require('@fillr_letspop/cart-scraper');
        var devKey = "a8d75ee9e1eae34b71bca5024289d314";// Set your dev key
        FillrScraper.setDevKey(devKey);
        const onCartDetected = function(ev) {
            const cartInfo = ev.detail;
            ipcRenderer.sendToHost('cart-detect-completed' , cartInfo);
        }
        document.addEventListener('fillr:cart:detected', onCartDetected);
        FillrScraper.start();
    }
}, 1000);
    
ipcRenderer.on("autofill-info",function(event,data){
    let intervalCount = 0;
    // Waiting for document readystate to be complete...
    const interval = setInterval(() => {
        intervalCount++;
        if (document && document.readyState === "complete" || intervalCount == 10) {
            clearInterval(interval);
        
            const FillrController = require('@fillr_letspop/desktop-autofill');
            const { ProfileDataInterface } = FillrController;
            
            var ProfileData = data.ProfileData;
            var devKey = data.fillr_dev_key;// Set your dev key
            var secretKey = data.fillr_secret_key; // Set your secret key
            var fill_type = data.fill_type;

            const profileDataHandler = new ProfileDataInterface((mappings) => {
                mappings.profile = ProfileData; // Set your profile data
                fillr.performFill(mappings);
                if(fill_type == 'address') {
                    ipcRenderer.sendToHost('autofill-completed-address' , 1);
                } else if(fill_type == 'card') {
                    ipcRenderer.sendToHost('autofill-completed-card' , 1);
                }
            })
            const fillr = new FillrController.default(devKey, secretKey, profileDataHandler);
            
        }
    }, 1000);
});