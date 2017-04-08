﻿
// Import the frameworks we will be using
var body_parser = require('body-parser');
var application = require('express')();
var amazon = require('aws-sdk');

amazon.config.loadFromPath('aws_config.json');


/**
 * API_Score class which represents the NewsAPI which allows a application
 * to access the latest updates from the game.
 * 
 * @constructor
 * @author William Taylor
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // Creates a API_Score object which will then handle requests
 * var scoreAPI = new API_Score();
 */
function API_Score() {
    /**
     * Records the number of scores posted for debugging
     * 
     * @author William Taylor
     * @version 1.0.0
     * @public 
     */
    this.sessionPosts = 0;
    
    /**
     * A dynamodb object for communicating with online 
     * database tables managed by the AWS sdk
     * 
     * @author William Taylor
     * @version 1.0.0
     * @public 
     */
    this.dynamodb = new amazon.DynamoDB({
        region: "eu-west-1",
        apiVersion: '2012-08-10'
    });
}

/**
 * This function handles the get scores request and will return a sorted
 * array of high scores for the correct version of the game.
 * 
 * @author William Taylor
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // This will then send the top 5 scores to the response object in JSON format
 * instance.handleGetScores(request, response);
 */
API_Score.prototype.handleGetScores = function (req, res) {
    // Set the parameters for the query we will be executing
    var data = {
        TableName: "UWS-MobileGameDevScores",   // The name of the table on DynamoDB
        KeyConditions: {        // The key conditions for the query
            Service: {
                ComparisonOperator: 'EQ',
                AttributeValueList: [{
                    S: "VERSION1"
                }]
            },
            Highscore: {
                ComparisonOperator: 'GE',
                AttributeValueList: [{
                    N: '0'
                }]
            }
        },

        AttributesToGet: ["Service", "Highscore", "Name"],  // The data we want from the server
        ScanIndexForward: false,  // Return in a reverse sorted order so the highest score is the first element
        Limit: 5
    };
    
    // Send of the query request
    this.dynamodb.query(data, function (err, news) {
        // if there was an error
        if (err) {
            // We print the error to the console
            console.log(err);
        } else {
            // else we return the results as a json object
            res.json(news.Items);
        }
    });
}

/**
 * This function will handle a score post request and insert
 * a new score into our online database provided by DynamoDB.
 * 
 * @author William Taylor
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // Should be called when a /postScore/ request has been recieved by the server
 * score_API.handleScorePost(request, response);
 */
API_Score.prototype.handleScorePost = function (req, res) {
    // if data was provided for the new entry
    if (req.body && req.body.service && req.body.highscore && req.body.name) {
        // create our new object to be inserted
        var params = {
            Item: {
                Service: { S: req.body.service },
                Highscore: { N: req.body.highscore },
                Name: { S: req.body.name },
            },

            TableName: "UWS-MobileGameDevScores"
        };
        
        // Increment the amount of posts this session
        this.sessionPosts++;
        
        // Put the item in the table or overwrite a previous score
        this.dynamodb.putItem(params, function (err, data) {
            if (err) {
                console.log(err, err.stack);
                // write score post fail if there is an error
                res.json({ "msg": "Score Post Failed" });
            } else {
                // write score posted if there isnt an error
                res.json({ "msg": "Score Posted" });
            }
        });
    } else {
        res.json({ "msg": "Invalid params" });
    }
}

/**
 * This function sets up the API_Score object and make sure that
 * all incoming requests are handled. it also sets up the middleware
 * which will handle a set of requests in the sub url /score/
 * 
 * @author William Taylor
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // Sets up a API_Score object which will then handle requests
 * score_API.setup();
 */
API_Score.prototype.setup = function () {
    // First capture the classes instance so we can refer to it later
    var instance = this;
    // then provide exports for this node module
    module.exports = function () {

        // attach the following post request to post scores
        application.post('/postScore/', function (request, response) {
            // upon recieving said request we will call this function
            instance.handleScorePost(request, response);
        });
        
        // attach the following post request to post scores
        application.get('/getScores/', function (request, response) {
            // upon recieving said request we will call this function
            instance.handleGetScores(request, response);
        });
        
        // attach the following post request to post scores
        application.post('/deleteScore/', function (request, response) {
            // upon recieving said request we will call this function
            instance.handleDeleteRequest(request, response);
        });
        
        // then return the express instance which will act as the middleware for the server module
        return application;
    }();
}

/**
 * This function will handle a delete request and delete it 
 * from the table if it exists and will send a message back
 * if it was deleted
 * 
 * @author William Taylor
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // Sets up the News API ready for use
 * scoreAPI.handleDeleteRequest(request, response);
 */
API_Score.prototype.handleDeleteRequest = function (req, res) {
   // First make sure we all the params to delete the right object
   if (req.body && req.body.service && req.body.name && req.body.highscore) {
        // Then create our JSON object which will detail what to delete
        var params = {
            TableName: "UWS-MobileGameDevScores",
            Key: {
                Service: { S: req.body.service },
                Highscore: { N: req.body.highscore },
            },
            Expected: {
                Name: {
                    Exists: true,
                    Value: {
                        S: req.body.name
                    }
                }
            }
        };
        
        // Then delete the item from the table using dynamodb
        this.dynamodb.deleteItem(params, function (err, data) {
            // if there is an error
            if (err) {
                //  state that in the response object
                res.json({ "msg": err });
            } else {
                // other wise post a success message
                res.json({ "msg": "item deleted successful" });
            }
        });
    } else {
        res.json({ "msg": "invalid request" });
    }
}

// Create the score api object and initialise it
var scoreAPI = new API_Score();
scoreAPI.setup();