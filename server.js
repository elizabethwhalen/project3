// Built-in Node.js modules
let path = require('path');

let cors = require('cors');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');


let app = express();
let port = 8000;
app.use(cors());

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
app.use(express.json());



// REST API: GET /codes
// Respond with list of codes and their corresponding incident type
app.get('/codes', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

    let query = 'SELECT code, incident_type FROM Codes';
    //if there are ?, add WHERE statemnt
    parts = (String(url)).split('?');
    if (parts.length > 1){
        if (parts[1].split('=')[0] != 'code'){
            res.status(500).send('Unknown parameter');
        }
        let codes = parts[1].split('=')[1];
        let codeArr = codes.split(',');
        //console.log(codeArr);
        query = query + ' WHERE code=';
        for(let i=0; i<codeArr.length; i++){
            if (i != codeArr.length-1){
                query = query + codeArr[i] + ' OR  code=';
            } else {
                query = query + codeArr[i];
            }
        }
    }
    query = query + ' ORDER BY code';
    console.log(query);
    let params = [];
    let promise = databaseSelect(query, params);
    promise.then((data) => {
        //console.log(data);
        res.status(200).type('json').send(data);
        }, (error) => {
            console.log(error); 
    });
    


 
});

// REST API: GET /neighborhoods
// Respond with list of neighborhood ids and their corresponding neighborhood name
app.get('/neighborhoods', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

    let query = 'SELECT neighborhood_number, neighborhood_name FROM Neighborhoods';
    parts = (String(url)).split('?');
    if (parts.length > 1){
        if (parts[1].split('=')[0] != 'id'){
            res.status(500).send('Unknown parameter');
        }
        let n = parts[1].split('=')[1];
        let nArr = n.split(',');
        //console.log(codeArr);
        query = query + ' WHERE neighborhood_number=';
        for(let i=0; i<nArr.length; i++){
            if (i != nArr.length-1){
                query = query + nArr[i] + ' OR  neighborhood_number=';
            } else {
                query = query + nArr[i];
            }
        }
    }
    query = query + ' ORDER BY neighborhood_number';
    //console.log(query);

    let params = [];
    let promise = databaseSelect(query, params);
    promise.then((data) => {
        //console.log(data);
        res.status(200).type('json').send(data);
        }, (error) => {
            console.log(error); 
    });
    
});

// REST API: GET/incidents
// Respond with list of crime incidents
app.get('/incidents', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

    let query = 'SELECT * FROM Incidents';

    parts = (String(url)).split('?');
    if (parts.length > 1){
        for (let i=1; i<parts.length; i++){
            if (parts[i].split('=')[0] != 'id' || parts[i].split('=')[0] != 'start_date' || parts[i].split('=')[0] != 'end_date' || parts[i].split('=')[0] != 'code' || parts[i].split('=')[0] != 'grid' || parts[i].split('=')[0] != 'neighborhood' || parts[i].split('=')[0] != 'limit'){
                res.status(500).send('Unknown parameter');
            }
            let param = parts[i].split('=')[0];
            let n = parts[i].split('=')[1]; //after the = (ex: 110,70)
            let nArr = n.split(',');        //array of these codes/dates/etc
            //console.log(codeArr);
            if (param == 'grid' || param == 'code' || param == 'neighborhood'){
                query = query + ' WHERE ' + param + '=';
            }
            for(let i=0; i<nArr.length; i++){
                if (i != nArr.length-1){
                    query = query + nArr[i] + ' OR  neighborhood_number=';
                } else {
                    query = query + nArr[i];
                }
            }
        }
        
    }
    query = query + ' ORDER BY date_time';
    console.log(query);





    let params = [];
    let promise = databaseSelect(query, params);
    promise.then((data) => {
        var i;
            for (i in data){
                var arr = data[i].date_time.split('T');
                var date = arr[0];
                var time = arr[1];
                data[i]['date'] = date;
                data[i]['time'] = time;
                delete data[i].date_time;
            }
        res.status(200).type('json').send(data);
        }, (error) => {
            console.log(error); 
    });
    
});

// REST API: PUT /new-incident
// Respond with 'success' or 'error'
app.put('/new-incident', (req, res) => {
    //console.log(req.body.case_number);
    db.get('SELECT case_number FROM Incidents WHERE case_number = ?', [req.body.case_number], (err, row) => {
        if (err || row!=undefined) {
            //console.log('matching case number');
            res.status(500).send('Error: incident already in database');
        } else {
            //console.log(row);
            //console.log('no matching case number');
            let date_time = req.body.date + 'T' + req.body.time;
            db.run(`INSERT INTO Incidents VALUES(?, ?, ?, ?, ?, ?, ?)`, [req.body.case_number, date_time, req.body.code,  req.body.incident, req.body.police_grid, req.body.neighborhood_number, req.body.block], function(err) {
                if (err) {
                  res.status(500).send('Error: could not insert into database');
                }
                else {
                    res.status(200).send(`Success: A row has been inserted`);
                    
                }
                
              });
            
        }
    });
});

app.delete('/remove-incident', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
    console.log(req.body.case_number);
    db.get('SELECT case_number FROM Incidents WHERE case_number = ?', [req.body.case_number], (err, row) => {
        //console.log(req.body.case_number);
        if (err || row==undefined) {
            console.log('no matching case number');
            res.status(500).send('Error: case number not in database');
        } else {
            console.log('matching case number');
           // let date_time = req.body.date + 'T' + req.body.time;
            db.run(`DELETE FROM Incidents WHERE case_number = ?`, [req.body.case_number], function(err) {
                if (err) {
                  res.status(500).send('Error: could not delete from database');

                }
                else {
                    res.status(200).send(`Success: A row has been deleted`);
                }
              });
            
        }
    });
    
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
