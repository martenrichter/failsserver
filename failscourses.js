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

var fs=require('fs');
var uuid = require('uuid-v4');
var ncp = require('ncp').ncp;
var config= require('./config')();
var moment = require('moment');

if (config.locale) {
  console.log("setting locale in moment failscourses",config.locale);
  moment.locale(config.locale);
}

ncp.limit = 16;

var syncallback = null;
var informchanges = null;

module.exports.init=function(sc,ic)
{
  syncallback=sc;
  informchanges=ic;
};

module.exports.FailsPicture = function(uuidin, mimetype, title)
{
  this.title=title;
  this.mimetype=mimetype;

  if (uuidin) this.uuid=uuidin;
  else this.uuid = uuid();

}

module.exports.FailsPicture.prototype.constructor = module.exports.FailsPicture;


module.exports.FailsLecture = function(title,date, instructor,name,termuuid,courseuuid,uuidin,directory,pdfgenerated,failsdata,type)
{
  this.title=title;
  this.instructor = instructor;
  if (name) this.name=name;
  this.date = new Date (date);
  if (type) this.type=type;
  else this.type = "FailsNative"; // other type would be pdf

  if (uuidin) this.uuid=uuidin;
  else this.uuid = uuid();
  this.termuuid = termuuid;
  this.courseuuid = courseuuid;
  this.directory = directory;
  this.pdfgenerated = pdfgenerated;
  this.failsdata = failsdata; // was failsdata saved
}



module.exports.FailsLecture.prototype.constructor = module.exports.FailsLecture;

module.exports.FailsLecture.prototype.isSameDay = function (date)
{
  if (!this.date) return false;
  var date1 = this.date;
  var date2 = date;
  if (date1.toDateString() == date2.toDateString()) {
    return true;
  }
  return false;
}



module.exports.FailsLectures = function (directory, filename,  filenamepictures, uuidin) {
    this.uuid = uuidin; //unique id of course
    this.directory = directory;
    this.filename = filename;
    this.filenamepictures = filenamepictures;
    this.lectures = [];
    this.pictures = [];
    if (!fs.existsSync(this.filename)) {
      console.log("lecture db file %s does not exist! Using empty courses!",filename);
      this.lectures = [];
    } else {
      this.lectures = JSON.parse(fs.readFileSync(this.filename,'utf8'),
      function(name,value){
        /// TODO
        if (value.uuid && uuid.isUUID(value.uuid) &&
           (value.type=="FailsNative" || value.type=="FailsPDF" ) ) {
          // seem to be an FailsLecturesObject or FailsPDF object
          if (!value.directory) {
            value.directory=directory+'/'+value.uuid;
          }
          return new module.exports.FailsLecture(value.title,
            value.date,value.instructor,value.name,value.termuuid,
            value.courseuuid,value.uuid,value.directory,
            value.pdfgenerated,value.failsdata,value.type);
        }
        return value;
      });
    }
    if (!fs.existsSync(this.filenamepictures)) {
      console.log("lecture pictures db file %s does not exist! Using picture db!",filename);
      this.pictures = [];
    } else {
      this.pictures = JSON.parse(fs.readFileSync(this.filenamepictures,'utf8'),
      function(name,value){
        if (value.uuid && uuid.isUUID(value.uuid) &&
           (value.mimetype=="image/png" || value.mimetype=="image/jpeg" ) ) {
          // seem to be an png or jpeg picture

          return new module.exports.FailsPicture(value.uuid,
            value.mimetype,value.title);
        }

        return value;
      });
    }
};

module.exports.FailsLectures.prototype.constructor =  module.exports.FailsLectures;


module.exports.FailsLectures.prototype.saveDB=function(){
  informchanges(this.lectures);
  var writeout=JSON.stringify(this.lectures,null,2);
  var options= {encoding: 'utf8',flag:'w',mode: 0644};

  fs.writeFile(this.filename,writeout,options,function(err){
  if (err) throw err;
   console.log("Saving lectures db succeeded!");
  });

  var writeoutpict=JSON.stringify(this.pictures,null,2);
  var options= {encoding: 'utf8',flag:'w',mode: 0644};

  fs.writeFile(this.filenamepictures,writeoutpict,options,function(err){
  if (err) throw err;
   console.log("Saving lectures picture db succeeded!");
  });

  var writeouthtml = '<!DOCTYPE html> <html lang="de"><head>'
                    +'<meta charset="utf-8"/><body><table border="1" >';
  writeouthtml += '<tr align=center> <th> Vorlesung </th>  '
                  +'<th> Datum </th>'
                  +'<th> Mitschrift </th></tr>';
  var arr=this.lectures;
  var length=arr.length;
  for (var i=0;i<length;i++) {
     writeouthtml+='<tr align=center><td> '+arr[i].title +'</td>';
     writeouthtml+='<td> '+moment(arr[i].date).format("L")+'</td><td>';
     if (arr[i].type == "FailsNative") {
       if (arr[i].pdfgenerated) {
            writeouthtml+='<a href="./'
                            +arr[i].uuid+'/lect_col.pdf"> farbig </a>, ';
            writeouthtml+='<a href="./'
                            +arr[i].uuid+'/lect_bw.pdf"> schwarzweiss </a>';
        }
      } else if (arr[i].type == "FailsPDF") {
          writeouthtml+='<a href="./'
                        +arr[i].uuid+'/upload.pdf"> link </a>';
      }
    writeouthtml+='</td></tr>';
  }
  writeouthtml+='</table> </body> </html>';

  var dir=this.directory;
  fs.writeFile(this.directory+'/index.html',writeouthtml,options,function(err){
    if (err) throw err;
    console.log("Saving lectures index.html succeeded!");
    syncallback(dir,['index.html']);
  });
};

module.exports.FailsLectures.prototype.addupdateLecture = function(lecture)
{
  console.log("add/update lecture:  title: %s date %s uuid: %s uuidcs: %s uuidtm: %s  to db",
                lecture.title, lecture.date, lecture.uuid, lecture.courseuuid,lecture.termuuid);
  var lectures= this.lectures;
  var lectureslength = lectures.length;
  for (var i=0; i<lectureslength; i++) {
    if (lectures[i].uuid==lecture.uuid) {
      console.log("overwriting existing lecture data, only update of some fields allowed");
      lectures[i].title=lecture.title;
      this.saveDB();
      return lectures[i];
    }
  }
  console.log("add new lecture");
  var newlecture=new module.exports.FailsLecture(lecture.title,new Date(),lecture.instructor, lecture.name,
    lecture.termuuid,lecture.courseuuid,false,false);
  newlecture.directory=this.directory+"/"+newlecture.uuid;
  fs.mkdir(newlecture.directory);
  lectures.push(newlecture);
  this.saveDB();
  return newlecture;
};

module.exports.FailsLectures.prototype.removeLecture= function(lecture)
{
  console.log("remove lecture: ",lecture);


  var lectures= this.lectures;
  var lectureslength = lectures.length;
  for (var i=0; i<lectureslength; i++) {
    if (lectures[i].uuid==lecture.uuid) {
      // we need also to delete the lectures
      lectures.splice(i,1);
      console.log("remove lectures successful");
      this.saveDB();
      return true;
    }
  }
  console.log("unknown lecture %s %s",lecture.title,lecture.uuid);
  this.saveDB();
  return true;
};

module.exports.FailsLectures.prototype.getLecturesList=function()
{
  return this.lectures;
};

module.exports.FailsLectures.prototype.getPictureList=function()
{
  return this.pictures;
};

module.exports.FailsLectures.prototype.getLecture= function(lectureuuid)
{
  var lectures= this.lectures;
  var lectureslength = lectures.length;
  for (var i=0; i<lectureslength; i++) {
    if (lectures[i].uuid == lectureuuid) {
      return lectures[i];
    }
  }
  console.log("getLecture: unknown lecture %s",lectureuuid);
  return null;
};

module.exports.FailsLectures.prototype.getPicture= function(pictureuuid,quality)
{
  var pictures= this.pictures;
  var pictureslength = pictures.length;
  if (!quality) quality="";
  for (var i=0; i<pictureslength; i++) {
    if (pictures[i].uuid == pictureuuid) {
      var picture=pictures[i];
      var extension=".unknown";
      if (picture.mimetype=='image/png') extension='.png';
      else if (picture.mimetype=='image/jpeg') extension='.jpg';
      var retfilenames=[];
      switch (quality) {
      case 'thumb':
         retfilenames.push(this.directory+'/'+picture.uuid+"_thumb"+extension);
      case 'drawing':
        retfilenames.push(this.directory+'/'+picture.uuid+"_drawing"+extension);
      case '':
        retfilenames.push(this.directory+'/'+picture.uuid+extension);
      };

      return {filenames: retfilenames, mimetype: picture.mimetype};
    }
  }
  console.log("getPicture: unknown picture %s",pictureuuid);
  return {};
};

module.exports.FailsLectures.prototype.getPictureObj= function(pictureuuid,quality)
{
  var pictures= this.pictures;
  var pictureslength = pictures.length;
  if (!quality) quality="";
  for (var i=0; i<pictureslength; i++) {
    if (pictures[i].uuid == pictureuuid) {
      return pictures[i];
    }
  }
  console.log("getPicture: unknown picture %s",pictureuuid);
  return null;
};

module.exports.FailsLectures.prototype.UploadPDFLecture = function (lectureuuid,buffer)
{
  var lecture=this.getLecture(lectureuuid);
  if (!lecture) {
    console.log("UploadPDFLecture lecture invalid");

    return false;
 }
  if (lecture.pdfgenerated || lecture.failsdata) {
    console.log("Attempt to upload file to FailsNative lecture! Abort!");
    return false;
  }

  lecture.type = "FailsPDF";
  console.log("Upload in progress to "+lecture.directory + "/upload.pdf");


  var writestream= fs.createWriteStream(lecture.directory + "/upload.pdf");


  //readstream.on('end', function (){
 // console.log("synchronisation complete with "+error);
  // console.log("mark0");

  // console.log("mark1");
   //fs.unlink(file);
  // console.log("mark2");
  //});


  // console.log("mark3");

  writestream.write(buffer);

  writestream.end();
   //console.log("mark4");
  syncallback(lecture.directory,['upload.pdf']);

  this.saveDB();
  return true;
}

module.exports.FailsLectures.prototype.AddPicture = function(buffer, title, mimetype, thumbcallback)
{
  var picture=new module.exports.FailsPicture(null,mimetype,title);

  var extension="unknown";
  if (mimetype=='image/png'){
    extension='png';
  } else if (mimetype=='image/jpeg') {
    extension='jpg';
  } else {
    return false;
  }


  var writestream= fs.createWriteStream(this.directory
    + "/"+picture.uuid+"."+extension);

  var mydir=this.directory;

  writestream.write(buffer);

  writestream.end();
   //console.log("mark4");
  writestream.on('finish',function() {
     var taskdesc={task:'GenerateThumbnails',file: mydir
       + "/"+picture.uuid,extension: "."+extension, dir: mydir,
       mimetype: mimetype};
  //     console.log("end of stream thumbcallback td",taskdesc);
     thumbcallback(taskdesc);
   });

   this.pictures.push(picture);

  this.saveDB();
  return true;
}



module.exports.FailsLectures.prototype.getDefLecture= function(date)
{
  var lectures= this.lectures;
  var lectureslength = lectures.length;
  for (var i=0; i<lectureslength; i++) {
      if(lectures[i].isSameDay(date)) {
        return lectures[i].uuid;
      }
  }

  return undefined;
};

module.exports.FailsCourse = function(title, instructors,instructorsnames,
                          website,termuuid,group,nuuid)
{
  this.title=title;
  this.instructors = instructors;
  if (instructorsnames) this.instructorsnames=instructorsnames;
  else {
    var i=0;
    this.instructorsnames=[];
    for (i=0;i<instructors.length;i++) {
      this.instructorsnames.push("N. N. ");
    }
  }
  this.website = website;
  if (nuuid) this.uuid=nuuid;
  else this.uuid = uuid();
  if (group) this.group=group;
  else this.group="global";
  this.termuuid = termuuid;
}

module.exports.FailsCourse.prototype.constructor = module.exports.FailsCourse;

module.exports.FailsCourse.prototype.isInstructor = function(username)
{
  var inst=this.instructors;
  var instlength=inst.length;
  for (var i=0;i<inst.length;i++)
  {
    if (inst[i]==username) return true;
  }
  return false;

}

module.exports.FailsCourses = function (directory, filename, uuidin) {
    this.uuid = uuidin; //unique id of term
    this.directory = directory;
    this.filename = filename
    if (!fs.existsSync(filename)) {
      console.log("courses db file %s does not exist! Using empty courses!",filename);
      this.courses = [];
      this.courseslectures = [];
    } else {
      this.courses = JSON.parse(fs.readFileSync(this.filename,'utf8'),
      function(name,value){
        if (value.uuid && uuid.isUUID(value.uuid)) {
          // seem to be an FailsCoursesObject
          var newobj= new module.exports.FailsCourse(value.title,value.instructors,
            value.instructorsnames,
            value.website,value.termuuid,value.group,value.uuid);
          return newobj;

        }
        return value;
      });
      this.courseslectures = [];
    }
};

module.exports.FailsCourses.prototype.constructor =  module.exports.FailsCourses;


module.exports.FailsCourses.prototype.saveDB=function(){

  var writeout=JSON.stringify(this.courses,null,2);
  informchanges(this.courses);
  var options= {encoding: 'utf8',flag:'w',mode: 0644};

  fs.writeFile(this.filename,writeout,options,function(err){
  if (err) throw err;
   console.log("Saving courses db succeeded!");
  });

  var writeouthtml = '<!DOCTYPE html> <html lang="de"><head>'
                    +'<meta charset="utf-8"/><body><table border="1" >';
  writeouthtml += '<tr align=center> <th> Kurs </th>  '
                  +'<th> Mitschriften </th></tr>';
  var arr=this.courses;
  var length=arr.length;
  for (var i=0;i<length;i++) {
     writeouthtml+='<tr align=center><td> <a href="'+arr[i].website
                      +'">'+arr[i].title +'</a></td>'
                      +'<td><a href="'
                      +arr[i].uuid+'/index.html"> link </a></td></tr>';
  }
  writeouthtml+='</table> </body> </html>';

  var dir=this.directory;
  fs.writeFile(this.directory+'/index.html',writeouthtml,options,function(err){
    if (err) throw err;
    console.log("Saving courses index.html succeeded!");
    syncallback(dir,['index.html']);
  });
};


module.exports.FailsCourses.prototype.getCourseLectures= function(courseuuid, authinfo)
{
  //first check if in courses
  var courses= this.courses;
  var courseslength= courses.length;
  var i=0;
  var found=false;
  for (i=0;i<courseslength;i++)
  {
    if (courses[i].uuid==courseuuid) {
      if (!authinfo.globalauth
        && authinfo.authgroups.indexOf(courses[i].group)<=-1)
        return null;
       found=true; break;
    }
  }
  if (!found) return undefined; // does not exist

  var lectures=this.courseslectures;
  var lectureslength=lectures.length;
  for (i=0;i<lectureslength;i++) {
    if (lectures[i].uuid==courseuuid) {
      return lectures[i]; // gotcha
    }
  }
  // we did not find it, so read it from disk
  var directory=this.directory+"/"+courseuuid;
  var newlectures = new module.exports.FailsLectures(directory, directory+"/lectures.json", directory+"/pictures.json",courseuuid);
  lectures.push(newlectures);
  return newlectures;
}

module.exports.FailsCourses.prototype.addupdateCourse = function(course, authinfo)
{
  console.log("add/update course: %s  uuid: %s termuuid: %s website: %s groups %s to db ",
                course.title, course.uuid, course.termuuid,course.website,course.group);
  if (!course.uuid) course.uuid=uuid();
  console.log("authinfo addupdatecourse",authinfo);
  if (!authinfo.globalauth
      && authinfo.authgroups.indexOf(course.group)<=-1) return null;

  var courses= this.courses;
  var courseslength = courses.length;
  for (var i=0; i<courseslength; i++) {
    if ((authinfo.globalauth
      || authinfo.authgroups.indexOf(courses[i].group)>-1)
      || courses[i].uuid==course.uuid) {
      console.log("overwriting existing coursedata, only update of some fields allowed");
      courses[i].title=course.title;
      courses[i].instructors=course.instructors;
      courses[i].instructorsnames=course.instructorsnames;
      courses[i].website=course.website;
      courses[i].group=course.group;
      if (!courses[i].termuuid) courses[i].termuuid=this.uuid;
      this.saveDB();
      return courses[i];
    }
  }
  console.log("add new course");
  var newcourse=new module.exports.FailsCourse(course.title,course.instructors,
    course.instructorsnames,course.website,course.termuuid);

  if (!newcourse.termuuid) newcourse.termuuid=this.uuid;
  newcourse.directory=this.directory+"/"+newcourse.uuid;
  fs.mkdir(newcourse.directory);
  courses.push(newcourse);
  this.saveDB();
  return newcourse;
};

module.exports.FailsCourses.prototype.removeCourse= function(course, authinfo)
{
  console.log("remove course: %s ",course);
  var mylectures=this.getCourseLectures(course.uuid, authinfo);
  if (mylectures && mylectures.lectures.length>0) {
    console.log("remove course: %d failed, since it is not empty");
    return false;
  } else if (mylectures) {
    var index= this.courseslectures.indexOf(mylectures);
    this.courseslectures.splice(index,1);
  }

  var courses= this.courses;
  var courseslength = courses.length;
  for (var i=0; i<courseslength; i++) {
    if (courses[i].uuid==course.uuid) {
      // we need also to delete the courses
      if (!authinfo.globalauth
        && authinfo.authgroups.indexOf(courses[i].group)<=-1) return false;

      courses.splice(i,1);
      console.log("remove course successful");
      this.saveDB();
      return true;
    }
  }
  console.log("unknown course %s %s",course.title,course.uuid);
  this.saveDB();
  return true;
};

module.exports.FailsCourses.prototype.getCoursesList=function(authinfo, secauthinfo)
{
  if (authinfo.globalauth) return this.courses;

  var result=[];
  var courses= this.courses;
  var courseslength = courses.length;
  for (var i=0; i<courseslength; i++) {
    if (authinfo.authgroups.indexOf(courses[i].group)>-1) {
       if (!secauthinfo) result.push(courses[i]);
       else {
         console.log("secauthinfo",secauthinfo);
         if (secauthinfo.authgroups.indexOf(courses[i].group)>-1) result.push(courses[i]);
       }
    }
   }
   return result;
};

module.exports.FailsCourses.prototype.getCourse= function(courseuuid,authinfo)
{
  var courses= this.courses;
  var courseslength = courses.length;
  for (var i=0; i<courseslength; i++) {
    if (courses[i].uuid==courseuuid) {
      if (authinfo.globalauth
        ||authinfo.authgroups.indexOf(courses[i].group)>-1)
        return courses[i];
      else {
        console.log("getCourse:%s not in group %s",courseuuid, courses[i].group);
        return null;
      }
    }
  }
  console.log("getCourse: unknown course %s",courseuuid);
  return null;
};

module.exports.FailsCourses.prototype.getDefCourse= function(username,authinfo)
{
  var courses= this.courses;
  var courseslength = courses.length;
  for (var i=0; i<courseslength; i++) {
      if (authinfo.globalauth
        ||authinfo.authgroups.indexOf(courses[i].group)>-1) {
          if(courses[i].isInstructor(username)) {
            return courses[i].uuid;
          }
      }

  }

  return undefined;
};

module.exports.FailsTerm = function (termname,nuuid) {
    this.termname = termname;
    if (nuuid) this.uuid=nuuid;
    else this.uuid = uuid(); //unique id

};



module.exports.FailsTerm.prototype.constructor =  module.exports.FailsTerm;

module.exports.FailsTerms = function(directory,filename)
{
  this.filename = filename;
  this.directory = directory;
  if (!fs.existsSync(filename)) {
    console.log("term db file %s does not exist! Using empty terms!",filename);
    this.terms = [];
    this.termscourses = [];
    this.currenttermuuid = null;
  } else {
    var temp = JSON.parse(fs.readFileSync(this.filename,'utf8'),
    function(name,value){
      if (value.uuid && uuid.isUUID(value.uuid)) {
        // seem to be an FailsTermObject
        return new module.exports.FailsTerm(value.termname,value.uuid);
      }
      return value;
    });
    this.terms = temp.terms;
    this.currenttermuuid = temp.currenttermuuid;
    this.termscourses = [];
  }
};

module.exports.FailsTerms.prototype.constructor = module.exports.FailsTerms;

module.exports.FailsTerms.prototype.saveDB=function(){
  informchanges({terms: this.terms, currenttermuuid : this.currenttermuuid});
  var writeout=JSON.stringify({terms: this.terms, currenttermuuid : this.currenttermuuid},null,2);
  var options= {encoding: 'utf8',flag:'w',mode: 0644};

  fs.writeFile(this.filename,writeout,options,function(err){
    if (err) throw err;
    console.log("Saving term db succeeded!");
  });


  var writeouthtml = '<!DOCTYPE html> <html lang="de"><head>'
                    +'<meta charset="utf-8"/><body><table border="1" >';
  writeouthtml += '<tr align=center> <th> Semester</th> </tr>';
  var arr=this.terms;
  var length=arr.length;
  for (var i=0;i<length;i++) {
     writeouthtml+='<tr align=center><td><a href="'+arr[i].uuid+'/index.html">'
            + arr[i].termname + '</a></td></tr>';
  }
  writeouthtml+='</table> </body> </html>';

  var dir=this.directory;
  fs.writeFile(this.directory+'/index.html',writeouthtml,options,function(err){
    if (err) throw err;
    console.log("Saving term index.html succeeded!");
    syncallback(dir,['index.html']);
  });


};

module.exports.FailsTerms.prototype.getTermCourses= function(termuuid)
{
  //first check if in terms
  var terms= this.terms;
  var termslength= terms.length;
  var i=0;
  var found=false;
  for (i=0;i<termslength;i++)
  {
    if (terms[i].uuid==termuuid) {
      found=true; break;
    }
  }
  if (!found) return null; // does not exist

  var courses=this.termscourses;
  var courseslength=courses.length;
  for (i=0;i<courseslength;i++) {
    if (courses[i].uuid==termuuid) {
        return courses[i]; // gotcha
    }
  }
  // we did not find it, so read it from disk
  var directory=this.directory+"/"+termuuid;
  var newcourses = new module.exports.FailsCourses(directory, directory+"/courses.json",termuuid);
  courses.push(newcourses);
  return newcourses; // gotcha
}

module.exports.FailsTerms.prototype.changeCurrentTerm = function(termuuid)
{
  var terms= this.terms;
  var termslength= terms.length;
  var i=0;
  var found=false;
  for (i=0;i<termslength;i++)
  {
    if (terms[i].uuid==termuuid) {
      console.log("set current term to ",terms[i]);
      found=true; break;
    }
  }
  if (found) {
    this.currenttermuuid=termuuid;
    this.saveDB();
  } else {
    console.log("setting current term failed!");
  }

}

module.exports.FailsTerms.prototype.addupdateTerm = function(term)
{
  console.log("add/update term: %s name: %s uuid: %s to db",
                term.termname, term.uuid);
  var terms= this.terms;
  var termslength = terms.length;
  for (var i=0; i<termslength; i++) {
    if (terms[i].uuid==term.uuid) {
      console.log("overwriting existing termdata, only update of name allowed");
      terms[i].termname=term.termname;
      this.saveDB();
      return true;
    }
  }
  console.log("add new term");
  var newterm = new module.exports.FailsTerm(term.termname);
  newterm.directory=this.directory+"/"+newterm.uuid;
  fs.mkdir(newterm.directory);
  terms.push(newterm);
  this.currenttermuuid=newterm.uuid;
  this.saveDB();
  return true;
};

module.exports.FailsTerms.prototype.removeTerm= function(term)
{
  console.log("remove term:",term);
  var mycourses=this.getTermCourses(term.uuid); //the system has always full access
  if (mycourses && mycourses.courses.length>0) {
    console.log("remove term: %d failed, since it is not empty");
    return false;
  } else if (mycourses) {
    var index= this.termscourses.indexOf(mycourses);
    this.termscourses.splice(index,1);
  }


  var terms= this.terms;
  var termslength = terms.length;
  for (var i=0; i<termslength; i++) {
    if (terms[i].uuid==term.uuid) {
      // we need also to delete the courses
      terms.splice(i,1);
      if (term.uuid == this.currenttermuuid) {
        if (termslength<2) this.currenttermuuid= undefined;
        else this.currenttermuuid= terms[terms.length-1].uuid;
      }
      console.log("remove term successful");
      this.saveDB();
      return true;
    }
  }


  console.log("unknown term %s %s",term.termname,term.uuid);
  this.saveDB();
  return true;
};

module.exports.FailsTerms.prototype.getTermList=function()
{
  return this.terms;
};

module.exports.FailsTerms.prototype.getTerm= function(termuuid)
{
  var terms= this.terms;
  var termslength = terms.length;
  for (var i=0; i<termslength; i++) {
    if (terms[i].uuid==termuuid) {
      return terms[i];
    }
  }
  console.log("getterm: unknown term %s",termuuid);
  return null;
};

module.exports.FailsTerms.prototype.getCourse=function(termuuid,courseuuid,authinfo)
{
  var mytermuuid=termuuid;
  if (!mytermuuid) mytermuuid=this.currenttermuuid;
  var courses=this.getTermCourses(mytermuuid);

  if (!courses) {
    return null;
  } else {
    return courses.getCourse(courseuuid,authinfo);
  }
};

module.exports.FailsTerms.prototype.copymovelectures = function(move,srctermuuid, srccourseuuid,luuid,
                                    desttermuuid, destcourseuuid, authinfo)
{
  var srccourse=this.getCourseLectures(srctermuuid,srccourseuuid,authinfo);
  var destcourse=this.getCourseLectures(desttermuuid,destcourseuuid,authinfo);
  if (!srccourse || !destcourse) {
    console.log("copy/move courses not found",desttermuuid,destcourseuuid);
    return false;
  }
  // ok jetzt brauchen wir die lecture
  var lecture=srccourse.getLecture(luuid);
  var srcdir=lecture.directory;

  if (move) {
    var destdir=destcourse.directory+'/'+luuid;
    var remindex=srccourse.lectures.indexOf(lecture);
    if (remindex>-1) {
      srccourse.lectures.splice(remindex,1);
    } else {
      console.log("cannotremove lecture!")
    }

    lecture.termuuid=desttermuuid;
    lecture.courseuuid=destcourseuuid;
    lecture.directory=destdir;
    fs.rename(srcdir,destdir);
  } else {
    var newuuid=uuid();
    var destdir=destcourse.directory+'/'+newuuid;
    lecture=new module.exports.FailsLecture(lecture.title,
      new Date(),lecture.instructor,desttermuuid,
      destcourseuuid,newuuid,destdir,
      lecture.pdfgenerated,lecture.failsdata,lecture.type);
     ncp(srcdir,destdir,function(err) {
       if (err) console.log("Copying lecturedata failed!",err);
     });
  }
  destcourse.lectures.push(lecture);


  srccourse.saveDB();
  destcourse.saveDB();


  return true;
};

module.exports.FailsTerms.prototype.getCourseLectures=function(termuuid,courseuuid,authinfo)
{
  var mytermuuid=termuuid;
  if (!mytermuuid) mytermuuid=this.currenttermuuid;
  var courses=this.getTermCourses(mytermuuid);

  if (!courses) {
    return null;
  } else {
    return courses.getCourseLectures(courseuuid, authinfo);
  }
};

module.exports.FailsTerms.prototype.getLecture=function(termuuid,courseuuid,uuid,authinfo)
{
  var mytermuuid=termuuid;
  if (!mytermuuid) mytermuuid=this.currenttermuuid;
  var courses=this.getTermCourses(mytermuuid);

  if (!courses) {
    return null;
  } else {
    var lectures=courses.getCourseLectures(courseuuid,authinfo);
    if (!lectures) {
      return null;
    } else {
      var lecture=lectures.getLecture(uuid);
      return lecture;
    }
  }
};
