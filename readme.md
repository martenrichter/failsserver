Note of end of life
===================
Fails is now deprecated. It's successor fails components is currently under active development!

License
========
Fails (Fancy Automated Internet Lecture System)
Copyright (C) 2015-2017  Marten Richter

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

See license file for details.


Please look for additional information about licenses of third party
contributions (like libraries, templates, patches ) into the respective files
the library folder and into the repository.

Introduction
============
Fails (Fancy Automated Internet Lecture System) is a simple to use system to
record lectures. It is fully HTML5 based on should run in many browsers.
It is specifically designed for the use of multiple screens and projectors and
captures the spirit of traditional blackboards and transfers to modern computers.

The software is centred around the concept of screens.
A docent logs into the system opens a lecture in one browser window.
For other projectors additional browser windows can be opened as additional
screens, which shows the content previously visible on the main screen.
Most major browsers should work with fails and most devices will. However
a PC with sufficient performance and graphics card and a recent Chrome browser
is recommendated.

The whole system is designed to make the system as easy as possible for the
docent and to reduce workload for administrative staff.
The course of the docent is automatically preselected and even the
toolbox is intelligent and keeps enough distance to not interfere with current
writing and drawing, but is always close enough to be easy reachable.
The lecture content is automatically saved and exported to html to web storage
at the end of the lecture.
The design and feature set of the software is the result of years of experiences
 in administrating and supporting automatic transfer systems for lectures and
 in giving lecture to students in physics.
I wrote this system, since comparable software for handling multiple projectors
is not on the market and really wanted to use such a system for my lectures.

Nevertheless in its current state Fails is designed for small units of
an university and has not sufficient user management abilities for handling
a whole university. But it has now the capability to connect to external
services, that provides users and groups and may in this way capable to serve
lager entities. Fails does not include palm detection and such turning off touch for
wacom tablets is recommendated.
Also other flaws may be possible, since the software is only tested on very
small range of devices.

Basic setup (Administrator)
===========================

Fails runs on servers using node.js.
For install fails, do the following:

1) Install a recent node.js version.
2) Checkout the recent git of fails.
3) Install required modules by running:

npm install

in fails directory and in failsUI/www subdirectory.

4) Rename config.js.example to config.js and configure the ports of the
webserver, keys for authentification, ssl server keys, hostname
and userauthentification in javascript.
Fails should only be configured by skilled administrators with good javascript
knowledge, since a bad configuration of fails may pose serious security
vulnerabilities. In config.js you can also connect to external services for
handling users and groups for every course in addition to fails own
permission system, which grants only global access to all lectures.

5) Create a data directory in fails working directory for storing lectures.
Since fails is currently designed for small units, lectures are currently stored
on file system.

6) After finishing lectures, html files and pdf will be transfered to web storage.
Therefore a skript needs to be created, that handles the transfer file transfer.
See sync.bat as template, the skript name needs to be specified in config.js and
on linux will also work with other shells like bash.
Define also a supersuperuser, which is allowed to do the initial login
and required to add other users allowed to use fails and to create terms, courses,
and lectures.
First argument is source file name in fails directory and second argument is
destination file name on your webstorage.
Do not attempt to export the data directory directly, since it contains
additional files with information, that should be kept private to the server.

7) Start the server with

node failsapp.js

8) Connect to the webserver for opening the login window.
Open screens by adding /screen to the url of your webserver

The web based configuration should be more or less self explanatory.
