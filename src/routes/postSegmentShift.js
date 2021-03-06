const db = require('../databases/databases.js').db;
const getHash = require('../utils/getHash.js');
const isUserVIP = require('../utils/isUserVIP.js');
const logger = require('../utils/logger.js');

const ACTION_NONE = Symbol('none');
const ACTION_UPDATE = Symbol('update');
const ACTION_REMOVE = Symbol('remove');

function shiftSegment(segment, shift) {
  if (segment.startTime >= segment.endTime) return {action: ACTION_NONE, segment};
  if (shift.startTime >= shift.endTime) return {action: ACTION_NONE, segment};
  const duration = shift.endTime - shift.startTime;
  if (shift.endTime < segment.startTime) {
    // Scenario #1 cut before segment
    segment.startTime -= duration;
    segment.endTime -= duration;
    return {action: ACTION_UPDATE, segment};
  }
  if (shift.startTime > segment.endTime) {
    // Scenario #2 cut after segment
    return {action: ACTION_NONE, segment};
  }
  if (segment.startTime < shift.startTime && segment.endTime > shift.endTime) {
    // Scenario #3 cut inside segment
    segment.endTime -= duration;
    return {action: ACTION_UPDATE, segment};
  }
  if (segment.startTime >= shift.startTime && segment.endTime > shift.endTime) {
    // Scenario #4 cut overlap startTime
    segment.startTime = shift.startTime;
    segment.endTime -= duration;
    return {action: ACTION_UPDATE, segment};
  }
  if (segment.startTime < shift.startTime && segment.endTime <= shift.endTime) {
    // Scenario #5 cut overlap endTime
    segment.endTime = shift.startTime;
    return {action: ACTION_UPDATE, segment};
  }
  if (segment.startTime >= shift.startTime && segment.endTime <= shift.endTime) {
    // Scenario #6 cut overlap startTime and endTime
    return {action: ACTION_REMOVE, segment};
  }
  return {action: ACTION_NONE, segment};
}

module.exports = (req, res) => {
  // Collect user input data
  const videoID = req.body.videoID;
  const startTime = req.body.startTime;
  const endTime = req.body.endTime;
  let userID = req.body.userID;

  // Check input data is valid
  if (!videoID
    || !userID
    || !startTime
    || !endTime
  ) {
    res.status(400).json({
      message: 'Bad Format'
    });
    return;
  }

  // Check if user is VIP
  userID = getHash(userID);
  const userIsVIP = isUserVIP(userID);

  if (!userIsVIP) {
    res.status(403).json({
      message: 'Must be a VIP to perform this action.'
    });
    return;
  }
  
  try {
    const segments = db.prepare('all', 'SELECT startTime, endTime, UUID FROM sponsorTimes WHERE videoID = ?', [videoID]);
    const shift = {
      startTime,
      endTime,
    };
    segments.forEach(segment => {
      const result = shiftSegment(segment, shift);
        switch (result.action) {
          case ACTION_UPDATE:
            db.prepare('run', 'UPDATE sponsorTimes SET startTime = ?, endTime = ? WHERE UUID = ?', [result.segment.startTime, result.segment.endTime, result.segment.UUID]);
          break;
          case ACTION_REMOVE:
            db.prepare('run', 'UPDATE sponsorTimes SET startTime = ?, endTime = ?, votes = -2 WHERE UUID = ?', [result.segment.startTime, result.segment.endTime, result.segment.UUID]);
          break;
        }
    });
  }
  catch(err) {
    logger.error(err);
    res.sendStatus(500);
  }
  
  res.sendStatus(200);
};
