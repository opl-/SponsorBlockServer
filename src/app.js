var express = require('express');
// Create a service (the app object is just a callback).
var app = express();
var config = require('./config.js');
var redis = require('./utils/redis.js');
const getIP = require('./utils/getIP.js');
const getHash = require('./utils/getHash.js');

// Middleware 
const rateLimitMiddleware = require('./middleware/requestRateLimit.js');
var corsMiddleware = require('./middleware/cors.js');
var loggerMiddleware = require('./middleware/logger.js');
const userCounter = require('./middleware/userCounter.js');

// Routes
var getSkipSegments = require('./routes/getSkipSegments.js').endpoint;
var postSkipSegments = require('./routes/postSkipSegments.js');
var getSkipSegmentsByHash = require('./routes/getSkipSegmentsByHash.js');
var voteOnSponsorTime = require('./routes/voteOnSponsorTime.js');
var viewedVideoSponsorTime = require('./routes/viewedVideoSponsorTime.js');
var setUsername = require('./routes/setUsername.js');
var getUsername = require('./routes/getUsername.js');
var shadowBanUser = require('./routes/shadowBanUser.js');
var addUserAsVIP = require('./routes/addUserAsVIP.js');
var getSavedTimeForUser = require('./routes/getSavedTimeForUser.js');
var getViewsForUser = require('./routes/getViewsForUser.js');
var getTopUsers = require('./routes/getTopUsers.js');
var getTotalStats = require('./routes/getTotalStats.js');
var getDaysSavedFormatted = require('./routes/getDaysSavedFormatted.js');
var getUserInfo = require('./routes/getUserInfo.js');
var postNoSegments = require('./routes/postNoSegments.js');
var deleteNoSegments = require('./routes/deleteNoSegments.js');
var getIsUserVIP = require('./routes/getIsUserVIP.js');
var warnUser = require('./routes/postWarning.js');
var postSegmentShift = require('./routes/postSegmentShift.js');

// Old Routes
var oldGetVideoSponsorTimes = require('./routes/oldGetVideoSponsorTimes.js');
var oldSubmitSponsorTimes = require('./routes/oldSubmitSponsorTimes.js');

// Rate limit endpoint lists
let voteEndpoints = [voteOnSponsorTime.endpoint];
let viewEndpoints = [viewedVideoSponsorTime];
if (config.rateLimit) {
    if (config.rateLimit.vote) voteEndpoints.unshift(rateLimitMiddleware(config.rateLimit.vote));
    if (config.rateLimit.view) viewEndpoints.unshift(rateLimitMiddleware(config.rateLimit.view));
}

//setup CORS correctly
app.use(corsMiddleware);
app.use(loggerMiddleware);
app.use(express.json())

if (config.userCounterURL) app.use(userCounter);

// Setup pretty JSON
if (config.mode === "development") app.set('json spaces', 2);

// Set production mode
app.set('env', config.mode || 'production');

//add the get function
app.get('/api/getVideoSponsorTimes', oldGetVideoSponsorTimes);

//add the oldpost function
app.get('/api/postVideoSponsorTimes', oldSubmitSponsorTimes);
app.post('/api/postVideoSponsorTimes', oldSubmitSponsorTimes);

//add the skip segments functions
app.get('/api/skipSegments', getSkipSegments);
app.post('/api/skipSegments', postSkipSegments);

// add the privacy protecting skip segments functions
app.get('/api/skipSegments/:prefix', getSkipSegmentsByHash);

//voting endpoint
app.get('/api/voteOnSponsorTime', ...voteEndpoints);
app.post('/api/voteOnSponsorTime', ...voteEndpoints);

//Endpoint when a submission is skipped
app.get('/api/viewedVideoSponsorTime', ...viewEndpoints);
app.post('/api/viewedVideoSponsorTime', ...viewEndpoints);

//To set your username for the stats view
app.post('/api/setUsername', setUsername);

//get what username this user has
app.get('/api/getUsername', getUsername);

//Endpoint used to hide a certain user's data
app.post('/api/shadowBanUser', shadowBanUser);

//Endpoint used to make a user a VIP user with special privileges
app.post('/api/addUserAsVIP', addUserAsVIP);

//Gets all the views added up for one userID
//Useful to see how much one user has contributed
app.get('/api/getViewsForUser', getViewsForUser);

//Gets all the saved time added up (views * sponsor length) for one userID
//Useful to see how much one user has contributed
//In minutes
app.get('/api/getSavedTimeForUser', getSavedTimeForUser);

app.get('/api/getTopUsers', getTopUsers);

//send out totals
//send the total submissions, total views and total minutes saved
app.get('/api/getTotalStats', getTotalStats);

app.get('/api/getUserInfo', getUserInfo);

//send out a formatted time saved total
app.get('/api/getDaysSavedFormatted', getDaysSavedFormatted);

//submit video containing no segments
app.post('/api/noSegments', postNoSegments);

app.delete('/api/noSegments', deleteNoSegments);

//get if user is a vip
app.get('/api/isUserVIP', getIsUserVIP);

//sent user a warning
app.post('/api/warnUser', warnUser);

//get if user is a vip
app.post('/api/segmentShift', postSegmentShift);

app.get('/database.db', function (req, res) {
    res.sendFile("./databases/sponsorTimes.db", { root: "./" });
});

// Create an HTTP service.
module.exports = function createServer (callback) {
    return app.listen(config.port, callback);
}
