﻿
// Import the frameworks we will be using
var body_parser = require('body-parser');
var application = require('express')();
var amazon = require('aws-sdk');

amazon.config.loadFromPath('aws_config.json');


/**
 * API_News class which represents the NewsAPI which allows a application
 * to access the latest updates from the game.
 * 
 * @constructor
 * @author William Taylor
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // Creates a API_News object which will then handle requests
 * var newsAPI = new API_News();
 */
function API_News() {
    /**
     * Records the number of news story's posted for debugging
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
 * This function returns the highest POST_ID so we know what the post
 * ID should be for the next news post
 * 
 * @author William Taylor
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // Returns the highest post ID value
 * newsAPI.getPostID("VERSION1", function(num){ 
 *      console.log(num);
 * });
 */
API_News.prototype.getPostID = function (version, callback) {
    // Set the parameters for our query
    var data = {
        TableName: "UWS-MobileGameDevNews",
        KeyConditions: {
            Service: {
                ComparisonOperator: 'EQ',
                AttributeValueList: [{
                        S: version
                    }]
            },
            PostID: {
                ComparisonOperator: 'GE',
                AttributeValueList: [{
                        N: '0'
                    }]
            }
        },
        AttributesToGet: ["PostID"],
        ScanIndexForward: false
    };
    
    // Query results
    this.dynamodb.query(data, function (err, news) {
        if (err) {
            console.log(err);
        } else {
            // If not data is returned then the table is empty
            if (news.Count == 0) {
                callback("0");
            } else {
                // Extract the highest post id
                var ID = Number(news.Items[0].PostID.N);
                // and call the callback function
                callback((++ID).toString());
            }
        }
    });
}

/**
 * This function handles the post news request and will
 * insert a news story into the online database
 * 
 * @author William Taylor
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // Pushes a news story in the request object to the database
 * newsAPI.handleNewsPost(request, response); 
 */
API_News.prototype.handleNewsPost = function (req, res) {
    // get a reference to the API_News object
    var instance = this;
    // if all the data required has been send in the request
    if (req.body && req.body.heading && req.body.service && req.body.text) {
        // Get the most recent post request
        this.getPostID(req.body.service, function (postNumber) {
            // Set the parameters for the news story we will insert
            var params = {
                TableName: "UWS-MobileGameDevNews",
                Item: {
                    Heading: { S: req.body.heading },
                    PostID: { N: postNumber },
                    Service: { S: req.body.service },
                    Text: { S: req.body.text }
                }  
            };
            
            // Then put it in the database or override the existing value
            instance.dynamodb.putItem(params, function (err, data) {
                if (err) {
                    console.log(err, err.stack);
                    res.json({ "msg": err });
                } else {
                    res.json({ "msg": "News Posted" });
                }
            });
        });
    } else {
        // Else return a message to indicate failure
        res.json({ "msg": "Didnt provide all information needed" });
    }
}

/**
 * Handles the getNews get request and returns a sorted array of news stories
 * to the user in a JSON object which contains an array of news stories.
 * 
 * @author William Taylor
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // Handles the list news requests and sends back an array of news stories.
 * newsAPI.handleListNews(request, response);
 */
API_News.prototype.handleListNews = function (req, res) {
    // The params for the request we will be making
    var data = {
        TableName: "UWS-MobileGameDevNews",
        KeyConditions: {
            Service: {
                ComparisonOperator: 'EQ',
                AttributeValueList: [{
                    S: "VERSION1"
                }]
            },
            PostID: {
                ComparisonOperator: 'GE',
                AttributeValueList: [{
                        N: '0'
                }]
            }
        },
        AttributesToGet: ["Heading", "PostID", "Text", "Service"],
        ScanIndexForward: false
    };
    
    // The query the data which will return it in sorted order
    this.dynamodb.query(data, function (err, news) {
        if (err) {
            console.log(err);
        } else {
            res.json(news.Items); 
        }
    });
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
 * newsAPI.handleDeleteRequest(request, response);
 */
API_News.prototype.handleDeleteRequest = function (req, res) {
    // First make sure we all the params to delete the right object
    if (req.body.service && req.body.postID) {
        // Then create our JSON object which will detail what to delete
        var params = {
            TableName: "UWS-MobileGameDevNews",
            Key: {
                Service: { S: req.body.service },
                PostID: { N: req.body.postID }
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

/**
 * This function will setup the News API and allow it to handle news requests.
 * It will also set the module exports for this file.
 * 
 * @author William Taylor
 * @version 1.0.0
 * @license Apache-2.0
 * @example 
 * // Sets up the News API ready for use
 * newsAPI.setup();
 */
API_News.prototype.setup = function () {
    // Keep track of the current instance
    var instance = this;
    
    // and then prepare to export the express module as a form of middleware
    module.exports = function () {
        // attach the postNews request to the express object
        application.post('/postNews/', function (request, response) {
            // then handle all of these requests
            instance.handleNewsPost(request, response);
        });
        
        // attach the getNews request to the express object
        application.get('/getNews/', function (request, response) {
            // then handle all of these requests
            instance.handleListNews(request, response);
        });
        
        // attach the deleteNews request to the express object
        application.post('/deleteNews/', function (request, response) {
            // then handle all of these requests
            instance.handleDeleteRequest(request, response);
        });
        
        // then return the express module as a form of middleware
        return application;
    }();
}

// Setup the API object so it can be an available API
var newsAPI = new API_News();
newsAPI.setup();