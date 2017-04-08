
// Import the frameworks we will be using
var body_parser = require('body-parser');
var application = require('express')();
var cors = require('cors');


/**
 * The server object represents the application. This
 * function is also the nodejs startup file.
 * 
 * @constructor
 * @params {string} servername - The name of the server application
 * @author William Taylor
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // Creates a server object with the name 'MyServer'
 * var server = new Server('MyServer');
 */
function Server(serverName) {
    /**
     * The name for the server. We plan to use this later
     * for effective debugging.
     * 
     * @author William Taylor
     * @version 1.0.0
     * @public 
     */
    this.name = serverName;
    
    /**
     * The portnumber which the server will listen on 
     * when it comes to incoming requests/traffic.
     * 
     * @author William Taylor
     * @version 1.0.0
     * @public 
     */
    this.portNumber = 3000;
}

/**
 * This function will take the time difference between a server request
 * and its start date and convert it to a decimal number rounded to 2
 * decimal places so it can be easily printed to a console or returned
 * via response post.
 * 
 * @params {int} milliseconds - The time difference between the request and server start in milliseconds.
 * @author William Taylor
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // Prints 1.00 to the console
 * console.log(server.to_minutes(1000 * 60));
 */
Server.prototype.to_minutes = function(num) {
    var mins = (num / 1000) / 60;
    return mins.toFixed(2);
}

/**
 * This function will set the port in which the server will listen for
 * incoming traffic. if the port number is not an ideal one it will be
 * rejected and defaulted to port 3000 a safer port.
 * 
 * @author William Taylor
 * @params {int} portNumber - The port number to listen on but must be higher than 2000
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // Sets the listening port to 3500
 * server.setListeningPort(3500);
 */
Server.prototype.setListeningPort = function (portNumber) {
    // Make sure we are setting on which will most likely be open
    if (this.portNumber >= 2000) {
        this.portNumber = portNumber;
    } else {
        this.portNumber = 3000;
    }
}

/**
 * Starts up the server on the port specified and waits for requests.
 * Upon recieving any request it will output the time
 * it has been online for debugging purposes.
 * 
 * @author William Taylor
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // Starts the server
 * server.start();
 */
Server.prototype.start = function () {
    // The date the server was started
    var startTime = Date.now();
    var instance = this;
    var nm = this.name;
    
    // Add the following middleware objects
    application.use(body_parser.json());
    application.use(cors());    // Cors for Cross Origin Resource Sharing
    application.use('/level/', require('./apis/level_api.js'));
    application.use('/score/', require('./apis/score_api.js'));
    application.use('/news/', require('./apis/news_api.js'));
    
    // On a standard request we will just print some debug info
    application.get('/', function (request, response) {
        // We create a string to show the time the server has been running
        var message = nm + ' online for ';
        message += instance.to_minutes(Date.now() - startTime);
        message += " mins";
        
        // We then send the message via the response object
        response.json({ "Time Active": message });
    });

    // Start up the server and listen on the provided port number
    var server = application.listen(this.portNumber, function () {
        var host = server.address().address;
        var port = server.address().port;
    
        // Track the starting time for the server       
        startTime = Date.now();
        
        // Output the ip address and the port we are listening
        console.log(nm, 'listening at http://', host, port);
    });
}

// Create our server object and start the process
var server = new Server('MobileGameDev Server');
server.setListeningPort(3005);
server.start();