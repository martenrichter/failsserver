@echo off
echo "This is the sync script" 

echo dirname %1 

:again
if not "%2" == "" (
	echo file %1 %2 
	shift /2
	goto again
)