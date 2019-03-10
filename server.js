const express = require('express');
const app = express();
const mysql = require('mysql');
const session = require('express-session'); 
const bcrypt = require('bcrypt');
const conInfo = 
{
    host: process.env.IP,
    user: process.env.C9_USER,
    password: "",
    database: "ASSIGN5"
};

app.use(session({ secret: 'happy jungle', 
                  resave: false, 
                  saveUninitialized: false, 
                  cookie: { maxAge: 60000 }}))

app.all('/', function (req, res)
{
  if (req.session.user == undefined)
    writeResult(req, res, {'result' : 'Nobody is logged in.'});
  else
    writeResult(req, res, req.session.user);
  console.log('@ "/"   User is --> ' + JSON.stringify(req.session.user));
});                  
app.all('/register', function (req, res)
{
  console.log('@ "/register"   User is --> ' + JSON.stringify(req.session.user));
  if (req.query.email == undefined || !validateEmail(req.query.email))
  {
    writeResult(req, res, {'error' : "Please specify a valid email"});
    return;
  }

  if (req.query.password == undefined || !validatePassword(req.query.password))
  {
    writeResult(req, res, {'error' : "Password must have a minimum of eight characters, at least one letter and one number"});
    return;
  }
  var con = mysql.createConnection(conInfo);
  con.connect(function(err) 
  {
    if (err) 
      writeResult(req, res, {'error' : err});
    else
    {
      let theHash = bcrypt.hashSync(req.query.password, 12);
      con.query("INSERT INTO USER (USER_EMAIL, USER_PASS) VALUES (?, ?)", [req.query.email, theHash], function (err, result, fields) 
      {
        if (err) 
        {
          if (err.code == "ER_DUP_ENTRY")
            err = "User account already exists.";
          writeResult(req, res, {'error' : err});
        }
        else
        {
          con.query("SELECT * FROM USER WHERE USER_EMAIL = ?", [req.query.email], function (err, result, fields) 
          {
            if (err) 
              writeResult(req, res, {'error' : err});
            else
            {
              req.session.user = {'result' : {'id': result[0].USER_ID, 'email': result[0].USER_EMAIL}};
              writeResult(req, res, req.session.user);
            }
          });
        }
      });
    }
  });
  
});
app.all('/login', function (req, res)
{
  console.log('@ "/login"   User is --> ' + JSON.stringify(req.session.user));
  if (req.query.email == undefined)
  {
    writeResult(req, res, {'error' : "Email is required"});
    return;
  }

  if (req.query.password == undefined)
  {
    writeResult(req, res, {'error' : "Password is required"});
    return;
  }
  var con = mysql.createConnection(conInfo);  
  con.connect(function(err) 
  {
    if (err) 
      writeResult(req, res, {'error' : err});
    else
    {
      con.query("SELECT * FROM USER WHERE USER_EMAIL = ?", [req.query.email], function (err, result, fields) 
      {
        if (err) 
          writeResult(req, res, {'error' : err});
        else
        {
          if(result.length == 1 && bcrypt.compareSync(req.query.password, result[0].USER_PASS))
          {
            req.session.user = {'result' : {'id': result[0].USER_ID, 'email': result[0].USER_EMAIL}};
            res.redirect('/');
          }
          else 
          {
            writeResult(req, res, {'error': "Invalid email/password"});
          }
        }
      });
    }
  });
});
app.all('/logout', function (req, res)
{
  console.log('@ "/logout"   User is --> ' + JSON.stringify(req.session.user));
  req.session.user = undefined;
  writeResult(req, res, {'result' : 'Nobody is logged in.'});
});
app.all('/listSongs', function(req, res)
{
  console.log('@ "/listSongs"   User is --> ' + JSON.stringify(req.session.user));
  if (req.session.user == undefined)
    writeResult(req, res, {'error' : 'Please login.'});
  else{
    var con = mysql.createConnection(conInfo);    
    con.connect(function(err) 
    {
      if (err) 
        writeResult(req,res, {'error' : err});
      else
      {
        con.query("SELECT * FROM SONG WHERE USER_ID =(?) ORDER BY SONG_ID",req.session.user.result.id,function (err, result, fields) 
        {
          if (err) 
            writeResult(req,res, {'error' : err});
          else
            writeResult(req,res, {'result' : result});
        });
      }
    });
  }
});                  
app.all('/addSong', function (req, res)
{
  console.log('@ "/addSong"   User is --> ' + JSON.stringify(req.session.user));
  if (req.session.user == undefined)
    res.redirect('/');  
  else if (req.query.song == undefined)
    writeResult(req,res, {'error' : "addSong requires you to enter a song"});
  else
  {
    var con = mysql.createConnection(conInfo);    
    con.connect(function(err) 
    {
      if (err) 
        writeResult(req,res, {'error' : err});
      else
      {
        if(!Array.isArray(req.query.song))
        {
          con.query('INSERT INTO SONG (SONG_NAME,USER_ID) VALUES (?,?)', [req.query.song,req.session.user.result.id], function (err, result, fields) 
          {
          if (err) 
            writeResult(req,res, {'error' : err});
          else
            res.redirect('/listSongs');
          });          
        }
        else
        {
          for(var x in req.query.song)
          {
            con.query('INSERT INTO SONG (SONG_NAME,USER_ID) VALUES (?,?)', [req.query.song[x],req.session.user.result.id], function (err, result, fields) 
            {
            if (err) 
              writeResult(req,res, {'error' : err});
            });             
          }
          res.redirect('/listSongs'); 
        }
      }
    });
  }
});
app.all('/removeSong', function (req, res)
{
  console.log('@ "/removeSong"   User is --> ' + JSON.stringify(req.session.user));
  if (req.session.user == undefined)
    res.redirect('/');    
  else if (req.query.song == undefined)
    writeResult(req,res, {'error' : "removeSong requires you to enter a song"});
  else
  {
    var con = mysql.createConnection(conInfo);    
    con.connect(function(err) 
    {
      if (err) 
        writeResult(req,res, {'error' : err});
      else
      {
        if(!Array.isArray(req.query.song))
        {
          con.query('DELETE FROM SONG WHERE SONG_NAME = (?) AND USER_ID = (?)', [req.query.song,req.session.user.result.id], function (err, result, fields) 
          {
          if (err) 
            writeResult(req,res, {'error' : err});
          });          
        }
        else
        {
          for(var x in req.query.song)
          {
            con.query('DELETE FROM SONG WHERE SONG_NAME = (?) AND USER_ID = (?)', [req.query.song[x],req.session.user.result.id], function (err, result, fields) 
            {
            if (err) 
              writeResult(req,res, {'error' : err});
            });             
          }
          res.redirect('/listSongs');
        }
      }
    });
  }
});
app.all('/clearSongs', function (req, res)
{
  console.log('@ "/clearSongs"   User is --> ' + JSON.stringify(req.session.user));
  if (req.session.user == undefined)
    res.redirect('/');
  else
  {
    var con = mysql.createConnection(conInfo);  
    con.connect(function(err) 
    {
      if (err) 
        writeResult(req,res, {'error' : err});
      else
      {
        con.query('DELETE FROM SONG WHERE USER_ID = (?)',req.session.user.result.id, function (err, result, fields) 
        {
          if (err) 
            writeResult(req,res, {'error' : err});
        });
      }
      res.redirect('/listSongs');
    });  
  }
});

app.listen(process.env.PORT,  process.env.IP, startHandler())

function startHandler()
{
  console.log('Server listening on port ' + process.env.PORT)
}
function writeResult(req,res, obj)
{
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(obj));
  res.end('');
}
function validateEmail(email) 
{
  if (email == undefined)
  {
    return false;
  }
  else
  {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }
}
function validatePassword(pass)
{
  if (pass == undefined)
  {
    return false;
  }
  else
  {
    var re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return re.test(pass);
  }
}