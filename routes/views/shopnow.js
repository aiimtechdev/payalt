exports = module.exports = function (req, res) {    
    const path = require('path')
    const url = require('url')
    
    const electron = require('electron')
    // Module to control application life.
    const app = electron.app
    // Module to create native browser window.
    const BrowserWindow = electron.BrowserWindow
    const {electron_session} = require('electron')
    
    //const window = require('electron-window');
    
    /** PROXY SETTINGS **/
    //app.commandLine.appendSwitch('no-proxy-server')
    app.commandLine.appendSwitch('proxy-server','http://192.168.2.5:8888')
    var proxy_password ="aiimtech";
    var proxy_username = "prem";
    app.on('login', (event, webContents, request, authInfo, callback) => {
        event.preventDefault();
        callback(proxy_username, proxy_password)
    })
    /** PROXY SETTINGS **/
    
    app.on("window-all-closed", function () {
        return;
        /*if (process.platform !== "darwin") {
            app.quit();
        }*/
    });
    
    /*app.on("activate", function () {
      if (mainWindow === null) {
        createWindow();
      }
    });*/
        
    let mainWindow
    function createWindow (logged_user_id) {
        console.log("INSIDE CREATE WINDOW");
        //window.open('https://github.com', '_blank', 'nodeIntegration=no')
        //return;
        
        // Create the browser window.        
        mainWindow = new BrowserWindow({
            title: "Shop Now", 
            width: 1600,
            height: 800,
            "center": true,
            modal: true,
            frame: true,
            show: true,
            webPreferences: {
                nativeWindowOpen: false,
                webviewTag: true,
                nodeIntegration: true,
                plugins: false,
                enableRemoteModule: true
            }
        })
        //mainWindow.setMenu(null);
        mainWindow.maximize();

        // and load the index.html of the app.
        var loadurl = url.format({
            pathname: path.join(__dirname, '/shopwindow/index.html'),
            protocol: 'file:',
            slashes: true,
            query: {user_id: logged_user_id, siteurl: process.env.SERVER_URL}
        });
        mainWindow.loadURL(loadurl);
        
        mainWindow.webContents.on('new-window', (event, url) => {
            console.log("INSIDE NEW WINDOW");
            event.preventDefault()
            mainWindow.loadURL(url)
        })

        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
        })
        
        // Emitted when the window is closed.
        mainWindow.on('closed', function () {
            mainWindow = null
        })
    }
    createWindow(req.session.logged_user_id);
    return res.send();
}