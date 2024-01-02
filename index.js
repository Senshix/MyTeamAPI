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
  connectionLimit: 10
};
//------------  Connection to Mysql
const dbConnection = mysql.createPool(dbConfig);
// dbConnection.connect((err) => {
//   if (err) {
//     console.error('Error connecting to MySQL database:', err);
//     return;
//   }
//   console.log('Connected to MySQL database');
// });
const position_mapping = {
  'RCMF': 'CMF', // Right Center Midfield to Center Midfield
  'LCMF': 'CMF', // Left Center Midfield to Center Midfield
  'RDMF': 'DMF', // Right Defensive Midfield to Defensive Midfield
  'LDMF': 'DMF', // Left Defensive Midfield to Defensive Midfield
  'RCB': 'CB',
  'CB':'CB',   // Right Center Back to Center Back
  'LCB': 'CB',   // Left Center Back to Center Back
  'LAMF': 'LW',  // Left Attacking Midfield to Left Wing
  'RAMF': 'RW',  // Right Attacking Midfield to Right Wing
  'RWF': 'CF',   // Right Wing Forward to Center Forward
  'LWF': 'CF',   // Left Wing Forward to Center Forward
  'LB': 'LB',    // Left Back
  'AMF': 'AMF',  // Attacking Midfield
  'CF': 'CF',    // Center Forward
  'RB': 'RB',    // Right Back
  'LWB': 'LB',   // Left Wing Back to Left Back
  'RWB': 'RB',   // Right Wing Back to Right Back
  'DMF': 'DMF',  // Defensive Midfield
  'CMF': 'CMF',  // Center Midfield
  'RW': 'RW',    // Right Wing
  'LW': 'LW'     // Left Wing
}
const position_to_template = {
  'AMF': 'Winger/Attacking Midfielder',
  'CF': 'Striker',
  'DMF': 'Midfielder',
  'CB': 'Defender',
  'LB': 'Full Wing Back',
  'RB': 'Full Wing Back',
  'RW': 'Winger/Attacking Midfielder',
  'CMF': 'Midfielder',
  'LW': 'Winger/Attacking Midfielder'
}
const poste_mapping_dict = {
  'AMF': 'Milieu offensif',
  'CB': 'Defenseur central',
  'CF': 'Attaquant',
  'CMF': 'Milieu central',
  'DMF': 'Milieu defensif',
  'LB': 'Arriéré gauche',
  'LW': 'Ailier gauche',
  'RB': 'Arriéré droit',
  'RW': 'Ailier droit'
}

//--------------------------player Profile POST
// app.post('/upload-csv/playerProfile', upload.single('csvFile'), (req, res) => {
//   console.log('Reached /upload-csv/playerProfile endpoint');
//   console.log('Request file:', req.file);
//   if (!req.file) {
//     return res.status(400).json({ error: 'No file uploaded.' });
//   }
//   // Start a transaction
  
//   dbConnection.beginTransaction((beginTransactionErr) => {
//     if (beginTransactionErr) {
//       console.error('Error starting MySQL transaction:', beginTransactionErr);
//       return res.status(500).json({
//         error: 'Error starting MySQL transaction.',
//         errorMessage: beginTransactionErr.sqlMessage,
//       });
//     }
//     csvtojson()
//       .fromString(req.file.buffer.toString())
//       .then((jsonArray) => {
//         const idCheck = jsonArray.map((data) => data.Joueur);
//         const placeholders = idCheck.map(() => '?').join(', ');
//         const searchQuery = `SELECT wyscout_name FROM PlayerProfile WHERE wyscout_name IN (${placeholders})`;
//                 // Execute the search query
//         dbConnection.query(searchQuery, idCheck, (searchErr, searchResults) => {
//         if (searchErr) {
//         console.error('Error searching for wyscout_name in PlayerProfile:', searchErr);
//         // Handle the error as needed
//         dbConnection.rollback(() => {
//           res.status(500).json({
//             error: 'Error searching for wyscout_name in PlayerProfile.',
//             errorMessage: searchErr.sqlMessage,
//           });
//         });
//         return;
//         }
//         const existingIds =Array.from(new Set(searchResults.map(result => result.Joueur)));
//         const insertPromises = [];
//         const updatePromises = [];
//         let template;
//         let position_full_name;
//         jsonArray.forEach((data) => {
//           const first_name = 'first_name';
//           const season='23-24';
//           const joueurValues = data.Joueur.split('.'); // Split the Joueur values by dot
//           const last_name = joueurValues.length > 1 ? joueurValues[1].trim() : data.Joueur.trim(); // Take the value after the dot
//           const placeValues = data.Place.split(','); // Split the values by comma
//           const firstPlace = placeValues.length > 0 ? placeValues[0].trim() : ''; // Take the first value and trim any extra spaces  
//           if (position_mapping.hasOwnProperty(firstPlace)  ) {
//             data.Place = position_mapping[firstPlace];

//         }
//         const _90s = Math.round((parseInt(data['Minutes jouées']) / 90) * 100) / 100; // Round to 2 decimal places
//         if( position_to_template.hasOwnProperty(data.Place)&& poste_mapping_dict.hasOwnProperty(data.Place)){
//            template=position_to_template[data.Place];
//            position_full_name=poste_mapping_dict[data.Place]
//         }
//         const values = [
//           data.Joueur || '',
//           first_name,
//           last_name,
//           data.Équipe || '',
//           parseFloat(_90s),
//           parseInt(data.Âge) || 0,
//           parseInt(data['Minutes jouées']) || 0,
//           data.Pied || '',
//           parseInt(data.Taille) || 0,
//           parseInt(data.Poids) || 0,
//           data["Pays de naissance"] || '',
//           data.Place, // Replace NaN with 0
//           template,
//           position_full_name,
//           season
//       ];
//       const values_Metrics=[
//         data.Joueur || '',
//         data.Équipe || '',
//         parseFloat(data["Duels défensifs par 90"] || 0),
//         parseFloat(data[" Duels défensifs gagnés, %	"] || 0),
//         parseFloat(data[" Duels aériens par 90	"] || 0),
//         parseFloat(data[" Duels aériens gagnés, %		"] || 0),
//         parseFloat(data["Tacles glissés PAdj	"] || 0),
//         parseFloat(data["Interceptions PAdj	"] || 0),
//         parseFloat(data["Fautes par 90	"] || 0),
//         parseFloat(data["Cartons jaunes	"] || 0),
//         parseFloat(data["Cartons rouges	"] || 0),
//         parseFloat(data["Buts par 90"] || 0),
//         parseFloat(data[" Buts hors penalty par 90"] || 0),
//         parseFloat(data["xG par 90	"] || 0),
//         parseFloat(data["Tirs par 90"] || 0),
//         parseFloat(data["Tirs à la cible, %	"] || 0),
//         parseFloat(data["Taux de conversion but/tir	"] || 0),
//         parseFloat(data["Passes décisives par 90	"] || 0),
//         parseFloat(data["Centres par 90	"] || 0),
//         parseFloat(data["Сentres précises, %	"] || 0),
//         parseFloat(data["Dribbles par 90	"] || 0),
//         parseFloat(data["Dribbles réussis, %	"] || 0),
//         parseFloat(data["Duels offensifs par 90"] || 0),
//         parseFloat(data["Touches de balle dans la surface de réparation sur 90"] || 0),
//         parseFloat(data["Courses progressives par 90"] || 0),
//         parseFloat(data["Passes réceptionnées par 90	"] || 0),
//         parseFloat(data["xA par 90	"] || 0),
//         parseFloat(data["Passes décisives avec tir par 90"] || 0),
//         parseFloat(data["Passes vers la surface de réparation par 90"] || 0),
//         parseFloat(data["Passes vers la surface de réparation précises, %"] || 0),
//         parseFloat(data["Passes pénétrantes par 90"] || 0),
//         parseFloat(data["Passes progressives par 90"] || 0),
//         parseFloat(data["Passes progressives précises, %"] || 0),
//         parseFloat(data["xG/Tir"] || 0),
//         parseFloat(data["Longues passes réceptionnées par 90"] || 0),
//         parseFloat(data["Passes longues par 90"] || 0),
//         parseFloat(data["Longues passes précises, %"] || 0),
//         parseFloat(data["Passes avant par 90"] || 0),
//         parseFloat(data["Passes précises, %"] || 0),
//         parseFloat(data["Passes par 90"] || 0),
//         parseFloat(data["Passes en avant précises, %"] || 0),
//         parseFloat(data["Actions défensives réussies par 90"] || 0),
//       ]


//           if (existingIds.includes(+data.Joueur)) {            
//             // If myteam_id exists
//             const updatePromise = new Promise((resolve, reject) => {
//               const updateQuery = 'UPDATE PlayerProfile SET ' +
//               'first_name= ?, ' +
//               'last_name = ?, ' +
//               '90s = ?, ' +
//               'age = ?, ' +
//               'minutes_played = ?, ' +
//               'foot = ?, ' +
//               'height = ?, ' +
//               'weight = ?, ' +
//               'country_of_birth = ?, ' +
//               'main_position = ?, ' +
//               'template = ?, ' +
//               'position_full_name = ?, ' +
//               'season = ?, ' +
//               'WHERE wyscout_name = ?';
//               dbConnection.query(updateQuery, [...values.slice(1), data.Joueur], (updateErr, updateResults) => {
//                 if (updateErr) {
//                   console.error('Error updating data in MySQL table:', updateErr);
//                   reject(updateErr);
//                 } else {
//                   console.log(`Data updated for Joueur :  ${data.Joueur} successfully`);
//                   resolve(updateResults);
//                 }
//               });
//             });
//             updatePromises.push(updatePromise);
//           } else {
// //            If wyscout_name doesn't exist
//             const insertPromise = new Promise((resolve, reject) => {
//               const insertQueryMetrics =
//               'INSERT INTO playerMetrics (wyscout_name,Team, defensive_duels_per_90, ' +
//               'defensive_duels_won_percentage, aerial_duels_per_90, aerial_duels_won_percentage, ' +
//               'sliding_tackles_per_90_padj, interceptions_per_90_padj, fouls_per_90, yellow_cards, ' +
//               'red_cards, goals_per_90, non_penalty_goals_per_90, xG_per_90, shots_per_90, ' +
//               'shots_on_target_percentage, shot_conversion_rate, assists_per_90, crosses_per_90, ' +
//               'accurate_crosses_percentage, dribbles_per_90, successful_dribbles_percentage, ' +
//               'offensive_duels_per_90, ball_touches_in_penalty_area_per_90, progressive_runs_per_90, ' +
//               'passes_received_per_90, xA_per_90, assists_with_shots_per_90, passes_to_penalty_area_per_90, ' +
//               'accurate_passes_to_penalty_area_percentage,key_passes_per_90, progressives_passes_per_90, ' +
//               'progressives_passes_accuracy, xG_per_shot, long_passes_received_per_90, ' +
//               'long_passes_per_90, long_passes_accuracy, forward_passes_per_90, ' +
//               'accurate_passes, passes_per_90, accurate_forward_passes, defensive_actions_per_90) VALUES ?';
          
//               const insertQuery = 'INSERT INTO PlayerProfile (wyscout_name, first_name, last_name, Team, `90s`, age, minutes_played, foot, height, weight, country_of_birth, main_position, template, position_full_name, season) VALUES ?';
//               dbConnection.query(insertQuery, [[values]], (insertErr, insertResults) => {
//                 if (insertErr) {
//                   console.error('Error inserting data into MySQL table:', insertErr);
//                   reject(insertErr);
//                 } else {
//                   resolve(insertResults);
//                 }
//               });
//               dbConnection.query(insertQueryMetrics, [[values_Metrics]], (insertErr, insertResults) => {
//                 if (insertErr) {
//                   console.error('Error inserting data into MySQL table:', insertErr);
//                   reject(insertErr);
//                 } else {
//                   resolve(insertResults);
//                 }
//               });
//             });
//             insertPromises.push(insertPromise);
//           }
//         });
//         console.log('Search Query:', dbConnection.format(searchQuery, idCheck));
//         console.log('existed  IDs:', existingIds);
//         //Execute all update promises
//         Promise.all(updatePromises)
//           .then(() => {
//             // Execute all insert promises
//             return Promise.all(insertPromises);
//           })
//           .then(() => {
// //             Commit the transaction
//              dbConnection.commit((commitErr) => {
//                if (commitErr) {
//                  console.error('Error committing MySQL transaction:', commitErr);
//                  res.status(500).json({
//                    error: 'Error committing MySQL transaction.',
//                    errorMessage: commitErr.sqlMessage,
//                  });
//                } else {
//                 // Send success response
//                  res.json({ success: true });
//                }
//              });
//           })
//           .catch((error) => {
//             // Handle errors from promises
//             console.error('Error in promises:', error);
//             dbConnection.rollback(() => {
//               res.status(500).json({ error: 'Error in promises.' });
//             });
//           });
//       });
//     })
//     .catch((error) => {
//       console.error('Error converting CSV to JSON:', error);
//       dbConnection.rollback(() => {
//         res.status(500).json({ error: 'Error converting CSV to JSON.' });
//       });
//     });
// });
// });
// ----------------------------------------------
app.post('/upload-csv/playerProfile', upload.single('csvFile'), (req, res) => {
  console.log('Reached /upload-csv/playerProfile endpoint');
  console.log('Request file:', req.file);

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  csvtojson()
    .fromString(req.file.buffer.toString())
    .then((jsonArray) => {
      const idCheck = jsonArray.map((data) => data.Joueur);

      const placeholders = idCheck.map(() => '?').join(', ');
      const searchQuery = `SELECT wyscout_name FROM PlayerProfile WHERE wyscout_name IN (${placeholders})`;

      // Execute the search query
      dbConnection.query(searchQuery, idCheck, (searchErr, searchResults) => {
        if (searchErr) {
          console.error('Error searching for wyscout_name in PlayerProfile:', searchErr);
          // Handle the error as needed
          return res.status(500).json({
            error: 'Error searching for wyscout_name in PlayerProfile.',
            errorMessage: searchErr.sqlMessage,
          });
        }

        const existingIds = Array.from(new Set(searchResults.map(result => result.wyscout_name)));
        const insertPromises = [];
        const updatePromises = [];
        
       
        let template;
        let position_full_name;
        let xG_Tir;
        jsonArray.forEach((data) => {
          const first_name = 'first_name';
          const season='23-24';
        // Split the Joueur values by dot if defined, otherwise use an empty array
          const joueurValues = data.Joueur ? data.Joueur.split('.') : [''];     
          // Take the value after the dot if available, otherwise trim data.Joueur or use an empty string
          const last_name = joueurValues.length > 1 ? joueurValues[1].trim() : (data.Joueur ? data.Joueur.trim() : '');

          // Split the values by comma
          const placeValues = data.Place ? data.Place.split(',') : [''];
          // Take the first value and trim any extra spaces
          const firstPlace = placeValues.length > 0 ? placeValues[0].trim() : '';
           xG_Tir=parseFloat((data.xG / data.Tir).toFixed(2));
          // Check if position_mapping has the firstPlace value before accessing it
          if (position_mapping.hasOwnProperty(firstPlace)) {
            data.Place = position_mapping[firstPlace];
          }

        const _90s = Math.round((parseInt(data['Minutes jouées']) / 90) * 100) / 100; // Round to 2 decimal places
        if( position_to_template.hasOwnProperty(data.Place)&& poste_mapping_dict.hasOwnProperty(data.Place)){
           template=position_to_template[data.Place];
           position_full_name=poste_mapping_dict[data.Place]
        }

          const values = [
            data.Joueur ,
            first_name,
            last_name,
            data.Équipe ,
            parseFloat(_90s),
            parseInt(data.Âge) || 0,
            parseInt(data['Minutes jouées']) || 0,
            data.Pied || '',
            parseInt(data.Taille) || 0,
            parseInt(data.Poids) || 0,
            data["Pays de naissance"] || '',
            data.Place, // Replace NaN with 0
            template,
            position_full_name,
            season
        ];
        const values_Metrics=[
          data.Joueur ,
          data.Équipe ,
          parseFloat(data["Duels défensifs par 90"] || 0),
          parseFloat(data["Duels défensifs gagnés, %"] || 0),
          parseFloat(data["Duels aériens par 90"] || 0),
          parseFloat(data["Duels aériens gagnés, %"] || 0),
          parseFloat(data["Tacles glissés PAdj"] || 0),
          parseFloat(data["Interceptions PAdj"] || 0),
          parseFloat(data["Fautes par 90"] || 0),
          parseFloat(data["Cartons jaunes"] || 0),
          parseFloat(data["Cartons rouges"] || 0),
          parseFloat(data["Buts par 90"] || 0),
          parseFloat(data["Buts hors penalty par 90"] || 0),
          parseFloat(data["xG par 90"] || 0),
          parseFloat(data["Tirs par 90"] || 0),
          parseFloat(data["Tirs à la cible, %"] || 0),
          parseFloat(data["Taux de conversion but/tir"] || 0),
          parseFloat(data["Passes décisives par 90"] || 0),
          parseFloat(data["Centres par 90"] || 0),
          parseFloat(data["Сentres précises, %"] || 0),
          parseFloat(data["Dribbles par 90"] || 0),
          parseFloat(data["Dribbles réussis, %"] || 0),
          parseFloat(data["Duels offensifs par 90"] || 0),
          parseFloat(data["Touches de balle dans la surface de réparation sur 90"] || 0),
          parseFloat(data["Courses progressives par 90"] || 0),
          parseFloat(data["Passes réceptionnées par 90"] || 0),
          parseFloat(data["xA par 90"] || 0),
          parseFloat(data["Passes décisives avec tir par 90"] || 0),
          parseFloat(data["Passes vers la surface de réparation par 90"] || 0),
          parseFloat(data["Passes vers la surface de réparation précises, %"] || 0),
          parseFloat(data["Passes pénétrantes par 90"] || 0),
          parseFloat(data["Passes progressives par 90"] || 0),
          parseFloat(data["Passes progressives précises, %"] || 0),
          parseFloat(xG_Tir || 0),
          parseFloat(data["Longues passes réceptionnées par 90"] || 0),
          parseFloat(data["Passes longues par 90"] || 0),
          parseFloat(data["Longues passes précises, %"] || 0),
          parseFloat(data["Passes avant par 90"] || 0),
          parseFloat(data["Passes précises, %"] || 0),
          parseFloat(data["Passes par 90"] || 0),
          parseFloat(data["Passes en avant précises, %"] || 0),
          parseFloat(data["Actions défensives réussies par 90"] || 0),
        ]

          if (existingIds.includes(data.Joueur)) {
            // Update existing record
            const updatePromise = new Promise((resolve, reject) => {
              const updateQuery = 'UPDATE PlayerProfile SET ' +
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
                            'season = ? ' +
                            'WHERE wyscout_name = ?';

              dbConnection.query(updateQuery, [...values.slice(1), data.Joueur], (updateErr, updateResults) => {
                if (updateErr) {
                  console.error('Error updating data in MySQL table:', updateErr);
                  reject(updateErr);
                } else {
                  console.log(`Data updated for Joueur: ${data.Joueur} successfully`);
                  resolve(updateResults);
                }
              });
            });
            updatePromises.push(updatePromise);
          } else {
            // Insert new record
            const insertPromise = new Promise((resolve, reject) => {
              const insertQuery = 'INSERT INTO PlayerProfile (wyscout_name, first_name, last_name, Team, `90s`, age, minutes_played, foot, height, weight, country_of_birth, main_position, template, position_full_name, season) VALUES ?';
              const insertQueryMetrics =
                            'INSERT INTO playerMetrics (wyscout_name,Team, defensive_duels_per_90, ' +
                            'defensive_duels_won_percentage, aerial_duels_per_90, aerial_duels_won_percentage, ' +
                            'sliding_tackles_per_90_padj, interceptions_per_90_padj, fouls_per_90, yellow_cards, ' +
                            'red_cards, goals_per_90, non_penalty_goals_per_90, xG_per_90, shots_per_90, ' +
                            'shots_on_target_percentage, shot_conversion_rate, assists_per_90, crosses_per_90, ' +
                            'accurate_crosses_percentage, dribbles_per_90, successful_dribbles_percentage, ' +
                            'offensive_duels_per_90, ball_touches_in_penalty_area_per_90, progressive_runs_per_90, ' +
                            'passes_received_per_90, xA_per_90, assists_with_shots_per_90, passes_to_penalty_area_per_90, ' +
                            'accurate_passes_to_penalty_area_percentage,key_passes_per_90, progressives_passes_per_90, ' +
                            'progressives_passes_accuracy, xG_per_shot, long_passes_received_per_90, ' +
                            'long_passes_per_90, long_passes_accuracy, forward_passes_per_90, ' +
                            'accurate_passes, passes_per_90, accurate_forward_passes, defensive_actions_per_90) VALUES ?';

              dbConnection.query(insertQuery, [[values]], (insertErr, insertResults) => {
                if (insertErr) {
                  console.error('Error inserting data into PlayerProfile table:', insertErr);
                  reject(insertErr);
                  return ;
                } else {
                  console.log(`Data inserted for Joueur: ${data.Joueur} successfully`);
                  resolve(insertResults);
                }
              });

              dbConnection.query(insertQueryMetrics, [[values_Metrics]], (insertErr, insertResults) => {
                if (insertErr) {
                  console.error('Error inserting data into playerMetrics table:', insertErr);
                  reject(insertErr);
                  return ;
                } else {
                  console.log(`Metrics inserted for Joueur: ${data.Joueur} successfully`);
                  resolve(insertResults);
                }
              });
            });
            insertPromises.push(insertPromise);
          }
        });

        // Execute all update promises
        Promise.all(updatePromises)
          .then(() => {
            // Execute all insert promises
            return Promise.all(insertPromises);
          })
          .then(() => {
            // Send success response
            res.json({ success: true });
          })
          .catch((error) => {
            // Handle errors from promises
            console.error('Error in promises:', error);
            res.status(500).json({ error: 'Error in promises.' });
          });
      });
    })
    .catch((error) => {
      console.error('Error converting CSV to JSON:', error);
      res.status(500).json({ error: 'Error converting CSV to JSON.' });
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
              parseFloat(data.shot_conversion_rate),  // Changed from goal_conversion_rate
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
              parseFloat(data.key_passes_per_90),  // Added missing field
              parseFloat(data.progressives_passes_per_90),  // Changed from progressive_passes_per_90
              parseFloat(data.progressives_passes_accuracy), // Added missing field
              parseFloat(data.xG_per_shot),
              parseFloat(data.long_passes_received_per_90),  // Added missing field
              parseFloat(data.long_passes_per_90),  // Added missing field
              parseFloat(data.long_passes_accuracy),  // Added missing field
              parseFloat(data.forward_passes_per_90),  // Added missing field
              parseFloat(data.accurate_passes),  // Added missing field
              parseFloat(data.passes_per_90),  // Added missing field
              parseFloat(data.accurate_forward_passes),  // Added missing field
              parseFloat(data.defensive_actions_per_90),  // Added missing field
              parseInt(data.ranking_index),

          ];
          
            if (existingIds.includes(+data.myTeam_id)) {            
              // If myTeam_id exists
              const updatePromise = new Promise((resolve, reject) => {
                const updateQuery =
                'UPDATE playerMetrics SET ' +
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
                'shot_conversion_rate = ?, ' +
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
                'key_passes_per_90=?,'+
                'progressives_passes_per_90 = ?, ' +
                'progressives_passes_accuracy = ?, ' +  // Added missing field
                'xG_per_shot = ?, ' +
                'long_passes_received_per_90 = ?, ' +  // Added missing field
                'long_passes_per_90 = ?, ' +  // Added missing field
                'long_passes_accuracy = ?, ' +  // Added missing field
                'forward_passes_per_90 = ?, ' +  // Added missing field
                'accurate_passes = ?, ' +  // Added missing field
                'passes_per_90 = ?, ' +  // Added missing field
                'accurate_forward_passes = ?, ' +  // Added missing field
                'defensive_actions_per_90 = ? ' +  // Added missing field
                'WHERE myTeam_id = ?';

                dbConnection.query(updateQuery, [...values.slice(1), data.myTeam_id], (updateErr, updateResults) => {
                  if (updateErr) {
                    console.error('Error updating data in MySQL table:', updateErr);
                    reject(updateErr);
                  } else {
                    // console.log(`Data updated for myTeam_id :  ${data.myTeam_id} successfully`);
                    resolve(updateResults);
                  }
                });
              });
              updatePromises.push(updatePromise);
            } else {
              // If myTeam_id doesn't exist
              const insertPromise = new Promise((resolve, reject) => {
                const insertQuery =
                'INSERT INTO playerMetrics (myTeam_id, defensive_duels_per_90, ' +
                'defensive_duels_won_percentage, aerial_duels_per_90, aerial_duels_won_percentage, ' +
                'sliding_tackles_per_90_padj, interceptions_per_90_padj, fouls_per_90, yellow_cards, ' +
                'red_cards, goals_per_90, non_penalty_goals_per_90, xG_per_90, shots_per_90, ' +
                'shots_on_target_percentage, shot_conversion_rate, assists_per_90, crosses_per_90, ' +
                'accurate_crosses_percentage, dribbles_per_90, successful_dribbles_percentage, ' +
                'offensive_duels_per_90, ball_touches_in_penalty_area_per_90, progressive_runs_per_90, ' +
                'passes_received_per_90, xA_per_90, assists_with_shots_per_90, passes_to_penalty_area_per_90, ' +
                'accurate_passes_to_penalty_area_percentage,key_passes_per_90, progressives_passes_per_90, ' +
                'progressives_passes_accuracy, xG_per_shot, long_passes_received_per_90, ' +
                'long_passes_per_90, long_passes_accuracy, forward_passes_per_90, ' +
                'accurate_passes, passes_per_90, accurate_forward_passes, defensive_actions_per_90) VALUES ?';
            

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
          // console.log('Search Query:', dbConnection.format(searchQuery, idCheck));
          // console.log('existed  IDs:', existingIds);
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
// ------------- Players Metrics Calculs
                // let positionWeightPath = './position_weights.json';
                // let positionWeightIndexPath = './position_index_weights.json';
                // // Read existing data from the file
                // let positionWeightExistingData = fs.readFileSync(positionWeightPath, 'utf-8');
                // let positionIndexWeightExistingData = fs.readFileSync(positionWeightIndexPath, 'utf-8');
                // // Parse existing JSON data
                // let position_weights = JSON.parse(positionWeightExistingData);
                // let position_index_weights = JSON.parse(positionIndexWeightExistingData);
                // app.get('/get-csv/MetricsVar', (req, res) => {
                //   res.json({  position_weights,position_index_weights });
                // });
                // app.put('/get-csv/MetricsVar', (req, res) => {
                //   let { positionWeights, positionIndexWeights } = req.body;
                //   console.log(positionIndexWeights);
                //   // Update your position_weights and position_index_weights variables here
                //   if(Object.keys(positionWeights).length !=0){
                //     position_weights = positionWeights;
                //     let updatedData = JSON.stringify(position_weights, null, 2);
                //     fs.writeFileSync(positionWeightPath, updatedData);
                //   }

                //   if (Object.keys(positionIndexWeights).length !=0) {
                //     position_index_weights = positionIndexWeights;
                //     let updatedIndexData = JSON.stringify(position_index_weights, null, 2);
                //     fs.writeFileSync(positionWeightIndexPath, updatedIndexData);
                //   }
                //   // console.log(Object.keys(positionIndexWeights).length );

                //   res.json({ message: 'MetricsVar updated successfully' });
                // });
                // const playerMetricsApi = 'http://localhost:5038/get-csv/playerMetrics';
                // const playerProfilesApi = 'http://localhost:5038/get-csv/playerprofile';

                // // Assuming you define profilesData somewhere in your code
                // let profilesData;
                // let totalSumArray;
                // const options = [];
                // const colors = ["#C70773", "#32CCA0", "#64BB9E", "#582E6E", "#86F749"];
                // const selected_features = [
                //   'xG_per_90', 'shots_per_90', 'ball_touches_in_penalty_area_per_90',
                //   'dribbles_per_90', 'successful_dribbles_percentage', 'defensive_actions_per_90', 'passes_per_90',
                //   'passes_to_penalty_area_per_90', 'progressives_passes_per_90'
                // ];
                // let League_Avg = {};
                // let Pos_Avg={};
                // let recent_performance=[];
                // let weighted;

                //   // Min-Max Scaling function
                //   const minMaxScaleArray = (data, newMin = 0, newMax = 100, decimalPlaces = 2) => {
                //     const min = Math.min(...data);
                //     const max = Math.max(...data);
                    
                //     const scaledData = data.map(value =>
                //       parseFloat(((value - min) / (max - min) * (newMax - newMin) + newMin).toFixed(decimalPlaces))
                //     );
                  
                //     return scaledData;
                //   };
                // const applyPositionWeights = (player, position_weights) => {
                //   const position = player['main_position'];

                //   const applyWeightsRecursive = (data, weights) => {
                //     if (typeof data === 'number') {
                //       return data * weights;
                //     } else if (typeof data === 'object') {
                //       const result = {};
                //       for (const key in data) {
                //         if (weights[key] !== undefined) {
                //           result[key] = applyWeightsRecursive(data[key], weights[key]);
                //         } else {
                //           result[key] = data[key];
                //         }
                //       }
                //       return result;
                //     } else {
                //       return data; // Non-object, non-number values (e.g., strings) are not weighted
                //     }
                //   };

                //   if (position_weights[position]) {
                //     const weightedPlayer = { ...player };
                //     let values = {};
                //     let sumValue = {};
                //     let sumValues = {};

                //     for (const [key, value] of Object.entries(position_weights[position])) {
                //       if (typeof value === 'object') {
                //         for (const metricGroup in value) {
                //           if (weightedPlayer[metricGroup]) {
                //             const weights = value[metricGroup];
                //             weightedPlayer[metricGroup] = applyWeightsRecursive(weightedPlayer[metricGroup], weights);

                //             if (!values[key]) {
                //               values[key] = {};
                //             }
                //             values[key][metricGroup] = weightedPlayer[metricGroup];
                //             sumValue[key] = Object.values(values[key]).reduce((a, b) => a + b, 0);
                //             sumValue["minutes_played"]=weightedPlayer["90s"]*90;
                //             // console.log(weightedPlayer["myTeam_id"],sumValue);
                //           }
                //         }
                //       }
                //     }

                //     for (const [key, value] of Object.entries(position_index_weights[position])) {
                //       for (const [key1, value1] of Object.entries(sumValue)) {
                //         if (key === key1) {
                //           if (!sumValues[key1]) {
                //             sumValues[key1] = 0;
                //           }
                //           sumValues[key1] += value * value1;
                //           //  console.log(weightedPlayer["myTeam_id"],sumValues)
                //         }
                //       }
                //     }

                //     // Calculate totalSum based on the sumValues
                //     const totalSum = Object.values(sumValues).reduce((a, b) => a + b, 0);
                //     //  console.log(weightedPlayer["myTeam_id"],totalSum)
                //       if(!totalSumArray){
                //       totalSumArray=[];
                //       weightedPlayer[`${position}_index`]=totalSumArray;
                //     }
                //     totalSumArray.push(totalSum);
                //     // Min-Max scale the standard-scaled totalSumArray
                //     const finalScaledTotalSumArray = minMaxScaleArray(totalSumArray);
                //     // console.log(finalScaledTotalSumArray)
                //     player["indice"]=totalSum;
                //   }

                //   return player;
                // };


                // app.get('/getMergedPlayerData', async (req, res) => {
                //   try {
                //     const metricsResponse = await axios.get(playerMetricsApi);
                //     const metricsData = metricsResponse.data;

                //     const profilesResponse = await axios.get(playerProfilesApi);
                //     const profilesData = profilesResponse.data;

                //     const mergedData = mergeDataframes(metricsData, profilesData);

                //     // Apply position weights to each player in the merged data
                //     const weightedMergedData = {};
                //     for (const position in mergedData) {
                //       weightedMergedData[position] = mergedData[position].map(player => {
                //         Pos_Avg[position] = {}; // Create an object for the position

                //         selected_features.forEach(feature => {
                //           Pos_Avg[position][feature] = []; // Create an empty array for the feature
                      
                //           mergedData[position].forEach(player => {
                //             if (player) {
                //               Pos_Avg[position][feature].push(player[feature]);
                //             }
                //           });
                      
                //           const totalSum = Pos_Avg[position][feature].reduce((a, b) => a + b, 0);
                //           const average = totalSum / Pos_Avg[position][feature].length;
                //           Pos_Avg[position][feature] = parseFloat(average.toFixed(1));

                //         });

                //         return applyPositionWeights(player, position_weights);
                //       })
                //       ;
                //     }
                //     const finalScaledTotalSumArray = minMaxScaleArray(totalSumArray);

                // // Your existing loop code
                // for (const position in weightedMergedData) {
                //   // Sort players within the position based on scaled indice values in descending order
                //   weightedMergedData[position].sort((a, b) => b.indice - a.indice);

                //   // Assign ranking based on the sorted order
                //   weightedMergedData[position].forEach((player, index) => {
                //     for (const scaledMetric in totalSumArray){
                //       if (player["indice"]==totalSumArray[scaledMetric]){
                //         player["indice"] = finalScaledTotalSumArray[scaledMetric]; // Update the scaled indice value if needed

                //       }
                //     }
                //     player.Classement = index + 1; // Assign rank based on sorted order
                //   });
                 
                //     selected_features.forEach(feature => {
                //       weightedMergedData[position].forEach(player => {
                //         if (feature === "progressives_passes_per_90" || feature === "passes_to_penalty_area_per_90") {
                //           return;
                //         }

                //         const performanceObject = {
                //           id:player["myTeam_id"],
                //           label: feature,
                //           player_value: player[feature],
                //           league_value: League_Avg[feature],
                //           position_value: Pos_Avg[position][feature],
                //           children: []
                //         };

                //         if (feature === "passes_per_90") {
                //           performanceObject["id"]=player["myTeam_id"],
                //           performanceObject["label"] = feature;
                //           performanceObject["player_value"] = player[feature];
                //           performanceObject["league_value"] = League_Avg[feature];
                //           performanceObject["position_value"] = Pos_Avg[position][feature];
                //           performanceObject["children"] = [];
                //           performanceObject.children.push({
                //             label: "passes_to_penalty_area_per_90",
                //             player_value: player["passes_to_penalty_area_per_90"],
                //             league_value: League_Avg["passes_to_penalty_area_per_90"],
                //             position_value: Pos_Avg[position]["passes_to_penalty_area_per_90"]
                //           }, {
                //             label: "progressives_passes_per_90",
                //             player_value: player["progressives_passes_per_90"],
                //             league_value: League_Avg["progressives_passes_per_90"],
                //             position_value: Pos_Avg[position]["progressives_passes_per_90"]
                //           });
                //         }

                //         recent_performance.push(performanceObject); 
                        
                //         // console.log(player["myTeam_id"])
                //         // Push the performance object into the array
                //       });
                      
                      
                      
                //     });
                //     weighted= weightedMergedData[position].map(player=>{
                //      return recent_performance.map(metric=>{
                //         if(metric["id"]===player["myTeam_id"]){
                //          player["recent_performances"]=metric;

                //         }
                //         return player
                //        })
                //     })
                // }
                //   console.log(weighted)
                //   res.json(weightedMergedData);
                //   } catch (error) {
                //     console.error(error);
                //     res.status(500).json({ error: 'Failed to fetch and merge player data.' });
                //   }
                // });

                // const mergeDataframes = (metricsData, profilesData) => {
                //   const metricsArray = metricsData.data;
                //   const profilesArray = profilesData.data;

                //   const mergedArray = [];
                //   for (const metricRow of metricsArray) {
                //     const profileRow = profilesArray.find(profileRow => profileRow.myTeam_id === metricRow.myTeam_id);
                //     if (profileRow) {
                //       mergedArray.push({ ...metricRow, ...profileRow });
                //     }
                //     const featureObjects = {};

                //     selected_features.forEach(feature => {
                //       featureObjects[feature] = []; // Create an empty array for the feature
                    
                //       const metrics = Object.values(mergedArray);
                    
                //       metrics.forEach(Metric => {
                //         if (Metric) {
                //           featureObjects[feature].push(Metric[feature]);
                //         }
                //       });
                //       const totalSum = featureObjects[feature].reduce((a, b) => a + b, 0);
                //       const average = totalSum/featureObjects[feature].length;
                //       League_Avg[feature] = parseFloat(average.toFixed(1));
                //     });

                //   }
                //   const groupedByPosition = mergedArray.reduce((acc, player) => {
                //     const position = player['main_position'];
                //     if (!acc[position]) {
                //       acc[position] = [];
                //     }
                //     acc[position].push(player);
                //     return acc;
                //   }, {});
                //   return groupedByPosition;
                // };
                  
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
//--------------------Post Matches Junior
app.post('/upload-csv/matchesJunior',upload.single('csvFile'),(req,res)=>{
  console.log('Reached /upload-csv/matchesJunior endpoint');
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
            'INSERT INTO match_results (region,equipe_domicile,buts_domicile,buts_visiteuse,equipe_visiteuse,journee,type_champions,date,heure ) VALUES ?';
            const values = jsonArray.map(data => [
              data.region,
              data.equipe_domicile,
              !isNaN(data.buts_domicile) ? parseInt(data.buts_domicile) : null,
              !isNaN(data.buts_visiteuse) ? parseInt(data.buts_visiteuse) : null,
              data.equipe_visiteuse,
              parseInt(data.journee),
              data.type_champions,
              new Date(data.date),
              data.heure,
            ]).filter(row => row.slice(2, 4).every(value => value !== null));
        
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
  
})
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
function isEmpty(obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}
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
                  // console.log(Object.keys(positionIndexWeights).length );

                  res.json({ message: 'MetricsVar updated successfully' });
                });
                const playerMetricsApi = 'http://localhost:5038/get-csv/playerMetrics';
                const playerProfilesApi = 'http://localhost:5038/get-csv/playerprofile';

                // Assuming you define profilesData somewhere in your code
                let profilesData;
                let totalSumArray;
                const options = [];
                const colors = [
                  {"Possession": '#1adea3'},
                  {"Defensive": '#168dcb'},
                  {"Offensive": '#f35c5c'}
                ]
                const selected_features = [
                  'xG_per_90', 'shots_per_90', 'ball_touches_in_penalty_area_per_90',
                  'dribbles_per_90', 'successful_dribbles_percentage', 'defensive_actions_per_90', 'passes_per_90',
                  'passes_to_penalty_area_per_90', 'progressives_passes_per_90'
                ];
                const  offensive_selected_metrics = ['goals_per_90', 'key_passes_per_90', 'offensive_duels_per_90', 'xG_per_shot', 'progressives_passes_per_90'];
                const defensive_selected_metrics = ['interceptions_per_90_padj', 'defensive_duels_per_90', 'defensive_actions_per_90']

                
                const Offensive_selected_features=['xG_per_90','shots_per_90','xG_per_shot','dribbles_per_90','successful_dribbles_percentage','ball_touches_in_penalty_area_per_90'];
                const Possession_selected_features=['passes_per_90','passes_to_penalty_area_per_90','progressives_passes_per_90'];
                const Defensive_selected_features=['interceptions_per_90_padj','aerial_duels_won_percentage','defensive_actions_per_90'];
                const Percentiles=['xG_per_90','shots_per_90','xG_per_shot','dribbles_per_90','successful_dribbles_percentage','ball_touches_in_penalty_area_per_90','passes_per_90','passes_to_penalty_area_per_90','progressives_passes_per_90','interceptions_per_90_padj','aerial_duels_won_percentage','defensive_actions_per_90']
                const map_cls = {
                  'Duels défensifs':'defensive_duels_per_90',
                'Duels défensifs gagnés, %':'defensive_duels_won_percentage',
                'Duels aériens':'aerial_duels_per_90',
                'Duels aériens gagnés, %':'aerial_duels_won_percentage',
                'Tacles glissés PAdj':'sliding_tackles_per_90_padj',
                'Interceptions':'interceptions_per_90_padj',
                'Fautes':'fouls_per_90',
                'Cartons jaunes':'yellow_cards',
                'Cartons rouges':'red_cards',
                'Buts':'goals_per_90',
                'Buts hors penalty':'non_penalty_goals_per_90',
                'xG':'xG_per_90',
                'Tirs':'shots_per_90',
                'Tirs à la cible, %':'shots_on_target_percentage',
                'Taux de conversion but/tir':'goal_conversion_rate',
                'Passes décisives':'assists_per_90',
                'Centres':'crosses_per_90',
                'Сentres précises, %':'accurate_crosses_percentage',
                'Dribbles':'dribbles_per_90',
                'Dribbles réussis, %':'successful_dribbles_percentage',
                'Duels offensifs':'offensive_duels_per_90',
                'Touches de balle dans la surface  de réparation sur 90':'ball_touches_in_penalty_area_per_90',
                'Courses progressives':'progressive_runs_per_90',
                'Passes réceptionnées':'passes_received_per_90',
                'xA':'xA_per_90',
                'Passes décisives avec tir':'assists_with_shots_per_90',
                'Passes vers la surface  de réparation':'passes_to_penalty_area_per_90',
                'Passes vers la surface  de réparation précises, %':'accurate_passes_to_penalty_area_percentage',
                'Passes pénétrantes':'key_passes_per_90',
                'Passes progressives':'progressives_passes_per_90',
                'Passes progressives précises, %':'progressives_passes_accuracy',
                'xG/Tir':'xG_per_shot',
                'Longues passes réceptionnées':'long_passes_received_per_90',
                'Passes longues':'long_passes_per_90',
                'Longues passes précises, %':'long_passes_accuracy',
                'Passes avant':'forward_passes_per_90',
                'Passes précises, %':'accurate_passes',
                'Passes':'passes_per_90',
                'Taux de conversion but/tir':'shot_conversion_rate',  
                'Passes en avant précises, %':'accurate_forward_passes',
                'Actions défensives réussies':'defensive_actions_per_90'
              }
              const metrics_byPosition = {
                RW:["goals_per_90","crosses_per_90","accurate_crosses_percentage","dribbles_per_90","successful_dribbles_percentage","accurate_passes", "forward_passes_per_90","key_passes_per_90","assists_per_90","ball_touches_in_penalty_area_per_90","shot_conversion_rate", "shots_per_90"],
                LW:["goals_per_90","crosses_per_90","accurate_crosses_percentage","dribbles_per_90","successful_dribbles_percentage","accurate_passes", "forward_passes_per_90","key_passes_per_90","assists_per_90","ball_touches_in_penalty_area_per_90","shot_conversion_rate", "shots_per_90"],
                CF: [
                  'xG_per_90', 'shots_per_90', 'ball_touches_in_penalty_area_per_90',
                  'dribbles_per_90', 'successful_dribbles_percentage', 'defensive_actions_per_90', 'passes_per_90',
                  'passes_to_penalty_area_per_90', 'progressives_passes_per_90'
                ],
                AMF:["goals_per_90","dribbles_per_90","successful_dribbles_percentage","accurate_passes", "forward_passes_per_90","key_passes_per_90","assists_per_90","ball_touches_in_penalty_area_per_90","shot_conversion_rate", "shots_per_90"],
                CMF:["interceptions_per_90_padj","accurate_forward_passes","key_passes_per_90", "long_passes_per_90","forward_passes_per_90","assists_per_90","aerial_duels_won_percentage"],
                DMF:["sliding_tackles_per_90_padj","interceptions_per_90_padj","accurate_passes","passes_per_90","defensive_duels_per_90","defensive_duels_won_percentage","fouls_per_90","long_passes_per_90"],
                CB:["aerial_duels_won_percentage","aerial_duels_per_90","fouls_per_90","interceptions_per_90_padj","sliding_tackles_per_90_padj","long_passes_per_90","long_passes_accuracy"],
                RB:["fouls_per_90","sliding_tackles_per_90_padj","interceptions_per_90_padj","accurate_passes","key_passes_per_90","crosses_per_90","accurate_crosses_percentage","dribbles_per_90","successful_dribbles_percentage","aerial_duels_won_percentage","aerial_duels_per_90"],
                LB:["fouls_per_90","sliding_tackles_per_90_padj","interceptions_per_90_padj","accurate_passes","key_passes_per_90","crosses_per_90","accurate_crosses_percentage","dribbles_per_90","successful_dribbles_percentage","aerial_duels_won_percentage","aerial_duels_per_90"]        
              };
              
                let League_Avg = {};
                let Pos_Avg={};
                let recent_performance=[{}];
                let weighted;
                let Offensive_Sum=[];
                let defensive_Sum=[];
                let Offensive_metric=[];
                let defensive_metric=[];
                let totalSumOfe;
                let totalSumDef;
                let SumArrayOfe=[];
                let SumArrayDefe=[];
                let Percentiles_array=[];
                let Percentiles_Object={};
                  // Min-Max Scaling function
                  const minMaxScaleArray = (data, newMin , newMax , decimalPlaces = 2) => {
                    const min = Math.min(...data);
                    const max = Math.max(...data);
                    
                    const scaledData = data.map(value =>
                      parseFloat(((value - min) / (max - min) * (newMax - newMin) + newMin).toFixed(decimalPlaces))
                    );
                  
                    return scaledData;
                  };
                  function calculatePercentiles(data) {
                    if (data.length === 0) {
                      return null; // No data to calculate percentiles
                    }
                  
                    // Create an array of objects with value and index properties
                    const dataWithIndex = data.map((value, index) => ({ value, index }));
                  
                    // Rank the data by value
                    const rankedData = dataWithIndex.slice().sort((a, b) => a.value - b.value);
                  
                    // Calculate the percentile for each value using the ranked index
                    const percentiles = dataWithIndex.map(({ value, index }) => {
                      const rank = rankedData.findIndex(item => item.value === value);
                      const percentile = (rank / (data.length - 1)) * 100;

                      // Round to 2 decimal places
                      return Math.round(percentile * 100) / 100;
                    });
                  
                    return percentiles;
                  }
                  function create_pie_chart_option(selected_player){
                    let data=[];
                    let datas=[]
                    Object.keys(selected_player["percentiles"]).forEach(value=>{
                      colors.forEach(obj => {
                           const key = Object.keys(obj)[0];
                           if(value===key){
                            selected_player["percentiles"][value].forEach(key1=>{
                              for (const [key, value] of Object.entries(map_cls)) {
                                if(key1.name===value){
                                   key1.name=key
                                }
                                                          
                              }
                            })
                            datas={[value]:{'color':obj[key],'data':selected_player["percentiles"][value]}}
                            data.push(datas)
                           }
                        });
                    })
                    const option = {
                      "legend": {"top": "bottom"},
                      "toolbox": {
                          "show": "True",
                          "feature": {
                              "mark": {"show": "True"},
                              "dataView": {"show": "True", "readOnly": "False"},
                              "restore": {"show": "True"},
                              "saveAsImage": {"show": "True"}
                          }
                      },
                      "series": [
                          {
                              "name": selected_player["wyscout_name"],
                              "type": "pie",
                              "radius": [50, 250],
                              "center": ["50%", "50%"],
                              "roseType": "area",
                              "itemStyle": {"borderRadius": 8},                           
                              data
                          }
                      ]
                  }
                  
                 
                  return option
                  }
                const applyPositionWeights = (player, position_weights) => {
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

                  if (position_weights[position]) {
                    const weightedPlayer = { ...player };
                    let values = {};
                    let sumValue = {};
                    let sumValues = {};

                    for (const [key, value] of Object.entries(position_weights[position])) {
                      if (typeof value === 'object') {
                        for (const metricGroup in value) {
                          if (weightedPlayer[metricGroup]) {
                            const weights = value[metricGroup];
                            weightedPlayer[metricGroup] = applyWeightsRecursive(weightedPlayer[metricGroup], weights);

                            if (!values[key]) {
                              values[key] = {};
                            }
                            values[key][metricGroup] = weightedPlayer[metricGroup];
                            sumValue[key] = Object.values(values[key]).reduce((a, b) => a + b, 0);
                            sumValue["minutes_played"]=weightedPlayer["90s"]*90;
                            // console.log(weightedPlayer["myTeam_id"],sumValue);
                          }
                        }
                      }
                    }

                    for (const [key, value] of Object.entries(position_index_weights[position])) {
                      for (const [key1, value1] of Object.entries(sumValue)) {
                        if (key === key1) {
                          if (!sumValues[key1]) {
                            sumValues[key1] = 0;
                          }
                          sumValues[key1] += value * value1;
                          //  console.log(weightedPlayer["myTeam_id"],sumValues)
                        }
                      }
                    }

                    // Calculate totalSum based on the sumValues
                    const totalSum = Object.values(sumValues).reduce((a, b) => a + b, 0);
                    //  console.log(weightedPlayer["myTeam_id"],totalSum)
                      if(!totalSumArray){
                      totalSumArray=[];
                      weightedPlayer[`${position}_index`]=totalSumArray;
                    }
                    totalSumArray.push(totalSum);
                    // Min-Max scale the standard-scaled totalSumArray
                    // const finalScaledTotalSumArray = minMaxScaleArray(totalSumArray);
                    // console.log(finalScaledTotalSumArray)
                    player["indice"]=totalSum;
                  }

                  return player;
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
                        Pos_Avg[position] = {}; // Create an object for the position

                        for (const [position1, positionMetrics] of Object.entries(metrics_byPosition)) {
                          metrics_byPosition[position1].forEach(feature => {
                          if(player["main_position"]===position1){
                            Pos_Avg[position][feature] = []; // Create an empty array for the feature
                      
                            mergedData[position].forEach(player => {
                              if (player) {
                                Pos_Avg[position][feature].push(player[feature]);
                              }
                            });
                        
                            const totalSum = Pos_Avg[position][feature].reduce((a, b) => a + b, 0);
                            const average = totalSum / Pos_Avg[position][feature].length;
                            Pos_Avg[position][feature] = parseFloat(average.toFixed(1)); 
                          }

                        });
                       }
                        return applyPositionWeights(player, position_weights);
                      })
                      ;
                    }
                     const finalScaledTotalSumArray = minMaxScaleArray(totalSumArray,0,100);
                // Your existing loop code
                for (const position in weightedMergedData) {
                  // Sort players within the position based on scaled indice values in descending order
                  weightedMergedData[position].sort((a, b) => b.indice - a.indice);

                  // Assign ranking based on the sorted order
                  weightedMergedData[position].forEach((player, index) => {
                    for (const scaledMetric in totalSumArray){
                      if (player["indice"]==totalSumArray[scaledMetric]){
                        player["indice"] = finalScaledTotalSumArray[scaledMetric]; // Update the scaled indice value if needed
                      }
                    }
                    player.Classement = index + 1; // Assign rank based on sorted order
                  });
                 
                  for (const [position1, positionMetrics] of Object.entries(metrics_byPosition)) {
                    metrics_byPosition[position1].forEach(feature => {
                        weightedMergedData[position].forEach(player => {
                         if(player["main_position"]===position1){
                           if (feature === "progressives_passes_per_90" || feature === "passes_to_penalty_area_per_90" || feature==="successful_dribbles_percentage") {
                             return;
                           }
                          // for (const [key, value] of Object.entries(map_cls)) {
                          //   console.log(value)
                          // }

                          const performanceObject = {
                            id:player["wyscout_name"],
                            label: feature,
                            player_value: player[feature],
                            league_value: League_Avg[feature],
                            position_value: Pos_Avg[position][feature],
                            children: []
                          };
                          const valuesToSortChildPasses1=[
                            player["passes_to_penalty_area_per_90"],
                            League_Avg["passes_to_penalty_area_per_90"],
                            Pos_Avg[position]["passes_to_penalty_area_per_90"]
                          ]
                          const valuesToSortChildPasses2=[
                            player["progressives_passes_per_90"],
                            League_Avg["progressives_passes_per_90"],
                            Pos_Avg[position]["progressives_passes_per_90"]
                          ]
                          const valuesToSortChildDribble=[
                            player["successful_dribbles_percentage"],
                            League_Avg["successful_dribbles_percentage"],
                            Pos_Avg[position]["successful_dribbles_percentage"]
                          ]
                          const sortedValuesChildDribble = valuesToSortChildDribble.slice().sort((a, b) => b - a);
                          const sortedValuesChildPasses1 = valuesToSortChildPasses1.slice().sort((a, b) => b - a);
                          const sortedValuesChildPasses2 = valuesToSortChildPasses2.slice().sort((a, b) => b - a);
  
  
                          if (feature === "passes_per_90") {
                            performanceObject["id"]=player["wyscout_name"],
                            performanceObject["label"] = feature;
                            performanceObject["player_value"] = player[feature];
                            performanceObject["league_value"] = League_Avg[feature];
                            performanceObject["position_value"] = Pos_Avg[position][feature];
                            performanceObject["children"] = [];
                            performanceObject.children.push({
                              label: "passes_to_penalty_area_per_90",
                              player_value: player["passes_to_penalty_area_per_90"],
                              league_value: League_Avg["passes_to_penalty_area_per_90"],
                              position_value: Pos_Avg[position]["passes_to_penalty_area_per_90"],
                              player_color:getColor(player["passes_to_penalty_area_per_90"], sortedValuesChildPasses1),
                              league_color:getColor(League_Avg["passes_to_penalty_area_per_90"], sortedValuesChildPasses1),
                              position_color:getColor(Pos_Avg[position]["passes_to_penalty_area_per_90"], sortedValuesChildPasses1)
                            }, {
                              label: "progressives_passes_per_90",
                              player_value: player["progressives_passes_per_90"],
                              league_value: League_Avg["progressives_passes_per_90"],
                              position_value: Pos_Avg[position]["progressives_passes_per_90"],
                              player_color:getColor(player["progressives_passes_per_90"], sortedValuesChildPasses2),
                              league_color:getColor(League_Avg["progressives_passes_per_90"], sortedValuesChildPasses2),
                              position_color:getColor(Pos_Avg[position]["progressives_passes_per_90"], sortedValuesChildPasses2)
                            });
                          }
                          else  if(feature==="dribbles_per_90") {
  
                            performanceObject["id"]=player["wyscout_name"],
                            performanceObject["label"] = feature;
                            performanceObject["player_value"] = player[feature];
                            performanceObject["league_value"] = League_Avg[feature];
                            performanceObject["position_value"] = Pos_Avg[position][feature];
                            performanceObject["children"] = [];
                            performanceObject.children.push({
                              label: "successful_dribbles_percentage",
                              player_value: player["successful_dribbles_percentage"],
                              league_value: League_Avg["successful_dribbles_percentage"],
                              position_value: Pos_Avg[position]["successful_dribbles_percentage"],
                              player_color:getColor(player["successful_dribbles_percentage"], sortedValuesChildDribble),
                              league_color:getColor(League_Avg["successful_dribbles_percentage"], sortedValuesChildDribble),
                              position_color:getColor(Pos_Avg[position]["successful_dribbles_percentage"], sortedValuesChildDribble)
                            });
                        
                          }
                          function getColor(value, sortedValues) {
                            const index = sortedValues.indexOf(value);
                            const totalValues = sortedValues.length;
                          
                            if (index === 0) {
                              return '#009900'; // Highest value
                            } else if (index === totalValues - 1) {
                              return '#ff3300'; // Lowest value
                            } else {
                              return '#FF69B4'; // Middle value
                            }
                          }
                          
                          // Assuming you have an array of values to sort
                          const valuesToSort = [
                            performanceObject["player_value"],
                            performanceObject["league_value"],
                            performanceObject["position_value"],
                          ];
                         
                          
                          // Sort the values in descending order
                          const sortedValues = valuesToSort.slice().sort((a, b) => b - a);
                         
                          // Assign colors based on position
                          performanceObject["player_color"] = getColor(performanceObject["player_value"], sortedValues);
                          performanceObject["league_color"] = getColor(performanceObject["league_value"], sortedValues);
                          performanceObject["position_color"] = getColor(performanceObject["position_value"], sortedValues);
                          // console.log(performanceObject.label)
                          for (const [key, value] of Object.entries(map_cls)) {
                            if (performanceObject.label==="dribbles_per_90"){
                              performanceObject.label="Dribbles"
                              performanceObject.children.forEach(child => {
                                if (child.label==="successful_dribbles_percentage"){
                                  child.label="Dribbles réussis, %"
                                }
                                
                              });
                            }
                            else if(performanceObject.label === "passes_per_90") {
                              performanceObject.label="Passes";
                              performanceObject.children.forEach(child => {
                                if (child.label==="progressives_passes_per_90"){
                                  child.label="Passes progressives";
                                }
                                else  if (child.label==="passes_to_penalty_area_per_90"){
                                  child.label='Passes vers la surface  de réparation';
                                }
                              });
                            }
                            else if(performanceObject.label===value )
                            performanceObject.label=key
                          }
                          recent_performance.push(performanceObject); 
                          
                          // console.log(player["wyscout_name"])
                          // Push the performance object into the array
                         }
                        });
                        
                        
                        
                      });
                    }
                    weighted = weightedMergedData[position].map(player => {
                      const matchingMetrics = recent_performance
                        .filter(metric => metric["id"] === player["wyscout_name"])
                        .map(({ id, ...rest }) => rest); // Remove "id" property from each metric
                    
                      // Add the recent_performances key with the array of matching metrics to the player
                      player["recent_performances"] = matchingMetrics;
                    
                      return player;
                    });
                    weightedMergedData[position].map(player=>{
                      offensive_selected_metrics.forEach(feature=>{

                        Offensive_metric[feature]=player[feature];
                        totalSumOfe = Object.values(Offensive_metric).reduce((a, b) => a + b, 0);
                      })
                      defensive_selected_metrics.forEach(feature=>{

                        defensive_metric[feature]=player[feature];
                        totalSumDef = Object.values(defensive_metric).reduce((a, b) => a + b, 0);
                      })
                      player["total_offense"]=totalSumOfe;
                      SumArrayOfe.push(totalSumOfe);   
                      player["total_defence"]=totalSumDef;
                      SumArrayDefe.push(totalSumDef);

                    })
                    
                }
                const finalScaledSumArrayOfe = minMaxScaleArray(SumArrayOfe,0,10);
                const finalScaledSumArrayDef = minMaxScaleArray(SumArrayDefe,0,10);

                for (const position in weightedMergedData) {
                  weightedMergedData[position].forEach((player) => {
                    for (const scaledMetric in SumArrayOfe){
                      if (player["total_offense"]==SumArrayOfe[scaledMetric]){
                         player["total_offense"] = finalScaledSumArrayOfe[scaledMetric]; 
                      }
                    }
                  });
                }
                for (const position in weightedMergedData) {
                  weightedMergedData[position].forEach((player) => {
                    for (const scaledMetric in SumArrayDefe){
                      if (player["total_defence"]==SumArrayDefe[scaledMetric]){
                         player["total_defence"] = finalScaledSumArrayDef[scaledMetric]; 
                      }
                    }
                  });
                }
                
                
              const Min_Ofe = Math.min(...finalScaledSumArrayOfe);
              const Max_Ofe = Math.max(...finalScaledSumArrayOfe);

              const Min_Def = Math.min(...finalScaledSumArrayDef);
              const Max_Def = Math.max(...finalScaledSumArrayDef);

              for (const position in weightedMergedData) {

                weightedMergedData[position].forEach(selected_player => {
                  const resultlist_Ofe = [];
                  const resultlist_Def = [];

                  weightedMergedData[position].forEach(player => {
                    if (player["90s"] > selected_player["90s"] * 1 / 3) {
                      //Offensive
                      const interval_Ofe = (Max_Ofe - Min_Ofe) / 5;
                      const intervals_Ofe = Array.from({ length: 6 }, (_, i) => Min_Ofe + i * interval_Ofe);
                      const colors = ['#f6412f', '#fca17e', '#f9e42e', '#74b142', '#446f1a'];
                      const colorIndex_Ofe = intervals_Ofe.findIndex(interval_Ofe => player["total_offense"] <= interval_Ofe);
                      const assignedColor_Ofe =  colors[colorIndex_Ofe-1];

                        //defensive
                      const interval_Def = (Max_Def - Min_Def) / 5;
                      const intervals_Def = Array.from({ length: 6 }, (_, i) => Min_Def + i * interval_Def);
                      const colorIndex_Def = intervals_Def.findIndex(interval_Def => player["total_defence"] <= interval_Def);
                      //assign color
                      const assignedColor_Def =  colors[colorIndex_Def-1];
                      resultlist_Ofe.push({
                        'value': player['total_offense'],
                        'item Style': {'color':assignedColor_Ofe},
                        'symbolSize': player['wyscout_name']=== selected_player['wyscout_name'] ? 23 : 15,
                        'fullname': player['wyscout_name'],
                        'img_src': player['image_path'],
                      })
                      resultlist_Def.push({
                        'value': player['total_defence'],
                        'itemStyle': {'color':assignedColor_Def},
                        'symbolSize': player['wyscout_name']=== selected_player['wyscout_name'] ? 23 : 15,
                        'fullname': player['wyscout_name'],
                        'img_src': player['image_path'],
                      })
                    }    
                    else{
                      return;
                    }  
                   })
                  selected_player["offensive_performces"]=resultlist_Ofe;
                  selected_player["defensive_performances"]=resultlist_Def;
                  });
                  weightedMergedData[position].forEach(selected_player=>{

                   Offensive_selected_features.forEach(feature=>{
                    const result=[];
                    weightedMergedData[position].forEach(player=>{
                      if(selected_player["wyscout_name"]===player["wyscout_name"]){
                        result.push(selected_player[feature])
                      }
                      else{
                        result.push(player[feature])
                      }
                    })
                    const  result_percentiles=calculatePercentiles(result);
                   for (const percentiledMetric in result){
                     if(selected_player[feature]===result[percentiledMetric]){
                       selected_player[`${feature}_percentile`]=result_percentiles[percentiledMetric];
                     }
                   }
                  })
                  Defensive_selected_features.forEach(feature=>{
                    const result=[];
                    weightedMergedData[position].forEach(player=>{
                      if(selected_player["wyscout_name"]===player["wyscout_name"]){
                        result.push(selected_player[feature])
                      }
                      else{
                        result.push(player[feature])
                      }
                    })
                    const  result_percentiles=calculatePercentiles(result);
                   for (const percentiledMetric in result){
                     if(selected_player[feature]===result[percentiledMetric]){
                       selected_player[`${feature}_percentile`]=result_percentiles[percentiledMetric];
                     }
                   }
                  })
                 Possession_selected_features.forEach(feature=>{
                    const result=[];
                    weightedMergedData[position].forEach(player=>{
                      if(selected_player["wyscout_name"]===player["wyscout_name"]){
                        result.push(selected_player[feature])
                      }
                      else{
                        result.push(player[feature])
                      }
                    })
                    const  result_percentiles=calculatePercentiles(result);
                   for (const percentiledMetric in result){
                     if(selected_player[feature]===result[percentiledMetric]){
                       selected_player[`${feature}_percentile`]=result_percentiles[percentiledMetric];
                     }
                   }
                  })
                  Possession_selected_features.forEach(feature => {
                    let Percentile = { name: feature, value: selected_player[`${feature}_percentile`] };
                    Percentiles_Object["Possession"] = Percentiles_Object["Possession"] || [];
                    Percentiles_Object["Possession"].push(Percentile);
                    delete selected_player[`${feature}_percentile`];
                });
                
                Defensive_selected_features.forEach(feature => {
                    let Percentile = { name: feature, value: selected_player[`${feature}_percentile`] };
                    Percentiles_Object["Defensive"] = Percentiles_Object["Defensive"] || [];
                    Percentiles_Object["Defensive"].push(Percentile);
                    delete selected_player[`${feature}_percentile`];
                });
                
                Offensive_selected_features.forEach(feature => {
                    let Percentile = { name: feature, value: selected_player[`${feature}_percentile`] };
                    Percentiles_Object["Offensive"] = Percentiles_Object["Offensive"] || [];
                    Percentiles_Object["Offensive"].push(Percentile);
                    delete selected_player[`${feature}_percentile`];
                });
                
                // Assign the Percentiles_Object object to the selected_player
                  selected_player["percentiles"] = Percentiles_Object;
                  Percentiles_Object={};
                  const player_radar_option = {
                    "joueur": selected_player["wyscout_name"],
                    "equipe": {
                        "nom": selected_player["Equipe"],
                        "logo": `logos/${selected_player["Equipe"]}.png`
                    },
                    "main_position": {
                        "key": selected_player["main_position"],
                        "label": selected_player["template"]
                    },
                    "position": selected_player["position_full_name"],
                    "age": (selected_player["age"]),
                    "minutes_played": selected_player["minutes_played"],
                    "option": create_pie_chart_option( selected_player)
                }
                selected_player["player_radar_option"]=player_radar_option;
                delete selected_player[`percentiles`];
                })
                   
                }
                  // Assuming 'weightedMergedData' is an object or array containing your data
                  // Convert the data to JSON
                  if (!isEmpty(weightedMergedData)) {
                    // Convert the data to JSON
                    const jsonData = JSON.stringify(weightedMergedData, null, 2); // The third parameter (2) is for pretty formatting
                
                    // Check if the file already exists
                    if (fs.existsSync('output.json')) {
                      // Update the existing JSON file
                      fs.writeFile('output.json', jsonData, 'utf8', (err) => {
                        if (err) {
                          console.error('Error updating JSON file:', err);
                          res.status(500).send('Internal Server Error');
                        } else {
                          console.log('JSON file updated successfully');
                          // Send a response indicating success
                          res.json({ success: true, message: 'JSON file updated successfully' });
                        }
                      });
                    } else {
                      // Create a new JSON file
                      fs.writeFile('output.json', jsonData, 'utf8', (err) => {
                        if (err) {
                          console.error('Error creating JSON file:', err);
                          res.status(500).send('Internal Server Error');
                        } else {
                          console.log('JSON file created successfully');
                          // Send a response indicating success
                          res.json({ success: true, message: 'JSON file created successfully' });
                        }
                      });
                    }
                  } else {
                    // Send a response indicating that the data is empty
                    res.status(400).json({ success: false, message: 'Data is empty, cannot create or update JSON file' });
                  }
                  
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
                    const profileRow = profilesArray.find(profileRow => profileRow["wyscout_name"] === metricRow["wyscout_name"]);
                    if (profileRow) {
                      mergedArray.push({ ...metricRow, ...profileRow });
                    }
                    const featureObjects = {};

                    selected_features.forEach(feature => {
                      featureObjects[feature] = []; // Create an empty array for the feature
                    
                      const metrics = Object.values(mergedArray);
                    
                      metrics.forEach(Metric => {
                        if (Metric) {
                          featureObjects[feature].push(Metric[feature]);
                        }
                      });
                      const totalSum = featureObjects[feature].reduce((a, b) => a + b, 0);
                      const average = totalSum/featureObjects[feature].length;
                      League_Avg[feature] = parseFloat(average.toFixed(1));
                    });

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
   
// //  CLose Connection
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
 app.get('/players',(req,res)=>{
   fs.readFile('./players.json', 'utf8', (err, data) => {
     if (err) {
       console.error('Error reading JSON file:', err);
       res.status(500).json({ error: 'Internal Server Error' });
       return;
     }
    
     try {
       const jsonData = JSON.parse(data) ;
       res.status(200).json(jsonData);
     } catch (parseError) {
       console.error('Error parsing JSON:', parseError);
       res.status(500).json({ error: 'Internal Server Error' });
     }
   });
 })
 const MIME_TYPE_MAP = {
   'image/png': 'png',
   'image/jpeg': 'jpeg',
   'image/jpg': 'jpg',
 };

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

