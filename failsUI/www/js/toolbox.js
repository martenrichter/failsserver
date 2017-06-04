/**
* @author Marten Richter
*/
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

(function() {

    CircleButtonsColl = function(toolbox,radius,notactivated)
    {
        PIXI.Container.call(this);
        this.position.x=0.0;
        this.position.y=0.0;

        this.toolbox = toolbox;

        if (notactivated) this.circlepos = 0;
        else this.circlepos=1;
        this.circledir = 0;

        this.radius = radius;
        this.items = [];

        this.backgroundgraphics=new PIXI.Graphics();
        this.backgroundgraphics.lineStyle(1.5, 0x001A00 ,0.3);
        this.backgroundgraphics.beginFill(0x3d3d3d,0.7);
        this.backgroundgraphics.drawCircle(0,0,radius+20);
        this.backgroundgraphics.endFill();
        this.addChild(this.backgroundgraphics);




    };

    CircleButtonsColl.prototype=Object.create( PIXI.Container.prototype);
    CircleButtonsColl.prototype.constructor = CircleButtonsColl;

    CircleButtonsColl.prototype.addButton=function(button) {
        this.items.push(button);
        this.addChild(button);
    };

    CircleButtonsColl.prototype.arrangeButtons=function() {
        var dangle=2.*Math.PI*this.circlepos/this.items.length;
        var items=this.items;
        var num=0;
        var radius=this.radius*this.circlepos;
        var scale=this.circlepos;

        var offset=0;

       /* if (this.circledir==-1) {
            offset=Math.PI*2.*(-this.circlepos);
        }*/

        for (num=0;num<items.length; num++) {
            var item=items[num];
            item.x=Math.sin(offset+dangle*num)*radius;
            item.y=-Math.cos(offset+dangle*num)*radius;
            item.scale.x=scale;
            item.scale.y=scale;
        }
        this.backgroundgraphics.scale.x=scale;
        this.backgroundgraphics.scale.y=scale;
    };

    CircleButtonsColl.prototype.activateInteractiveChilds=function(activated)
    {
        var items=this.items;
        var num=0;
        for (num=0;num<items.length; num++) {
            var item=items[num];
            item.interactive=activated;
        }
    }



    CircleButtonsColl.prototype.timeStep=function(timestep)
    {
        if (this.circledir) {
            this.circlepos+=this.circledir*timestep*0.002;
            if (this.circlepos<0) {
                this.circlepos=0;
                this.circledir=0;
                // trigger remove event
            }
            if (this.circlepos>1) {
                this.circlepos=1;
                this.circledir=0;
                this.activateInteractiveChilds(true);
            }
            this.arrangeButtons();
        }
    }

    //todo fade in and fade out

    CircleButtonsColl.prototype.startFadeIn=function()
    {
        if (this.circlepos==1) this.circlepos=0;
        this.circledir=1;
    };

    CircleButtonsColl.prototype.startFadeOut=function()
    {
        //this.circlepos=0;
         this.circledir=-1;
         this.activateInteractiveChilds(false);
    };

    CircleButtonsColl.prototype.isRemovable=function()
    {
        return (this.circlepos==0 && this.circledir==0);
    };

    CircleButtonsColl.prototype.checkAutoRemove=function(vistime)
    {
        if (this.circlepos==1. && this.circledir==0 && vistime>15000) return true;
        else return false;
    };


    FilledButton = function(toolbox,buttonid)
    {
        PIXI.Graphics.call(this);
        this.selected = false;
        this.toolbox = toolbox;
        this.buttonid = buttonid;
        this.interactive=true;

    };

    FilledButton.prototype=Object.create( PIXI.Graphics.prototype);
    FilledButton.prototype.constructor = FilledButton;

    FilledButton.prototype.drawButton = function() {
       // this.cacheAsBitmap=false;
        this.clear();
        this.drawButtonInternal();
        //this.cacheAsBitmap=true;
    }

    FilledButton.prototype.drawButtonInternal = function() {



        if (!this.selected) {
            this.lineStyle(1.5, 0x001A00 ,0.2);
            this.beginFill(0x3d3d3d,1);
        } else {
            this.lineStyle(1.5, 0x3d3d3d ,0.2);
            this.beginFill(0x001A00,0.7);
        }
        this.drawCircle(0,0,20);
        this.endFill();




    };

    FilledButton.prototype.tap =FilledButton.prototype.mousedown = function(mouse) {

        this.toolbox.selectTool(this.buttonid);
    };

    ScrollButton = function(toolbox,buttonid)
    {
        FilledButton.call(this,toolbox,buttonid);
        this.scrollmodeactiv=false;
        this.mousescrollx=this.mousescrolly=0;
    };

    ScrollButton.prototype=Object.create(FilledButton.prototype);
    ScrollButton.prototype.constructor = ScrollButton;

    ScrollButton.prototype.drawButtonInternal  = function() {
        FilledButton.prototype.drawButtonInternal.call(this);
        // Now draw arrows
        this.lineStyle(4,0xFFFFCC,1);
        this.moveTo(0,-15);
        this.currentPath.shape.closed=false;
        this.lineTo(0,15);
        this.moveTo(-6,8);
        this.currentPath.shape.closed=false;
        this.lineTo(0,15);
        this.moveTo(6,8);
        this.currentPath.shape.closed=false;
        this.lineTo(0,15);
        this.moveTo(-6,-8);
        this.currentPath.shape.closed=false;
        this.lineTo(0,-15);
        this.moveTo(6,-8);
        this.currentPath.shape.closed=false;
        this.lineTo(0,-15);
    };

    ScrollButton.prototype.touchstart=ScrollButton.prototype.mousedown = function(mouse) {

        this.scrollmodeactiv=true;
        this.selected=true;
        this.drawButton();
        this.mousescrollx = mouse.data.global.x;
        this.mousescrolly = mouse.data.global.y;
        this.toolbox.scrollboardSetReference();
    };

    ScrollButton.prototype.touchmove=ScrollButton.prototype.mouseover = ScrollButton.prototype.mousemove = function(mouse) {
        if (this.scrollmodeactiv) {
            this.toolbox.scrollboard(0,-mouse.data.global.y+this.mousescrolly);
        }
    };

    ScrollButton.prototype.touchendoutside= ScrollButton.prototype.touchend=ScrollButton.prototype.mouseup = ScrollButton.prototype.mouseupoutside= function(mouse) {

        this.scrollmodeactiv=false;
        this.selected=false;
        this.drawButton();
    };

    EndButton = function(toolbox,buttonid)
    {
        FilledButton.call(this,toolbox,buttonid);
    };

    EndButton.prototype=Object.create(FilledButton.prototype);
    EndButton.prototype.constructor = EndButton;

    EndButton.prototype.drawButtonInternal  = function() {
        FilledButton.prototype.drawButtonInternal.call(this);
        // Now draw arrows
        this.lineStyle(4,0xFFFFCC,1);
        this.arc(0,-2,12,0.35*Math.PI,0.65*Math.PI,true);
        this.moveTo(0,0);
        this.currentPath.shape.closed=false;
        this.lineTo(0,15);
    };

    EndButton.prototype.tap = EndButton.prototype.mousedown = function(mouse) {
        this.toolbox.endButtonPressed();
    };

    PictButton = function(toolbox,buttonid)
    {
        FilledButton.call(this,toolbox,buttonid);
    };

    PictButton.prototype=Object.create(FilledButton.prototype);
    PictButton.prototype.constructor = PictButton;

    PictButton.prototype.drawButtonInternal  = function() {
        FilledButton.prototype.drawButtonInternal.call(this);
        // Now draw arrows
        this.lineStyle(1,0xFFFFCC,0);
        this.beginFill(0xcc0000,0.7);
        this.drawEllipse(-5,-5,10,10);
        this.endFill();

        this.beginFill(0x00cc00,0.7);
        this.drawRect(-2,-2,15,15);
        this.endFill();


    };

   PictButton.prototype.tap= PictButton.prototype.mousedown = function(mouse) {
        this.toolbox.pictButtonPressed();
    };

    OkButton = function(toolbox,buttonid)
    {
        FilledButton.call(this,toolbox,buttonid);
    };

    OkButton.prototype=Object.create(FilledButton.prototype);
    OkButton.prototype.constructor = OkButton;

    OkButton.prototype.drawButtonInternal = function() {
        FilledButton.prototype.drawButtonInternal.call(this);
        // Now draw arrows
        this.lineStyle(4,0x00cc00,1);
        this.moveTo(-15,0);
        this.currentPath.shape.closed=false;
        this.lineTo(-8,15);
        this.lineTo(8,-8);
    };

   OkButton.prototype.tap= OkButton.prototype.mousedown = function(mouse) {
        this.toolbox.okButtonPressed();
    };

    CancelButton = function(toolbox,buttonid)
    {
        FilledButton.call(this,toolbox,buttonid);
    };

    CancelButton.prototype=Object.create(FilledButton.prototype);
    CancelButton.prototype.constructor = CancelButton;

    CancelButton.prototype.drawButtonInternal = function() {
        FilledButton.prototype.drawButtonInternal.call(this);
        // Now draw arrows
        this.lineStyle(4,0xcc0000,1);
        this.moveTo(-8,8);
        this.currentPath.shape.closed=false;
        this.lineTo(8,-8);
        this.moveTo(-8,-8);
        this.lineTo(8,8);
    };

    CancelButton.prototype.tap=CancelButton.prototype.mousedown = function(mouse) {
        this.toolbox.cancelButtonPressed();
    };

    DrawFilledButton = function(toolbox,buttonid,color,alpha,marker)
    {
        FilledButton.call(this,toolbox,buttonid);
        this.mycolor=color;
        this.myalpha=alpha;
        this.marker=marker;
    };

    DrawFilledButton.prototype=Object.create(FilledButton.prototype);
    DrawFilledButton.prototype.constructor = DrawFilledButton;

    DrawFilledButton.prototype.drawButtonInternal = function() {
        FilledButton.prototype.drawButtonInternal.call(this);
        // Now draw arrows
        if (!this.marker) {
            this.lineStyle(2,this.mycolor,this.myalpha);
        } else {
            this.lineStyle(2,0x99FF99,1.0);
        }
      /*  this.beginFill(this.mycolor,this.myalpha);
        this.drawCircle(0,0,10);
        this.endFill();*/
        this.moveTo(-10,-3);
        this.currentPath.shape.closed=false;
        this.lineTo(-8,3);
        this.lineTo(-6,-3);
        this.lineTo(-4,4);
        this.moveTo(-2,-4);
        this.currentPath.shape.closed=false;
        this.lineTo(0,3);
        this.lineTo(2,-5);
        this.lineTo(4,2);
        this.lineTo(6,8);
        this.lineTo(8,10);
        this.lineTo(10,12);
        this.lineTo(-9,13);
        if (this.marker) {
            this.lineStyle(8,this.mycolor,this.myalpha);
            this.moveTo(-10,0);
            this.currentPath.shape.closed=false;
            this.lineTo(0,-2);
            this.lineTo(12,2);
        }

    };




    ColorPickerButton = function(toolbox,color,pickerid,size,sizefac)
    {
        PIXI.Graphics.call(this);
        this.selected = false;
        this.mycolor = color;
        this.mysize = size;
        this.pickerid = pickerid;
        this.sizefac = sizefac;

        this.toolbox = toolbox;

    };

    ColorPickerButton.prototype=Object.create( PIXI.Graphics.prototype);
    ColorPickerButton.prototype.constructor = ColorPickerButton;

    ColorPickerButton.prototype.drawButton= function() {

        //this.cacheAsBitmap=false;
        this.clear();

        if (this.mysize*0.5<10) {
            this.lineStyle(0.5, 0x001A00 ,0);
            this.beginFill(0x001A00,1);
            this.drawCircle(0,0,10);
            this.endFill();
        }

        this.lineStyle(0, 0x001A00 ,1);
        this.beginFill(this.mycolor,this.myalpha);
        this.drawCircle(0,0,this.mysize*this.sizefac*0.5);
        this.endFill();
      //  this.cacheAsBitmap=true;




    };

    ColorPickerButton.prototype.tap =ColorPickerButton.prototype.mousedown = function(mouse) {
        this.toolbox.selectColor(this.pickerid,this.mycolor,this.mysize);
    };


    ToolBox = function(stage, blackboard)
    {
        PIXI.Container.call(this);
        this.blackboard=blackboard;
        this.blackboard.toolbox=this;
        this.stage=stage;

        this.position.x=0.93*this.blackboard.blackboardscale;
        this.position.y=0.1*this.blackboard.blackboardscale;
        var scalefac=1.2*0.45*this.blackboard.blackboardscale/1000;

        this.scale.x=scalefac;
        this.scale.y=scalefac;


        //this.ShadowFilter = new PIXI.filters.DropShadowFilter();

        //this.ShadowFilter.distance=5;
        this.BlurFilter = new PIXI.filters.BlurFilter();
        this.BlurFilter.blur=0.1;
        this.BlurFilter.strength=0.5;
        this.BlurFilter.resolution=2;

        //this.BloomFilter = new PIXI.filters.BloomFilter();
        //this.BloomFilter.blur=20;




        this.stage.addChild(this);

        this.maintools= new CircleButtonsColl(this,/*40*/45,true);
        this.addChild(this.maintools);

        this.pencolor=0x99FF99;
        this.markercolor=0xCCFF33;
        this.pensize=1.;



        this.endbutton = new EndButton(this,1);
        this.endbutton.drawButton();
        this.maintools.addButton(this.endbutton);

        this.pictbutton = new PictButton(this,6);
        this.pictbutton.drawButton();
        this.maintools.addButton(this.pictbutton);

        this.scrollbutton = new ScrollButton(this,2);
        this.scrollbutton.drawButton();
        this.maintools.addButton(this.scrollbutton);

        this.eraserbutton = new DrawFilledButton(this,3,0,1.,true);
        this.eraserbutton.drawButton();
        this.maintools.addButton(this.eraserbutton);

        this.markerbutton = new DrawFilledButton(this,4,this.markercolor,0.5,true);
        this.markerbutton.drawButton();
        this.maintools.addButton(this.markerbutton);

        this.penbutton = new DrawFilledButton(this,5,this.pencolor,1.0,false);
        this.penbutton.selected=true;
        this.penbutton.drawButton();
        this.maintools.addButton(this.penbutton);



        this.maintools.arrangeButtons();



        this.secondtools = null;
        this.secondtoolsremove = null;
        this.secondtoolstep = 0;
        this.secondtooltime = 0;

        this.lastUpdateTime = performance.now();

        //dynamics

        this.lastdrawpos = false;
        this.lastdrawposx = 0;
        this.lastdrawposy = 0;

        this.lastvx= 0;
        this.lastvy= 0;





        this.colorwheel = new CircleButtonsColl(this.blackboard,/*75*/80);
        //this.addChild(this.colorwheel);
        var colorwheelcolors = [0xFFFFFF,0x844D18,0xBFBFBF ,0x000000, 0xFF7373,
				0xFF0000,// for HS
                                0xFFAC62,0xFFF284,0xCAFEB8,
				0x00CD00, // for HS
				0x99C7FF, 0x2F74D0,
				0x0018CD, // for HS
				0xAE70ED,0xFE8BF0,0xFFA8A8];
        var it=0;
        for (it=0;it<colorwheelcolors.length;it++) {
            var newcolorbutton= new ColorPickerButton(this,colorwheelcolors[it],1,20,1);
            newcolorbutton.drawButton();
            this.colorwheel.addButton(newcolorbutton);
        }

        this.colorwheel.arrangeButtons();



        this.pensizewheel = new CircleButtonsColl(this,
                                                  65+16*0.001*this.blackboard.blackboardscale);
        //this.addChild(this.pensizewheel);
        var pensizesizes = [ 1,1.5,2,3,4,6,8,11,16];
        var it=0;
        for (it=0;it<pensizesizes.length;it++) {
            var newcolorbutton= new ColorPickerButton(this,0xffffff,2,
                                                      pensizesizes[it]*0.001*this.blackboard.blackboardscale,1./scalefac);
            newcolorbutton.drawButton();
            this.pensizewheel.addButton(newcolorbutton);
        }

        this.pensizewheel.arrangeButtons();



        this.tmcolorwheel = new CircleButtonsColl(this,/*78*/83);
        //this.addChild(this.tmcolorwheel);
        var tmcolorwheelcolors = [0xFF0066 ,0xFF00, 0xFFFF00,0xFF3300,0x6600FF,0xFF99, 0xFF,0xFFFF];
        var it=0;
        for (it=0;it<tmcolorwheelcolors.length;it++) {
            var newcolorbutton= new ColorPickerButton(this,tmcolorwheelcolors[it],3,20,1);
            newcolorbutton.blendModes=PIXI.BLEND_MODES.ADD;
            newcolorbutton.drawButton();
            this.tmcolorwheel.addButton(newcolorbutton);
        }

        this.tmcolorwheel.arrangeButtons();
      //  this.tmcolorwheel.filters = [this.BloomFilter];

        this.selectColor(3,tmcolorwheelcolors[2],20);
        this.selectColor(2,colorwheelcolors[0],pensizesizes[2]);
        this.selectColor(1,colorwheelcolors[0],10);



        this.filters=  [ this.BlurFilter/*, this.ShadowFilter*/];

        this.blackboard.setPenTool(colorwheelcolors[0],pensizesizes[2]);


    };

    ToolBox.prototype=Object.create( PIXI.Container.prototype);
    ToolBox.prototype.constructor = ToolBox;

    ToolBox.prototype.shutdown = function(){
        console.log("shutdown toolbox");
        this.stage.removeChild(this);
        this.destroy(true);
    };



    ToolBox.prototype.selectTool=function(buttonid)
    {
        var items=this.maintools.items;
        var itemit=0;
        for (itemit=0;itemit<items.length;itemit++) {
            var curitem=items[itemit];
            if (curitem.buttonid == buttonid) {
                if (!curitem.selected) this.secondtoolstep=0;
                curitem.selected=true;
            } else {
                curitem.selected=false;
            }
            curitem.drawButton();
        }



        switch(buttonid) {
        case 3: {
            this.secondtoolsremove = this.secondtools;
            this.secondtools =  null;
            if (this.secondtoolsremove) {
                this.secondtoolsremove.startFadeOut();
            }
            this.blackboard.setEraserTool(15); // was 30
        }; break;
        case 4: {
            this.blackboard.setMarkerTool(this.markercolor,20);

            if (this.secondtoolstep==0) {
                if (this.secondtoolsremove) {
                    this.removeChild(this.secondtoolsremove);
                    this.secondtoolsremove=null;
                }
                this.secondtoolsremove = this.secondtools;
                this.secondtools =  this.tmcolorwheel;
                if (this.secondtoolsremove) {
                    this.secondtoolsremove.startFadeOut();
                }
                this.addChildAt(this.secondtools,this.getChildIndex(this.maintools));
                this.secondtools.startFadeIn();
                this.secondtools.arrangeButtons();
                this.secondtoolstep++;
            }
        }; break;
        case 5: {
            this.blackboard.setPenTool(this.pencolor,this.pensize);
            if (this.secondtoolsremove) {
                this.removeChild(this.secondtoolsremove);
                this.secondtoolsremove=null;
            }
            this.secondtoolsremove = this.secondtools;

            if (this.secondtoolstep==0) this.secondtools =  this.colorwheel;
            else this.secondtools =  this.pensizewheel;

            this.secondtoolstep = (this.secondtoolstep+1) %2;
            if (this.secondtoolsremove) {
                this.secondtoolsremove.startFadeOut();
            }
            this.addChildAt(this.secondtools,this.getChildIndex(this.maintools));
            this.secondtools.startFadeIn();
            this.secondtools.arrangeButtons();
        }; break;
        default:{
            if (this.secondtoolsremove) {
                this.removeChild(this.secondtoolsremove);
                this.secondtoolsremove=null;
            }
            this.secondtoolsremove = this.secondtools;
            this.secondtools =  null;
            if (this.secondtoolsremove) {
                this.secondtoolsremove.startFadeOut();
            }
        }; break;
        };
        this.secondtooltime = performance.now();




    }

    ToolBox.prototype.updateGraphics=function(timestamp)
    {
        // figure out passed time
        var time = timestamp;//performance.now();
        var timestep = time-this.lastUpdateTime ;
        this.lastUpdateTime = time;

        if (this.maintools) this.maintools.timeStep(timestep);

        if (this.secondtools) {
            this.secondtools.timeStep(timestep);
            var vistime=time-this.secondtooltime;
            if (this.secondtools.checkAutoRemove(vistime)) {
                this.secondtools.startFadeOut();
                this.secondtoolstep=0;
            }

            // check for removal
            if (this.secondtools.isRemovable()) {
                this.removeChild(this.secondtools);
                this.secondtools = null;
            }
        }
         if (this.secondtoolsremove) {
            this.secondtoolsremove.timeStep(timestep);
            // check for removal
             if (this.secondtoolsremove.isRemovable()) {
                this.removeChild(this.secondtoolsremove);
                this.secondtoolsremove = null;
            }
        }

        this.doDynamics(timestep);
    };

    ToolBox.prototype.doDynamics=function(timestep)
    {
        if (this.scrollbutton.selected) return;
        var step=timestep;
        if (step>40 || !step) step = 40;
        step*=0.001;
        var posx= this.position.x;
        var posy= this.position.y;
        var dposx=0;
        var dposy=0;
        var dvx=0;
        var dvy=0;
        var height=this.blackboard.blackboardscale
                * this.blackboard.scrollheight;
        var width = this.blackboard.blackboardscale;
        var invwidth=1./(width);

        //damping;
        if (this.lastdrawpos) {

            dvy += -this.lastvy*5.0*invwidth*1000;
        }
        dvx += -this.lastvx*5.0*invwidth*1000;
        dvx += -this.lastvx*0.5*invwidth*1000;
        dvy += -this.lastvy*0.5*invwidth*1000;

        //damping with v^2 scaling
        var vlength=(this.lastvx*this.lastvx+this.lastvy*this.lastvy);
        var vnorm=Math.sqrt(vlength);
        var vlengthscale=vlength*invwidth*invwidth;
        if (vnorm!=0) {
            dvx+=-vlengthscale*this.lastvx/vnorm*100000;
            if (this.lastdrawpos) {
                dvy+=-vlengthscale*this.lastvy/vnorm*100000;
            }

        }
        // y -center hooks law

        dvy += - 0.5*(posy-height*0.4)/height*1000.;

        // x center using gaussian
        var xdiff=(posx-width*0.5);


        dvx += -4.*xdiff*invwidth*200.; // this is again hooks law

        dvx += +7.4*xdiff*invwidth*5.1*Math.exp(-xdiff*xdiff*0.5*invwidth*invwidth*5.1*5.1)*200.;

        // We want to be nearby the drawing tool but not to close
        if (this.lastdrawpos) {
            var disx=posx-this.lastdrawposx;
            var disy=posy-this.lastdrawposy;
            // new yukawa code
	    var yukcor=1000*1000*1000 *invwidth*invwidth;
            var dist=Math.sqrt(disx*disx+disy*disy+1000)*invwidth;
            var g1=0.05;
            var expfac1=Math.exp(-g1*dist);
            dvx+=-invwidth*10*disx*(-g1*expfac1-expfac1/dist) /dist/dist;
            dvy+=-invwidth*10*disy*(-g1*expfac1-expfac1/dist) /dist/dist;

            // old Gaussian code
            var expfac1=Math.exp(-(disx*disx+disy*disy)*0.5*invwidth*invwidth);
            dvx+=-14.*disx*invwidth*expfac1*200.;
            dvy+=-14.*disy*invwidth*expfac1*200.;

            /*var expfac2=Math.exp(-(disx*disx+disy*disy)*0.5*invwidth*invwidth*10.*10.);
            dvx+=50.*disx*invwidth*expfac2*200.;
            dvy+=50.*disy*invwidth*expfac2*200.;*/


        }

        this.lastvx += dvx * step;
        this.lastvy += dvy * step;

        posx=0.93*this.blackboard.blackboardscale;//static case
      //  posx += this.lastvx * step;
        posy += this.lastvy * step;

        if (posy<-0.075*height) { //overrun
          posy=1.02*height;
          this.lastvy=0;
        } else if (posy>1.075*height) {
          posy=-0.02*height;
          this.lastvy=0;
        }



        //console.log("dodyn",this.position.x,this.position.y,this.lastdrawposx,this.lastdrawposy);
        this.position.x = posx;
        this.position.y = posy;

      /*  this.lastdrawpos = false;
        this.lastdrawposx = 0;
        this.lastdrawposy = 0;

        this.lastvx= 0;
        this.lastvy= 0;*/


    };

    ToolBox.prototype.selectColor=function(pickerid,color,size)
    {
        this.secondtooltime = performance.now();
        switch (pickerid) {
        case 1: {
            this.pencolor=color;
            this.penbutton.mycolor=color;
            this.penbutton.drawButton();
            var it=0;
            var pslist=this.pensizewheel.items;

             for (it=0;it<pslist.length;it++) {
                 var cur=pslist[it];
                 cur.mycolor=color;
                 cur.drawButton();
             }
            this.blackboard.setPenTool(this.pencolor,this.pensize);

        }; break;
        case 2: {
            this.pensize=size;
            this.blackboard.setPenTool(this.pencolor,this.pensize);
        }; break;
        case 3: {
            this.markercolor=color;
            this.markerbutton.mycolor=color;
            this.markerbutton.drawButton();
            this.blackboard.setMarkerTool(this.markercolor,20);
        }; break;
        };
    };

    ToolBox.prototype.scrollboardSetReference=function()
    {
         var blackboard=this.blackboard;
        this.scrollboardreference= blackboard.getStartScrollboardTB();
        this.scrolltoolposref=this.position.y;
    };

    ToolBox.prototype.scrollboard=function(scrollx,scrolly)
    {
        this.position.y=this.scrolltoolposref-scrolly;
        var blackboard=this.blackboard;
        blackboard.scrollboardTB(scrollx,scrolly,this.scrollboardreference);
    };

    ToolBox.prototype.reportScroll=function()
    {
        this.lastdrawpos=false;
    };

    ToolBox.prototype.reportDrawPos=function(x,y)
    {
        this.lastdrawposx=x;
        this.lastdrawposy=y;
        this.lastdrawpos=true;
    };

    ToolBox.prototype.endButtonPressed = function()
    {
        this.blackboard.endButtonPressed();
        this.maintools.startFadeOut();
        if (this.secondtools) {
            this.secondtools.startFadeOut();
            this.secondtoolstep=0;
        }
    };

    ToolBox.prototype.pictButtonPressed = function()
    {
        this.blackboard.pictButtonPressed();
        this.maintools.startFadeOut();
        if (this.secondtools) {
            this.secondtools.startFadeOut();
            this.secondtoolstep=0;
        }
    };

    ToolBox.prototype.reactivate = function(){
        console.log("reactivate");
         this.maintools.startFadeIn();
    };


    ConfirmBox = function(stage, blackboard)
    {
        PIXI.Container.call(this);
        this.blackboard=blackboard;
        this.blackboard.confirmbox=this;
        this.stage=stage;

        this.position.x=0;
        this.position.y=0;
        var scalefac=1.2*0.45*this.blackboard.blackboardscale/1000;

        this.scale.x=scalefac;
        this.scale.y=scalefac;


        //this.ShadowFilter = new PIXI.filters.DropShadowFilter();

        //this.ShadowFilter.distance=2*this.blackboard.blackboardscale/1920;
        this.BlurFilter = new PIXI.filters.BlurFilter();
        this.BlurFilter.blur=0.1;
        this.BlurFilter.strength=0.5;
        this.BlurFilter.resolution=2;

       // this.BloomFilter = new PIXI.filters.BloomFilter();
        //this.BloomFilter.blur=20;



        this.stage.addChild(this);

        this.buttons= new CircleButtonsColl(this,/*40*/20,true);
        this.addChild(this.buttons);


        this.okbutton = new OkButton(this,1);
        this.okbutton.drawButton();
        this.buttons.addButton(this.okbutton);

        this.cancelbutton = new CancelButton(this,2);
        this.cancelbutton.drawButton();
        this.buttons.addButton(this.cancelbutton);


        this.buttons.arrangeButtons();


        this.lastUpdateTime = performance.now();


        this.filters=  [ this.BlurFilter/*, this.ShadowFilter*/];


    };

    ConfirmBox.prototype=Object.create( PIXI.Container.prototype);
    ConfirmBox.prototype.constructor = ConfirmBox;


    ConfirmBox.prototype.shutdown = function(){
        console.log("shutdown confirmbox");
        this.stage.removeChild(this);
        this.destroy(true);
    };


    ConfirmBox.prototype.updateGraphics=function(timestamp)
    {
        // figure out passed time
        var time = timestamp;//performance.now();
        var timestep = time-this.lastUpdateTime ;
        this.lastUpdateTime = time;

        if (this.buttons) this.buttons.timeStep(timestep);


    };

    ConfirmBox.prototype.reactivate = function(position){
        this.position.x=position.x;
        this.position.y=position.y;
        this.buttons.startFadeIn();
    };

    ConfirmBox.prototype.okButtonPressed = function()
    {
        this.blackboard.okButtonPressed();
        this.buttons.startFadeOut();

    };

    ConfirmBox.prototype.cancelButtonPressed = function()
    {
        this.blackboard.cancelButtonPressed();
        this.buttons.startFadeOut();
    };







}());
