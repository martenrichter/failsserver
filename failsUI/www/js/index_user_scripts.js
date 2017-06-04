//Fails (Fancy Automated Internet Lecture System)
//Copyright (C) 2015-2017  Marten Richter
//
//This program is free software; you can redistribute it and/or modify
//it under the terms of the GNU General Public License version 2 as
//published by the Free Software Foundation.
//
//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//GNU General Public License for more details.
//
//You should have received a copy of the GNU General Public License
//along with this program; if not, write to the Free Software
//Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

// Portions from the Intel XDK template


(function()
{
 "use strict";
 /*
   hook up event handlers
 */
 function register_event_handlers()
 {
    var serveraddress = "";
    var serverport=":8080";

     // dirty hack to ensure ArrayBuffer is set in global
     var dummyarraybuffer=new ArrayBuffer(10);


     if (typeof intel !== 'undefined') {
        console.log("Test where app is running, device:", intel.xdk.isnative);
        console.log("Test where app is running, test:", intel.xdk.istest);
        console.log("Test where app is running, xdk:", intel.xdk.isxdk);

        if (intel.xdk.isnative || intel.xdk.istest || intel.xdk.isxdk) {
            serveraddress="http://localhost";
        }
     }
     var spath = window.location.pathname;
     var spage = spath.substring(spath.lastIndexOf('/') + 1);

     var isscreen=false;
     if (spage=="screen.html") {
        console.log("Screen detected");
         isscreen= true;
     } else {
         console.log("Notepad detected");
     }

     $("#loginmessage").hide();

     window.addEventListener('contextmenu', function (e) {
        e.preventDefault();
     }, false);

    var servererrorhandler = function( jqXHR, textStatus,  errorThrown )
    {
        console.log("servererror status",textStatus);
        console.log("errorThrown",errorThrown);
        console.log("jqXHR:",jqXHR);
        /* $("#servererrortext")[0].innerHTML = '<div class="widget-container left-receptacle"></div><div class="widget-container right-receptacle"></div>'
             +'<div><p> Status:'+textStatus+'</p></div>'
            +'<div><p> Error:'+errorThrown+'</p></div>'
         +'<div><p> Request:'+jqXHR+'</p></div>';*/
        alert(textStatus+errorThrown+jqXHR);

       // activate_subpage("#servererrorsub");

    };

    jQuery.extend({
    postJSON: function(url, data, callback, errorcallback) {
      return jQuery.ajax({
        type: "POST",
        url: url,
        data: JSON.stringify(data),
        success: callback,
        error: errorcallback,
        dataType: "json",
        contentType: "application/json",
        processData: false
      });
    }
    });

     if (!isscreen) {
        jQuery.extend({
        getJSONAuth: function(url,data,success) {
            return jQuery.ajax({
                dataType: "json",
                url:url,
                data:data,
                success: success,
                error: servererrorhandler,
                headers: {authorization: "Bearer "+sessionStorage.getItem("FailsAuthtoken")}
            });
        },
        getDownloadAuth: function(url,data,filename) {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    //console.log("We got data!",this.response);
                    var blob=new Blob([this.response],{type: 'application/pdf'});
                    var link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.target = '_blank';
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(function() {
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(link.href);
                    },100);
                }
            }
            xhr.open('GET',url+'?'+jQuery.param(data));
            xhr.responseType = 'blob';
            xhr.setRequestHeader('authorization', "Bearer "+sessionStorage.getItem("FailsAuthtoken"));
            xhr.send();
        },
        postJSONAuth: function(url, data, callback) {
          return jQuery.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(data),
            success: callback,
            dataType: "json",
            contentType: "application/json",
            processData: false,
            error: servererrorhandler,
            headers: {authorization: "Bearer "+sessionStorage.getItem("FailsAuthtoken")}
          });
        },
        postUploadAuth: function(url, data,file, callback) {
          var formdata= new FormData();
          formdata.append('file',file);
          formdata.append('data',JSON.stringify(data));
          return jQuery.ajax({
            type: "POST",
            url: url,
            data: formdata,
            success: callback,
            dataType: "json",
            contentType: false,
            processData: false,
            error: servererrorhandler,
            headers: {authorization: "Bearer "+sessionStorage.getItem("FailsAuthtoken")}
          });
        },
        });



         var showLoginError = function (message) {
             $("#loginmessage")[0].innerHTML = '<div class="widget-container left-receptacle"></div><div class="widget-container right-receptacle"></div><div><p>'+'Login failed:'+message+'</p></div>';
             $("#loginmessage").show();
         };

         var activateAdminControls = function(activated,globalperm) {
             if (activated) {
                 $("#adminbutton").show();
                 if (globalperm) {
                   $("#editusers").show();
                   $("#editsemesters").show();
                 } else {
                   $("#editusers").hide();
                   $("#editsemesters").hide();
                 }
             } else {
                 $("#adminbutton").hide();
             }
         };

         var activateMaintenanceControls = function(activated) {
             if (activated) {
                  $("#movebutton").show();
                  $("#deletelecture").show();
             } else {
                  $("#movebutton").hide();
                  $("#deletelecture").hide();
             }
         };
         var admin= false;
         var maintenance =false;
         var globalperm=false;
         var usergroups=[];

         var activateControls = function(level, globalp, groups) {
            console.log("activate controls on level", level,globalp);
            admin=false;
            maintenance=false;
            if (globalp) {
              globalperm=true;
              usergroups=[];
            } else {
              globalperm=false;
              usergroups=groups;
            }
             if (level=="admin") {
                 admin=maintenance=true;
                 if (globalperm) fillUserData(); // added temporarly, and requires admin level!
                 fillInstructorData();
             } else if (level=="maintenance") {
                 maintenance=true;
             }

             fillTermData();


             activateAdminControls(admin, globalperm);
             activateMaintenanceControls(maintenance);
             if (screenfull.enabled) {
                 console.log("screenfull is present");
                 $("#fullscreenbtn").show();
             } else {
                 console.log("screenfull is absent");
                 $("#fullscreenbtn").hide();
             }
         };



         var fillUserDetails = function(username)
         {
             if (username!="newuser") {
                $.getJSONAuth(serveraddress+"/app/admin/user",{username: username},function(data) {
                    if (data.user) {
                        $("#fullusername").val(data.user.name);
                        $("#useremail").val(data.user.email);
                        switch (data.user.permgroup)
                        {
                            case "admin": {
                                $("#userpermissions").val("admin");



                                } break;
                                case "maintenance": {
                                    $("#userpermissions").val("maintenance");


                                } break;
                                case "instructor": {
                                    $("#userpermissions").val("instructor");

                                } break;
                        };
                        $("#userpermissions").trigger("change");

                    } else {
                        console.log("fillUserDetails response empty!");
                    }
                } );
            } else {
                $("#fullusername").val("");
                $("#useremail").val("");
                $("#userpermissions").val("instructor");
                 $("#userpermissions").trigger("change");
            }
         }



         var fillUserData = function(username) {
             $.getJSONAuth(serveraddress+"/app/admin/users",null,function(data) {
                 console.log("fillUserData",data.userlist);

                 if (data.userlist) {
                     var userlist=data.userlist;
                     var length=userlist.length;
                     var i;
                     $("#userlist option").remove();
                      $("#userlist").append('<option value="'+"newuser"+
                        '" class="dropDownBlk">'+"Add user..."+'</option>');
                     for (i=0;i<length;i++) {
                        $("#userlist").append('<option value="'+userlist[i]+
                        '" class="dropDownBlk">'+userlist[i]+'</option>');
                     }
                     if (username) $("#userlist").val(username);
                     $("#userlist").trigger("change");
                     fillUserDetails($("#userlist").val());
                 } else {
                     console.log("fillUserData response empty!");
                 }

             } );

         };

         var fillInstructorData = function() {

             var instdatup=function(data) {

                 if (data.userlist && data.usernameslist) {
                     var userlist=cur_courseinstructors.concat(data.userlist);
                     var usernameslist=cur_courseinstructorsnames.concat(data.usernameslist);

                     var combinedlist=[];
                     var length=userlist.length;
                     var i;
                     for (i=0;i<length;i++) {
                       var user=userlist[i];
                       var name=usernameslist[i]
                       combinedlist.push({user: user,
                          name: name });
                     }

                     combinedlist=combinedlist.filter(function(val,ind,self) {
                       return self.findIndex(function(test) {return test.user==val.user; }) === ind;
                     });

                     var length=combinedlist.length;
                     var i;
                     $("#instructorlist option").remove();
                     for (i=0;i<length;i++) {
                        $("#instructorlist").append('<option value="'
                        +combinedlist[i].user+
                        '" name="'+combinedlist[i].name+
                        '" class="dropDownBlk">'+combinedlist[i].name +' ('
                        +combinedlist[i].user+')</option>');
                     }
                     $("#instructorlist").trigger("change");
                 } else {
                     console.log("fillinstructorData response empty!");
                 }

             };
             var curgroup=$("#grouplist").val();
             if (!curgroup) curgroup="global";
             if (curgroup=="global") {
               if (globalperm) $.getJSONAuth(serveraddress+"/app/admin/users",null,instdatup);
               else instdatup({userlist:[]});
             } else {
               $.getJSONAuth(serveraddress+"/app/gadmin/groupusers",
                        {group:curgroup},instdatup);
             }

         };

         var fillGroupData = function(groupname) {
             var procgrpdata=function(data) {
                 //console.log("fillGroupData",data.grouplist);

                 if (data.grouplist) {
                     var grouplist=data.grouplist;
                     var length=grouplist.length;
                     var i;
                     $("#grouplist option").remove();
                     for (i=0;i<length;i++) {
                        $("#grouplist").append('<option value="'+grouplist[i].group+
                        '" class="dropDownBlk">'+grouplist[i].group+'</option>');
                     }
                     if (groupname) $("#grouplist").val(groupname);
                     $("#grouplist").trigger("change");
                     //fillGroupUsers($("#grouplist").val());
                 } else {
                     console.log("fillGroupData response empty!");
                 }

             } ;
             if (globalperm) {
               $.getJSONAuth(serveraddress+"/app/admin/groups",null,procgrpdata);
             } else {
               var filteredgrp=[];
               var grplength=usergroups.length;
               var i=0;
               for (i=0;i<grplength;i++) {
                 var cur=usergroups[i];
                 if (cur.permgroup=="admin") filteredgrp.push(cur);
               }
               procgrpdata({grouplist: filteredgrp});
             }

         };

         var updateAddUsers = function(user) {
                $.postJSONAuth(serveraddress+"/app/admin/user",{user : user}, function(res){
                    if (res.user) {
                        fillUserData(user.username);
                        fillInstructorData();
                    }
                });
         };

        var deleteUser = function(user) {
                $.postJSONAuth(serveraddress+"/app/admin/users",{user : user, task: "delete"}, function(res){

                    fillUserData();
                    fillInstructorData();

                });
         }


        var fillTermData = function() {
             $.getJSONAuth(serveraddress+"/app/common/terms",null,function(data) {

                 if (data.termlist) {
                     var termlist=data.termlist;
                     var length=termlist.length;
                     var i;
                     $("#termlist option").remove();
                     $("#desttermlist option").remove();
                     $("#lecttermlist option").remove();

                      $("#termlist").append('<option value="'+"newterm"+
                        '" class="dropDownBlk">'+"Add term..."+'</option>');
                     for (i=0;i<length;i++) {
                        $("#termlist").append('<option value="'+termlist[i].uuid+
                        '" class="dropDownBlk">'+termlist[i].termname+'</option>');
                         $("#desttermlist").append('<option value="'+termlist[i].uuid+
                        '" class="dropDownBlk">'+termlist[i].termname+'</option>');
                        $("#lecttermlist").append('<option value="'+termlist[i].uuid+
                       '" class="dropDownBlk">'+termlist[i].termname+'</option>');
                     }
                     if (data.currenttermuuid) {
                         $("#termlist").val(data.currenttermuuid);
                         $("#desttermlist").val(data.currenttermuuid);
                         $("#lecttermlist").val(data.currenttermuuid);
                         fillCourseData(data.currenttermuuid);
                         fillLectCourseData(data.currenttermuuid);
                     }
                     $("#lecttermlist").trigger("change");
                     $("#termlist").trigger("change");
                     $("#desttermlist").trigger("change");
                     var curterm= $("#termlist").val();
                     if (curterm!="newterm") {
                        $("#termname").val( $("#termlist").find(":selected").text());
                     } else {
                        $("#termname").val("");
                     }

                 } else {
                     console.log("fillTermData response empty!");
                 }

             } );

         };

         var updateAddTerm = function(term) {
                $.postJSONAuth(serveraddress+"/app/admin/term",{term : term}, function(res){
                    if (res.term) {
                        fillTermData();
                    }
                });
         };

         var changeCurrentTerm = function(termuuid)
         {
             $.postJSONAuth(serveraddress+"/app/admin/currentterm",{currenttermuuid : termuuid}, function(res){
                    if (res.currenttermuuid) {
                         fillCourseData(res.currenttermuuid);
                         fillLectCourseData(res.currenttermuuid);
                    }
                });
         };

        var deleteTerm = function(term) {
                $.postJSONAuth(serveraddress+"/app/admin/terms",{term : term, task: "delete"}, function(res){
                    fillTermData();
                });
         };

         var cur_courselist=undefined;
         var cur_courseinstructors=[];
         var cur_courseinstructorsnames=[];

         var updateInstructorField= function()
         {
             var header='<div class="widget-container left-receptacle"></div><div class="widget-container right-receptacle"></div><div><p>';
             var footer='</p></div>';
             var middle= "Instructors:";

             if (cur_courseinstructors.length>0) {
                 var length= cur_courseinstructors.length;
                 for (var i=0;i<length;i++) {
                     middle+=cur_courseinstructorsnames[i]
                              +" ("+cur_courseinstructors[i]+") ";
                 }
             } else {
                 middle+=" None!";
             }
            $("#courseinformation")[0].innerHTML=header+middle+footer;


         };

         var fillCourseData = function(termuuid,courseuuid) {
             $.getJSONAuth(serveraddress+"/app/common/courses",
                           {termuuid: termuuid,username:$("#usernameipt").val(),
                         elevatedpermgroup: "admin"},
                function(data) {

                 if (data.courseslist) {
                     var courselist=data.courseslist;
                     cur_courselist=courselist;
                     var length=courselist.length;
                     var i;
                     $("#courselist option").remove();

                      $("#courselist").append('<option value="'+"newcourse"+
                        '" class="dropDownBlk">'+"Add course..."+'</option>');
                     for (i=0;i<length;i++) {
                        $("#courselist").append('<option value="'+courselist[i].uuid+
                        '" class="dropDownBlk">'+courselist[i].title+'</option>');
                         if (courselist[i].uuid==courseuuid) {
                             var item=courselist[i];
                             $("#coursetitle").val(item.title);
                             $("#coursewebsite").val(item.website);
                             cur_courseinstructors=item.instructors;
                             cur_courseinstructorsnames=item.instructorsnames;
                             updateInstructorField();
                         }
                     }

                     if (courseuuid) {
                         $("#courselist").val(courseuuid);

                     }


                     $("#courselist").trigger("change");


                     //update the details
                 } else {
                     console.log("fillCourseData response empty!");
                 }

             } );

         };

         var fillLectCourseData = function(termuuid) {
            console.log("fillLectCourseData");
             $.getJSONAuth(serveraddress+"/app/common/courses",
                           {termuuid: termuuid,username:$("#usernameipt").val()},
                function(data) {
                    console.log("fillLectCourseData",data.courseslist);

                 if (data.courseslist) {
                     var courselist=data.courseslist;
                     cur_courselist=courselist;
                     var length=courselist.length;
                     var i;
                     $("#lectcourselist option").remove();

                     for (i=0;i<length;i++) {
                         $("#lectcourselist").append('<option value="'+courselist[i].uuid+
                        '" group="'+courselist[i].group+'" class="dropDownBlk">'
                        +courselist[i].title+'</option>');

                     }

                    if (data.defcourseuuid) {
                         $("#lectcourselist").val(data.defcourseuuid);
                     }




                     $("#lectcourselist").trigger("change");
                     fillLectureData(termuuid, $("#lectcourselist").val());

                     //update the details
                 } else {
                     console.log("fillLectCourseData response empty!");
                 }

             } );

         };

         var fillDestCourse = function(termuuid) {
             $.getJSONAuth(serveraddress+"/app/common/courses",
                           {termuuid: termuuid,username:$("#usernameipt").val(),
                            elevatedpermgroup: "maintenance"},
                function(data) {

                 if (data.courseslist) {
                     var courselist=data.courseslist;
                     var length=courselist.length;
                     var i;
                     $("#destcourselist option").remove();

                     for (i=0;i<length;i++) {
                        $("#destcourselist").append('<option value="'+courselist[i].uuid+
                        '" class="dropDownBlk">'+courselist[i].title+'</option>');

                     }

                     $("#destcourselist").trigger("change");


                     //update the details
                 } else {
                     console.log("fillDestCourse response empty!");
                 }

             } );

         };

         var updateAddCourse = function(course) {
                $.postJSONAuth(serveraddress+"/app/gadmin/course",{course : course}, function(res){
                    if (res.course) {
                        fillCourseData(res.course.termuuid,res.course.uuid);
                        fillLectCourseData(res.course.termuuid);
                    }
                });
         };

        var deleteCourse = function(course) {
                $.postJSONAuth(serveraddress+"/app/gadmin/courses",{course: course, task: "delete"}, function(res){
                    fillCourseData(course.termuuid);
                    fillLectCourseData(course.termuuid);

                });
         };

        var fillLectureData = function(termuuid,courseuuid,lectureuuid) {

             $.getJSONAuth(serveraddress+"/app/common/lectures",
                           {termuuid: termuuid,courseuuid: courseuuid},
                function(data) {

                 if (data.lectureslist) {
                     var lectureslist=data.lectureslist;
                     var length=lectureslist.length;
                     var i;
                     $("#lectureslist option").remove();

                      $("#lectureslist").append('<option value="'+"newlecture"+
                        '" class="dropDownBlk">'+"Add lecture..."+'</option>');
                     for (i=0;i<length;i++) {
                         var cur=lectureslist[i];
                         var tempdate="No date!";
                         var typestr="";
                         var canupload=true;
                         if (!cur.failsdata && !cur.pdfgenerated) typestr=", Empty";
                         else canupload=false;
                         if (cur.pdfgenerated) typestr=", Auto PDF";
                         else if (cur.type=="FailsPDF") typestr=", Upload PDF";

                         if (cur.date) tempdate=new Date(cur.date).toLocaleDateString();

                        $("#lectureslist").append('<option value="'+cur.uuid+
                        '" title="'+cur.title+
                        '" generatedpdf="'+cur.pdfgenerated+
                        '" canuploadpdf="'+canupload+
                        '" failstype="'+cur.type+
                        '" class="dropDownBlk">'+cur.title+
                        " [" +tempdate+typestr+']</option>');

                     }
                     if (data.deflectureuuid) {
                         $("#lectureslist").val(data.deflectureuuid);
                     }
                     if (lectureuuid) {
                         $("#lectureslist").val(lectureuuid);
                     }

                     $("#lectureslist").trigger("change");

                     if ( $("#lectureslist").val() !="newlecture") {
                       var selitem=$("#lectureslist").find(":selected")[0];
                       if (selitem) $("#lecturename").val(selitem.title);
                     } else {
                          $("#lecturename").val("");
                     }

                     //update the details
                 } else {
                     console.log("fillCourseData response empty!");
                 }

             } );

         };

        var updateAddLecture = function(lecture,func) {
                $.postJSONAuth(serveraddress+"/app/common/lecture",{lecture : lecture}, function(res){
                    if (res.lecture) {
                        fillLectureData(res.lecture.termuuid,res.lecture.courseuuid,res.lecture.uuid);
                        if (func) func();
                    }
                });
         };

         var generatePDF = function(data) {
                $.postJSONAuth(serveraddress+"/app/common/lecturePDF",{lecture: data}, function(res){
                    /*if (res.lecture) {

                    }*/
                });
         };

         var uploadPDF =function(data,file)
         {
            $.postUploadAuth(serveraddress+ "/app/common/lecturePDFUpload",data,file,function(res) {
                //goo;
            });
         };

         var downloadPDF = function(data,filename) {
                $.getDownloadAuth(serveraddress+"/app/common/lecturePDF",{lecture: data},filename);
         };

                 /* button  #uploadpdfbutton */





        var deleteLecture = function(lecture) {
                $.postJSONAuth(serveraddress+"/app/maintenance/lectures",{lecture: lecture, task: "delete"}, function(res){
                    fillLectureData(lecture.termuuid,lecture.courseuuid);
                });
         };

         var movecopyLecture = function(coursetomove) {
              $.postJSONAuth(serveraddress+"/app/maintenance/lectures",{lecture: coursetomove, task: coursetomove.task}, function(res){
                    fillLectureData(coursetomove.termuuid,coursetomove.courseuuid);
                });
         };


         var logout= function() {
              sessionStorage.setItem("FailsAuthtoken","");
         };


         /* button  Lecture */
        $(document).on("click", ".uib_w_10", function(evt)
        {
             activate_subpage("#taskslecture");
        });

            /* button  Adminstration */
        $(document).on("click", ".uib_w_11", function(evt)
        {
             activate_subpage("#tasksadmin");
        });



            /* button  Back to tasks */
        $(document).on("click", ".uib_w_80", function(evt)
        {
             activate_subpage("#taskslecture");
        });







            /* button  Logout */
        $(document).on("click", ".uib_w_81", function(evt)
        {
             logout();
             activate_subpage("#mainpagesub");
        });


                /* button  #movelecturebtn */
        $(document).on("click", "#movelecturebtn", function(evt)
        {
            var coursetomove= {
                uuid: $("#lectureslist").val(),
                termuuid:    $("#lecttermlist").val(),
                courseuuid:  $("#lectcourselist").val(),
                desttermuuid:     $("#desttermlist").val(),
                destcourseuuid:  $("#destcourselist").val(),
                task: "move"
            };
            if (coursetomove.uuid == "newcourse") return;
            movecopyLecture(coursetomove);

            $( "#movelecture" ).popup( "close" );
            //activate_subpage("#taskslecture");
        });

        /* button  #copylecturebtn */
        $(document).on("click", "#copylecturebtn", function(evt)
        {
            var coursetomove= {
                uuid: $("#lectureslist").val(),
                termuuid:     $("#lecttermlist").val(),
                courseuuid:  $("#lectcourselist").val(),
                desttermuuid:     $("#desttermlist").val(),
                destcourseuuid:  $("#destcourselist").val(),
                task: "copy"
            };

            if (coursetomove.uuid == "newcourse") return;
            movecopyLecture(coursetomove);
            $( "#movelecture" ).popup( "close" );

            //activate_subpage("#taskslecture");
        });




            /* button  #startlecturenotepad */
        $(document).on("click", "#startlecturenotepad", function(evt)
        {

            activate_subpage("#notepadsub");
        });

            /* button  Logout and publish... */


            /* button  Back to login */
        $(document).on("click", ".uib_w_112", function(evt)
        {
             activate_subpage("#mainpagesub");
        });

         var onaddstartlecture=function(func)
         {
             var lecturetoupdate= {
                title: $("#lecturename").val(),
                instructor: $("#usernameipt").val(),
                 uuid: $("#lectureslist").val(),
                 termuuid:     $("#lecttermlist").val(),
                 courseuuid:  $("#lectcourselist").val()
            };
            if (!lecturetoupdate.title || lecturetoupdate.title == "") return;
            if (lecturetoupdate.uuid == "newlecture") lecturetoupdate.uuid = undefined;
            updateAddLecture(lecturetoupdate,func);
            return true;
         };
     }

     if (!isscreen) {

        var notepad = null;
        var notepadsocket = null;

        var availscreens = [];
        var myscreens = [];

        var notepadisscreen = true;
        var casttoscreens = false;

	var backgroundbw = true;

        var updateScreenList = function() {
            var list="";
            $("#screenlist li").remove();

            $("#screenlist").append('<li class="widget uib_w_140" data-uib="jquery_mobile/listitem" data-ver="0" data-role="list-divider"><span>Current screens:</span></li>');
            for (var i=0;i<myscreens.length;i++) {
                 if (!myscreens[i]) continue;
                  $("#screenlist").append('<li class="widget uib_w_141" data-uib="jquery_mobile/listitem" data-ver="0" >'
                                         +'<a  data-val='+myscreens[i].uuid+' data-type="del"><p> ID:'
                                        +myscreens[i].name+'<br>['
                                        +myscreens[i].uuid+']'
                                        +'</p> <span class="ui-li-count">Del</span></li></a>');
            }
             $("#screenlist").append('<li class="widget uib_w_136" data-uib="jquery_mobile/listitem" data-ver="0" data-role="list-divider"><span>Available screens:</span></li>');
            console.log("availscreens",availscreens);
            for (var i=0;i<availscreens.length;i++) {
                $("#screenlist").append('<li class="widget uib_w_141" data-uib="jquery_mobile/listitem" data-ver="0" >'
                                        +'<a   data-val='+availscreens[i].uuid+' data-type="add"><p> ID:'
                                        +availscreens[i].name+'<br>['
                                        +availscreens[i].uuid+']'
                                        +'</p> <span class="ui-li-count">Add</span></a></li>');
            }
            $("#screenlist").append('<li class="widget uib_w_141" data-uib="jquery_mobile/listitem" data-ver="0" >'
                                      +'<a   data-val="findscreen" data-type="find">'
                                    +'<input name="findscreen" class="ui-input-text" id="findscreen" type="search" pattern="[0-9A-Z]{5}" value="" />'
                                    +'<span class="ui-li-count">Find</span></a></li>');
            $("#screenlist").listview("refresh");

            if (notepad) notepad.updateSizes();


        };

        $(document).on("click","#screenlist li a", function(evt)
        {
            console.log("listview on click",evt,$(this).attr("data-val"),$(this).attr("data-type"));
            if (notepadsocket) {
                if ($(this).attr("data-type")=="add") {
                    notepadsocket.emit("addscreen",{screenid: $(this).attr("data-val")});
                } else  if ($(this).attr("data-type")=="del") {
                    notepadsocket.emit("removescreen",{screenid: $(this).attr("data-val")});
                } else if ($(this).attr("data-type")=="find") {
                  var screenval=$("#findscreen").val();
                  if (screenval) {
                    screenval=screenval.toUpperCase();
                    var pattern=new RegExp('[A-Z0-9]{5}');
                    if (pattern.test(screenval) && screenval.length==5) {
                        console.log("find a screen sv:",screenval);
                        notepadsocket.emit("findscreen",{screenname: screenval});
                      }
                  }
                }
            }

        });


        /* button  Return to lecture... */
        $(document).on("click", "#returnlecture", function(evt)
        {
             /* Other possible functions are:
               uib_sb.open_sidebar($sb)
               uib_sb.close_sidebar($sb)
               uib_sb.toggle_sidebar($sb)
                uib_sb.close_all_sidebars()
                uib_sb.toggle_sidebar($("#notepadbar"))
              See js/sidebar.js for the full sidebar API */
            notepad.setHasControl(true);
            notepad.reactivateToolBox();

             uib_sb.close_sidebar($("#notepadbar"));

        });




        $(document).on("change", "#notepadisscreen", function(evt)
        {
            notepadisscreen=this.checked;
            if (notepad) {
                notepad.isalsoscreen=notepadisscreen;
                notepad.updateSizes();
            }
        });
        $('#notepadisscreen').prop('checked', notepadisscreen);


        $(document).on("change", "#casttoscreens", function(evt)
        {
            console.log("checkbox status",this.checked);
            casttoscreens=this.checked;
            if (notepad) {
                notepad.casttoscreens=casttoscreens;
                notepad.updateSizes();
            }
        });
        $('#casttoscreens').prop('checked', casttoscreens);

        $(document).on("change", "#backgroundbw", function(evt)
        {
            console.log("checkbox status bw",this.checked);
            backgroundbw=this.checked;
            if (notepad) {
                notepad.backgroundbw=backgroundbw;
                notepad.updateSizes();
            }
        });
        $('#backgroundbw').prop('checked', backgroundbw);




                /* button  #pdfcolor */
        $(document).on("click", "#pdfcolor", function(evt)
        {
           downloadPDF({color:true,termuuid: $("#lecttermlist").val(),
                    courseuuid:  $("#lectcourselist").val(),
                    uuid:    $("#lectureslist").val()},
                      "lect_col.pdf");
        });

        $(document).on("click", "#pdfbw", function(evt)
        {
           downloadPDF({color:false,termuuid: $("#lecttermlist").val(),
                    courseuuid:  $("#lectcourselist").val(),
                    uuid:    $("#lectureslist").val()},
                      "lect_bw.pdf");
        });

        $(document).on("click", "#pdfupload", function(evt)
        {
           downloadPDF({termuuid:$("#lecttermlist").val(),
                    courseuuid:  $("#lectcourselist").val(),
                    uuid:    $("#lectureslist").val()},
                      "lect.pdf");
        });

        /* button  #generatepdfs */
       $(document).on("click", "#generatepdfs", function(evt)
       {
         var data={termuuid: $("#lecttermlist").val(),
                    courseuuid:  $("#lectcourselist").val(),
                    uuid:    $("#lectureslist").val()};
        var title = $("#lecturename").val();


         if (!title || title == "") return;
         if (data.uuid == "newlecture") return; // first add it!
          generatePDF(data);
          fillLectureData($("#lecttermlist").val(),data.courseuuid,data.uuid);
       });



        $(document).on("click", "#uploadpdfbutton", function(evt)
        {
            var data={termuuid: $("#lecttermlist").val(),
                    courseuuid:  $("#lectcourselist").val(),
                    uuid:    $("#lectureslist").val()};
            var title = $("#lecturename").val();
            /* your code goes here */
            if (!title || title == "") return;
           if (data.uuid == "newlecture") return; // first add it!
            uploadPDF(data,$('#fileuploadwidget')[0].files[0]);
             fillLectureData($("#lecttermlist").val(),data.courseuuid,data.uuid);
        });


                 /* button  #logoutpublish */
       $(document).on("click", "#logoutpublish", function(evt)
       {
           var data={termuuid: $("#lecttermlist").val(),
                    courseuuid:  $("#lectcourselist").val(),
                    uuid:    $("#lectureslist").val()};
           generatePDF(data);
           logout();
           //window.location.href="index.html";
           activate_subpage("#mainpagesub");
       });


         $(document).on("pagecontainerhide", function (e, ui) {
             var nextpage = ui.nextPage[0].id;
             if (nextpage != "notepad") {
                 console.log("notepad hide!",nextpage);
                 if (notepad) {
                     notepad.running=false;
                     // call destructor and cut internet connection
                     notepad.shutdownNotepad();
                     notepad = null;
                     if (notepadsocket) {
                         notepadsocket.emit('LogoutPublish',{});
                         notepadsocket.disconnect();
                     }
                     notepadsocket = null;
                 }

             }
         });


         var newpagenotepad=function() {
             var swipertop = new Swiper ('.pictureselect-top', {
                // Optional parameters
                    direction: 'horizontal',
                    // scrollbar: '.swiper-scrollbar',
                  //  loop: true,
                    pagination: '.pictureselectpagination',
                    paginationClickable: true,
                    spaceBetween: 10,
                    slidesPerView: 'auto',
                    nextButton: '.pictureselectnext',
                    prevButton: '.pictureselectprev',
                    //    paginationType: 'progress',
                    //  calculateHeight:true,
                    centeredSlides: true,
                  effect: 'coverflow',
                 coverflow: {
                     rotate: 50,
                    stretch: 0,
                     depth: 200,
                    modifier: 1,
                    slideShadows : true
                 },
                 onDoubleTap: function(swiper,event) {
                  /*   console.log("ondoubletap");
                     var clickedslide=swiper.clickedSlide;
                     if (clickedslide && notepad) { notepad.enterAddPictureMode(
                         clickedslide.attributes.getNamedItem("pictureuuid").value,
                         clickedslide.attributes.getNamedItem("pictureurl").value);
                      uib_sb.close_sidebar($("#notepadbarbottom"));
                    }*/



                 }
                });
                var swiperthumb = new Swiper ('.pictureselect-thumb', {
                // Optional parameters
                direction: 'horizontal',
           // scrollbar: '.swiper-scrollbar',
                 //   loop: true,
                    pagination: '.pictureselectpagination',
                    paginationClickable: true,
                    spaceBetween: 2,
                    slidesPerView: 'auto',
                    //nextButton: '.pictureselectnext',
                    //prevButton: '.pictureselectprev',
                    //    paginationType: 'progress',
                    //  calculateHeight:true,
                    centeredSlides: true,
                    touchRatio: 0.2,
                 slideToClickedSlide: true

                });
                swipertop.params.control = swiperthumb;
                swiperthumb.params.control = swipertop;

             /* button  #addpicturebuttonnotepad */
                $(document).on("click", "#addpicturebuttonnotepad", function(evt)
                {
                    if (notepad) {
                        var target=swipertop.slides[swipertop.activeIndex];
                        notepad.enterAddPictureMode(target.getAttribute("pictureuuid"),
                        target.getAttribute("pictureurl"));
                        uib_sb.close_sidebar($("#notepadbarbottom"));
                    }
                    return false;
                });
                  /* button  #closepicturebuttonnotepad */
                 $(document).on("click", "#closepicturebuttonnotepad", function(evt)
                {
                    if (notepad) {
                        notepad.setHasControl(true);
                        notepad.reactivateToolBox();
                        uib_sb.close_sidebar($("#notepadbarbottom"));
                    }
                    return false;
                });


            console.log("socketio server",serveraddress+"/notepads");
	    notepadsocket=window.io(serveraddress+serverport+"/notepads", {
                'query': 'token=' + sessionStorage.getItem("FailsAuthtoken"),
                multiplex: false
            });
            notepadsocket.removeAllListeners('reloadBoard');
            notepadsocket.on('reloadBoard',function(data) {

                if (notepad) {
                    notepad.replaceData(data);
                    if (data.last) notepad.setHasControl(true);
                }
         });

            notepadsocket.removeAllListeners('drawcommand');
            notepadsocket.on('drawcommand',function(data) {
                if (notepad) notepad.receiveData(data);
            });

            notepadsocket.removeAllListeners('pictureinfo');
            notepadsocket.on('pictureinfo',function(data) {
                if (notepad) notepad.receivePictInfo(data);
            });

            notepadsocket.removeAllListeners('FoG');
            notepadsocket.on('FoG',function(data) {
                if (notepad) notepad.receiveFoG(data);
            });

            notepadsocket.removeAllListeners('availscreens');
            notepadsocket.on('availscreens',function(data) {
                //console.log("availscreens",data);
                availscreens=data.screens;
                updateScreenList();
            });

           notepadsocket.on('notepadscreens',function(data) {
                //console.log("availscreens",data);
                myscreens=data.screens;
            });

            notepadsocket.removeAllListeners('error');
            notepadsocket.on('error',function(data) {
                if (notepad) {
                    notepad.running=false;
                    notepad.shutdownNotepad();
                    notepad = null;
                    if (notepadsocket) notepadsocket.disconnect();
                    notepadsocket = null;
                    servererrorhandler ( data.code, data.message,  data.type );
                }
            });

            notepadsocket.removeAllListeners('connect');
            notepadsocket.on('connect',function(data) {
                if (notepad) notepad.setHasControl(false); // do not emit while reloading!
                setTimeout(function() {
                notepadsocket.emit('selectlecture', {
                    termuuid: $("#lecttermlist").val(),
                    courseuuid:  $("#lectcourselist").val(),
                    uuid:    $("#lectureslist").val()
                });
                }, 500);
            });


            notepadsocket.connect();
            console.log("Created new socket", notepadsocket);


            if (!notepad) {
                notepad = new NoteScreenBase($("#notepadsub"),
                function() { /*end buttonpressedcallback*/
                    uib_sb.open_sidebar($("#notepadbar"));
                },
                function(command,data){ // send network data
                notepadsocket.emit(command,data);
                }, true,function() { /*end buttonpressedcallback*/
                     uib_sb.open_sidebar($("#notepadbarbottom"));
                    fillPictureData($("#lecttermlist").val(),$("#lectcourselist").val(),
                        swipertop,swiperthumb, false);
                },notepadisscreen);

            }
            notepad.casttoscreens=casttoscreens;
            notepad.updateSizes();


            requestAnimationFrame(animate);
            var notepadrunning=true;
            function animate(timestamp) {
                if (notepad) {
                    requestAnimationFrame(animate);
                    if (notepadrunning) {
                        notepadrunning=notepad.animate(timestamp);
                    }
                }
            };

         };


         $(document).on("pagecontainershow", function (e, ui) {
             var newpage = $('body').pagecontainer('getActivePage').prop('id');
            console.log("pcs!",newpage);
             if (newpage == "notepad") {
                console.log("notepadshow!",newpage);
                newpagenotepad();
             } else if (newpage == "screen") {
                 console.log("screenshow!",newpage);
                 startScreen();

             }

         });
     }

    var setScreenText=function(top,middle,bottom,url) {
        if (top) {
            $("#screentop")[0].innerHTML = '<div class="widget-container left-receptacle"></div><div class="widget-container right-receptacle"></div>'+
                '<div><p>'+top+'</p></div>';
        }
        if (bottom) {
            $("#screenbottom")[0].innerHTML = '<div class="widget-container left-receptacle"></div><div class="widget-container right-receptacle"></div>'+
                '<div><p>'+bottom+'</p></div>';
        }

        if (middle) {
            $("#screenmiddle")[0].innerHTML = '<div class="widget-container left-receptacle"></div><div class="widget-container right-receptacle"></div>'+
                '<div><p>'+middle+'</p></div>';
        }

    };

     $("#screensub").dblclick(function() {
         if (screenfull.enabled) {
            screenfull.toggle(/*$("#notepadsub")*/);
        }
     });


    var showScreenError=function(error) {
        setScreenText(null,error,null,null);
        console.log("screenerror",error);
    };



     var screendata = null;
     var screensocket = null;
     var screen = null;
     var screenlectdetail = null;

     var screencast = false;

    var showLectDetail=function() {
        var dt=screenlectdetail;

        var top=dt.coursetitle+'<br>  <br>'+dt.instructor;
        var middle=dt.title;
        var bottom="is coming up";
        if (dt.lectureinstructor) {
            bottom="today held by <br>"+dt.lectureinstructor
                +'<br> is coming up';
        }

        setScreenText(top,middle,bottom);

    };

    var showLectEnd=function() {
        var dt=screenlectdetail;

        var top="Download "+ dt.title+" <br> of "+dt.coursetitle+"<br> from: ";
        var middle='<div id="qrcode" align="center"></div>';
        var bottom=dt.website+"<br> by: "+dt.instructor+
            '<br><p style="font-size:1.2em;"> Screen ID: '+
            screendata.name+"<small>UUID: "+screendata.uuid+"]</small><br></p>";

        setScreenText(top,middle,bottom);
        console.log("generate QRCode",dt.website);
        var qrcode=new QRCode("qrcode");
        qrcode.makeCode(dt.website);
         console.log("generate QRCode end");


    };


     var startScreenSocket = function() {
         screensocket=window.io(serveraddress+serverport+"/screens", {
            'query': 'token=' + sessionStorage.getItem("FailsScreenAuthtoken"),
             multiplex: false
        });
        screensocket.removeAllListeners('reloadBoard');
        screensocket.on('reloadBoard',function(data) {
            if (screen) {
                screen.replaceData(data);

            }
        });

        screensocket.removeAllListeners('drawcommand');
        screensocket.on('drawcommand',function(data) {
            if (screen) screen.receiveData(data);
        });

        screensocket.removeAllListeners('pictureinfo');
        screensocket.on('pictureinfo',function(data) {
            if (screen) screen.receivePictInfo(data);
        });

        screensocket.removeAllListeners('FoG');
        screensocket.on('FoG',function(data) {
            if (screen) screen.receiveFoG(data);
        });

        screensocket.removeAllListeners('lecturedetail');
        screensocket.on('lecturedetail',function(data) {
            screenlectdetail=data;
            showLectDetail();
        });


        screensocket.removeAllListeners('error');
        screensocket.on('error',function(data) {
            console.log("onerror",data);
            if (screen) {
                screen.running=false;
                screen.shutdownNotepad();
                screen = null;
                if (screensocket) screensocket.disconnect();
                screensocket = null;
                showScreenError("Server Error:"+ data.code+","+ data.message+","+  data.type );
            }
            uib_sb.open_sidebar($("#screenbar"));
            screencast=false;
        });

        screensocket.removeAllListeners('removeScreen');
        screensocket.on('removeScreen',function(data) {
             setScreenText("Screen connected:","ID: "+screendata.name
                        +"<br><br><small>UUID:<br>"+screendata.uuid+"</small><br>",
                          "Screen was removed <br>"+" Again, waiting for notepad to connect!");
            console.log("screen was removed from notepad ");
            uib_sb.open_sidebar($("#screenbar"));
            screencast=false;
        });

        screensocket.removeAllListeners('LogoutPublish');
         screensocket.on('LogoutPublish',function(data) {
             showLectEnd();
             uib_sb.open_sidebar($("#screenbar"));
             screencast=false;
         });


        screensocket.removeAllListeners('connect');
        screensocket.on('connect',function(data) {

               // todo imform size
            screen.updateSizes();
            console.log("screensocket connect");
            setScreenText("Screen connected:","ID: "+screendata.name
            +"<br><br><small>UUID:<br>"+screendata.uuid+"<br></small><br>",
                          "Waiting for notepad to connect!");
        });

        screensocket.removeAllListeners('disconnect');
        screensocket.on('disconnect',function(data) {

            uib_sb.open_sidebar($("#screenbar"));
            console.log("screensocket disconnect");
            setScreenText("Screen disconnected:","ID: "+screendata.name
                      +"<br><br><small>UUID:<br>"+screendata.uuid+"<br></small><br>",
                          "Waiting for server to connect!");
            screencast=false;
        });

        screensocket.removeAllListeners('updatescreensizes');
        screensocket.on('updatescreensizes',function(data) {
            var displaydata=data.casttoscreens;
            console.log("screensizes are updated",data);
            // we are now calculating an offset for scrolling
            var scrolloffset =0.;

            if (!data.notepadisscreen) { //if notepad is a screen all additional screen start in negative area
                // if it is not a screen we have to correct the offset
                scrolloffset=data.notepadscrollheight;
            }
            //now we have to add all screenheight up to the current one
            var arr=data.screenscrollheights;
            var length=arr.length;
            var i=0;
            for (i=0;i<length;i++) {
                if (!arr[i]) continue;
                var cur=arr[i];
                scrolloffset-=cur.scrollheight;
                if (cur.screenid == screendata.uuid) break;
            }
	    if (screen) screen.backgroundbw=data.backgroundbw;
            if (screen) screen.setScrollOffset(scrolloffset);



            if (displaydata!=screencast) {
                screencast=data.casttoscreens;
                if (screencast) uib_sb.close_sidebar($("#screenbar"));
                else uib_sb.open_sidebar($("#screenbar"));
            }
        });


        screensocket.connect();
        console.log("Created new screensocket", screensocket);


        if (!screen) {
            screen = new NoteScreenBase($("#screensub"),
                function() { /*end buttonpressedcallback*/

                },
                function(command,data){ // send network data
                screensocket.emit(command,data);
                }, false,function() { /*picture buttonpressedcallback*/

                });

        }
        if (screenfull) screenfull.request(/*$("#notepadsub")*/);


         requestAnimationFrame(animate);
         var screenrunning=true;
         function animate(timestamp) {
                if (screen) {
                    requestAnimationFrame(animate);
                    if (screenrunning) {
                        screenrunning=screen.animate(timestamp);
                    }
                }
            };


     };

     var startScreen = function() {
         if (!sessionStorage.getItem("FailsScreenAuthtoken") ||
             !sessionStorage.getItem("FailsScreenObj")) {
            $.postJSON(serveraddress+"/screen",
                       {},
                function(res) {
                if (res.error !== undefined || res.authtoken == undefined
                    || res.screenobj === undefined )  {
                    var errorstring ="Server not available!";
                    if (res.error !== undefined) errorstring =res.error;

                    showScreenError(errorstring);

                    console.log("acquire screen failed:", errorstring);
                } else {
                    sessionStorage.setItem("FailsScreenAuthtoken",res.authtoken);
                    sessionStorage.setItem("FailsScreenObj",JSON.stringify(res.screenobj));
                    screendata=res.screenobj;
                    console.log("getting screen worked!",res.authtoken,res.screenobj);
                    startScreenSocket();
                }
                },
                function(xhr,  textStatus,errorThrown )
                {
                    var errorstring= textStatus;
                    if (!errorstring) errorstring= "Server failure";
                    showScreenError(errorstring);
                });
         } else {
             screendata=JSON.parse(sessionStorage.getItem("FailsScreenObj"));
             console.log("screen already authenticated",screendata);
             console.log("screen already authenticated",sessionStorage.getItem("FailsScreenAuthtoken"));
             startScreenSocket();
         }

     };

     if (isscreen) {
         startScreen();

     }

     if (!isscreen) {




        /* button  #startlecture */
        $(document).on("click", "#startlecture", function(evt)
        {

            screenfull.request(/*$("#notepadsub")*/);
            onaddstartlecture(function() {
                 setTimeout(function() {
                activate_subpage("#notepadsub");
                  /* your code goes here */
                 },50);

            });
        });

        /* button  #updatelecture */
        $(document).on("click", "#updatelecture", function(evt)
        {
            onaddstartlecture();
        });

            /* button  Move lecture.... */


            /* button  Copy lecture... */


            /* button  Cancel */
        $(document).on("click", ".uib_w_120", function(evt)
        {
             activate_subpage("#taskslecture");
        });



            /* button  Move */


            /* button  Move */



            /* button  #loginbtn */
        $(document).on("click", "#loginbtn", function(evt)
        {
            var data= new Object();
            data.username = $("#usernameipt").val();
            data.password = $("#passwordipt").val();
            $.postJSON(serveraddress+"/login",
                   data,
                    function(res) {
                    if (res.error !== undefined || res.authtoken == undefined
                       || res.username === undefined
                       || (res.permgroup == undefined && res.gpermgroup==undefined))  {
                        var errorstring ="Server not available!";
                        if (res.error !== undefined) errorstring =res.error;

                        showLoginError(errorstring);

                        console.log("login failed:", errorstring);
                    } else {
                        $("#loginmessage").hide();
                        $("#passwordipt").val("");
                        sessionStorage.setItem("FailsAuthtoken",res.authtoken);
                        if (res.permgroup) activateControls(res.permgroup, true);
                        else activateControls(res.gpermgroup,false, res.groups);
                        activate_subpage("#taskslecture");
                    }
                },
                function(xhr,  textStatus,errorThrown )
                {
                    var errorstring= textStatus;
                    if (!errorstring) errorstring= "Server failure";
                    showLoginError(errorstring);
                });
        });


         $(document).on("change","#userlist",function(evt)
         {
             var userlistval=$("#userlist").val();
             if (userlistval!="newuser") $("#newusername").val(userlistval);
             else $("#newusername").val("");
             fillUserDetails($("#userlist").val());
         });

         $(document).on("change","#termlist",function(evt)
         {
             var userlistval=$("#termlist").val();
             if (userlistval!="newterm") {
                 $("#termname").val( $("#termlist").find(":selected").text());
                 if (admin && globalperm) changeCurrentTerm($("#termlist").val());
             } else  $("#termname").val( "");
         });

         $(document).on("change","#lecttermlist",function(evt)
        {
            var userlistval=$("#lecttermlist").val();
            fillCourseData(userlistval);
            fillLectCourseData(userlistval);

        });

          $(document).on("change","#desttermlist",function(evt)
         {
             var userlistval=$("#desttermlist").val();
             fillDestCourse($("#desttermlist").val());

         });

         $(document).on("change","#courselist",function(evt)
         {
             var courselistval=$("#courselist").val();
             if (courselistval!="newcourse") {
                 if (cur_courselist) {
                     var length = cur_courselist.length;
                     for (var i=0;i< length; i++) {
                         var item = cur_courselist[i];
                         if (item.uuid==courselistval) {
                             $("#coursetitle").val(item.title);
                             $("#coursewebsite").val(item.website);
                             fillGroupData(item.group);
                             cur_courseinstructors=item.instructors;
                             cur_courseinstructorsnames=item.instructorsnames;
                             updateInstructorField();
                         }
                     }
                 }
             } else  {
                 $("#coursetitle").val("");
                 $("#coursewebsite").val("");
                 cur_courseinstructors = [];
                 cur_courseinstructorsnames= [];
                 fillGroupData();
                 updateInstructorField();
             }
             //TODO update course instructors


         });

         $(document).on("change","#grouplist",function(evt)
         {
             var grouplistval=$("#grouplist").val();
             fillInstructorData(grouplistval);


         });

        $(document).on("change","#lectcourselist",function(evt)
         {
             var courselistval=$("#lectcourselist").val();
             fillLectureData($("#lecttermlist").val(), $("#lectcourselist").val());
             if (!globalperm) {
               console.log("lecture info", courselistval);
               console.log("usergroups",usergroups);
               var selitem=$("#lectcourselist").find(":selected")[0];
               var group=selitem.getAttribute("group");
               var obj=usergroups.find(function(test) {return test.group==group; });
               if (obj) {
                 if (obj.permgroup== 'maintenance'
                      || obj.permgroup == 'admin') {
                        maintenance=true;
                  } else {
                    maintenance=false;
                  }
                 activateMaintenanceControls(maintenance);
               }
             }


         });

        $(document).on("change","#lectureslist",function(evt)
         {
             var lectureslistval=$("#lectureslist").val();
             if (lectureslistval!="newlecture") {
                 var selected=$("#lectureslist").find(":selected")[0];
                 if (selected) {
                    $("#lecturename").val(selected.title);
                    $("#movelecturetext")[0].innerHTML = '<div class="widget-container left-receptacle"></div><div class="widget-container right-receptacle"></div><div><p>'
                        +'Lecture to move: '+selected.title+'</p></div>';

                     // now determine, which ui elements should be active

                     if ($(selected).attr("generatedpdf")=== 'true') {
                         $("#pdfcolor").show();
                         $("#pdfbw").show();
                         $("#pdfupload").hide();
                     } else {
                         $("#pdfcolor").hide();
                         $("#pdfbw").hide();
                     }
                     if ($(selected).attr("failstype") == "FailsPDF") {
                          $("#pdfupload").show();
                          $("#generatepdfs").hide();
                     } else {
                         $("#pdfupload").hide();
                          $("#generatepdfs").show();

                     }



                     if ($(selected).attr("canuploadpdf")=== 'true') {
                          $("#pdfuploadbox").show();
                     } else {
                         $("#pdfuploadbox").hide();

                     }

                 }


             } else  {
                $("#lecturename").val("");
                $("#pdfuploadbox").hide();
                 $("#pdfcolor").hide();
                 $("#pdfbw").hide();
                  $("#pdfupload").hide();
                 $("#generatepdfs").hide();
             }
             //TODO update course instructors


         });

            /* button  #updateuser */
        $(document).on("click", "#updateuser", function(evt)
        {
            /* your code goes here */
            var username = $("#userlist").val();
            if (username=="newuser") {
                username=$("#newusername").val();
            }
            if (!username || username == "" ) return;
            var usertoupdate={
                username: username,
                name: $("#fullusername").val(),
                email: $("#useremail").val(),
                permgroup: $("#userpermissions").val()
            };

            console.log("updateuser",usertoupdate);
            updateAddUsers(usertoupdate);
        });

            /* button  #deleteuser */
        $(document).on("click", "#deleteuser", function(evt)
        {
            var deleteuser={username:  $("#userlist").val()};
            console.log("delete user",deleteuser);

            deleteUser(deleteuser);
        });

            /* button  #addupdatesemeter */
        $(document).on("click", "#addupdatesemeter", function(evt)
        {
            var termuuid = $("#termlist").val();
            if (termuuid =="newterm") {
                termuuid= undefined;
            }
            var termname = $("#termname").val();
            if (!termname || termname == "") return;
            var termtoupdate = { termname : termname,
                                uuid : termuuid};
            updateAddTerm(termtoupdate);

        });

            /* button  #deletecurterm */
        $(document).on("click", "#deletecurterm", function(evt)
        {
            var deleteterm={uuid:  $("#termlist").val()};
            console.log("delete term",deleteterm);

            deleteTerm(deleteterm);
        });

        /* button  #deletecourse */
        $(document).on("click", "#deletecourse", function(evt)
        {
            var deletecourse={uuid:  $("#courselist").val(),
                             termuuid: $("#termlist").val()};
            console.log("delete course",deletecourse);

            deleteCourse(deletecourse);
        });

                 /* button  #deletelecture */
        $(document).on("click", "#deletelecture", function(evt)
        {
            /* your code goes here */
            var deletelecture={uuid:  $("#lectureslist").val(),
                              courseuuid:  $("#lectcourselist").val(),
                             termuuid: $("#lecttermlist").val()};
            console.log("delete lecture",deletelecture);

            deleteLecture(deletelecture);
        });

            /* button  #addupdatecourse */
        $(document).on("click", "#addupdatecourse", function(evt)
        {
            var coursetoupdate= {
                title: $("#coursetitle").val(),
                instructors: cur_courseinstructors,
                instructorsnames: cur_courseinstructorsnames,
                website: $("#coursewebsite").val(),
                uuid: $("#courselist").val(),
                group: $("#grouplist").val()
            };
            if (!coursetoupdate.title || coursetoupdate.title == "") return;
            if (coursetoupdate.uuid == "newcourse") coursetoupdate.uuid = undefined;
            updateAddCourse(coursetoupdate);
        });

            /* button  #addinstructor */
        $(document).on("click", "#addinstructor", function(evt)
        {
            var instr= $("#instructorlist").val();
            var index=cur_courseinstructors.indexOf(instr);
            if (index==-1) {
                 var selitem=$("#instructorlist").find(":selected")[0];
                 if (selitem)
                    cur_courseinstructorsnames.push(selitem.getAttribute("name"));
                else cur_courseinstructorsnames.push("N. N. ");
                cur_courseinstructors.push(instr);
                updateInstructorField();
            }
        });

            /* button  #removeinstructor */
        $(document).on("click", "#removeinstructor", function(evt)
        {
            var instr= $("#instructorlist").val();
            var index=cur_courseinstructors.indexOf(instr);
            if (index!=-1) {
                cur_courseinstructors.splice(index,1);
                cur_courseinstructorsnames.splice(index,1);
                updateInstructorField();
            }
        });


         $("#slidepos").bind("change",function(event,ui) {

             console.log("slidepos",$("#slidepos").val(),event,ui);
         });



            /* button  #fullscreenbtn */
        $(document).on("click", "#fullscreenbtn", function(evt)
        {
            if (screenfull.enabled) {
                screenfull.toggle(/*$("#notepadsub")*/);
            }
        });
        var fillPictureData = function(termuuid,courseuuid,swiper1,swiper2,isupload) {

             $.getJSONAuth(serveraddress+"/app/common/pictures",
                           {termuuid: termuuid,courseuuid: courseuuid, quality:"thumb"},
                function(data) {

                 if (data.picturelist) {
                     var pictureslist=data.picturelist;
                     var length=pictureslist.length;
                     var i;
                     if (length==0 && notepad) {

                         notepad.setHasControl(true);
                         notepad.reactivateToolBox();
                          uib_sb.close_sidebar($("#notepadbarbottom"));
                     }

                     var saveupload=null;
                     if (isupload==true) {
                         saveupload=swiper1.slides[0];

                     }
                    swiper1.removeAllSlides();
                    swiper2.removeAllSlides();

                    if (isupload==true) swiper1.appendSlide(saveupload);


                     for (i=length-1;i>=0;i--) {
                         var cur=pictureslist[i];
                         var tempdate="No date!";
                         var typestr="";
                         var canupload=true;
                         if (!cur.failsdata && !cur.pdfgenerated) typestr=", Empty";
                         else canupload=false;
                         if (cur.pdfgenerated) typestr=", Auto PDF";
                         else if (cur.type=="FailsPDF") typestr=", Upload PDF";

                         if (cur.date) tempdate=new Date(cur.date).toLocaleDateString();

                        swiper1.appendSlide('<div class="swiper-slide" style="background-image:url('+cur.url +')"'
                                            +'pictureuuid="'+cur.uuid+'"'
                                            +'pictureurl="'+cur.url+'"></div>');
                         $("div[pictureuuid='"+cur.uuid+"']").dblclick(function(event){
                                if (notepad) { notepad.enterAddPictureMode(event.target.getAttribute("pictureuuid"),
                                                   event.target.getAttribute("pictureurl"));
                                        uib_sb.close_sidebar($("#notepadbarbottom"));
                                        }});;
                        swiper2.appendSlide('<div class="swiper-slide" style="background-image:url('+cur.url +')"></div>');

                     }
                     swiper1.update();
                     swiper2.update();

                     //update the details
                 } else {
                     console.log("fillPictureData response empty!");
                 }

             } );

         };



               /* button  #uploadpictures */

        var swiperinited=false;
        /* button  #uploadpictures */

         var swipertop=null;
        var swiperthumb=null;

        /* button  #uploadpictures */
        $(document).on("click", "#uploadpictures", function(evt)
        {


            /* your code goes here */
            swipertop = new Swiper ('.pictureupload-top', {
                // Optional parameters
                direction: 'horizontal',
                // scrollbar: '.swiper-scrollbar',
                loop: false,
                pagination: '.pictureuploadpagination',
            paginationClickable: true,
            spaceBetween: 10,
                slidesPerView: "auto",
                nextButton: '.pictureuploadnext',
            prevButton: '.pictureuploadprev',
            //    paginationType: 'progress',
           //  calculateHeight:true,
                centeredSlides: true

            });
            swiperthumb = new Swiper ('.pictureupload-thumb', {
                // Optional parameters
                direction: 'horizontal',
            // scrollbar: '.swiper-scrollbar',
                loop: false,
                pagination: '.pictureuploadpagination',
                paginationClickable: true,
                spaceBetween: 2,
                slidesPerView: 'auto',
       //     nextButton: '.pictureuploadnext',
        // prevButton: '.pictureuploadprev',
         //    paginationType: 'progress',
            //  calculateHeight:true,
                centeredSlides: true

            });
            swipertop.params.control = swiperthumb;
            swiperthumb.params.control = swipertop;
            swiperinited=true;

            fillPictureData($("#lecttermlist").val(),$("#lectcourselist").val(),swipertop,swiperthumb, true);
            setTimeout(function() {
                $( "#pictureedit" ).popup( "open",{ positionTo: "window"} );
            },50);







        });



        var uploadPicture =function(data,file)
        {
            $.postUploadAuth(serveraddress+ "/app/common/coursePictureUpload",data,file,function(res) {
                //goo;
            });
        };

        /* button  #uploadpicturebutton */
        $(document).on("click", "#uploadpicturebutton", function(evt)
        {
            var data={termuuid: $("#lecttermlist").val(),
                    uuid:   $("#lectcourselist").val()};

            uploadPicture(data,$('#pictureuploadwidget')[0].files[0]);
            setTimeout(function() {

            fillPictureData($("#lecttermlist").val(),data.uuid,swipertop,swiperthumb, true);
            }, 500);
        });



     } // end notepad section












    }

 document.addEventListener("app.Ready", register_event_handlers, false);
})();
