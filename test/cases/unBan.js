var request = require('request');

var utils = require('../utils.js');
const getHash = require('../../src/utils/getHash.js');

var databases = require('../../src/databases/databases.js');
const logger = require('../../src/utils/logger.js');
var db = databases.db;

describe('unBan', () => {
  before(() => {
    db.exec("INSERT INTO shadowBannedUsers VALUES('testMan-unBan')");
    db.exec("INSERT INTO shadowBannedUsers VALUES('testWoman-unBan')");
    db.exec("INSERT INTO shadowBannedUsers VALUES('testEntity-unBan')");

    db.exec("INSERT INTO vipUsers (userID) VALUES ('" + getHash("VIPUser-unBan") + "')");
    db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-unBan") + "', 'unBan-videoID-1', 'sponsor')");

    let startOfInsertSegmentQuery = "INSERT INTO sponsorTimes (videoID, startTime, endTime, votes, UUID, userID, timeSubmitted, views, category, shadowHidden, hashedVideoID) VALUES";
    db.exec(startOfInsertSegmentQuery + "('unBan-videoID-0', 1, 11, 2, 'unBan-uuid-0', 'testMan-unBan', 0, 50, 'sponsor', 1, '" + getHash('unBan-videoID-0', 1) + "')");
    db.exec(startOfInsertSegmentQuery + "('unBan-videoID-1', 1, 11, 2, 'unBan-uuid-1', 'testWoman-unBan', 0, 50, 'sponsor', 1, '" + getHash('unBan-videoID-1', 1) + "')");
    db.exec(startOfInsertSegmentQuery + "('unBan-videoID-1', 1, 11, 2, 'unBan-uuid-2', 'testEntity-unBan', 0, 60, 'sponsor', 1, '" + getHash('unBan-videoID-1', 1) + "')");
    db.exec(startOfInsertSegmentQuery + "('unBan-videoID-2', 1, 11, 2, 'unBan-uuid-3', 'testEntity-unBan', 0, 60, 'sponsor', 1, '" + getHash('unBan-videoID-2', 1) + "')");
  });

  it('Should be able to unban a user and re-enable shadow banned segments', (done) => {
    request.post(utils.getbaseURL() + "/api/shadowBanUser?userID=testMan-unBan&adminUserID=VIPUser-unBan&enabled=false", null, (err, res, body) => {
      if (err) done(err);
      else if (res.statusCode === 200) {
        let result = db.prepare('all', 'SELECT * FROM sponsorTimes WHERE videoID = ? AND userID = ? AND shadowHidden = ?', ['unBan-videoID-0', 'testMan-unBan', 1]);
        if (result.length !== 0) {
          console.log(result);
          done("Expected 0 banned entrys in db, got " + result.length);
        } else {
          done();
        }
      } else {
        console.log(body);
        done("Status code was " + res.statusCode);
      }
    });
  });

  it('Should be able to unban a user and re-enable shadow banned segments without noSegment entrys', (done) => {
    request.post(utils.getbaseURL() + "/api/shadowBanUser?userID=testWoman-unBan&adminUserID=VIPUser-unBan&enabled=false", null, (err, res, body) => {
      if (err) done(err);
      else if (res.statusCode === 200) {
        let result = db.prepare('all', 'SELECT * FROM sponsorTimes WHERE videoID = ? AND userID = ? AND shadowHidden = ?', ['unBan-videoID-1', 'testWoman-unBan', 1]);
        if (result.length !== 1) {
          console.log(result);
          done("Expected 1 banned entry1 in db, got " + result.length);
        } else {
          done();
        }
      } else {
        console.log(body);
        done("Status code was " + res.statusCode);
      }
    });
  }); 

  it('Should be able to unban a user and re-enable shadow banned segments with a mix of noSegment entrys', (done) => {
    request.post(utils.getbaseURL() + "/api/shadowBanUser?userID=testEntity-unBan&adminUserID=VIPUser-unBan&enabled=false", null, (err, res, body) => {
      if (err) done(err);
      else if (res.statusCode === 200) {
        let result = db.prepare('all', 'SELECT * FROM sponsorTimes WHERE  userID = ? AND shadowHidden = ?', ['testEntity-unBan', 1]);
        if (result.length !== 1) {
          console.log(result);
          done("Expected 1 banned entry1 in db, got " + result.length);
        } else {
          done();
        }
      } else {
        console.log(body);
        done("Status code was " + res.statusCode);
      }
    });
  }); 
});