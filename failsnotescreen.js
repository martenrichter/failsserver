//Fails (Fancy Automated Internet Lecture System)
//Copyright (C) 2015-2017  Marten Richter
//
//This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

var uuid = require('uuid-v4');
var chance = require('chance').Chance();
var failsdata = require('./failsUI/www/js/failsdata.js');
var fs=require('fs');

var syncallback = null;

module.exports.init=function(sc)
{
  syncallback=sc;
};

module.exports.FailsNoteScreen = function(lecture)
{
  this.lecture = lecture;

  this.screens=[]; // all assigned screens
  this.knownscreens=[]; //names of all previously assigned screens
  this.connectedscreens = 0;
  this.connectednotepads = 0;


  this.collection = new failsdata.Collection(function(id,data) {
            return new failsdata.CallbackContainer(id,data);} ,
            {writeData: function(obj,number,data,append) {
              obj.writeData(number,data,append);
            },
            obj: this} );
 this.dispatcher = new failsdata.Dispatcher(); // dispatcher adds time stamps
 this.dispatcher.addSink(this.collection);

  this.networksource = new failsdata.NetworkSource(this.dispatcher);

  this.filestreams = [];

  var filename = this.lecture.directory+"/boards.json";
  if (!fs.existsSync(filename)) {
    console.log("board db file %s does not exist! Using empty courses!",filename);
    this.persistent = {
      files: [],
      pictures: {}
    };
  } else {
    this.persistent = JSON.parse(fs.readFileSync(filename,'utf8'));
    if (!this.persistent.pictures) this.persistent.pictures= {};
  }


  this.lastaccess = new Date();

  var myself=this;
  fs.readFile(lecture.directory+"/command.board",function (err,data){
    if (err) return;
    var memcont=new failsdata.MemContainer("command",{});
    var ab = new ArrayBuffer(data.length);
    var view = new Uint8Array(ab);
    for (var i=0;i<data.length;i++) {
      view[i]=data[i];
    }


    memcont.replaceStoredData(ab);

    var cs=memcont.getCurCommandState();
    console.log("cs state",cs);
    myself.dispatcher.setTimeandScrollPos(cs.time,cs.scrollx,cs.scrolly);
    if (myself.socket) {
      myself.socket.emit('drawcommand',{ task:"scrollBoard",
          time: myself.dispatcher.getTime(),
          x: myself.dispatcher.scrollx,
          y: myself.dispatcher.scrolly,
          timeSet: true});
    }

  });

};

module.exports.FailsNoteScreen.prototype.constructor = module.exports.FailsNoteScreen;


module.exports.FailsNoteScreen.prototype.saveDB=function(){

  var writeout=JSON.stringify(this.persistent,null,2);
  var options= {encoding: 'utf8',flag:'w',mode: 0644};

  fs.writeFile(this.lecture.directory+"/boards.json",writeout,options,function(err){
  if (err) throw err;
   console.log("Saving FailsNoteScreen db succeeded!");
  });
};

module.exports.FailsNoteScreen.prototype.getKnownScreens=function(){
  return this.knownscreens;
};

module.exports.FailsNoteScreen.prototype.addKnownScreen=function(screenname) {
  var nscreenname=screenname.toUpperCase();
  var pattern=new RegExp('[A-Z0-9]{5}');
  this.lastaccess = new Date();
  if (pattern.test(nscreenname)) {
     // let's add it to the array of knownscreens
     if (this.knownscreens.indexOf(nscreenname)<=-1
          && this.knownscreens.length<20 /* prevents DOS*/) {
       this.knownscreens.push(nscreenname);
     }
     return true;
  }
  return false;
};

module.exports.FailsNoteScreen.prototype.setNotepadSize=function(scrollheight,isscreen, casttoscreens, backgroundbw)
{
  this.notepadisscreen = isscreen;
  this.notepadscrollheight = scrollheight;
  this.casttoscreens = casttoscreens;
  this.backgroundbw = backgroundbw;
};

module.exports.FailsNoteScreen.prototype.getLectDetail = function(terms,users,authinfo)
{
  var lecture=this.lecture;

  var course=terms.getCourse(lecture.termuuid,lecture.courseuuid,authinfo);

  var lectureuser=users.getUser(lecture.instructor);
  if (!lectureuser) {
    lectureuser={};
    if (lecture.name) {
      lectureuser.name=lecture.name;
    }
  }



  var lectdetail= {
    title: lecture.title,
    coursetitle: course.title,
    website: course.website,
    instructor: lectureuser.name,
    date: lecture.date
  };
  
  if (course.instructors.indexOf(lecture.instructor)==-1) {
    lectdetail.lectureinstructor=lectdetail.instructor;
    lectdetail.instructor="";
    var first=true;
    var i=0;
    var arr=course.instructors;
    var arr2=course.instructorsnames;
    var length=arr.length;
    for (i=0;i<length;i++) {
      var courseuser=users.getUser(arr[i]);
      if (!first)lectdetail.instructor+=", ";
      else first=false;
      if (courseuser) {
        lectdetail.instructor+=courseuser.name;
      } else {
        if (arr2[i]) {
          lectdetail.instructor+=arr2[i];
        } else {
          console.log("course get user failed",arr[i],arr2[i],courseuser);
        }
      }
    }
  }
  return lectdetail;

};
module.exports.FailsNoteScreen.prototype.generatePDFtask=function(terms,users,authinfo)
{

  if (this.lecture.type!="FailsNative") return null;
  var msg = {task:'GeneratePDF',files: this.persistent.files, dir: this.lecture.directory,
  lectdetail: this.getLectDetail(terms,users,authinfo),pictures: this.persistent.pictures};
  this.lecture.pdfgenerated=true;

  var lectures=terms.getCourseLectures(this.lecture.termuuid,
    this.lecture.courseuuid,authinfo);
  if (lectures) lectures.saveDB();

  return msg;
};

module.exports.FailsNoteScreen.prototype.downloadPDFname=function(color,terms,users)
{
  var filename = null;
  if (this.lecture.type=="FailsNative") {
    if (this.lecture.pdfgenerated) {
      if (color) filename="/lect_col.pdf";
      else filename="/lect_bw.pdf";
    }
  }else if (this.lecture.type=="FailsPDF") {
    filename="/upload.pdf";
  }
  if (!filename) return null;
  return this.lecture.directory+filename;
};




module.exports.FailsNoteScreen.prototype.sendBoardsToSocket=function(socket,signer) {
  //we have to send first information about pictures
  var pictures=this.persistent.pictures;
  for (var picture in pictures) {
    var pictinfo=this.getPictureInfo(picture,'drawing',signer); // now generate URL
    if (pictinfo) {
      socket.emit('pictureinfo',pictinfo);
    }
  }

  var file=this.persistent.files;
  var length=file.length;
  var countdown=length;

  for (var i=0;i<length;i++) {
     console.log("sendBoardsToSocket",i,file[i]);
     (function(number,lecture) {
       fs.readFile(lecture.directory+"/"+number+".board",function (err,data){
         if (err) throw err;
         countdown--;
         console.log("send reloadboard");
         var send={ number: number, data: data,
           last: countdown==0};
           socket.emit('reloadBoard',send);
           });
        }) (file[i],this.lecture);
  }
  var dispatcher=this.dispatcher;

  socket.emit('drawcommand',{ task:"scrollBoard",
      time: dispatcher.getTime(),
      x: dispatcher.scrollx,
      y: dispatcher.scrolly,
      timeSet: true});

};



module.exports.FailsNoteScreen.prototype.receiveData = function (data)
{
  this.networksource.receiveData(data);
}

module.exports.FailsNoteScreen.prototype.writeData = function(number,data,append)
{
  if (append){
    // First look, if we have already an open stream
    var stream = this.getStream(number);
    stream.write( new Buffer( new Uint8Array(data) ));

  } else {
    console.log("Warning! Attempt to write data in non append mode!");
  }
};

module.exports.FailsNoteScreen.prototype.getStream=function(number)
{
  if (isNaN(number) && number != "command") {
    return null; // some one tries to hack us! No file system access!
  }
  var streams = this.filestreams;
  var length = streams.length;
  for (var i=0; i<length;i++) {
    var cur=streams[i];
    if (number==cur.number) {
      //got it move it to top
      if (i!=0) {
        streams.splice(i,1);
        streams.unshift(cur); // now it is on top;
      }
      return cur.stream;
    }
  }
  //ok the file is not open, so first close the last one
  if (length>4) {
    var laststream=streams.pop();
    laststream.stream.end();
  }
  if (!(this.persistent.files.indexOf(number)> -1) && !isNaN(number)) {
    this.persistent.files.push(number);
    this.saveDB();
  }

  var newstream= fs.createWriteStream(this.lecture.directory+"/"+number+".board",
      {flags:'a',mode: 0644/*, encoding: 'binary'*/});
  streams.unshift({stream: newstream, number: number});
  return newstream;
};

module.exports.FailsNoteScreen.prototype.closeAllStreams=function()
{
  var streams = this.filestreams;
  var length = streams.length;
  for (var i=0; i<length;i++) {
    var cur=streams[i];
    cur.stream.end();
  }
  this.filestreams= [];

};



module.exports.FailsNoteScreen.prototype.getRoomName=function()
{
  return  this.lecture.uuid;
   /*this.lecture.termuuid + "/"
    +this.lecture.courseuuid + "/"
    +*/
};

module.exports.FailsNoteScreen.prototype.addScreen=function(screenid,screenname)
{
  var screens = this.screens;
  this.lastaccess = new Date();
  if (this.knownscreens.indexOf(screenname)==-1) {
    this.knownscreens.push(screenname);
  }
  if (screens.indexOf(screenid)==-1) {
    screens.push(screenid);
    return true;
  } else return false;

};

module.exports.FailsNoteScreen.prototype.removeScreen=function(screenid)
{
  var screens = this.screens;
  this.lastaccess = new Date();
  var index=screens.indexOf(screenid);
  if (index!=-1) {
    screens.splice(index,1);
    return true;
  } else return false;

};

module.exports.FailsNoteScreen.prototype.connectScreen=function()
{
  this.lastaccess = new Date();
  this.connectedscreens++;
  return true;
};

module.exports.FailsNoteScreen.prototype.disconnectScreen=function()
{
  this.lastaccess = new Date();
  this.connectedscreens--;
  if (this.connectedscreens<0)  {
    this.connectedscreens=0;
    return false;
  }
  return true;
};

module.exports.FailsNoteScreen.prototype.connectNotepad=function()
{
  this.lastaccess = new Date();
  this.connectednotepads++;
  console.log("connected notepads",this.connectednotepads);
/*  if (this.connectednotepads>1) { // no more than one notepad allowed
    this.connectednotepads=1;
    return false;
  }*/
  return true;
};

module.exports.FailsNoteScreen.prototype.disconnectNotepad=function()
{
  this.lastaccess = new Date();
  this.connectednotepads--;
  console.log("disconnected notepads",this.connectednotepads);
  if (this.connectednotepads<0)  {
    this.connectednotepads=0;
    return false;
  }
  return true;
};

module.exports.FailsNoteScreen.prototype.canRemove=function()
{
  if (this.connectednotepads!=0) return false;
  if ((new Date().getTime()-this.lastaccess.getTime())>10000) return true;
  else return false;
};

module.exports.FailsNoteScreen.prototype.doRemove=function()
{
  this.closeAllStreams(); //cleanup
};


module.exports.FailsNoteScreen.prototype.getPicture= function(pictureuuid)
{
  var picture = this.persistent.pictures[pictureuuid];
  return picture;
}

module.exports.FailsNoteScreen.prototype.getPictureInfo= function(pictureuuid,quality,signer)
{
  var pictures= this.persistent.pictures;
  if (!quality) quality="";
  var picture = pictures[pictureuuid];
  if (picture) {
      var extension=".unknown";
      if (picture.mimetype=='image/png') extension='.png';
      else if (picture.mimetype=='image/jpeg') extension='.jpg';
      var retfilename=null;
      switch (quality) {
      case 'thumb':
         retfilename= this.lecture.directory+'/'+picture.uuid+"_thumb"+extension; break;
      case 'drawing':
        retfilename=  this.lecture.directory+'/'+picture.uuid+"_drawing"+extension;break;
      case '':
        retfilename= this.lecture.directory+'/'+picture.uuid+extension;break;
      };

    if (retfilename) {
      var murl="/"+retfilename;
      if (signer) murl= signer.getSignedUrl(murl);
      var pictinfo= { mime: picture.mimetype, uuid: pictureuuid, url:  murl};
      return pictinfo;
    }
  }
  console.log("getPictureInfo: unknown picture %s",pictureuuid);
  return null;
};

module.exports.FailsNoteScreen.prototype.addPicture= function(pictureuuid,picture)
{
  this.persistent.pictures[pictureuuid]=picture;
  this.saveDB();
}

module.exports.FailsNoteScreenManager = function(failsterms)
{
  this.screenlist = [];

  this.notescreens = [];

  this.failsterms=failsterms;
};

module.exports.FailsNoteScreenManager.prototype.constructor = module.exports.FailsNoteScreenManager;

module.exports.FailsNoteScreenManager.prototype.getNoteScreen=function(termuuid,courseuuid,uuid,authinfo)
{
  var notescreens = this.notescreens;
  var length = notescreens.length;

  var mytermuuid=termuuid;

  if (!mytermuuid) mytermuuid=this.failsterms.currenttermuuid;

  for ( var i=0; i< length; i++) {
    var cur=notescreens[i];
    console.log("getNotescreen,",cur.lecture.uuid,uuid , cur.lecture.courseuuid,courseuuid,
    cur.lecture.termuuid,mytermuuid);
    if (cur.lecture.uuid==uuid && cur.lecture.courseuuid==courseuuid
    && cur.lecture.termuuid==mytermuuid) {
      return cur;
    }
  }
  var lecture=this.failsterms.getLecture(mytermuuid,courseuuid,uuid,authinfo);
  if (!lecture) return null;
  var newnotescreen = new module.exports.FailsNoteScreen(lecture);
  notescreens.push(newnotescreen);
  return newnotescreen;

};

module.exports.FailsNoteScreenManager.prototype.iterOverNotescreens=function(itfunc)
{
  var notescreens = this.notescreens;
  var length = notescreens.length;
  for ( var i=0; i< length; i++) {
    var cur=notescreens[i];
    itfunc(cur);
  }
};

module.exports.FailsNoteScreenManager.prototype.getAvailableScreens=function(address,knownscreens)
{
  var availscreens=[];
  var screens= this.screenlist;
  var length= screens.length;
  for (var i=0;i<length; i++) {
    var isofinterest=false;
    var cur=screens[i];


    if (cur.connected && !cur.notescreen) {
      //first check if ip is known
      var saddress=null;
      if (cur.socket) {
        saddress=cur.socket.client.request.headers['x-forwarded-for']
          || cur.socket.client.conn.remoteAddress;
      }
      if (saddress && saddress==address) {
        isofinterest=true;
      }
    //  console.log("knownscreens",knownscreens,cur.name);
      if (knownscreens.indexOf(cur.name)>-1) {
        isofinterest=true;
      }


      if (isofinterest) {
        availscreens.push({name:cur.name,uuid: cur.uuid});
      }
    }
  }

  return availscreens;
};

module.exports.FailsNoteScreenManager.prototype.getNotepadScreens=function(notepad)
{
  var availscreens=[];
  var screens= this.screenlist;
  var length= screens.length;
  for (var i=0;i<length; i++) {
    var cur=screens[i];
    if (cur.notescreen==notepad) {
      var index=notepad.screens.indexOf(cur.uuid);
      availscreens[index]={name:cur.name,uuid: cur.uuid};
    }
  }

  return availscreens;
};


module.exports.FailsNoteScreenManager.prototype.getSendSizes=function(notepad)
{
  var screens=this.screenlist;
  var length=screens.length;
  var screenheights=[];
  var i;
  for (i=0;i<length;i++) {
    var cur=screens[i];
    if (cur.notescreen==notepad) {
      var index=notepad.screens.indexOf(cur.uuid);
      screenheights[index]={screenid: cur.uuid,
        scrollheight: cur.scrollheight};
    }
  }

  var send = {
   notepadisscreen : notepad.notepadisscreen,
   casttoscreens : notepad.casttoscreens,
   notepadscrollheight: notepad.notepadscrollheight,
   screenscrollheights: screenheights,
   backgroundbw: notepad.backgroundbw
 };
 return send;
};

module.exports.FailsNoteScreenManager.prototype.assignScreenToNotescreen=function(screenid,notescreen,signer)
{
  var screens= this.screenlist;
  var length= screens.length;
  for (var i=0;i<length; i++) {
    var cur=screens[i];
    if (cur.uuid==screenid) {
      notescreen.addScreen(screenid,cur.name);
      cur.notescreen = notescreen;
      cur.roomname=cur.notescreen.getRoomName();
      if (cur.socket) {
        console.log("screen added send board data");
        notescreen.sendBoardsToSocket(cur.socket,signer);
        console.log("screen added join room",cur.roomname);
        cur.socket.join(cur.roomname);
      }
      return cur;
    }
  }

  return null;
};

module.exports.FailsNoteScreenManager.prototype.removeScreenFromNotescreen=function(screenid,notescreen)
{
  var screens= this.screenlist;
  var length= screens.length;
  for (var i=0;i<length; i++) {
    var cur=screens[i];
    if (cur.uuid==screenid) {
      notescreen.removeScreen(screenid);
      if (cur.socket && cur.roomname) {
        cur.socket.leave(cur.roomname);
        console.log("screen removed leave room",cur.roomname);
        cur.socket.emit("removeScreen",{});
        delete cur.roomname;
      }
      delete cur.notescreen;
      return true;
    }
  }

  return false;
};

module.exports.FailsNoteScreenManager.prototype.addPictureToNotescreen=function(notescreen,pictureuuid,authinfo,callback)
{

  if ( notescreen && notescreen.lecture) {
    var lecture=notescreen.lecture;
    if (lecture.termuuid && lecture.courseuuid) {
      var lectures=this.failsterms.getCourseLectures(lecture.termuuid,lecture.courseuuid,authinfo);
      if (!lectures) {
          console.log("addPictureToLecture failed, not authorized?",pictureuuid);
          return;
      }
      var pictfiles=lectures.getPicture(pictureuuid,'thumb');
      var picture=lectures.getPictureObj(pictureuuid);
      if (picture && pictfiles.filenames) {
        console.log("pictfiles",pictfiles);
        console.log("addPictureToNotescreen",pictureuuid,lecture.uuid);
        notescreen.addPicture(pictureuuid,picture);
        //now we copy
        var count=0;
        for (var file in pictfiles) {
          count++;
        }
        var filenames= pictfiles.filenames;
        for (var file in filenames) {
          var infile=filenames[file];
          var destfile=lecture.directory+'/'+infile.replace(/^.*[\\\/]/, '');
          console.log("filename",infile,destfile);
          var rd = fs.createReadStream(infile);
          var wr = fs.createWriteStream(destfile);
          wr.on("close",function(ex) {
            count--;
            if (count==0) {
              callback();
              console.log("addPictureToNotescreen done");
            }
          });
          rd.pipe(wr);
        }

        return ;
      }
    }
  }
  console.log("addPictureToLecture failed",pictureuuid);



  return null;
};

module.exports.FailsNoteScreenManager.prototype.cleanupNoteScreen=function()
{
  var notescreens = this.notescreens;
  var length = notescreens.length;

  for ( var i=0; i< length; i++) {
    var cur=notescreens[i];
    if (cur.canRemove()) {
      cur.doRemove();
      this.unassignRelatedScreens(cur);
      notescreens.splice(i,1);
      length--;
      i--;
    }
  }
};

module.exports.FailsNoteScreenManager.prototype.createNewScreen=function()
{
  var newscreen= {
    lastaccess : new Date(),
    uuid : uuid(),
    name : chance.string({length: 5,
      pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'}),
    connected: false,
    notescreen: null
  };
  this.screenlist.push(newscreen);
  return newscreen;
};

module.exports.FailsNoteScreenManager.prototype.connectScreen=function(screenid,name,socket)
{
  var screens= this.screenlist;
  var length= screens.length;
  for (var i=0;i<length; i++) {
    var cur=screens[i];
    if (cur.uuid==screenid) {
      cur.connected=true;
      cur.lastaccess=new Date();
      cur.socket=socket;
      var notescreen = cur.notescreen;
      if (notescreen) {
        notescreen.connectScreen();
      }
      return  cur;
    }
  }
  var newscreen= {
    lastaccess : new Date(),
    uuid : screenid,
    name : name,
    connected: true,
    notescreen: null,
    socket: socket
  };

  this.screenlist.push(newscreen);
  return newscreen;
};

module.exports.FailsNoteScreenManager.prototype.disconnectScreen=function(screenid)
{
  var screens= this.screenlist;
  console.log("disconnect screen",screenid);
  var length= screens.length;
  for (var i=0;i<length; i++) {
    var cur=screens[i];
    if (cur.uuid==screenid) {
      console.log("disconnect screen found");
      cur.connected=false;
      cur.lastaccess=new Date();
      cur.socket=null;
      var notescreen = cur.notescreen;
      if (notescreen) {
        notescreen.disconnectScreen();
      }
      return  true;
    }
  }
  return false;
};

module.exports.FailsNoteScreenManager.prototype.unassignRelatedScreens=function(notescreen)
{
  var screensrem=notescreen.screens;
  var screens= this.screenlist;
  var length= screens.length;
  for (var i=0;i<length; i++) {
    var cur=screens[i];
    if (screensrem.indexOf(cur.uuid)!=-1) {
      if (cur.roomname) {
        cur.socket.leave(cur.roomname);
        console.log("unassign relatedscreen leave room",cur.roomname);
        delete cur.roomname;
      }
      delete cur.notescreen;
    }
  }

};

module.exports.FailsNoteScreenManager.prototype.cleanupScreens=function()
{
  var screens= this.screenlist;
  var length= screens.length;
  var ret=false;

  for (var i=0;i<length; i++) {
    var cur=screens[i];
    if (!cur) {
      screens.splice(i,1);
      length--;
      i--;
      continue;
    }
    if (cur.connected) continue;
    if ((new Date().getTime()-cur.lastaccess.getTime())>(1000*60*1)) { //purge after 1 Minutes

      var notescreen = cur.notescreen;
      if (notescreen) notescreen.removeScreen(cur.uuid);

      ret=true;
      screens.splice(i,1);
      length--;
      i--;
    }
  }
  return ret;
};
