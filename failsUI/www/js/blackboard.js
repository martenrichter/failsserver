/**
* @author Marten Richter
*/
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

(function() {


    Blackboard = function(stage, width, height,backcolor, notepadscreen)
    {
        PIXI.Graphics.call(this);
        this.position.x=0.0;
        this.position.y=0.0;
        this.lastpos=0;
        this.backcolor=backcolor;


        this.temppoints = [];
        this.curcolor = 0; //properties of the drawing surface
        this.curpenwidth = 0;
        this.curtype =0;

        this.touchOn = 0; // are touchevents recognized for drawing


        this.scrollheight=height/width;
        this.hitArea=new PIXI.Rectangle(0,0,width,height);
        this.blackboardscale = width;

        this.curscrollpos=0;
        this.rendermin=0.;
        this.rendermax=height/width;
        this.forceredraw=false;

        this.curkeyscroll=0;
        this.lastkeyscrolltime=new Date(0);



        this.pictures={};



        this.notepadscreen = notepadscreen;

        this.fpstext= new PIXI.Text('?? fps',{font : '24px Arial', fill : 0xff1010, align : 'center'});

        this.fpstext.position.x=0;
        this.fpstext.position.y=0;
        this.fpstext.visible=false;
        this.fpsstarttime= performance.now();
        this.fpsnum = 0;


        this.scrolloffset = 0;

        this.resetDebug();



        this.incomdispatcher = new failsdata.Dispatcher();
        this.incomdispatcher.addSink(this); // we also want to draw everything
        this.collection = new failsdata.Collection(function(id,data) {
            return new failsdata.MemContainer(id,data);},{});
        this.incomdispatcher.addSink(this.collection);


        //this.outgodispatcher.addSink(this.incomdispatcher); //short cut
         this.networkreceive = new failsdata.NetworkSource(this.incomdispatcher);



       // this.ShadowFilter = new PIXI.filters.DropShadowFilter();
    //    this.ShadowFilter.distance=2*this.blackboardscale/1920;
         this.BlurFilter = new PIXI.filters.BlurFilter();
        this.BlurFilter.blur=0.1;
        this.BlurFilter.strength=0.5*5;
        this.BlurFilter.resolution=1;//2;



        //this.filters= [ this.BlurFilter/*, this.ShadowFilter*/];
        this.changeQuality(0); //init filter quality settings

        this.filterArea=new PIXI.Rectangle( 0,0,
                                        this.blackboardscale,this.scrollheight*this.blackboardscale);


        this.blendModes=PIXI.BLEND_MODES.NORMAL;




        stage.addChild(this);


        this.blackboardcont= new PIXI.Container();
        //this.blackbaordcont.hitArea=new PIXI.Rectangle(0,0,0,0);
	    this.blackboardcont.position.x = 0.0;
        this.blackboardcont.position.y = 0.0;
        this.addChild(this.blackboardcont);
     //   this.blackboardcont.filters=[ this.BlurFilter/*, this.ShadowFilter*/];
         this.bbcacheDirty=true;


        this.blackboardtemp = new PIXI.Graphics();
        this.blackboardtemp.position.x = 0.0;
        this.blackboardtemp.position.y = 0.0;
        //this.blackboardtemp.filters=[ this.BlurFilter/*, this.ShadowFilter*/];
        this.blackboardtemp.shadowadded=false;
        this./*blackboardcont.*/addChild(this.blackboardtemp);

         this.lastbbtemp=null;


        //stage.addChild(this.blackboardtemp);

        this.pathstarted = this.pathupdated = false;
        this.pointnum=0;

        //emitter stuff
        var emconfig= {
            	alpha: {
		          start: 1,
		          end: 0
	           },
	           scale: {
		          start: 0.27*2,
		          end: 0.01*2*2,
		          minimumScaleMultiplier: 1.02
	           },
	           color: {
		          start: "#e4f9ff",
		          end: "#3fcbff"
	           },
	           speed: {
		          start: 100,
		          end: 50
	           },
	           acceleration: {
		          x: 0,
		          y: 0
	           },
	           startRotation: {
		          min: 0,
		          max: 360
	           },
	           rotationSpeed: {
		          min: 0,
		          max: 0
	           },
	           lifetime: {
                min: 0.05,
		        max: 0.8
	           },
	           blendMode: "normal",
	           frequency: 0.001*3,
	           emitterLifetime: -1,
	           maxParticles: 50,
	           spawnType: "point",
                pos: {
                x: 0,
		        y: 0
	           },
        };
        this.partemitcont= new PIXI.Container();
        this.partemitcont.hitArea=new PIXI.Rectangle(0,0,0,0);

        stage.addChild(this.partemitcont);

         stage.addChild(this.fpstext);

        this.partemitter = new PIXI.particles.Emitter(this.partemitcont, [PIXI.Texture.fromImage('images/particle.png')],emconfig);
        this.partemitter.emit = false;
        this.elapsed= new Date();
        this.fogtime= new Date();
        this.lastfogpos= null;
        this.fogmeanvel=0;


        this.stage=stage;
        console.log("Blackboard start up completed!");




    };

    Blackboard.prototype=Object.create( PIXI.Graphics.prototype);
    Blackboard.prototype.constructor = Blackboard;

    Blackboard.prototype.shutdown=function()
    {
        var stage=this.stage;
        this.stage=null;
        this.blackboardcont.cacheAsBitmap=null;
        this.blackboardcont=null;
        this.blackboardtemp=null;
        this.lastbbtemp=null;
        var notepadscreen=this.notepadscreen;
        this.notepadscreen=null;
        stage.removeChild(this);
	    this.destroy(true);
        stage.removeChild(this.partemitcont);
	    this.partemitcont.destroy(true);
        if (this.toolbox) this.toolbox.shutdown();
        this.toolbox=null;
        if (this.confirmbox) this.confirmbox.shutdown();
        this.confirmbox=null;

        this.interactive = false;
        stage.interactive=false;

	    //this.blackboardtemp.destroy();
    };

    Blackboard.prototype.resetDebug=function() {
        this.debperfpoints = 0;
        this.debperfobjts = 0;
        this.debperfpointsmin = 2000;
        this.debperfpointsmax = 0;
        this.debperfpixels=0;
    };


   Blackboard.prototype.setScrollOffset=function(scrolloffset)
    {
        this.scrolloffset=scrolloffset;
        console.log("setScrollOffset", scrolloffset);
        this.scrollBoard(0,0,this.getStartScrollboardTB());
    };

    Blackboard.prototype.resize = function(width,height)
    {
        console.log("blackboard resize! %d %d",width,height);
        if (width!=0) this.scrollheight=height/width;
        else this.scrollheight=1.;
        this.hitArea=new PIXI.Rectangle(0,0,width,height);
        this.blackboardscale = width;
       // this.ShadowFilter.distance=2*this.blackboardscale/1920;
         this.filterArea=new PIXI.Rectangle( 0,0,
                                        this.blackboardscale,this.scrollheight*this.blackboardscale);

        this.rendermin=this.rendermax=this.curscrollpos;
        this.forceredraw=true;
        console.log("resize scrollboard",this.getStartScrollboardTB());
        this.scrollBoard(0,0,this.getStartScrollboardTB());
        if (this.toolbox) this.toolbox.reportScroll();;
        console.log("Redraw! resize");
    }


    Blackboard.prototype.updateRenderArea=function(x,y) {
        this.rendermin=Math.min(y,this.rendermin);
        this.rendermax=Math.max(y,this.rendermax);

    }

    Blackboard.prototype.addPicture =function(time,objnum,curclient,x,y,width,height,uuid) {
        this.updateRenderArea(x,y);
        this.updateRenderArea(x+width,y+height);
        console.log("addpicture",x,y,width,height,uuid);
        var pictinfo=this.pictures[uuid];
        console.log("pictinfo",pictinfo);
        if (pictinfo) {

             var texture=new PIXI.Texture(PIXI.BaseTexture.fromImage(pictinfo.url));//PIXI.Texture.fromImage(pictinfo.url);

             if (!texture.baseTexture) {
                 console.log("basetexture is broken recreate",texture);
                 // does not work

             }
            var myself=this;
            texture.baseTexture.on('loaded', function(){  myself.bbcacheDirty=true;  });

             var pixipicture=new PIXI.Sprite(texture);
            this.submitPath(true); //flush handdrawings
            this.submitPath(true); //flush handdrawings // we need it twice!

            this.blackboardcont.addChild(pixipicture);
            pixipicture.position.x=x*this.blackboardscale;
            pixipicture.position.y=y*this.blackboardscale;
            pixipicture.width=width*this.blackboardscale;
            pixipicture.height=height*this.blackboardscale;

            console.log("addpicture scaled",pixipicture.position,pixipicture.width,pixipicture.height);

            this.bbcacheDirty=true;

        }


        //resubmitpath
    }


   Blackboard.prototype.startPath =function(time,objnum,curclient,x,y,type,color,width) {
       var needresubmit=false;

        //figure out if shadow status changes
        var shadow=true;
        if (type==2) shadow=false;
        if (this.lastbbtemp && shadow!=this.lastbbtemp.shadowadded) {
            needresubmit=true;
            //console.log("resubmit shadow", type,shadow,this.lastbbtemp.shadowadded);
        }
       //if (this.lastbbtemp) console.log("shadow test startpath", type,shadow,this.lastbbtemp.shadowadded);

       if (this.pathstarted) {//in case of lost messages
            console.log("lost case");
       }

        if (this.pathstarted ) {
            this.submitPath(this.needresubmit);
            this.needresubmit=false;

        }
        this.needresubmit=needresubmit;

        this.partemitter.emit = false;
        this.updateRenderArea(x,y);
        this.temppoints = [];
        this.temppoints.push(new PIXI.Point(x*this.blackboardscale,y*this.blackboardscale));
        //console.log("startPath",time,objnum,curclient,x,y,color,width,x*this.blackboardscale,y*this.blackboardscale);
        this.pathstarted = true;
        this.curcolor=color;
        this.curtype=type;
        this.curpenwidth=Math.max(width*this.blackboardscale,1);



    };

    Blackboard.prototype.addToPath = function(time,curclient,x,y) {
       if (this.pathstarted) {
            this.pathupdated = true;
            this.temppoints.push(new PIXI.Point(Math.floor(x*this.blackboardscale),Math.floor(y*this.blackboardscale)));
         //  console.log("aTP",new PIXI.Point(Math.floor(x*this.blackboardscale),Math.floor(y*this.blackboardscale)));
            this.updateRenderArea(x,y);
           if (this.toolbox) this.toolbox.reportDrawPos(x*this.blackboardscale,
                                                        y*this.blackboardscale+this.position.y);
           this.pointnum++;
       }
        //console.log("addToPath",time,curclient,x,y,x*this.blackboardscale,y*this.blackboardscale);
    };

    Blackboard.prototype.finishPath = function(time,curclient) {
        /*if (this.pathstarted) {
            this.pathstarted = false;
            this.drawtemppoints(this);
            this.pathupdated = false;
            this.blackboardtemp.clear();
            this.temppoints = [];
        }*/
        if (this.pathstarted) {
            this.pathstarted = false;
            this.submitPath(this.needresubmit);
            this.needresubmit=false;
        }

       // console.log("finishPath",time,curclient);
    };

    Blackboard.prototype.submitPath = function(needresubmit) {

        this.pathupdated = false;
        this.blackboardtemp.clear();
       // console.log("submit path",this.temppoints.length,this.pointnum,this.lastbbtemp);
        //if (this.lastbbtemp) console.log("new submitter", this.pointnum, !this.lastbbtemp,needresubmit);
        if (this.pointnum>2000 || !this.lastbbtemp  || needresubmit
            /*|| this.lastbbtemp.shadowadded!=this.blackboardtemp.shadowadded*/) {
            //if (this.lastbbtemp)console.log("new submitter", this.pointnum, !this.lastbbtemp,
            //            this.lastbbtemp.shadowadded,this.blackboardtemp.shadowadded,needresubmit);

           // if (this.pointnum>2000) console.log("pointnum criteria");
            //if (!this.lastbbtemp ) console.log("lastbbtemp criteria");
            //if (needresubmit) console.log("needresubmit criteria");
          //  console.log("submit");


           if (this.lastbbtemp) {
            //   console.log("lastbbtemp info",this.lastbbtemp.position.x,this.lastbbtemp.position.y, this.lastbbtemp.width, this.lastbbtemp.height);
                this.debperfpixels+=this.lastbbtemp.width*this.lastbbtemp.height;
           }
            this.drawtemppoints(this.blackboardtemp);
            if (this.lastbbtemp) {
                this.removeChild(this.lastbbtemp);
                if (this.lastbbtemp.height>0) {
                    this.blackboardcont.addChild(this.lastbbtemp);
                    this.bbcacheDirty=true;
                } else {
                    this.lastbbtemp.destroy(true);
                }
             //   console.log("lastbbtemp",this.blackboardcont.getChildIndex(this.lastbbtemp) );
            }
            this.lastbbtemp=this.blackboardtemp;
           // console.log("compare", this.lastbbtemp.shadowadded, this.blackboardtemp.shadowadded);
            //this.lastbbshadowactivated=this.blackboardshadowadded;

            this.temppoints = [];
            this.blackboardtemp=new PIXI.Graphics();
            this.blackboardtemp.position.x = 0.0;
            this.blackboardtemp.position.y = 0.0;
            //this.blackboardtemp.filters=[ this.BlurFilter/*, this.ShadowFilter*/];
            this.blackboardtemp.shadowadded=false;
            this./*blackboardcont.*/addChild(this.blackboardtemp);


            //performance statistics
            this.debperfpoints+= this.pointnum;
            this.debperfobjts++;
            this.debperfpointsmin = Math.min(this.debperfpointsmin, this.pointnum);
            this.debperfpointsmax = Math.max(this.debperfpointsmax, this.pointnum);

          /*  if (this.pointnum>1000)*/ this.pointnum=0;
        } else {
            /* if (this.lastbbtemp.graphicsData.length>1) console.log("lastbbtempdraw start",this.lastbbtemp.graphicsData.length,
                        this.lastbbtemp.graphicsData[this.lastbbtemp.graphicsData.length-1],
                       this.lastbbtemp.graphicsData[this.lastbbtemp.graphicsData.length-1].shape.points.length);*/
           // console.log("drawpoints this lastbbtemp",this.position,this.lastbbtemp.position,this.blackboardtemp.position);
       //     console.log("indices", this.getChildIndex(this.lastbbtemp),this.getChildIndex(this.blackboardtemp),
         //               this.getChildIndex(this.blackboardcont));
             this.drawtemppoints(this.lastbbtemp);
          /* if (this.lastbbtemp.graphicsData.length>1) console.log("lastbbtempdraw end",this.lastbbtemp.graphicsData.length,
                        this.lastbbtemp.graphicsData[this.lastbbtemp.graphicsData.length-1],
                       this.lastbbtemp.graphicsData[this.lastbbtemp.graphicsData.length-1].shape.points.length);*/

        }
        this.blackboardcont.filterArea=new PIXI.Rectangle( 0,(this.rendermin-0.1)*this.blackboardscale,
                                        this.blackboardscale,(this.rendermax+0.1)*this.blackboardscale);



    };

    Blackboard.prototype.setblocked = function(isblocked){
        if (this.outgodispatcher) {
            this.outgodispatcher.blocked = isblocked;
            console.log("dispatcher blocked",this.outgodispatcher.blocked);
        }
    };


    Blackboard.prototype.drawtemppoints = function drawtemppoints(grafik)
    {//0xffd900
        var length = this.temppoints.length;
        if (length==0) return;
        var alpha=1;
        var color=this.curcolor;
        if (this.curtype==1) alpha=0.3;
        else if (this.curtype==2) {
            color=this.backcolor;
            alpha=0.95;
        }
        if (grafik.shadowadded==false && this.curtype!=2) {
            grafik.shadowadded=true;
            //console.log("add shadow filter")
           // grafik.filters=[ this.BlurFilter,/* this.ShadowFilter*/];
        }
        if (grafik.shadowadded==true && this.curtype==2) {
            console.log("shadow filter too much");
        }


        var pointsdrawn=0;
        var penwidth=Math.max(1.5, this.curpenwidth);

        if (length > 1) {
	       var x=this.temppoints[0].x;
	       var y=this.temppoints[0].y;

           var outpoints=[];

           outpoints.push(x);
           outpoints.push(y);
           pointsdrawn++;

           //  console.log(this.temppoints[0]);
            for (var i=1; i < length; i++ ) {
		          var dx=x-this.temppoints[i].x;
                  var dy=y-this.temppoints[i].y;
                  if ((dx*dx+dy*dy)>/*4*/ 1  ) {
                    x=this.temppoints[i].x;
		            y=this.temppoints[i].y;
                    outpoints.push(x);
                    outpoints.push(y);
                    //grafik.lineTo(x,y);
                    pointsdrawn++;
                  }
            }
            if (pointsdrawn>1) {
                //console.log("dtp pre",this.curpenwidth,grafik.lineWidth);
                grafik.lineStyle(penwidth, color, alpha);
          //   console.log("dtp",this.curpenwidth,grafik.lineWidth, color, alpha,this.temppoints.length,grafik,pointsdrawn);
                grafik.moveTo(outpoints[0],outpoints[1]);
                grafik.currentPath.shape.closed=false;
                for (var i=1; i<pointsdrawn;i++) {
                    grafik.lineTo(outpoints[0+2*i],outpoints[1+2*i]);
                }

            } else {
                grafik.lineStyle(penwidth, color, alpha);
                grafik.drawCircle(outpoints[0],outpoints[1],penwidth*0.5);
                //console.log("circle");
            }


        }
       // console.log("dtpend",pointsdrawn,length);
        this.pathupdated = false;
    };

    Blackboard.prototype.scrollBoard = function scrollBoard(time,x,y)
    {
        if (x!=0) {
            // implement
        }
        if (y!=0) {
            console.log("scrollboard",y);
            var newpos =/*this.curscrollpos+*/y;
            if (newpos<0) newpos=0;
            this.curscrollpos=newpos;

            newpos+=this.scrolloffset;
            /*this.blackboardtemp.y=*/this.position.y=-newpos*this.blackboardscale;
            this.hitArea.y=newpos*this.blackboardscale;
        }
        if (x!=0 || y!=0 || this.forceredraw) {
            if (this.toolbox) this.toolbox.reportScroll();
           // console.log("scrollboard",x,y,this.position.x,this.blackboardtemp.y,this.hitArea);
            if (this.collection.suggestRedraw(this.rendermin,this.rendermax,
                                              this.curscrollpos,this.curscrollpos+this.scrollheight) || this.forceredraw) {
                this.forceredraw=false;
                this.rendermin=this.rendermax=this.curscrollpos;
                //this.clear();
		        this.flushForRedraw();

                this.collection.redrawTo(this,this.curscrollpos-1.5,this.curscrollpos+this.scrollheight+1.5);
                if (this.toolbox) this.toolbox.reportScroll();
                this.bbcacheDirty=true;
                console.log("Redraw!");
            }


        }

    };

    Blackboard.prototype.refreshbbCache= function ()
    {
        if (this.notepadscreen.canvas) {
            console.log("No bbcaching due to bug in canvas renderer????");
            return;
        }
        console.log("bbchache", this.blackboardcont.cacheAsBitmap);
        console.log("bbchache2", this.blackboardcont);

        this.blackboardcont.cacheAsBitmap=false;
        console.log("bbchache3", this.blackboardcont.cacheAsBitmap,this.blackboardcont.children.length );
            //
        console.log("refreshbbcache");
         //   this.blackboardcont.position.scale=0.2;
        this.blackboardcont.cacheAsBitmap=true;

         console.log("bbchache4", this.blackboardcont.cacheAsBitmap);
    }

    Blackboard.prototype.flushForRedraw= function ()
    {
        this.blackboardtemp.clear();
        if (this.lastbbtemp) {
            this.removeChild(this.lastbbtemp);
        }
        this.lastbbtemp=null;
       this.lastbbshadowactivated=false;
       this.pointnum=0;

	    var childpos = this.getChildIndex(this.blackboardcont);
	    var oldcontainer = this.blackboardcont;




        console.log("DebugPerf points:",this.debperfpoints, "objts:",this.debperfobjts,
                   "points min:",this.debperfpointsmin,"points max:",this.debperfpointsmax,
                   "points per objs:", this.debperfpoints/this.debperfobjts,
                   "pixels", this.debperfpixels,"pixels per objs: ",this.debperfpixels/this.debperfobjts);

        this.debperfpoints = 0;
        this.debperfobjts = 0;
        this.debperfpointsmin = 2000;
        this.debperfpointsmax = 0;

        this.resetDebug();

        this.blackboardcont= new PIXI.Container();
        //this.blackbaordcont.hitArea=new PIXI.Rectangle(0,0,0,0);
	    this.blackboardcont.position.x = 0.0;
        this.blackboardcont.position.y = 0.0;
        //this.blackboardcont.filters=[ this.BlurFilter/*, this.ShadowFilter*/];
	    //oldcontainer.removeChild(this.blackboardtemp);
	    this.removeChild(oldcontainer);

	   // this.blackboardcont.addChild(this.blackboardtemp);

	    oldcontainer.destroy(true);

	    this.addChildAt(this.blackboardcont,childpos);
        this.bbcacheDirty=true;
        console.log("flush for redraw",childpos);

    };

    Blackboard.prototype.changeQuality= function changeQuality(change)
    {
        if (change==0)
        {
            this.drawquality=2;
        }
        if (change==-1) {
            this.drawquality+=change;
            if (this.drawquality<0) {
                this.drawquality=0;
                return;
            }
        }
        if (change==1) {
            this.drawquality+=change;
            if (this.drawquality>2) {
                this.drawquality=2;
                return;
            }
        }
        switch (this.drawquality)
        {
            case  2: {
                this.BlurFilter.resolution=2;//2;
                this.filters= [ this.BlurFilter/*, this.ShadowFilter*/];
            } break;
            case  1: {
                this.BlurFilter.resolution=1;//2;
                this.filters= [ this.BlurFilter/*, this.ShadowFilter*/];
            } break;
            case  0: {
               // this.BlurFilter.resolution=2;//2;
                this.filters= null ;//[ this.BlurFilter/*, this.ShadowFilter*/];
            } break;

        };
    }


    Blackboard.prototype.updateGraphics= function updateGraphics(timestamp)
    {

        if (this.pathupdated) {
            this.blackboardtemp.clear();
            //this.blackboardtemp.filters=[ this.BlurFilter/*, this.ShadowFilter*/];
            this.blackboardtemp.shadowadded=false;
            this.drawtemppoints(this.blackboardtemp);
            this.pathupdated=false;
        }
       // var now= new Date();

        var fogtimeelapsed=(timestamp-this.fogtime.getTime())/1000;

        if (fogtimeelapsed>0.5) { // No fog update for a while turn off
            this.partemitter.emit=false;
        }

        this.partemitter.update((timestamp-this.elapsed)*0.001);
        this.elapsed= timestamp;
        if (this.bbcacheDirty) {
            this.bbcacheDirty=false;
            this.refreshbbCache();
        }
        if (this.fpsnum==0 ){
            this.fpsstarttime=timestamp;

        }


        this.fpsnum++;
        var fps=this.fpsnum*1000/(timestamp-this.fpsstarttime);
        this.fpstext.text=fps.toFixed(3)+" fps "+(performance.now()-timestamp).toFixed(3)+" ms lag"+this.drawquality+" qual "+this.fpsabove+" ab"+this.fpsbelow+" bl "+this.notepadscreen.canvas+" canvas";

        if (fps>50) {
            if (!this.fpsabove) this.fpsabove=0;
            this.fpsbelow=0
            this.fpsabove++;
            if (this.fpsabove>fps*10) {
                this.changeQuality(1);
                this.fpsabove=0;
                this.fpsbelow=0;
            }
        } else if (fps<30) {
            if (!this.fpsbelow) this.fpsbelow=0;
            this.fpsabove=0
            this.fpsbelow++;
            if (this.fpsbelow>fps*10) {
                this.changeQuality(-1);
                this.fpsabove=0;
                this.fpsbelow=0;
            }
        }

        if ((timestamp-this.fpsstarttime)>2000) {
            this.fpsnum*=(1000) /(timestamp-this.fpsstarttime);
            this.fpsstarttime=timestamp-1000;
        }

    };

    Blackboard.prototype.getStartScrollboardTB = function()
    {
        return this.curscrollpos;
    }

    Blackboard.prototype.scrollboardTB = function(x,y,reference)
    {
        console.log("scrollboardTB",x,y,reference);
        if (this.outgodispatcher) this.outgodispatcher.scrollBoard(null,0,
                                         reference+y/this.blackboardscale);

    };

    Blackboard.prototype.scrollboardKeys = function(x,y)
    {
        console.log("scrollboardKeys",x,y,this.curscrollpos,this.curkeyscroll);
        var time=new Date();

        if ((time-this.lastkeyscrolltime)>1000) { // This prevents weird effects
          // if network has a hickup
          this.curkeyscroll=this.curscrollpos;
        }
        this.lastkeyscrolltime=time;

        this.curkeyscroll+=y;
        if (this.curkeyscroll<=0) this.curkeyscroll=0.0001;
        if (this.outgodispatcher) this.outgodispatcher.scrollBoard(null,0,
                                         this.curkeyscroll);


    };

    Blackboard.prototype.toggleDebugView=function()
    {
      if (this.fpstext.visible) {
        this.fpstext.visible=false;
      } else {
        this.fpstext.visible=true;
      }

    };

    Blackboard.prototype.receiveData = function(data) {
        if (typeof data.timeSet != 'undefined') {
            if (data.timeSet) {
                console.log("initialscroll",data);
                if (this.outgodispatcher) this.outgodispatcher.setTimeandScrollPos(data.time);
            }
        }
        //console.log("Blackboard receive data",data);
        this.networkreceive.receiveData(data);
    };

    Blackboard.prototype.replaceData = function(data) {
        this.collection.replaceStoredData(data.number,data.data);
        this.rendermin=Math.min(data.number,this.rendermin);
        this.rendermax=Math.max(data.number+1,this.rendermax);
        if (data.last) {
            this.rendermin=this.rendermax=this.curscrollpos;
            //this.clear();
            this.flushForRedraw();


            this.collection.redrawTo(this,this.curscrollpos-1.5,this.curscrollpos+this.scrollheight+1.5);
            if (this.toolbox) this.toolbox.reportScroll();
            console.log("Redraw! replace Data");
        }
    };
    Blackboard.prototype.receivePictInfo = function(data) {
       this.pictures[data.uuid]=data;
    };

    Blackboard.prototype.receiveFoG=function(data) {
        this.partemitter.updateOwnerPos(data.x*this.blackboardscale,
                                        (data.y-this.scrolloffset-this.curscrollpos)*this.blackboardscale);
        // Now decide according to velocity if we emit
        var newtime=new Date();
        var timeelapsed=(newtime.getTime()-this.fogtime.getTime())/1000;


        if (timeelapsed>0.05) { //
          this.fogtime= newtime;


          var lfp=this.lastfogpos;
          var distance=0;
          if (lfp) distance= (data.x-lfp.x)*(data.x-lfp.x)+(data.y-lfp.y)*(data.y-lfp.y);
          this.lastfogpos=data;


          var velocity=Math.sqrt(distance/timeelapsed/timeelapsed); //this is velocity squared
          this.fogmeanvel=this.fogmeanvel*0.66+0.33*velocity;

        //  console.log("fog "+this.fogmeanvel);
          if (this.fogmeanvel > 0.7 ) {
            this.partemitter.emit=true;
          } else {
            this.partemitter.emit=false;
          }
        }
    };


    BlackboardNotepad = function(stage, width, height,backcolor, notepadscreen)
    {
        Blackboard.call(this,stage,width,height,backcolor,notepadscreen);
         //interactive class

        this.outgodispatcher = new failsdata.Dispatcher();
        this.outgodispatcher.blocked = true; // we block initially
        var locnotepadscreen = this.notepadscreen;
        this.networksender = new failsdata.NetworkSink(function(data) {
            locnotepadscreen.netSend('drawcommand',data);
        });
        this.outgodispatcher.addSink(this.networksender);



        this.interactive = true;
        stage.interactive=true;

        this.mousepathstarted = false;


        this.rightmousescroll = false;
        this.rightmousescrollx = 0;
        this.rightmousescrolly = 0;

        //properties of the current tool
        this.toolcolor = 0;
        this.toolsize = 10;
        this.tooltype = 0;
        this.toolbox = null;

        this.addpictmode=0; //stage of adding picture
        this.addpictuuid=null;
        this.addpictsprite=null;
    };

    BlackboardNotepad.prototype=Object.create( Blackboard.prototype);
    BlackboardNotepad.prototype.constructor =  BlackboardNotepad;

    BlackboardNotepad.prototype.touchstart = function(mouse)
    {
         if (this.touchOn) this.mousedown(mouse);
    }



    BlackboardNotepad.prototype.mousedown = function(mouse) {
        //console.log("mousedownbb");
        var pos=mouse.data.getLocalPosition(this,null,null);
        this.rightmousescroll = false;

        if (!this.mousemulttouchdata) {
            this.mousemulttouchdata=mouse;
            this.mouseidentifier=mouse.data.identifier;

            if (this.addpictsprite) {
                switch (this.addpictmode) {
                case 4: {
                    //this.addpictsprite.
                    this.addpictsprite.position=pos;
                    this.addpictmode=3;
                } break;
                case 3: {
                    this.addpictmode=2;
                    this.confirmbox.reactivate({x: (this.addpictsprite.position.x+this.addpictsprite.width) ,
                                            y: (this.addpictsprite.position.y+this.addpictsprite.height+this.position.y)});
                } break;
                };
            } else {
                this.outgodispatcher.startPath(null,null,null,
                                  pos.x/this.blackboardscale,pos.y/this.blackboardscale,
                                  this.tooltype,
                                  this.toolcolor,this.toolsize/this.blackboardscale);
                this.lastpos=pos;
                this.mousepathstarted = true;
                //console.log("mousedownbb");
            }
        }
    };

    BlackboardNotepad.prototype.rightdown = function(mouse) {
          //console.log("rightdown1");
        var pos=mouse.data.getLocalPosition(this,null,null);
        this.rightmousescrollx = mouse.data.global.x;
        this.rightmousescrolly = mouse.data.global.y;
        this.rightmousescroll = true;
        this.rightmousescrollpos = this.curscrollpos;
          //console.log("rightdown");
        this.mousemulttouchdata=null;

    };


    BlackboardNotepad.prototype.touchmove = function(mouse)
    {
         if (this.touchOn) this.mousemove(mouse);
    }

    BlackboardNotepad.prototype.mouseover = Blackboard.prototype.mousemove = function(mouse) {
        var pos=mouse.data.getLocalPosition(this,null,null);
        if (this.mousemulttouchdata) {
            pos=this.mousemulttouchdata.data.getLocalPosition(this,null,null);
        }



        if (!this.rightmousescroll) {
            if (this.mouseidentifier==mouse.data.identifier) {
                var distance =(this.lastpos.x-pos.x)*(this.lastpos.x-pos.x)+(this.lastpos.y-pos.y)*(this.lastpos.y-pos.y);
                if (this.mousepathstarted && (distance>0)) {
                    this.outgodispatcher.addToPath(null,null,
                                                   pos.x/this.blackboardscale,pos.y/this.blackboardscale);
                    this.lastpos=pos;
                } else if (this.addpictsprite) {
                    switch (this.addpictmode) {
                    case 4: {
                        //this.addpictsprite.
                        this.addpictsprite.position=pos;
                    } break;
                        case 3: {
                            var aspectratio=this.addpictsprite.height/this.addpictsprite.width;
                            var nx=pos.x-this.addpictsprite.position.x;
                            var ny=pos.y-this.addpictsprite.position.y;
                            //console.log("newsize1",nx,ny,aspectratio);
                            if (nx<1) nx=1;
                            if (ny<1) ny=1;
                            if (nx>ny) {
                                nx=ny/aspectratio;
                            } else {
                                ny=nx*aspectratio;
                            }
                            //console.log("newsize",nx,ny);
                            this.addpictsprite.width=nx;
                            this.addpictsprite.height=ny;

                        } break;
                        };
                }  else if (!this.mousepathstarted) {
                    // console.log("Fog out BB",pos.x,this.blackboardscale,pos.y,this.blackboardscale,mouse.data,this);
                    this.notepadscreen.reportFoG(pos.x/this.blackboardscale,pos.y/this.blackboardscale);
                }
                //console.log("mousemove");
            }


        } else {
            this.outgodispatcher.scrollBoard(null,0, this.rightmousescrollpos+(-mouse.data.global.y+this.rightmousescrolly)/this.blackboardscale);
            //console.log("rightmove");
        }
    };

    BlackboardNotepad.prototype.touchendoutside = BlackboardNotepad.prototype.touchend = function(mouse)
    {
         if (this.touchOn) this.mouseup(mouse);
    }

    BlackboardNotepad.prototype.mouseup=Blackboard.prototype.mouseupoutside = function(mouse) {
         var pos=mouse.data.getLocalPosition(this,null,null);
        if (this.mousemulttouchdata) {
            pos=this.mousemulttouchdata.data.getLocalPosition(this,null,null);
        }

        if (this.mousepathstarted && this.mouseidentifier==mouse.data.identifier) {
            this.outgodispatcher.addToPath(null,null,
                                  pos.x/this.blackboardscale,pos.y/this.blackboardscale);
            this.outgodispatcher.finishPath(null,null);
            this.mousepathstarted=false;
        }
        this.rightmousescroll = false;
        this.mousemulttouchdata=null;
          //console.log("mouseup");
    };

     BlackboardNotepad.prototype.rightup = Blackboard.prototype.rightupoutside = function(mouse) {
        var pos=mouse.data.getLocalPosition(this,null,null);
        if (this.rightmousescroll) {
            this.outgodispatcher.scrollBoard(null,0,this.rightmousescrollpos+(-mouse.data.global.y+this.rightmousescrolly)/this.blackboardscale);
            this.rightmousescroll = false;
        }
           //console.log("rightup");
    };



    BlackboardNotepad.prototype.setPenTool=function(color,size)
    {
        this.tooltype = 0;
        this.toolsize = size;
        this.toolcolor = color;
    };

    BlackboardNotepad.prototype.setMarkerTool=function(color,size)
    {
        this.tooltype = 1;
        this.toolsize = size;
        this.toolcolor = color;
    };

    BlackboardNotepad.prototype.setEraserTool=function(size)
    {
        this.tooltype = 2;
        this.toolsize = size;
    };

    BlackboardNotepad.prototype.endButtonPressed=function()
    {
        this.setblocked(true);
        this.notepadscreen.endButtonPressed();
    };

    BlackboardNotepad.prototype.pictButtonPressed=function()
    {
        this.setblocked(true);
        this.notepadscreen.pictButtonPressed();
    };

    BlackboardNotepad.prototype.okButtonPressed=function()
    {
        if (this.addpictsprite) {
            this.setblocked(false);
            this.removeChild(this.addpictsprite); //do not remove it, it does not hurt
            this.blackboardcont.addChild(this.addpictsprite);
            this.bbcacheDirty=true;
            var adps=this.addpictsprite;
            // todo report about new picture
            this.outgodispatcher.addPicture(null,null, null,adps.position.x/this.blackboardscale,
                                            adps.position.y/this.blackboardscale,
                                           adps.width/this.blackboardscale,adps.height/this.blackboardscale,
                                            this.addpictuuid);
            //this.addpictsprite.destroy();
            this.addpictsprite=null;
            this.addpictmode=0;
            this.reactivateToolBox();
        }
    };

    BlackboardNotepad.prototype.cancelButtonPressed=function()
    {
        if (this.addpictsprite) {
            this.setblocked(false);
            this.removeChild(this.addpictsprite);
            this.addpictsprite.destroy();
            this.addpictsprite=null;
            // todo report about new picture
            this.addpictmode=0;
            this.reactivateToolBox();
        }
    };

    BlackboardNotepad.prototype.reactivateToolBox = function() {
        if (this.toolbox) this.toolbox.reactivate();
    };

    BlackboardNotepad.prototype.enterAddPictureMode=function(uuid,url) {
        this.addpictmode=4; //stage of adding picture
        this.addpictuuid=uuid;
        this.addpictsprite=PIXI.Sprite.fromImage((url));

        this.addChild(this.addpictsprite);

    };







})();
