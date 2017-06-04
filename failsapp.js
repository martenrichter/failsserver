//Fails (Fancy Automated Internet Lecture System)
//Copyright (C) 2015-2017  Marten Richter
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

var express = require('express');
var http = require('http');
var https = require('https');
var bodyParser = require('body-parser');
var ipfilter = require('express-ipfilter').IpFilter;
var multer = require('multer');
var fs=require('fs');

var app = express();
var jsonParser = bodyParser.json();

//config
var config= require('./config')();


//fails data structures
var failsusers = require('./failsusers.js');
var failscourses = require('./failscourses.js');
var failsnotescreen = require('./failsnotescreen.js')

//authentification
var jwt = require('jsonwebtoken');
var jwtexpress = require('express-jwt');

var signer = require('url-signer');

var socketioJwt = require("socketio-jwt");

var uuid = require('uuid-v4');

var backgrounder = require('backgrounder');



var users = new failsusers.FailsUsers("data/users.json");
var terms = new failscourses.FailsTerms("data","data/terms.json");
var nsmanager = new failsnotescreen.FailsNoteScreenManager(terms);

// This are server specific settings, may be put them into a json file
var serverjwtkey = config.serverjwtkey;
var serverscreenjwtkey = config.serverscreenjwtkey;
var screenips = config.screenips;

signer.init({privateKey: serverscreenjwtkey, ttl:/*300*/10800});


var failsworker = null;
//start up the worker thread first
backgrounder.spawn(__dirname +"/failsworker.js",{
  },  function(worker) {
  failsworker=worker;
  console.log("Failsworker is ready(master)");
});

var backgroundcleanup=function(opt,err) {
  console.log("Terminate backgroundprocess",opt);
  if (opt.cleanup && failsworker) failsworker.terminate();
  if (opt.exit) process.exit();
};
process.stdin.resume();
process.on('exit',backgroundcleanup.bind(null,{cleanup:true}));
process.on('SIGINT',backgroundcleanup.bind(null,{exit:true}));
process.on('SIGTERM',backgroundcleanup.bind(null,{exit:true,cleanup:true}));
process.on('uncaughtException',backgroundcleanup.bind(null,{exit:true}));

var syncfiles=function(dir,files)
{
  var filesync={
    task: 'syncfile',
    dir: dir,
    files: files
  };
  failsworker.send(filesync);
}

var informchanges=function(obj)
{
  if (config.pushchanges)
    return config.pushchanges(obj);
}

failsusers.init(syncfiles);
failscourses.init(syncfiles,informchanges);
failsnotescreen.init(syncfiles);


app.get('/',function(req,res) {
  res.redirect('/failsUI/index.html');
});

app.get('/screen',function(req,res) {
  res.redirect('/failsUI/screen.html');
});


app.use('/failsUI',express.static('failsUI/www')); // static application

app.use('/data',signer.verifier(),express.static('data'));//serve files from data
// only if verified



// validates the jwt token
app.use('/app',jwtexpress({secret: serverjwtkey}));

app.use('/app/admin', function(req, res, next){
  if (!req.user.permgroup) return res.status(401).send("unauthorized");
  if (req.user.permgroup!="admin") return res.status(401).send("unauthorized");
  next();
});

app.get('/app/admin/users',function(req,res){
  res.status(200).json({ userlist: users.getUserList(),
            usernameslist: user.getUserNamesList()});
});

app.get('/app/admin/groups',function(req,res){
  var groups=[];
  if (config.grouplist) groups=config.grouplist();
  groups.unshift({group:"global"});
  res.status(200).json({ grouplist: groups});
});


app.post("/app/admin/users", jsonParser,function (req, res) {
    if (!req.body.user || !req.body.user.username || !req.body.task) {
      res.status(400).send("malformed request");
    } else {
      if (req.body.task=="delete")
      {
        users.removeUser(req.body.user.username);
        res.status(200).json({});
      } else {
        res.status(400).send("malformed request");
      }
    }
}
);

app.get('/app/admin/user',function(req,res){
  if (req.query.username === undefined) {
    res.status(400).send("malformed request");
  } else {
    res.status(200).json({ user: users.getUser(req.query.username)});
  }
});

app.post("/app/admin/user", jsonParser,function (req, res) {
    if (!req.body.user || !req.body.user.username) {
      res.status(400).send("malformed request");
    } else {
      // do not trust the client!
      var newuser= {username: req.body.user.username,
        name: "Not set",
        email: null,
        permgroup: "instructor"
      };
      console.log("updateadd",req.body.user);
      if (req.body.user.name !== undefined) newuser.name=req.body.user.name;
      if (req.body.user.email !== undefined) newuser.email=req.body.user.email;
      if (req.body.user.permgroup == "admin") newuser.permgroup="admin";
      if (req.body.user.permgroup == "maintenance") newuser.permgroup="maintenance";

      users.addupdateUser(newuser);
      res.status(200).json({user: newuser});
    }
}
);

app.post("/app/admin/term", jsonParser,function (req, res) {
    if (!req.body.term.termname) {
      res.status(400).send("malformed request");
    } else {

      // do not trust the client!
      var term= {termname: req.body.term.termname,
        uuid: undefined
      };
      if (uuid.isUUID(req.body.term.uuid)) term.uuid=req.body.term.uuid;
      console.log("updateadd term",req.body.term);

      terms.addupdateTerm(term);

      res.status(200).json({term: term, currenttermuuid: terms.currenttermuuid});
    }
}
);

app.post("/app/admin/currentterm", jsonParser,function (req, res) {
  console.log("currentterm",req.body);
    if (!req.body.currenttermuuid) {
      res.status(400).send("malformed request");
    } else {
      if (uuid.isUUID(req.body.currenttermuuid)) {
        terms.changeCurrentTerm(req.body.currenttermuuid);
        res.status(200).json({currenttermuuid: terms.currenttermuuid});
      } else {
        res.status(400).send("malformed request");
      }
      console.log("change current term",req.body.currenttermuuid);
    }
}
);

app.post("/app/admin/terms", jsonParser,function (req, res) {
    if (!req.body.term || !req.body.term.uuid || !req.body.task) {
      res.status(400).send("malformed request");
    } else {
      if (req.body.task=="delete")
      {
        terms.removeTerm(req.body.term);
        res.status(200).json({});
      } else {
        res.status(400).send("malformed request");
      }
    }
}
);

app.use('/app/gadmin', function(req, res, next){
  if (!req.user.permgroup) {
    req.authinfo=users.getGroupAuthInfo("admin",req.user.groups);
    if (req.authinfo.authgroups.length==0 && !req.authinfo.groupauth) return res.status(401).send("unauthorized");
  } else {
    if (!users.checkPermLevel("admin",req.user.permgroup)) return res.status(401).send("unauthorized");
    else {
      req.authinfo={globalauth:true,authgroups: []};
    }
  }
  next();
});

app.post("/app/gadmin/course", jsonParser,function (req, res) {
    if (!req.body.course || !req.body.course.title) {
      res.status(400).send("malformed request");
    } else {

      // do not trust the client!
      var course= {title: req.body.course.title,
        uuid: undefined,
        termuuid: undefined,
        instructors: [],
        instructorsnames: [],
        website: undefined,
        group: undefined

      };
      if (uuid.isUUID(req.body.course.uuid)) course.uuid=req.body.course.uuid;
      console.log("updateadd course",req.body.course);
      if (uuid.isUUID(req.body.course.termuuid)) course.termuuid=req.body.course.termuuid;

      if (req.body.course.instructors) course.instructors=req.body.course.instructors;
      if (req.body.course.instructorsnames) course.instructorsnames=req.body.course.instructorsnames;
      if (req.body.course.website) course.website=req.body.course.website;
      var grouplist=config.grouplist();
      if ((req.body.course.group
        || (grouplist && grouplist.indexOf(req.body.course.group)>-1))
        && (typeof req.body.course.group === 'string'
        || ( req.body.course.group instanceof String)))
          course.group=req.body.course.group;

      var termuuid = terms.currenttermuuid;
      if (course.termuuid)  termuuid = course.termuuid;

      var courses=terms.getTermCourses(termuuid);

      if (!courses) {
        res.status(400).send("malformed request");
      } else {
        var retcourse=courses.addupdateCourse(course,req.authinfo);
        if (!retcourse)   res.status(404).send("unauthorized");
        else res.status(200).json({course: retcourse});

      }

    }
}
);

app.post("/app/gadmin/courses", jsonParser,function (req, res) {
    console.log("admin courses",req.body);
    if (!req.body.course || !req.body.course.uuid
      || !uuid.isUUID(req.body.course.uuid)
      || !req.body.course.termuuid
      || !uuid.isUUID(req.body.course.termuuid)|| !req.body.task) {
      res.status(400).send("malformed request");
    } else {
      var courses=terms.getTermCourses(req.body.course.termuuid);

      if (req.body.task=="delete")
      {
        if (!courses.removeCourse(req.body.course,req.authinfo))
          res.status(404).send("unauthorized");
        res.status(200).json({});
      } else {
        res.status(400).send("malformed request");
      }
    }
}
);


app.get('/app/gadmin/groupusers',function(req,res){
  if (!req.query.group) return res.status(400).send("malformed request");
  var users=[];
  if (config.groupmembers) users=config.groupmembers(req.query.group);

  res.status(200).json({ userlist: users.users, usernameslist: users.names});
});


app.use('/app/common', function(req, res, next){
  if (!req.user.permgroup) {
    req.authinfo=users.getGroupAuthInfo("instructor",req.user.groups);
    if (req.authinfo.authgroups.length==0 && !req.authinfo.groupauth) return res.status(401).send("unauthorized");
  } else {
    if (!users.checkPermLevel("instructor",req.user.permgroup)) return res.status(401).send("unauthorized");
    else {
        req.authinfo={globalauth:true,authgroups: []};
    }
  }

  next();
});



app.get('/app/common/terms',function(req,res){
  res.status(200).json({ termlist: terms.getTermList(),
    currenttermuuid: terms.currenttermuuid});
});

app.get('/app/common/courses',function(req,res){

  if (!req.query.termuuid || !uuid.isUUID(req.query.termuuid)) {

    res.status(200).json({ courseslist: [],
      defcourseuuid: 'none'});

  } else {
    var courses=terms.getTermCourses(req.query.termuuid);
    var defcourseuuid = undefined;

    if (!courses)   {

      res.status(400).send("malformed request invalid termuuid or unauthenticated");
    } else {
      if (req.query.username) {
        defcourseuuid = courses.getDefCourse(req.query.username,req.authinfo);
      }
      var secauthinfo=null;
      if (req.query.elevatedpermgroup) secauthinfo=users.getGroupAuthInfo(req.query.elevatedpermgroup,req.user.groups);
      res.status(200).json({ courseslist: courses.getCoursesList(req.authinfo,
                                  secauthinfo),
        defcourseuuid: defcourseuuid});
      }
  }
});

app.post("/app/common/coursePictureUpload",multer().single('file'),function (req, res) {

    if (!req.body.data ) {
      res.status(400).send("malformed request");
    } else {
      var cmd=JSON.parse(req.body.data);

      if ((cmd.termuuid && !uuid.isUUID(cmd.termuuid))
       || !uuid.isUUID(cmd.uuid)) {
          console.log("coursePictureUpload invalid request",cmd.termuuid,cmd.uuid);
          res.status(400).send("malformed request");
          return;
      }
      if (!cmd.termuuid) cmd.termuuid=terms.currenttermuuid;
      console.log("picture upload",req.user.username,cmd.termuuid,cmd.uuid);
      var lectures= terms.getCourseLectures(cmd.termuuid,cmd.uuid,req.authinfo);

      if (!lectures) {
	        console.log("picture upload failed unknown course or unauthenticated");
          res.status(400).send("unknown course");
          return;
      }
      if (!req.file) {
	        console.log("picture upload failed no file");
          res.status(400).send("unknown course");
          return;
      }

      if (req.file.mimetype!='image/png' && req.file.mimetype!='image/jpeg') {
        res.status(400).send("wrong mimetype");
	      console.log("picture upload failed wrong mime type"+req.files.file.mimetype);
        return;
      }

      console.log(req.file);
      if (!lectures.AddPicture(req.file.buffer, req.file.filename,req.file.mimetype,
        function(task) {
          if (task) {
            console.log("send picture task to worker",task);
            failsworker.send(task);
          }
        }
      )) {
        console.log("course invalid request upload Picture path");
        res.status(400).send("malformed request something really wrong");
        return;
      }
      res.status(200).json({});
    }
}
);

app.get('/app/common/pictures',function(req,res){

  if (/*!req.query.termuuid || !uuid.isUUID(req.query.termuuid)
      ||*/ !req.query.courseuuid || !uuid.isUUID(req.query.courseuuid)) {

      res.status(200).json({ picturelist: []});

  } else {
    var termuuid = terms.currenttermuuid;
    if (req.query.termuuid && uuid.isUUID(req.query.termuuid)) termuuid=req.query.termuuid;
    var courses=terms.getTermCourses(termuuid);
    if (!courses)   {
      res.status(400).send("malformed request invalid termuuid or unauthorized");
    } else {
      var lectures=courses.getCourseLectures(req.query.courseuuid,req.authinfo);
      if (!lectures) {
        res.status(400).send("malformed request invalid courseuuid");
      } else {
         var picturelist=lectures.getPictureList();
         var plength=picturelist.length;
         var outpicturelist=[];
         for (var i=0; i<plength;i++) {
           var urls=lectures.getPicture(picturelist[i].uuid,req.query.quality).filenames;
           var tpict= { mimetype: picturelist[i].mimetype, uuid: picturelist[i].uuid};
           tpict.url= signer.getSignedUrl("/"+urls[0]);
           outpicturelist.push(tpict);
           //console.log("URL:"+picturelist[i].url);
         }

          res.status(200).json({ picturelist: outpicturelist});
      }

    }
  }
});

app.get("/app/common/picture", function(req,res){

    if (!req.query.lecture ) {
      res.status(400).send("malformed request");
    } else {
      var cmd=req.query.lecture;

      if ((cmd.termuuid && !uuid.isUUID(cmd.termuuid))
       || !uuid.isUUID(cmd.courseuuid)
        || !uuid.isUUID(cmd.uuid)) {
          console.log("picture invalid request");
          res.status(400).send("malformed request");
          return;
      }

      if (!cmd.termuuid) cmd.termuuid=terms.currenttermuuid;
      console.log("picture download",req.user.username,cmd.termuuid,cmd.courseuuid,cmd.uuid);
      var lectures= terms.getCourseLectures(cmd.termuuid,cmd.courseuuid,req.authinfo);

      if (!lectures) {
	        console.log("picture download failed unknown course or unauthorized");
          res.status(400).send("unknown course");
          return;
      }
      var quality="";
      if (cmd.quality == "thumb") quality="thumb";
      else if (cmd.quality == "drawing") quality="drawing";
      else if (cmd.quality == "print") quality="print";

      var picture = lectures.getPicture(cmd.uuid,quality);
      if (picture.filenames) {
        res.status(400).send("malformed request");
        return;
      }
      var picturefiles=picture.filenames;
      var picturemime=picture.mimetype;
      var picturefilename='picture.unknown';

      if (picturemime=='image/png') picturefilename='picture.png';
      else  if (picturemime=='image/jpeg') picturefilename='picture.jpeg';

      console.log("get picture request",cmd);


      var existchecker=function(err,stats) {
          if (err == null) {
             res.download(picturefiles[0],picturefilename);
          } else {
            if (picturesfiles.length>1) {
              picturefiles.shift();
              fs.stat(picturefiles[0],existchecker);
            } else   res.status(404).send("file not found");
          }
      };
    }
}
);

app.get('/app/common/lectures',function(req,res){

  if (/*!req.query.termuuid || !uuid.isUUID(req.query.termuuid)
      ||*/ !req.query.courseuuid || !uuid.isUUID(req.query.courseuuid)) {

      res.status(200).json({ lectureslist: [],
        deflectureuuid: "none"});

  } else {
    var termuuid = terms.currenttermuuid;
    if (req.query.termuuid && uuid.isUUID(req.query.termuuid)) termuuid=req.query.termuuid;
    var courses=terms.getTermCourses(termuuid);
    if (!courses)   {
      res.status(400).send("malformed request invalid termuuid");
    } else {
      var lectures=courses.getCourseLectures(req.query.courseuuid,req.authinfo);
      if (!lectures) {
        res.status(400).send("malformed request invalid courseuuid or unauthorized");
      } else {
          var deflectureuuid = undefined;
          deflectureuuid = lectures.getDefLecture(new Date());
          res.status(200).json({ lectureslist: lectures.getLecturesList(),
            deflectureuuid: deflectureuuid});
      }

    }
  }
});

app.post("/app/common/lecture", jsonParser,function (req, res) {
    if (!req.body.lecture || !req.body.lecture.title) {
      res.status(400).send("malformed request");
    } else {

      // do not trust the client!
      var lecture= {title: req.body.lecture.title,
        uuid: undefined,
        termuuid: undefined,
        courseuuid: undefined,
        instructor: undefined,
        name: undefined,
        type: undefined,
        date: undefined

      };

      if (uuid.isUUID(req.body.lecture.uuid)) lecture.uuid=req.body.lecture.uuid;
      console.log("updateadd lecture",req.body.lecture);
      if (uuid.isUUID(req.body.lecture.termuuid)) lecture.termuuid=req.body.lecture.termuuid;
      if (uuid.isUUID(req.body.lecture.courseuuid)) lecture.courseuuid=req.body.lecture.courseuuid;


      lecture.instructor=req.user.username;
      if (req.user.name) lecture.name=req.user.name;

      var termuuid = terms.currenttermuuid;
      if (lecture.termuuid)  termuuid = lecture.termuuid;
      else lecture.termuuid = termuuid;
      var courseuuid = undefined;
      if (lecture.courseuuid) courseuuid=  lecture.courseuuid;

      var courses=terms.getTermCourses(termuuid);

      if (!courses) {
        res.status(400).send("malformed request or unauthenticated");
      } else {
        var lectures = courses.getCourseLectures(courseuuid,req.authinfo);
        if (!lectures) {
          res.status(400).send("malformed request or unauthorized");
        } else {
          var retlecture=lectures.addupdateLecture(lecture);

          res.status(200).json({lecture: retlecture});
        }
      }

    }
}
);



app.post("/app/common/lecturePDFUpload",multer().single('file'),function (req, res) {

    if (!req.body.data ) {
      res.status(400).send("malformed request");
    } else {
      var cmd=JSON.parse(req.body.data);

      if ((cmd.termuuid && !uuid.isUUID(cmd.termuuid))
       || !uuid.isUUID(cmd.courseuuid)
        || !uuid.isUUID(cmd.uuid)) {
          console.log("lecturePDF invalid request",cmd.termuuid,cmd.courseuuid,cmd.uuid);
          res.status(400).send("malformed request");
          return;
      }
      if (!cmd.termuuid) cmd.termuuid=terms.currenttermuuid;
      console.log("lecture upload",req.user.username,cmd.termuuid,cmd.courseuuid,cmd.uuid);
      var lectures= terms.getCourseLectures(cmd.termuuid,cmd.courseuuid,req.authinfo);

      if (!lectures) {
	         console.log("lecture upload failed unknown course or unauthorized");

        res.status(400).send("unknown course or authorized");
        return;

      }
      if (req.file.mimetype!='application/pdf') {
        res.status(400).send("wrong mimetype");
	      console.log("lecture upload failed wrong mime type"+req.files.file.mimetype);

        return;
      }

      if (!lectures.UploadPDFLecture(cmd.uuid,req.file.buffer)) {
        console.log("lecturePDF invalid request upload PDF path");
        res.status(400).send("malformed request something really wrong");
        return;
      }
      res.status(200).json({});
    }
}
);

app.post("/app/common/lecturePDF", jsonParser,function (req, res) {
    if (!req.body.lecture ) {
      res.status(400).send("malformed request");
    } else {
      var cmd=req.body.lecture;

      if ((cmd.termuuid && !uuid.isUUID(cmd.termuuid))
       || !uuid.isUUID(cmd.courseuuid)
        || !uuid.isUUID(cmd.uuid)) {
          console.log("lecturePDF invalid request");
          res.status(400).send("malformed request");
          return;
        }
      var notepadscreen=nsmanager.getNoteScreen(cmd.termuuid,
        cmd.courseuuid,cmd.uuid,req.authinfo);
      if (!notepadscreen) {
        res.status(400).send("malformed request");
        return;
      }
      var task=notepadscreen.generatePDFtask(terms,users,req.authinfo);

      if (task) failsworker.send(task);

      res.status(200).json({});
    }
}
);



app.get("/app/common/lecturePDF", function(req,res){

    if (!req.query.lecture ) {
      res.status(400).send("malformed request");
    } else {
      var cmd=req.query.lecture;

      if ((cmd.termuuid && !uuid.isUUID(cmd.termuuid))
       || !uuid.isUUID(cmd.courseuuid)
        || !uuid.isUUID(cmd.uuid)) {
          console.log("lecturePDF invalid request");
          res.status(400).send("malformed request");
          return;
        }
      var notepadscreen=nsmanager.getNoteScreen(cmd.termuuid,
        cmd.courseuuid,cmd.uuid,req.authinfo);
      if (!notepadscreen) {
        res.status(400).send("malformed request");
        return;
      }
      console.log("get lecturePDF request",cmd);
      var file=notepadscreen.downloadPDFname(cmd.color==="true",terms,users);

      if (!file) {
        res.status(404).send("file not found");
        return;
      }
      //if (task) failsworker.send(task);
      res.download(file,"lecture.pdf");
    }
}
);



app.use('/app/maintenance', function(req, res, next){
  if (!req.user.permgroup) {
    req.authinfo=users.getGroupAuthInfo("maintenance",req.user.groups);
    if (req.authinfo.authgroups.length==0 && !req.authinfo.groupauth) return res.status(401).send("unauthorized");
  } else {
    if (!users.checkPermLevel("maintenance",req.user.permgroup)) return res.status(401).send("unauthorized");
    else {
      req.authinfo={globalauth:true,authgroups:[]};
    }
  }
  next();
});

app.post("/app/maintenance/lectures", jsonParser,function (req, res) {
    console.log("maintenance lectures",req.body);
    if (!req.body.lecture || !req.body.lecture.uuid
       || !uuid.isUUID(req.body.lecture.uuid)
      || !req.body.lecture.courseuuid || !uuid.isUUID(req.body.lecture.courseuuid)
      || !req.body.task) {
      res.status(400).send("malformed request");
    } else {
      var termuuid = terms.currenttermuuid;
      if (req.body.lecture.termuuid && uuid.isUUID(req.body.lecture.termuuid))
              termuuid=req.body.lecture.termuuid;
      if (req.body.task=="delete")
      {
          var lectures=terms.getCourseLectures(termuuid,
            req.body.lecture.courseuuid,req.authinfo);
          if (!lectures) {
              res.status(400).send("malformed request invalid courseuuid or unauthorized");
          } else {
            lectures.removeLecture(req.body.lecture);
            res.status(200).json({});
          }
      } else if (req.body.task=="move" || req.body.task=="copy") {
        if ( !req.body.lecture.destcourseuuid
            || !uuid.isUUID(req.body.lecture.destcourseuuid)
            || !req.body.lecture.desttermuuid
            || !uuid.isUUID(req.body.lecture.desttermuuid)) {
            res.status(400).send("malformed request");
        } else  {
          var move=false;
          if (req.body.task=="move") move=true;
          if (!terms.copymovelectures(move,termuuid, req.body.lecture.courseuuid,req.body.lecture.uuid,
                                      req.body.lecture.desttermuuid, req.body.lecture.destcourseuuid)) {
                res.status(400).send("move/copy failed or unauthorized");
          } else {
            res.status(200).json({});
          }
        }
      } else {
        res.status(400).send("malformed request");
      }

    }
}
);



app.post("/login", jsonParser,function (req, res) {
  var ip =  req.client.remoteAddress;
  var username=req.body.username;
  console.log("Got login request user: %s with ip %s", username,ip);

  if (!config.userauthentificate) {
    console.log("Fix config! userauthentificate");
    return;
  }
  var expirationtime="3h";
  config.userauthentificate(username,req.body.password,
  function(err,user) {
    if (err) {
      console.log("user %s password not in db!",username);
      res.status(200).json({error: 'User '+username+'/password not authorized'});
      return;
    }
    if ( config.supersuperusers.indexOf(username) > -1 ) {
      console.log("Supersuperuser detected!");
      var tokendata = {
        username : username,
        permgroup : "admin"
      };
      var token = jwt.sign(tokendata, serverjwtkey,{expiresIn: "3h"});
      res.status(200).json({authtoken: token,
        username: username,
        permgroup: "admin"});
        return ;
      }
      if (user) { // config, passed a user object, that can override our settings
        var userobj=users.checkExtUserObj(user);
        if (userobj) {
          if (userobj.expirationtime) expirationtime=userobj.expirationtime;
          var tokendata = {
                username : username,
                groups : userobj.groups,
                name: userobj.name,
                email: userobj.email,
                gpermgroup: userobj.gpermgroup
          };
          var token = jwt.sign(tokendata, serverjwtkey,{expiresIn: expirationtime});
          res.status(200).json({authtoken: token,
              username : username,
              groups : user.groups,
              name: user.name,
              email: user.email,
              gpermgroup: userobj.gpermgroup});
            return;
          }
      }

      // ok, we fall back to the our old user database

      var userobj = users.getUser(username);
      if (!userobj) {
        console.log("user %s not in db not authorized",username);
        res.status(200).json({error: 'User '+username+' not found'});
      } else {
        var tokendata = {
          username : userobj.username,
          permgroup : userobj.permgroup
        };
        var token = jwt.sign(tokendata, serverjwtkey,{expiresIn: expirationtime});
        res.status(200).json({authtoken: token,
          username: userobj.username,
          permgroup: userobj.permgroup});
        }
      })
    });

console.log("Set screen allowed ips",screenips);
app.use("/screen",ipfilter(screenips,{mode:'allow',cidr: true,log:true})); // only allow whitelisted ips

app.post("/screen", jsonParser,function (req, res) {
  var ip =  req.client.remoteAddress;

  console.log("Got screen request:  ip %s", ip);

  var screenobj = nsmanager.createNewScreen();
  console.log("added screen with name %s and uuid %s",screenobj.name,screenobj.uuid);
  var tokendata = {
    uuid: screenobj.uuid,
    name: screenobj.name,
    permgroup: "screen"
  };
  var token = jwt.sign(tokendata, serverscreenjwtkey,{expiresIn: "10h"});
  res.status(200).json({authtoken: token,
    screenobj: screenobj});

});

var credentials = {};

//var server = https.createServer(credentials,app);
var server;
var serverport=80;
if (config.http) {
    server = http.createServer(app);
    serverport = config.httpport;
} else {
   var privatekey= fs.readFileSync(config.privateKey);
   var cert=fs.readFileSync(config.certificate);
   var credentials= {key: privatekey, cert: cert};
   server = https.createServer(credentials,app);
   serverport = config.httpsport;
   if (config.httpredirecter) {
     var appre = express();
     appre.get('*',function(req,res) {
       res.redirect('https://'+req.headers.host  +req.path);
     });
     var serverre=http.createServer(appre);
     serverre.listen(config.httpport,config.hostname,function() {
       console.log('Failsserver redirector listening at http://%s:%s',
           serverre.address().address, serverre.address().port);
     });

   }
}



//socket io stuff
var io = require('socket.io')(server);
var notepadio = io.of('/notepads');
var screenio = io.of('/screens');

// notepad implementation
notepadio.use(socketioJwt.authorize({secret: serverjwtkey,handshake:true}));

notepadio.use(function(socket,next) {
  var data=socket.decoded_token;
  var authinfo;
  if (!data.permgroup) {
    authinfo=users.getGroupAuthInfo("instructor",data.groups);
    if (authinfo.authgroups.length==0
      && !authinfo.groupauth) {
        console.log("unauthorized socket attempt",data);
        next(new Error("unauthorized"));
        return;
      }
  } else {
    if (!users.checkPermLevel("instructor",data.permgroup)) {
      console.log("unauthorized socket attempt",data);
      next(new Error("unauthorized"));
      return;
    } else {
      authinfo={globalauth:true,authgroups: []};
    }
  }
  console.log("Authinfo client",authinfo);
  socket.decoded_token.authinfo=authinfo;
   next();
});

var emitscreenlists=function(socket,notepad) {
  nsmanager.cleanupScreens(); // do some house keeping, before we emit the screenlist
  if (socket && notepad) {
    socket.emit('notepadscreens',{screens: nsmanager.getNotepadScreens(notepad)});
  }
  /*var remoteclientip=null;
  if (socket) {
    remoteclientip=socket.client.request.headers['x-forwarded-for']
        || socket.client.conn.remoteAddress;
  }*/

  // Now we iterate over all notepads instead of just emitting it to everyone
  //no broadcasts anymore
  /*notepadio.emit('availscreens',
        {screens: nsmanager.getAvailableScreens(remoteclientip,knownscreens)});*/
  nsmanager.iterOverNotescreens(function(inotescreen){
    if (inotescreen.socket) {
      var remoteclientip=null;
      remoteclientip=inotescreen.socket.client.request.headers['x-forwarded-for']
          || inotescreen.socket.client.conn.remoteAddress;
      var knownscreens=[];
      knownscreens=inotescreen.getKnownScreens();
      inotescreen.socket.emit('availscreens',
            {screens: nsmanager.getAvailableScreens(remoteclientip,knownscreens)});
    }

  });
};

// fullnotepad lifecycle
notepadio.on('connection',function(socket) {
  var address = socket.client.conn.remoteAddress;
  console.log("Client %s with ip %s  connected",socket.id,
          address);
  console.log("Client username",socket.decoded_token.username);
  var notepadscreen=null;
  var roomname=null;

  emitscreenlists();

  /*socket.emit('availscreens',
          {screens: nsmanager.getAvailableScreens(remoteclientip, null)});*/

  socket.on('selectlecture',function(cmd){
    if ((cmd.termuuid && !uuid.isUUID(cmd.termuuid)) || !uuid.isUUID(cmd.courseuuid)
      || !uuid.isUUID(cmd.uuid)) {
        console.log("selectlecture invalid request");
        return;
      }
    notepadscreen=nsmanager.getNoteScreen(cmd.termuuid,cmd.courseuuid,cmd.uuid,
            socket.decoded_token.authinfo);

    if (notepadscreen) {
      notepadscreen.socket=socket;
      notepadscreen.lecture.failsdata=true; // we have started giving a lecture
      var lectures=terms.getCourseLectures(cmd.termuuid,cmd.courseuuid
                ,socket.decoded_token.authinfo);
      if (lectures) lectures.saveDB();
      emitscreenlists(socket,notepadscreen);
      if (notepadscreen.connectNotepad()) {
        console.log("notepad connected, send board data");
        notepadscreen.sendBoardsToSocket(socket,signer);
        roomname=notepadscreen.getRoomName();

        console.log("notepad connected, join room",roomname);
        if (roomname) socket.join(roomname);
      } else {
        console.log("Could not connect to notepadscreen");
        socket.emit('error',{errorText:"Could not connect to notepadscreen, unauthorized or something else!"});
        notepadscreen=null;
      }
    }
  });

  socket.on('updatesizes',function(cmd){
    if (notepadscreen) {
      notepadscreen.setNotepadSize(cmd.scrollheight,cmd.isalsoscreen,cmd.casttoscreens,cmd.backgroundbw);
      var info=nsmanager.getSendSizes(notepadscreen);
      if (roomname) {
        notepadio.to(roomname).emit('updatescreensizes',info);
        screenio.to(roomname).emit('updatescreensizes',info);
      }
    }

  });

  socket.on('drawcommand',function(cmd) {
    var delayed=false;
    // special handling
    if (cmd.task=='addPicture') {
      if (notepadscreen) {
        var picture=notepadscreen.getPicture(cmd.uuid);
        if (!picture)
        { // we have to add the picture to lecture
          delayed=true;
          nsmanager.addPictureToNotescreen(notepadscreen,cmd.uuid,
            socket.decoded_token.authinfo,function() {
            if (roomname) {
              notepadio.to(roomname).emit('drawcommand',cmd);
              screenio.to(roomname).emit('drawcommand',cmd);
            }
          });

        }
        var pictinfo=notepadscreen.getPictureInfo(cmd.uuid,'drawing',signer); // now generate URL
        if (pictinfo) {
          notepadio.to(roomname).emit('pictureinfo',pictinfo);
          screenio.to(roomname).emit('pictureinfo',pictinfo);
        }

      }
    }
    //generell distribution
    if (roomname && !delayed) {
      notepadio.to(roomname).emit('drawcommand',cmd);
      screenio.to(roomname).emit('drawcommand',cmd);
    }

    if (notepadscreen) {
      notepadscreen.receiveData(cmd);
    }
  });

  socket.on('FoG',function(cmd) {
    if (roomname) {
      notepadio.to(roomname).emit('FoG',cmd);
      screenio.to(roomname).emit('FoG',cmd);
    }
  });

  socket.on('addscreen',function(cmd) {
    if (uuid.isUUID(cmd.screenid) && notepadscreen) {
      console.log("addscreen request",cmd.screenid);
      var tmpscreen=nsmanager.assignScreenToNotescreen(cmd.screenid,notepadscreen,signer);
      if (tmpscreen && tmpscreen.socket) {
        tmpscreen.socket.emit('lecturedetail',
                  notepadscreen.getLectDetail(terms,users,
                    socket.decoded_token.authinfo));
        var info=nsmanager.getSendSizes(notepadscreen);
        tmpscreen.socket.emit('updatescreensizes',info);
      }

      emitscreenlists(socket,notepadscreen);
    }

  });

  socket.on('findscreen',function(cmd){
    if (!notepadscreen) return; //no one cares
    console.log("findscreen",cmd);
    if (cmd.screenname  &&
      (typeof cmd.screenname === 'string'
      || ( cmd.screename instanceof String))) {
      if (cmd.screenname.length==5) {
         console.log("aks emit before");
          if (notepadscreen.addKnownScreen(cmd.screenname)) {
            console.log("aks emit");
            emitscreenlists();
          }
      }
    }
  });

  socket.on('LogoutPublish',function(cmd){
    if (roomname) {
      screenio.to(roomname).emit('LogoutPublish',cmd);
      if (notepadscreen) {
        nsmanager.unassignRelatedScreens(notepadscreen);
      }
    }
  });

  socket.on('removescreen',function(cmd) {
    if (uuid.isUUID(cmd.screenid) && notepadscreen) {
      console.log("removescreen request",cmd.screenid);
      nsmanager.removeScreenFromNotescreen(cmd.screenid,notepadscreen);

      emitscreenlists(socket,notepadscreen);
    }

  });


  socket.on('disconnect',function() {
    console.log("Client %s with ip %s  disconnected",socket.id,
          address);
    if (roomname) {
      socket.leave(roomname);
      roomname=null;
    }
    if (notepadscreen) {
      delete  notepadscreen.socket;
      notepadscreen.disconnectNotepad();
      notepadscreen=null;
    }
  });
});


// screen implementation

screenio.use(socketioJwt.authorize({secret: serverscreenjwtkey,handshake:true}));

screenio.use(function(socket,next) {
  var data=socket.decoded_token;
  if (!data.permgroup) {
    console.log("unauthorized socket attempt",data);
    next(new Error("unauthorized"));
    return;
  }

  if (!data.name) {
    console.log("unauthorized socket attempt",data);
    next(new Error("unauthorized"));
    return;
  }

  if (!uuid.isUUID(data.uuid)) {
    console.log("unauthorized socket attempt",data);
    next(new Error("unauthorized"));
    return;
  }

  if (data.permgroup!="screen") {
      console.log("unauthorized socket attempt",data);
      next(new Error("unauthorized"));
      return;
    }
    next();
});

// full screen lifecycle
screenio.on('connection',function(socket) {
  var address = socket.client.conn.remoteAddress;
  console.log("Screen %s with ip %s  connected",socket.id,
          address);
  console.log("Screen name",socket.decoded_token.name);
  console.log("Screen uuid",socket.decoded_token.uuid);
  var notepadscreen=null;

  var purescreen=null;
  var cs=nsmanager.connectScreen(socket.decoded_token.uuid,
    socket.decoded_token.name,socket);

  if ( cs!=false) {
    console.log("screen connected");
    purescreen=cs;
    notepadscreen=purescreen.notescreen;
    purescreen.socket=socket;
    if (notepadscreen) {
      socket.emit('lecturedetail',
            notepadscreen.getLectDetail(terms,users,
              {globalauth:true,authgroups: []}));
      console.log("screen send board data");
      notepadscreen.sendBoardsToSocket(socket,signer);
      purescreen.roomname=notepadscreen.getRoomName();
      console.log("screen is connected to notepad, join room",purescreen.roomname);
      socket.join(purescreen.roomname);
    }

  } else {
    console.log("screen unauthorized",socket.screendata);
    return;
  }

  emitscreenlists();


  socket.on('updatesizes',function(cmd){
    if (purescreen) {
      purescreen.scrollheight=cmd.scrollheight;
      if (notepadscreen) {
        var info=nsmanager.getSendSizes(notepadscreen);
        if (purescreen.roomname) {
          notepadio.to(purescreen.roomname).emit('updatescreensizes',info);
          screenio.to(purescreen.roomname).emit('updatescreensizes',info);
        }
      }
      //todo send also to screens
    }

  });




  socket.on('disconnect',function() {
    console.log("Screen Client %s with ip %s  disconnected",socket.id,
          address);
    if (purescreen) {
      if (purescreen.roomname) {
        socket.leave(purescreen.roomname);
        console.log("screen disconnected leave room",purescreen.roomname);
        delete purescreen.roomname;
      }
      if (purescreen.socket) {
        delete purescreen.socket;
      }
    }
    if (notepadscreen) {
      notepadscreen.disconnectScreen();
      notepadscreen=null;
    }
    nsmanager.disconnectScreen(socket.decoded_token.uuid);
    nsmanager.cleanupScreens(); // do some house keeping, before we emit the screenlist
    emitscreenlists();
  });

});

setInterval(function() {
  var cleaned=nsmanager.cleanupScreens();
  if (cleaned) {
    console.log("Screens were cleaned");
    emitscreenlists();
  }
}, 10*1000);


server.listen(serverport,config.hostname,function() {
  console.log('Failsserver listening at http://%s:%s',
      server.address().address, server.address().port);
    });
