const express = require('express');
const multer = require('multer');
const path = require('path');
const csvtojson = require('csvtojson');
const cors = require('cors');
const mysql = require('mysql');
const app = express();
const port = 5038;
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const fs = require('fs');
const AdmZip = require('adm-zip');
const xlsx = require('xlsx');
const math = require('mathjs');
const ss = require('simple-statistics');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const axios = require('axios'); 
const { file } = require('jszip');
const { create } = require('domain');

app.use(express.json());
app.use(cors());
//----  Mysql Database Configuration --------------------------------
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'MyTeam',
};
//------------  Connection to Mysql
const dbConnection = mysql.createConnection(dbConfig);
dbConnection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});
const pool = mysql.createPool(dbConfig);
//--------------------------player Profile POST
app.post('/upload-csv/playerProfile', upload.single('csvFile'), (req, res) => {
  console.log('Reached /upload-csv/playerProfile endpoint');
  console.log('Request file:', req.file);
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  // Start a transaction
  dbConnection.beginTransaction((beginTransactionErr) => {
    if (beginTransactionErr) {
      console.error('Error starting MySQL transaction:', beginTransactionErr);
      return res.status(500).json({
        error: 'Error starting MySQL transaction.',
        errorMessage: beginTransactionErr.sqlMessage,
      });
    }
    csvtojson()
      .fromString(req.file.buffer.toString())
      .then((jsonArray) => {
        const idCheck = jsonArray.map((data) => data.myteam_id);
        const placeholders = idCheck.map(() => '?').join(', ');
        const searchQuery = `SELECT myteam_id FROM PlayerProfile WHERE myteam_id IN (${placeholders})`;
                // Execute the search query
        dbConnection.query(searchQuery, idCheck, (searchErr, searchResults) => {
        if (searchErr) {
        console.error('Error searching for myteam_id in PlayerProfile:', searchErr);
        // Handle the error as needed
        dbConnection.rollback(() => {
          res.status(500).json({
            error: 'Error searching for myteam_id in PlayerProfile.',
            errorMessage: searchErr.sqlMessage,
          });
        });
        return;
        }
        const existingIds =Array.from(new Set(searchResults.map(result => result.myteam_id)));
        const insertPromises = [];
        const updatePromises = [];
        jsonArray.forEach((data) => {
          const values = [
            parseInt(data.myteam_id),
            data.wyscout_name,
            data.first_name,
            data.last_name,
            data['90s'],
            data.age,
            data.minutes_played,
            data.foot,
            data.height,
            data.weight,
            data.country_of_birth,
            data.main_position,
            data.template,
            data.position_full_name,
            data.season,
            data.image_path,
          ];
          if (existingIds.includes(+data.myteam_id)) {            
            // If myteam_id exists
            const updatePromise = new Promise((resolve, reject) => {
              const updateQuery = 'UPDATE PlayerProfile SET ' +
              'wyscout_name = ?, ' +
              'first_name= ?, ' +
              'last_name = ?, ' +
              '90s = ?, ' +
              'age = ?, ' +
              'minutes_played = ?, ' +
              'foot = ?, ' +
              'height = ?, ' +
              'weight = ?, ' +
              'country_of_birth = ?, ' +
              'main_position = ?, ' +
              'template = ?, ' +
              'position_full_name = ?, ' +
              'season = ?, ' +
              'image_path = ? ' +
              'WHERE myteam_id = ?';
              dbConnection.query(updateQuery, [...values.slice(1), data.myteam_id], (updateErr, updateResults) => {
                if (updateErr) {
                  console.error('Error updating data in MySQL table:', updateErr);
                  reject(updateErr);
                } else {
                  console.log(`Data updated for myteam_id :  ${data.myteam_id} successfully`);
                  resolve(updateResults);
                }
              });
            });
            updatePromises.push(updatePromise);
          } else {
            // If myteam_id doesn't exist
            const insertPromise = new Promise((resolve, reject) => {
              const insertQuery = 'INSERT INTO PlayerProfile(myTeam_id, wyscout_name, first_name, last_name, ' +
              '90s, age, minutes_played, foot, height, weight, country_of_birth, ' +
              'main_position, template, position_full_name, season, image_path) VALUES ?';
          
              dbConnection.query(insertQuery, [[values]], (insertErr, insertResults) => {
                if (insertErr) {
                  console.error('Error inserting data into MySQL table:', insertErr);
                  reject(insertErr);
                } else {
                  resolve(insertResults);
                }
              });
            });
            insertPromises.push(insertPromise);
          }
        });
        console.log('Search Query:', dbConnection.format(searchQuery, idCheck));
        console.log('existed  IDs:', existingIds);
        // Execute all update promises
        Promise.all(updatePromises)
          .then(() => {
            // Execute all insert promises
            return Promise.all(insertPromises);
          })
          .then(() => {
            // Commit the transaction
            dbConnection.commit((commitErr) => {
              if (commitErr) {
                console.error('Error committing MySQL transaction:', commitErr);
                res.status(500).json({
                  error: 'Error committing MySQL transaction.',
                  errorMessage: commitErr.sqlMessage,
                });
              } else {
                // Send success response
                res.json({ success: true });
              }
            });
          })
          .catch((error) => {
            // Handle errors from promises
            console.error('Error in promises:', error);
            dbConnection.rollback(() => {
              res.status(500).json({ error: 'Error in promises.' });
            });
          });
      });
    })
    .catch((error) => {
      console.error('Error converting CSV to JSON:', error);
      dbConnection.rollback(() => {
        res.status(500).json({ error: 'Error converting CSV to JSON.' });
      });
    });
});
});
//--------------------------player Metrics POST
app.post('/upload-csv/playerMetrics', upload.single('csvFile'), (req, res) => {
  console.log('Reached /upload-csv/playerMetrics endpoint');
  console.log('Request file:', req.file);

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  // Start a transaction
  dbConnection.beginTransaction((beginTransactionErr) => {
    if (beginTransactionErr) {
      console.error('Error starting MySQL transaction:', beginTransactionErr);
      return res.status(500).json({
        error: 'Error starting MySQL transaction.',
        errorMessage: beginTransactionErr.sqlMessage,
      });
    }
    csvtojson()
      .fromString(req.file.buffer.toString())
      .then((jsonArray) => {
        const idCheck = jsonArray.map((data) => data.myTeam_id);
        const placeholders = idCheck.map(() => '?').join(', ');
        const searchQuery = `SELECT myTeam_id FROM PlayerMetrics WHERE myTeam_id IN (${placeholders})`;
        // Execute the search query
        dbConnection.query(searchQuery, idCheck, (searchErr, searchResults) => {
          if (searchErr) {
            console.error('Error searching for myTeam_id in PlayerMetrics:', searchErr);
            // Handle the error as needed
            dbConnection.rollback(() => {
              res.status(500).json({
                error: 'Error searching for myTeam_id in PlayerMetrics.',
                errorMessage: searchErr.sqlMessage,
              });
            });
            return;
          }
          const existingIds =Array.from(new Set(searchResults.map(result => result.myTeam_id)));
          const insertPromises = [];
          const updatePromises = [];
          jsonArray.forEach((data) => {
            const values = [
              parseInt(data.myTeam_id),
              parseFloat(data.defensive_duels_per_90),
              parseFloat(data.defensive_duels_won_percentage),
              parseFloat(data.aerial_duels_per_90),
              parseFloat(data.aerial_duels_won_percentage),
              parseFloat(data.sliding_tackles_per_90_padj),
              parseFloat(data.interceptions_per_90_padj),
              parseFloat(data.fouls_per_90),
              parseInt(data.yellow_cards),
              parseInt(data.red_cards),
              parseFloat(data.goals_per_90),
              parseFloat(data.non_penalty_goals_per_90),
              parseFloat(data.xG_per_90),
              parseFloat(data.shots_per_90),
              parseFloat(data.shots_on_target_percentage),
              parseFloat(data.goal_conversion_rate),
              parseFloat(data.assists_per_90),
              parseFloat(data.crosses_per_90),
              parseFloat(data.accurate_crosses_percentage),
              parseFloat(data.dribbles_per_90),
              parseFloat(data.successful_dribbles_percentage),
              parseFloat(data.offensive_duels_per_90),
              parseFloat(data.ball_touches_in_penalty_area_per_90),
              parseFloat(data.progressive_runs_per_90),
              parseFloat(data.passes_received_per_90),
              parseFloat(data.xA_per_90),
              parseFloat(data.assists_with_shots_per_90),
              parseFloat(data.passes_to_penalty_area_per_90),
              parseFloat(data.accurate_passes_to_penalty_area_percentage),
              parseFloat(data.progressive_passes_per_90),
              parseFloat(data.xG_per_shot),
              parseFloat(data.ranking_index),
            ];
            if (existingIds.includes(+data.myTeam_id)) {            
              // If myTeam_id exists
              const updatePromise = new Promise((resolve, reject) => {
                const updateQuery = 'UPDATE PlayerMetrics SET ' +
                'defensive_duels_per_90 = ?, ' +
                'defensive_duels_won_percentage = ?, ' +
                'aerial_duels_per_90 = ?, ' +
                'aerial_duels_won_percentage = ?, ' +
                'sliding_tackles_per_90_padj = ?, ' +
                'interceptions_per_90_padj = ?, ' +
                'fouls_per_90 = ?, ' +
                'yellow_cards = ?, ' +
                'red_cards = ?, ' +
                'goals_per_90 = ?, ' +
                'non_penalty_goals_per_90 = ?, ' +
                'xG_per_90 = ?, ' +
                'shots_per_90 = ?, ' +
                'shots_on_target_percentage = ?, ' +
                'goal_conversion_rate = ?, ' +
                'assists_per_90 = ?, ' +
                'crosses_per_90 = ?, ' +
                'accurate_crosses_percentage = ?, ' +
                'dribbles_per_90 = ?, ' +
                'successful_dribbles_percentage = ?, ' +
                'offensive_duels_per_90 = ?, ' +
                'ball_touches_in_penalty_area_per_90 = ?, ' +
                'progressive_runs_per_90 = ?, ' +
                'passes_received_per_90 = ?, ' +
                'xA_per_90 = ?, ' +
                'assists_with_shots_per_90 = ?, ' +
                'passes_to_penalty_area_per_90 = ?, ' +
                'accurate_passes_to_penalty_area_percentage = ?, ' +
                'progressive_passes_per_90 = ?, ' +
                'xG_per_shot = ?, ' +
                'ranking_index = ? ' +
                'WHERE myTeam_id = ?';
                dbConnection.query(updateQuery, [...values.slice(1), data.myTeam_id], (updateErr, updateResults) => {
                  if (updateErr) {
                    console.error('Error updating data in MySQL table:', updateErr);
                    reject(updateErr);
                  } else {
                    console.log(`Data updated for myTeam_id :  ${data.myTeam_id} successfully`);
                    resolve(updateResults);
                  }
                });
              });
              updatePromises.push(updatePromise);
            } else {
              // If myTeam_id doesn't exist
              const insertPromise = new Promise((resolve, reject) => {
                const insertQuery = 'INSERT INTO PlayerMetrics (myTeam_id, defensive_duels_per_90, ' +
                'defensive_duels_won_percentage, aerial_duels_per_90, aerial_duels_won_percentage, ' +
                'sliding_tackles_per_90_padj, interceptions_per_90_padj, fouls_per_90, yellow_cards, ' +
                'red_cards, goals_per_90, non_penalty_goals_per_90, xG_per_90, shots_per_90, ' +
                'shots_on_target_percentage, goal_conversion_rate, assists_per_90, crosses_per_90, ' +
                'accurate_crosses_percentage, dribbles_per_90, successful_dribbles_percentage, ' +
                'offensive_duels_per_90, ball_touches_in_penalty_area_per_90, progressive_runs_per_90, ' +
                'passes_received_per_90, xA_per_90, assists_with_shots_per_90, passes_to_penalty_area_per_90, ' +
                'accurate_passes_to_penalty_area_percentage, progressive_passes_per_90, xG_per_shot, ' +
                'ranking_index) VALUES ?';

                dbConnection.query(insertQuery, [[values]], (insertErr, insertResults) => {
                  if (insertErr) {
                    console.error('Error inserting data into MySQL table:', insertErr);
                    reject(insertErr);
                  } else {
                    resolve(insertResults);
                  }
                });
              });
              insertPromises.push(insertPromise);
            }
          });
          console.log('Search Query:', dbConnection.format(searchQuery, idCheck));
          console.log('existed  IDs:', existingIds);
          // Execute all update promises
          Promise.all(updatePromises)
            .then(() => {
              // Execute all insert promises
              return Promise.all(insertPromises);
            })
            .then(() => {
              // Commit the transaction
              dbConnection.commit((commitErr) => {
                if (commitErr) {
                  console.error('Error committing MySQL transaction:', commitErr);
                  res.status(500).json({
                    error: 'Error committing MySQL transaction.',
                    errorMessage: commitErr.sqlMessage,
                  });
                } else {
                  // Send success response
                  res.json({ success: true });
                }
              });
            })
            .catch((error) => {
              // Handle errors from promises
              console.error('Error in promises:', error);
              dbConnection.rollback(() => {
                res.status(500).json({ error: 'Error in promises.' });
              });
            });
        });
      })
      .catch((error) => {
        console.error('Error converting CSV to JSON:', error);
        dbConnection.rollback(() => {
          res.status(500).json({ error: 'Error converting CSV to JSON.' });
        });
      });
  });
});

// -------------------------matches Post data
app.post('/upload-csv/Matches', upload.single('csvFile'), (req, res) => {
  console.log('Reached /upload-csv/Matches endpoint');
  console.log('Request file:', req.file);
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  csvtojson()
    .fromString(req.file.buffer.toString())
    .then((jsonArray) => {
      // Insert new values into the Matches table
      const insertQuery =
        'INSERT INTO Matches (Id, date, team_id, team, project, goals, xG, shots, shots_on_target, shots_from_outside_the_box, shots_on_target_from_outside_the_box, counter_attacks, counter_attacks_with_shots_percentage, corners, corners_with_shots, free_kicks, free_kicks_with_shots, penalties, converted_penalties, offensive_duels, offensive_duels_won, r_low, r_medium, r_high, p_low, p_medium, p_high, positional_attacks, positional_attacks_with_shots_percentage, passes, completed_passes, forward_passes, accurate_forward_passes, possession_percentage, defensive_duels, defensive_duels_won, duels, duels_won, sliding_tackles, successful_sliding_tackles, fouls, yellow_cards, red_cards, goals_conceded, shots_against, shots_on_target_against, xG_against) VALUES ?';
      const values = jsonArray.map((data) => [
        parseInt(data.id),
        new Date(data.date),
        parseInt(data.team_id),
        data.team,
        data.project,
        parseFloat(data.goals),
        parseFloat(data.xG),
        parseFloat(data.shots),
        parseFloat(data.shots_on_target),
        parseFloat(data.shots_from_outside_the_box),
        parseFloat(data.shots_on_target_from_outside_the_box),
        parseFloat(data.counter_attacks),
        parseFloat(data.counter_attacks_with_shots_percentage),
        parseFloat(data.corners),
        parseFloat(data.corners_with_shots),
        parseFloat(data.free_kicks),
        parseFloat(data.free_kicks_with_shots),
        parseFloat(data.penalties),
        parseFloat(data.converted_penalties),
        parseFloat(data.offensive_duels),
        parseFloat(data.offensive_duels_won),
        parseFloat(data.r_low),
        parseFloat(data.r_medium),
        parseFloat(data.r_high),
        parseFloat(data.p_low),
        parseFloat(data.p_medium),
        parseFloat(data.p_high),
        parseFloat(data.positional_attacks),
        parseFloat(data.positional_attacks_with_shots_percentage),
        parseFloat(data.passes),
        parseFloat(data.completed_passes),
        parseFloat(data.forward_passes),
        parseFloat(data.accurate_forward_passes),
        parseFloat(data.possession_percentage),
        parseFloat(data.defensive_duels),
        parseFloat(data.defensive_duels_won),
        parseFloat(data.duels),
        parseFloat(data.duels_won),
        parseFloat(data.sliding_tackles),
        parseFloat(data.successful_sliding_tackles),
        parseFloat(data.fouls),
        parseFloat(data.yellow_cards),
        parseFloat(data.red_cards),
        parseFloat(data.goals_conceded),
        parseFloat(data.shots_against),
        parseFloat(data.shots_on_target_against),
        parseFloat(data.xG_against),
      ]);
      dbConnection.query(insertQuery, [values], (insertErr, insertResults) => {
        if (insertErr) {
          console.error('Error inserting data into Matches table:', insertErr);
          res.status(500).json({
            error: 'Error inserting data into Matches table.',
            errorMessage: insertErr.sqlMessage,
          });
        } else {
          console.log('Data inserted into Matches table successfully');
          res.json({ success: true, insertedRows: insertResults.affectedRows });
        }
      });
    })
    .catch((error) => {
      console.error('Error converting CSV to JSON:', error);
      res.status(500).json({ error: 'Error converting CSV to JSON.' });
    });
});
//--------------------MatchesProfiles POST
app.post('/upload-csv/matchesProfiles', upload.single('csvFile'), (req, res) => {
  console.log('Reached /upload-csv/matchesProfiles endpoint');
  console.log('Request file:', req.file);
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  // Start a transaction
  dbConnection.beginTransaction((beginTransactionErr) => {
    if (beginTransactionErr) {
      console.error('Error starting MySQL transaction:', beginTransactionErr);
      return res.status(500).json({
        error: 'Error starting MySQL transaction.',
        errorMessage: beginTransactionErr.sqlMessage,
      });
    }
    csvtojson()
      .fromString(req.file.buffer.toString())
      .then((jsonArray) => {
        // Insert new values into the table
        const insertQuery =
          'INSERT INTO MatchesProfiles (match_id, date, home_team_id, away_team_id) VALUES ?';
        const values = jsonArray.map((data) => [
          parseInt(data.match_id),
          data.date,
          parseInt(data.home_team_id),
          parseInt(data.away_team_id),
        ]);
        dbConnection.query(insertQuery, [values], (insertErr, insertResults) => {
          if (insertErr) {
            console.error('Error inserting data into MySQL table:', insertErr);
            dbConnection.rollback(() => {
              res.status(500).json({
                error: 'Error inserting data into MySQL table.',
                errorMessage: insertErr.sqlMessage,
              });
            });
          } else {
            console.log('Data inserted into MySQL table successfully');
            dbConnection.commit((commitErr) => {
              if (commitErr) {
                console.error('Error committing MySQL transaction:', commitErr);
                res.status(500).json({
                  error: 'Error committing MySQL transaction.',
                  errorMessage: commitErr.sqlMessage,
                });
              } else {
                res.json({ success: true, insertedRows: insertResults.affectedRows });
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('Error converting CSV to JSON:', error);

        dbConnection.rollback(() => {
          res.status(500).json({ error: 'Error converting CSV to JSON.' });
        });
      });
  });
});
// MATCHES PRCESSING POST 
const columnMapping = [
  "Date", "Match", "Compétition", "Championnat", "Équipe", "Projet", "Buts", "xG", 
  "Tirs",
  "Tirs cadrés",
  "Tirs cadrés, %",  
 "Passes",
 "Passes complètes",
 "Passes complètes, %", 
 "Possession, %",
 "Pertes de balle",
 "P.Bas",
 "P.Moyen",
 "P.Élevé",
 "Récupérations de balle",
 "R.Bas",
 "R.Moyen",
 "R.Élevé",
 "Duels",
 "Duels gagnés",
 "Duels gagnés, %",
 "Tirs de l'extérieur de la surface",
 "Tirs de l'extérieur de la surface cadrés",
 "Tirs de l'extérieur de la surface cadrés, %",
 "Attaques positionnelles",
 "Attaques positionnelles avec tirs",
 "Attaques positionnelles avec tirs, %",
 "Contre-attaques",
 "Contre-attaques avec tirs",
 "Contre-attaques avec tirs, %",
 "Coups de pied arrêtés",
 "Coups de pied arrêtés avec tirs",
 "Coups de pied arrêtés avec tirs, %",
 "Corners",
 "Corners avec tirs",
 "Corners avec tirs, %",
 "Coups francs",
 "Coups francs avec tirs",
 "Coups francs avec tirs, %",
 "Penaltys",
 "Penaltys convertis",
 "Penaltys convertis, %",
 "Centres",
 "Centres précis",
 "Centres précis, %",
 "Entrées dans la la surface de réparation",
 "Entrées dans la la surface de réparation (courses)",
 "Entrées dans la la surface de réparation (centres)",
 "Duels offensifs",
 "Duels offensifs gagnés",
 "Duels offensifs gagnés, %",
 "Hors-jeu", "Buts concédés", 
 "Tirs contre",
 "Tirs contre cadrés",
 "Tirs contre cadrés, %",
 "Duels défensifs",
 "Duels défensifs gagnés",
 "Duels défensifs gagnés, %",
 "Duels aériens",
 "Duels aériens gagnés",
 "Duels aériens gagnés, %",
 "Tacles glissés",
 "Tacles glissés réussis",
 "Tacles glissés réussis, %",
    "Interceptions", "Dégagements", "Fautes", "Cartons jaunes",
 "Cartons rouges", 
 "Passes en avant",
 "Passes en avant précises",
 "Passes en avant précises, %",
 "Passes arrière",
 "Passes arrière précises",
 "Passes arrière précises, %",
 "Passes latérales",
 "Passes latérales précises",
 "Passes latérales précises, %",
 "Passes longues",
 "Passes longues précises",
 "Passes longues précises, %",
 "Passes dans 3ème tiers",
 "Passes dans 3ème tiers précises",
 "Passes dans 3ème tiers précises, %",
 "Passes progressives",
 "Passes progressives précises",
 "Passes progressives précises, %",
 "Passes astucieuses",
 "Passes astucieuses précises",
 "Passes astucieuses précises, %",
 "Remises en jeu",
 "Remises en jeu précises",
 "Remises en jeu précises, %",
   "But sur coup franc", "Rythme du match",
 "Moyenne de passes par possession", "% passes longues", "Moyenne distance de tir", "Longueur moyenne des passes", "PPDA"
];
const columns_to_drop = [
  'Passes progressives précises', 'Passes progressives précises, %',
  'Passes astucieuses', 'Passes astucieuses précises', 'Passes astucieuses précises, %',
  'Passes arrière', 'Passes arrière précises', 'Passes arrière précises, %',
  'Passes longues', 'Passes longues précises', 'Passes longues précises, %',
  'Passes latérales', 'Passes latérales précises', 'Passes latérales précises, %',
  'Remises en jeu', 'Remises en jeu précises', 'Remises en jeu précises, %',
  'Passes en avant précises, %', 'Duels aériens gagnés, %', 'Duels défensifs gagnés, %',
  'Centres précis, %', 'Coups francs avec tirs, %', 'Récupérations de balle',
  'Pertes de balle', 'Hors-jeu', 'Passes dans 3ème tiers',
  "Tirs de l'extérieur de la surface cadrés, %", 'Coups de pied arrêtés avec tirs, %',
  'Contre-attaques avec tirs', 'Corners avec tirs, %',
  'Penaltys convertis, %', 'Passes dans 3ème tiers précises', 'Passes dans 3ème tiers précises, %',
  'Tirs contre cadrés, %', 'Rythme du match'
]
const Columns_To_Add = ['Buts concédés','Tirs contre', 'Tirs contre cadrés', 'XG_against'];
const teamIdMapping=[
  {
    "id": 696,
    "nom": "SENIOR",
    "slug": "ASCL"
  },
  {
    "id": 730,
    "nom": "RS BERKANE",
    "slug": "RSB"
  },
  {
    "id": 737,
    "nom": "Raja Club Athletic",
    "slug": "RCA"
  },
  {
    "id": 738,
    "nom": "FUS RABAT",
    "slug": "FUS"
  },
  {
    "id": 742,
    "nom": "Maghreb de Fes",
    "slug": "MAS DE FES"
  },
  {
    "id": 745,
    "nom": "ASFAR (ASSOCIATION SPORTIVE DES FORCES ARMÉES ROYALES)",
    "slug": "ASFAR"
  },
  {
    "id": 746,
    "nom": "ASS (ASSOCIATION SPORTIVE DE SALE)",
    "slug": "ASS"
  },
  {
    "id": 747,
    "nom": "CAK (CHABAB ATLAS KHENIFRA)",
    "slug": "CAK"
  },
  {
    "id": 748,
    "nom": "CAYB (CLUB ATHLETIC YOUSSOUFIA BERRCHID)",
    "slug": "CAYB"
  },
  {
    "id": 749,
    "nom": "CISM(CLUB ITTIFAK SPORTIF DE MARRAKECH)",
    "slug": "CISM"
  },
  {
    "id": 750,
    "nom": "CJBG (CLUB JEUNESSE BEN GRIR)",
    "slug": "CJBG"
  },
  {
    "id": 751,
    "nom": "Sénior (DIFAA HASSANI EL JADIDI)",
    "slug": "DHJ"
  },
  {
    "id": 752,
    "nom": "HUSA (HASSANIA UNION SPORT AGADIR)",
    "slug": "HUSA"
  },
  {
    "id": 753,
    "nom": "IRT (ITTIHAD RIADI DE TANGER)",
    "slug": "IRT"
  },
  {
    "id": 754,
    "nom": "JSS (JEUNESSE SPORTIVE DE SOUALEM)",
    "slug": "JSS"
  },
  {
    "id": 755,
    "nom": "KACM (Kawkab Athletic Club Marrakech)",
    "slug": "KACM"
  },
  {
    "id": 756,
    "nom": "MAT (MORGHEB ATHLETIC TETOUAN)",
    "slug": "MAT"
  },
  {
    "id": 757,
    "nom": "MCO (MOULOUDIA CLUB OUJDA)",
    "slug": "MCO"
  },
  {
    "id": 758,
    "nom": "OCK (OLYMPIC CLUB KHOURIBGA)",
    "slug": "OCK"
  },
  {
    "id": 759,
    "nom": "OCS (OLYMPIC CLUB SAFI)",
    "slug": "OCS"
  },
  {
    "id": 760,
    "nom": "OD (OLYMPIC DCHEIRA)",
    "slug": "OD"
  },
  {
    "id": 761,
    "nom": "RAC (RACING ATHLETIC CASABLANCA)",
    "slug": "RAC"
  },
  {
    "id": 762,
    "nom": "RCAZ (RENAISSANCE CLUB ATHLETIC ZMAMRA)",
    "slug": "RCAZ"
  },
  {
    "id": 763,
    "nom": "RCOZ (RAPIDE CLUB OUED ZEM)",
    "slug": "RCOZ"
  },
  {
    "id": 764,
    "nom": "SCCM (SPORTING CLUB CHABAB MOHAMMEDIA)",
    "slug": "SCCM"
  },
  {
    "id": 765,
    "nom": "UTS (UNION TOUARGA SPORT)",
    "slug": "UTS"
  },
  {
    "id": 766,
    "nom": "WAC (WYDAD ATHLETIC CLUB)",
    "slug": "WAC"
  },
  {
    "id": 767,
    "nom": "WAF (WYDAD ATHLETIC FASSI)",
    "slug": "WAF"
  },
  {
    "id": 768,
    "nom": "CODM (CLUB OMNISPORTS DE MEKNES)",
    "slug": "CODM"
  },
  {
    "id": 769,
    "nom": "JSM (JEUNESSE SPORTIVE MASSIRA)",
    "slug": "JSM"
  },
  {
    "id": 770,
    "nom": "RBM (RAJA BENI MELLAL)",
    "slug": "RBM"
  },
  {
    "id": 771,
    "nom": "STADE MAROCAIN (SM)",
    "slug": "SM"
  },
  {
    "id": 772,
    "nom": "USMO (UNION SPORTIVE MUSULMAN OUJDA)",
    "slug": "USMO"
  },
  {
    "id": 773,
    "nom": "Académie Mohammed VI",
    "slug": "AMF"
  },
  {
    "id": 787,
    "nom": "ELITE CASABLANCA",
    "slug": "ELITE FCC"
  }
]
const slugsMapping= {
  'Olympic Safi': 'OCS',
  'Mouloudia Oujda': 'MCO',
  'Khemis Zemamra': 'RCAZ',
  'JS Soualem': 'JSM',
  'Moghreb Tétouan': 'MAT',
  'Raja Casablanca': 'RCA',
  'Chabab Mohammédia': 'SM',
  'FUS Rabat': 'FUS',
  'Youssoufia Berrechid': 'CAYB',
  'FAR Rabat': 'ASFAR',
  'Hassania Agadir': 'HUSA',
  'RSB Berkane': 'RSB',
  'Maghreb Fès': 'MAS DE FES',
  'Wydad Casablanca': 'WAC',
  'Ittihad Tanger': 'IRT',
  'UTS Rabat': 'UTS'
}
app.post('/upload-xlsx/Matches', upload.single('zipFile'), async (req, res) => {
  console.log('Reached /upload-xlsx/Matches endpoint');
  console.log('Request file:', req.file);

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const zip = new JSZip();
  await zip.loadAsync(req.file.buffer);
  const fileEntries = Object.values(zip.files);

  // Filter out files that start with '__MACOSX/._'
  const validXlsxEntries = fileEntries.filter((entry) => entry.name.endsWith('.xlsx') && !entry.name.startsWith('__MACOSX/._'));

  if (validXlsxEntries.length === 0) {
    return res.status(400).json({ error: 'No valid xlsx files found in the zip archive.' });
  }

  const resultArray = [];

  for (let i = 0; i < validXlsxEntries.length; i++) {
    const xlsxEntry = validXlsxEntries[i];
    const xlsxContent = await xlsxEntry.async('nodebuffer');

    try {
      const workbook = xlsx.read(xlsxContent, { type: 'buffer' });

      const jsonData = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const originalData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        // Drop rows 2 and 3
        const filteredData = originalData.filter((row, index) => index !== 1 && index !== 2);
        // Use columnMapping as header names
        const header = columnMapping;
        // Rename the keys 
        const [originalHeader, ...data] = filteredData;
        const renamedData = data.map(row => Object.fromEntries(header.map((key, index) => [key, row[index]])));
        
        const cleanedData = renamedData.map(row => {
          columns_to_drop.forEach(column => delete row[column]);
          return row;        
      });
      const opponent={Opponent:''};
      const evenRows=[];
      const Matches = [] ;
      cleanedData.forEach((row, index,Array) => {
        const SameGame = `${row.Match}-${row.Date}`;
        const opponentTeam = `${row.Équipe} ${row.Match}-${row.Date}`;
        const opponentTeamData = renamedData.find(r => r['Match'] === `${opponentTeam}-${row['Date']}`);
        if (!opponentTeamData && index % 2 !== 0) {
          // console.log(`${row.Équipe}`,'Oponnent ',opponentEquipe);
        } else {
          row['Buts concédés'] =  Array[index +1]['Buts'] ;
          row['Tirs contre'] =  Array[index +1]['Tirs'] ;
          row['Tirs contre cadrés'] =  Array[index +1]['Tirs cadrés'] ;
          row['XG_against'] = Array[index +1]['xG'] ;
          // opponent.Opponent= Array[index + 1] ? Array[index + 1]['Équipe'] : null;
          evenRows.push(row);
          // console.log(`${row.Équipe}`,'Oponnent ',opponent);
        }
      });
      evenRows.sort((a, b) => new Date(a.Date) - new Date(b.Date));
      cleanedData.length = 0;
      evenRows.forEach(row => cleanedData.push(row)); 
   
       return {
        data: cleanedData,
      };
      
      });
      resultArray.push({ jsonData });
      let flatMappedData = resultArray
      .flatMap(({ fileName, jsonData }) => {
        return jsonData.flatMap(sheetData => {
          return sheetData.data.map(row => ({ fileName, sheetName: sheetData.sheetName, ...row }));
        });
      });
      flatMappedData.sort((a, b) => {
        const dateComparison = new Date(a.Date) - new Date(b.Date);
      
        if (dateComparison === 0) {
          // If dates are equal, compare by Match
          return a.Match.localeCompare(b.Match);

        }
        return dateComparison;
      });
      let matchId = 1;
      const MatchesProfiles = {};

      flatMappedData.forEach((item, index) => {
        if (index % 2 === 0) {
          const homeTeam = item;
          const awayTeam = flatMappedData[index + 1];
          
          const matchKey = `${homeTeam.Match}-${homeTeam.Date}`;
          // const TeamSlugs=`${homeTeam.Equipe}-${slugsMapping[key]}`;
          
          MatchesProfiles[matchKey] = {
            match_Id: matchId++,
            home_id: index,
            away_id: index + 1,
            date: `${homeTeam.Date}`
          };
        }
      });

      flatMappedData = flatMappedData.map((item, index) => ({ ...item, id: index}));
      flatMappedData.forEach((item) => {
        const teamName = item?.Équipe; // Adjust the property name if needed
        if (teamName && slugsMapping[teamName]) {
          item.slug = slugsMapping[teamName];
        }
      });
      flatMappedData.forEach((item) => {
        const teamSlug = item?.slug; // Adjust the property name if needed
        if (teamSlug && teamIdMapping.some((mapping) => mapping.slug === teamSlug)) {
          const teamId = teamIdMapping.find((mapping) => mapping.slug === teamSlug)?.id;
          if (teamId) {
            item.team_id = teamId;
            delete item.slug; // Remove the 'slug' property
          }
        }
      });
        if (resultArray.length === validXlsxEntries.length) {
          const deleteQuery = "delete from matches"
      const deleteQuery1 = "delete from MatchesProfiles"

      const insertQuery =
      'INSERT INTO Matches (Id, date, team_id, team, project, goals, xG, shots, shots_on_target, shots_from_outside_the_box, shots_on_target_from_outside_the_box, counter_attacks, counter_attacks_with_shots_percentage, corners, corners_with_shots, free_kicks, free_kicks_with_shots, penalties, converted_penalties, offensive_duels, offensive_duels_won, r_low, r_medium, r_high, p_low, p_medium, p_high, positional_attacks, positional_attacks_with_shots_percentage, passes, completed_passes, forward_passes, accurate_forward_passes, possession_percentage, defensive_duels, defensive_duels_won, duels, duels_won, sliding_tackles, successful_sliding_tackles, fouls, yellow_cards, red_cards, goals_conceded, shots_against, shots_on_target_against, xG_against) VALUES ?';
      const values = flatMappedData.map((data) => [
        parseInt(data.id),
        new Date(data.Date),
        parseInt(data.team_id),
        data.Équipe,
        data.Projet,
        parseFloat(data.Buts),
        parseFloat(data.xG),
        parseFloat(data.Tirs),
        parseFloat(data['Tirs cadrés']),
        parseFloat(data["Tirs de l'extérieur de la surface"]),
        parseFloat(data["Tirs de l'extérieur de la surface cadrés"]),
        parseFloat(data["Contre-attaques"]),
        parseFloat(data["Contre-attaques avec tirs, %"]),
        parseFloat(data.Corners),
        parseFloat(data["Corners avec tirs"]),
        parseFloat(data["Coups francs"]),
        parseFloat(data["Coups francs avec tirs"]),
        parseFloat(data.Penaltys),
        parseFloat(data["Penaltys convertis"]),
        parseFloat(data["Duels offensifs"]),
        parseFloat(data["Duels offensifs gagnés"]),
        parseFloat(data["R.Bas"]),
        parseFloat(data["R.Moyen"]),
        parseFloat(data["R.Élevé"]),
        parseFloat(data["P.Bas"]),
        parseFloat(data["P.Moyen"]),
        parseFloat(data["P.Élevé"]),
        parseFloat(data["Attaques positionnelles"]),
        parseFloat(data["Attaques positionnelles avec tirs, %"]),
        parseFloat(data.Passes),
        parseFloat(data["Passes complètes"]),
        parseFloat(data["Passes en avant"]),
        parseFloat(data["Passes en avant précises"]),
        parseFloat(data["Possession, %"]),
        parseFloat(data["Duels défensifs"]),
        parseFloat(data["Duels défensifs gagnés"]),
        parseFloat(data.Duels),
        parseFloat(data["Duels gagnés"]),
        parseFloat(data["Tacles glissés"]),
        parseFloat(data["Tacles glissés réussis"]),
        parseFloat(data.Fautes),
        parseFloat(data["Cartons jaunes"]),
        parseFloat(data["Cartons rouges"]),
        parseFloat(data["Buts concédés"]),
        parseFloat(data["Tirs contre"]),
        parseFloat(data["Tirs contre cadrés"]),
        parseFloat(data.XG_against),
      ]);
      const insertMatchesProfiles =
      'INSERT INTO MatchesProfiles (match_id, home_team_id, away_team_id,date) VALUES ?';
      const matchesProfilesValues = Object.values(MatchesProfiles).map((profile) => [
        profile.match_Id,
        profile.home_id,
        profile.away_id,
        profile.date,
      ]);
            // delete Query for Matches Profiles

      dbConnection.query(deleteQuery1, (err, results) => {
        if (err) {
          console.error('Error retrieving data from MySQL table:', err);
          res.status(500).json({ error: 'Error retrieving data from MySQL table.', errorMessage: err.sqlMessage });
        } else {
    
        }
      });
            // delete Query for Matches
      dbConnection.query(deleteQuery, (err, results) => {
        if (err) {
          console.error('Error retrieving data from MySQL table:', err);
          res.status(500).json({ error: 'Error retrieving data from MySQL table.', errorMessage: err.sqlMessage });
        } else {
    
        }
      });
      // Insert Query for Matches
     dbConnection.query(insertQuery, [values], (insertErr, insertResults) => {
       if (insertErr) {
         console.error('Error inserting data into Matches table:', insertErr);
         res.status(500).json({
           error: 'Error inserting data into Matches table.',
           errorMessage: insertErr.sqlMessage,
         });
       } else {
         console.log('Data inserted into Matches table successfully');
       }
     });
           // Insert Query for Matches Profiles

     dbConnection.query(insertMatchesProfiles, [matchesProfilesValues], (insertErr, insertResults) => {
      if (insertErr) {
        console.error('Error inserting data into MySQL table:', insertErr);
        dbConnection.rollback(() => {
          res.status(500).json({
            error: 'Error inserting data into MySQL table.',
            errorMessage: insertErr.sqlMessage,
          });
        });
      } else {

     }
     ;});
     res.json({flatMappedData});
        app.get('/get/Matches', (req, res) => {
          res.json({ message: 'Data processed successfully.', flatMappedData });
        });
        app.get('/get/Matches/Profile', (req, res) => {
          res.json({ message: 'Data processed successfully.', MatchesProfiles });
        });
      }
    } catch (error) {
      console.error('An error occurred:', error);
      res.status(500).json({ error: 'An error occurred.' });
    }
  }
  
});
//---------------------------- GET PLAYER PROFILE DATA 
app.get('/get-csv/playerProfile', (req, res) => {
  // GET data from the database
  const query = 'SELECT * FROM PlayerProfile';
  dbConnection.query(query, (err, results) => {
    if (err) {
      console.error('Error retrieving data from MySQL table:', err);
      res.status(500).json({ error: 'Error retrieving data from MySQL table.', errorMessage: err.sqlMessage });
    } else {
      res.json({ data: results });
    }
  });
});
// update profile
app.post('/updated-csv/playerProfile', (req, res) => {
  const updatedPlayer = req.body; // Assuming the updated player data is sent in the request body
  // Acquire a connection from the pool
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting database connection:', err);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }
    // Update the player data in the database
    const updateQuery = 'UPDATE playerProfile SET wyscout_name = ?, first_name = ?, last_name = ?, ' +
      '90s = ?, age = ?, minutes_played = ?, foot = ?, height = ?, weight = ?, ' +
      'country_of_birth = ?, main_position = ?, template = ?, position_full_name = ?, ' +
      'season = ?, image_path = ? WHERE myTeam_id = ?';
    connection.query(
      updateQuery,
      [
        updatedPlayer.wyscout_name, updatedPlayer.first_name, updatedPlayer.last_name,
        updatedPlayer['90s'], updatedPlayer.age, updatedPlayer.minutes_played,
        updatedPlayer.foot, updatedPlayer.height, updatedPlayer.weight,
        updatedPlayer.country_of_birth, updatedPlayer.main_position,
        updatedPlayer.template, updatedPlayer.position_full_name,
        updatedPlayer.season, updatedPlayer.image_path,
        updatedPlayer.myTeam_id
      ],
      (updateError, results) => {
        // Release the connection back to the pool
        connection.release();

        if (updateError) {
          console.error('Error updating player data:', updateError);
          res.status(500).json({ message: 'Internal server error' });
        } else {
          res.status(200).json({ message: 'Player data updated successfully' });
        }
      }
    );
  });
});
//--------------------------player Metrics GET
app.get('/get-csv/playerMetrics', (req, res) => {
  // GET data from the database
  const query = 'SELECT * FROM PlayerMetrics';
  dbConnection.query(query, (err, results) => {
    if (err) {
      console.error('Error retrieving data from MySQL table:', err);
      res.status(500).json({ error: 'Error retrieving data from MySQL table.', errorMessage: err.sqlMessage });
    } else {
      res.json({ success: true, data: results });
    }
  });
});
//--------------------------Matches Get
app.get('/get-csv/Matches', (req, res) => {
  // GET data from the database
  const query = 'SELECT * FROM Matches';

  dbConnection.query(query, (err, results) => {
    if (err) {
      console.error('Error retrieving data from MySQL table:', err);
      res.status(500).json({ error: 'Error retrieving data from MySQL table.', errorMessage: err.sqlMessage });
    } else {
      res.json({ success: true, data: results });
    }
  });
});
//--------------------------MatchesProfiles Get
app.get('/get-csv/Matchesprofiles', (req, res) => {
  // GET data from the database
  const query = 'SELECT * FROM Matchesprofiles';

  dbConnection.query(query, (err, results) => {
    if (err) {
      console.error('Error retrieving data from MySQL table:', err);
      res.status(500).json({ error: 'Error retrieving data from MySQL table.', errorMessage: err.sqlMessage });
    } else {
      res.json({ success: true, data: results });

    }
  });
});

// ------------- Players Metrics Calculs
let positionWeightPath = './position_weights.json';
let positionWeightIndexPath = './position_index_weights.json';
// Read existing data from the file
let positionWeightExistingData = fs.readFileSync(positionWeightPath, 'utf-8');
let positionIndexWeightExistingData = fs.readFileSync(positionWeightIndexPath, 'utf-8');
// Parse existing JSON data
let position_weights = JSON.parse(positionWeightExistingData);
let position_index_weights = JSON.parse(positionIndexWeightExistingData);
app.get('/get-csv/MetricsVar', (req, res) => {
  res.json({  position_weights,position_index_weights });
});
app.put('/get-csv/MetricsVar', (req, res) => {
  let { positionWeights, positionIndexWeights } = req.body;
  console.log(positionIndexWeights);
  // Update your position_weights and position_index_weights variables here
  if(Object.keys(positionWeights).length !=0){
    position_weights = positionWeights;
    let updatedData = JSON.stringify(position_weights, null, 2);
    fs.writeFileSync(positionWeightPath, updatedData);
  }

  if (Object.keys(positionIndexWeights).length !=0) {
    position_index_weights = positionIndexWeights;
    let updatedIndexData = JSON.stringify(position_index_weights, null, 2);
    fs.writeFileSync(positionWeightIndexPath, updatedIndexData);
  }
  console.log(Object.keys(positionIndexWeights).length );

  res.json({ message: 'MetricsVar updated successfully' });
});
const playerMetricsApi = 'http://localhost:5038/get-csv/playerMetrics';
const playerProfilesApi = 'http://localhost:5038/get-csv/playerprofile';

// Assuming you define profilesData somewhere in your code
let profilesData;
const applyPositionWeights = (player, positionWeights) => {
  const position = player['main_position'];

  const applyWeightsRecursive = (data, weights) => {
    if (typeof data === 'number') {
      return data * weights;
    } else if (typeof data === 'object') {
      const result = {};
      for (const key in data) {
        if (weights[key] !== undefined) {
          result[key] = applyWeightsRecursive(data[key], weights[key]);
        } else {
          result[key] = data[key];
        }
      }
      return result;
    } else {
      return data; // Non-object, non-number values (e.g., strings) are not weighted
    }
  };

  if (positionWeights[position]) {
    const weightedPlayer = { ...player };
    let values  =  {};
    
    for (const [key, value] of Object.entries(positionWeights[position])) {
      if(typeof value === 'object'  ){
        for (const metricGroup in value) {
          if (weightedPlayer[metricGroup]) {
            const weights = value[metricGroup];
            weightedPlayer[metricGroup] = applyWeightsRecursive(weightedPlayer[metricGroup], weights);
            if (values.hasOwnProperty(key) ){
              const newArray = [...values[key], weightedPlayer[metricGroup]];
              console.log(newArray);
            }
            else{
              
            }
            values["team_id"]=weightedPlayer["myTeam_id"];

          } else {
          }

        }  
      }
      // function sumOfObject(positionWeights) {
      //   const sum = {};
       
      //   for (const key1 in positionWeights[position]) {
      //      if (positionWeights[position].hasOwnProperty(key1)) {
      //        sum[key1] = positionWeights[position][key1].key + positionWeights[position][key1].key;
      //      }

      //   }
       
      //   return sum;
      //  }

      //  console.log(sumOfObject(positionWeights)); // Output: { A: 30, B: 70 }
    }

    return weightedPlayer;
  }

  return player; // If no weights are defined for the position, return the original player
};

app.get('/getMergedPlayerData', async (req, res) => {
  try {
    const metricsResponse = await axios.get(playerMetricsApi);
    const metricsData = metricsResponse.data;

    const profilesResponse = await axios.get(playerProfilesApi);
    const profilesData = profilesResponse.data;

    const mergedData = mergeDataframes(metricsData, profilesData);

    // Apply position weights to each player in the merged data
    const weightedMergedData = {};
    for (const position in mergedData) {
      weightedMergedData[position] = mergedData[position].map(player => {
        return applyPositionWeights(player, position_weights);
      });
    }

    res.json(weightedMergedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch and merge player data.' });
  }
});

const mergeDataframes = (metricsData, profilesData) => {
  const metricsArray = metricsData.data;
  const profilesArray = profilesData.data;

  const mergedArray = [];
  for (const metricRow of metricsArray) {
    const profileRow = profilesArray.find(profileRow => profileRow.myTeam_id === metricRow.myTeam_id);
    if (profileRow) {
      mergedArray.push({ ...metricRow, ...profileRow });
    }
  }

  const groupedByPosition = mergedArray.reduce((acc, player) => {
    const position = player['main_position'];
    if (!acc[position]) {
      acc[position] = [];
    }
    acc[position].push(player);
    return acc;
  }, {});

  return groupedByPosition;
};

   
//  CLose Connection
app.on('close', () => {
  dbConnection.end((err) => {
    if (err) {
      console.error('Error closing MySQL database connection:', err);
    } else {
      console.log('Closed MySQL database connection');
    }
  });
});


// // Anas
// app.get('/players',(req,res)=>{
//   fs.readFile('./players.json', 'utf8', (err, data) => {
//     if (err) {
//       console.error('Error reading JSON file:', err);
//       res.status(500).json({ error: 'Internal Server Error' });
//       return;
//     }
    
//     try {
//       const jsonData = JSON.parse(data) ;
//       res.status(200).json(jsonData);
//     } catch (parseError) {
//       console.error('Error parsing JSON:', parseError);
//       res.status(500).json({ error: 'Internal Server Error' });
//     }
//   });
// })
// const MIME_TYPE_MAP = {
//   'image/png': 'png',
//   'image/jpeg': 'jpeg',
//   'image/jpg': 'jpg',
// };

// const FileUPload = multer({
//   storage: multer.diskStorage({
//     destination(req, file, cb) {
//       const { directory , file_name } = req.body; let
//         uploadPath = `uploads/datahub/${directory}`;
//       uploadPath = `${uploadPath}`;
//       if (!fs.existsSync(uploadPath)) {
//         fs.mkdirSync(`${uploadPath}`, { recursive: true });
//       }else{
//         fs.unlink(path.join(uploadPath, file), (err) => {
//           if (err) throw err;
//         });
//       }
//       cb(null, uploadPath);
//     },
//     filename(req, file, cb) {
//       const ext = MIME_TYPE_MAP[file.mimetype];
//       cb(null, `${file_name}.${ext}`);
//     },
//   }),
//   fileFilter: (req, file, cb) => {
//     if (
//       MIME_TYPE_MAP[file.mimetype]
//     ) {
//       cb(null, true);
//     } else {
//       cb(null, false);
//     }
//   },
// });
// // type [ player | club ]
// // body { file_name , directory  , file }
// app.post('/update-player' ,  FileUPload.fields([{ name: 'file', maxCount: 1 }]) ,(req,res)=>{
//    try {
//     const { directory  } = req.body , file = req.files ;
//     let fileImg ;
//     // if(file){
//     //   if (file.fileImg && file.fileImg.length > 0) {
//     //     fileImg = `images/${file.fileImg[0].filename}`;
//     //   }
//     // }
//     if (file.fileImg && file.fileImg.length > 0 && fs.existsSync(directory )) {
//       res.status(200).json(true);
//     }else{
//       res.status(200).json(false);
//     }
//     // fs.readFile('./players.json', 'utf8', (err, data) => {
//     //   if (err) {
//     //     console.error('Error reading JSON file:', err);
//     //     res.status(500).json({ error: 'Internal Server Error' });
//     //     return;
//     //   }
//     //   try {
//     //     // const jsonData = JSON.parse(data) ;
//     //     // // Update the file JSON
//     //     // switch (type) {
//     //     //   case 'player':
            
//     //     //     break;
//     //     //   case 'club':
            
//     //     //     break;
//     //     //   default:
//     //     //     break;
//     //     // }
//     //     res.status(200).json(jsonData);
//     //   } catch (error) {
//     //     res.status(500).json({ error  });
//     //   }
//     // });
//    } catch (error) {
//      res.status(500).json({ error  });
//    }
// })
//  PORT  serving
// ... (previous code)

app.listen(port, async () => {
  try {
     
      // Rest of your code
      console.log(`Server is running on port ${port}`);
  } catch (error) {
      console.error(error);
      console.log('Failed to start the server.');
  }
});

