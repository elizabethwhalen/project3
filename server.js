// Built-in Node.js modules
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');


let app = express();
let port = 8000;

let public_dir = path.join(__dirname, 'public');
let template_dir = path.join(__dirname, 'templates');
let db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

// open stpaul_crime.sqlite3 database
// data source: https://information.stpaul.gov/Public-Safety/Crime-Incident-Report-Dataset/gppb-g9cg
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
    }
});

app.use(express.static(public_dir));


// REST API: GET /codes
// Respond with list of codes and their corresponding incident type
app.get('/codes', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

    db.all('SELECT code, incident_type FROM Codes ORDER BY code', (err, rows) => {
        if (err) {
            res.status(404).send('Error: data not found');
        }
        else {
            res.status(200).type('json').send(rows);
        }
    
    });
});

// REST API: GET /neighborhoods
// Respond with list of neighborhood ids and their corresponding neighborhood name
app.get('/neighborhoods', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

    db.all('SELECT neighborhood_number, neighborhood_name FROM Neighborhoods ORDER BY neighborhood_number', (err, rows) => {
        if (err) {
            res.status(404).send('Error: data not found');
        }
        else {
            res.status(200).type('json').send(rows);
        }
    
    });
    
});

// REST API: GET/incidents
// Respond with list of crime incidents
app.get('/incidents', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

    db.all('SELECT * FROM Incidents ORDER BY date_time', (err, rows) => {
        //separate date and time
        if (err) {
            res.status(404).send('Error: data not found');
        }
        else {
            var i;
            for (i in rows){
                //console.log(rows[i].date_time);
                var arr = rows[i].date_time.split('T');
                var date = arr[0];
                var time = arr[1];
                //rows[i].date_time.replace(arr[0]);
                rows[i]['date'] = date;
                rows[i]['time'] = time;
                delete rows[i].date_time;
                //console.log(rows[i]);
            }

            res.status(200).type('json').send(rows);
        }
    
    });
    
});

// REST API: PUT /new-incident
// Respond with 'success' or 'error'
app.put('/new-incident', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
    //console.log('hi');
    //db.all('INSERT INTO Incidents (?)', [window.location.search], (err, rows) => {
    //    if (err) {
            //res.status(404).send('Error: data not found');
    //    }
     //   else {



      //  }
    //});
    
    res.status(200).type('txt').send('success');
});


// Create Promise for SQLite3 database SELECT query 
function databaseSelect(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        })
    })
}

// Create Promise for SQLite3 database INSERT query
function databaseInsert(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    })
}


// Start server
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
