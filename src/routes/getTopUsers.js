var db = require('../databases/databases.js').db;
const logger = require('../utils/logger.js');
const createMemoryCache = require('../utils/createMemoryCache.js');
const config = require('../config.js');

const MILLISECONDS_IN_MINUTE = 60000;
const getTopUsersWithCache = createMemoryCache(generateTopUsersStats, config.getTopUsersCacheTimeMinutes * MILLISECONDS_IN_MINUTE);

function generateTopUsersStats(sortBy, categoryStatsEnabled = false) {
  return new Promise((resolve, reject) => {
    const userNames = [];
    const viewCounts = [];
    const totalSubmissions = [];
    const minutesSaved = [];
    const categoryStats = categoryStatsEnabled ? [] : undefined;
    
    let additionalFields = '';
    if (categoryStatsEnabled) {
      additionalFields += "SUM(CASE WHEN category = 'sponsor' THEN 1 ELSE 0 END) as categorySponsor, " +
                          "SUM(CASE WHEN category = 'intro' THEN 1 ELSE 0 END) as categorySumIntro, " +
                          "SUM(CASE WHEN category = 'outro' THEN 1 ELSE 0 END) as categorySumOutro, " +
                          "SUM(CASE WHEN category = 'interaction' THEN 1 ELSE 0 END) as categorySumInteraction, " +
                          "SUM(CASE WHEN category = 'selfpromo' THEN 1 ELSE 0 END) as categorySelfpromo, " +
                          "SUM(CASE WHEN category = 'music_offtopic' THEN 1 ELSE 0 END) as categoryMusicOfftopic, ";
    }

    const rows = db.prepare('all', "SELECT COUNT(*) as totalSubmissions, SUM(views) as viewCount," + 
                    "SUM((sponsorTimes.endTime - sponsorTimes.startTime) / 60 * sponsorTimes.views) as minutesSaved, " +
                    "SUM(votes) as userVotes, " +
                    additionalFields +
                    "IFNULL(userNames.userName, sponsorTimes.userID) as userName FROM sponsorTimes LEFT JOIN userNames ON sponsorTimes.userID=userNames.userID " +
                    "LEFT JOIN privateDB.shadowBannedUsers ON sponsorTimes.userID=privateDB.shadowBannedUsers.userID " +
                    "WHERE sponsorTimes.votes > -1 AND sponsorTimes.shadowHidden != 1 AND privateDB.shadowBannedUsers.userID IS NULL " +
                    "GROUP BY IFNULL(userName, sponsorTimes.userID) HAVING userVotes > 20 " +
                    "ORDER BY " + sortBy + " DESC LIMIT 100", []);
    
    for (let i = 0; i < rows.length; i++) {
        userNames[i] = rows[i].userName;

        viewCounts[i] = rows[i].viewCount;
        totalSubmissions[i] = rows[i].totalSubmissions;
        minutesSaved[i] = rows[i].minutesSaved;
        if (categoryStatsEnabled) {
          categoryStats[i] = [
            rows[i].categorySponsor,
            rows[i].categorySumIntro,
            rows[i].categorySumOutro,
            rows[i].categorySumInteraction,
            rows[i].categorySelfpromo,
            rows[i].categoryMusicOfftopic,
          ];
        }
    }
    
    resolve({
      userNames,
      viewCounts,
      totalSubmissions,
      minutesSaved,
      categoryStats
    });
  });
}

module.exports = async function getTopUsers (req, res) {
  let sortType = req.query.sortType;
  let categoryStatsEnabled = req.query.categoryStats;

  if (sortType == undefined) {
      //invalid request
      res.sendStatus(400);
      return;
  }
  
  //setup which sort type to use
  let sortBy = '';
  if (sortType == 0) {
    sortBy = 'minutesSaved';
  } else if (sortType == 1) {
    sortBy = 'viewCount';
  } else if (sortType == 2) {
    sortBy = 'totalSubmissions';
  } else {
    //invalid request
    return res.sendStatus(400);
  }
  
  const stats = await getTopUsersWithCache(sortBy, categoryStatsEnabled);
  
  //send this result
  res.send(stats);
}
