import os
import sys
import requests
import wget
import re
import json

DL_LIST_DEFAULT = "episodes.json"
# DEBUG_FILE = "http_responses.json"

### function for creating the mp3 filename ###
def makeFilename(url):
	urlPieces = url.split('/')
	numPieces = len(urlPieces)
	lastUrlPiece = urlPieces[numPieces-1]
	filename = re.match("^.*\.mp3", lastUrlPiece).group(0)
	return filename

### runs all functions to modify the url ###
def modifyUrl(url):
	url = removeOuterUrl(url)
	url = url.replace("https://", "http://")
	url = addHTTP(url)
	return str(url)
###
### function for download links that are wrapped in a tracker (might cause bad server response) ###
def removeOuterUrl(url):
	match = re.search("/[A-Z|a-z|0-9|-|_|~|\.]*\.[A-Z|a-z]*/", url)
	if match:
		url = url[match.start()+1:]
		return removeOuterUrl(url)
	return url
###
### function to add http if needed since we're not in a web browser ###
def addHTTP(url):
	match = re.match("http://", url)
	if not match:
		return "http://" + url
	else:
		return url

### function for doing the initial http request and writing to the log file ###
def doRequest(url):
	result = requests.get(url)
	return result.status_code

### function for downloading the mp3 ###
def doDownload(url, filename):
	print("\nattempting download of " + url)
	try:
		result = wget.download(url, filename)
	except:
		result = "WGET Exception: download failed"
	return result

# allows you to specify another location of the episodes.json file if you like
if sys.argv[1]=="":
	dlList = DL_LIST_DEFAULT
else:
	dlList = sys.argv[1]
print ("Downloading episodes listed in: "+dlList)
# todo: make this so it doesn't stall if a download is taking literally forever
# todo: some error handling for files that aren't correct or won't open...
with open(dlList, 'r') as downloadsList:
	line = downloadsList.readline()
	while line:
		#get the episode object
		epObj = json.loads(line)
		epObj['filename'] = makeFilename(epObj['url']);
		fName = epObj['filename']
		url = epObj['url']
		if not os.path.exists(fName):
			result = doRequest(url)
			if result==200:
				result = doDownload(url, fName)
				# may work or not
				print("\n"+result + " for "+str(epObj['title']))
			else:
				url = modifyUrl(url)
				result = doRequest(url)
				if result==200:
					result = doDownload(url, fName)
					### may work or not
					print("\n"+result + " for "+str(epObj['title']))
				else:
					# can't properly reach server, show http request error
					print("\nHTTP Error " + result + " for "+str(epObj['title']))
		else:
			print("\n"+str(epObj['title'])+": Already Exists. Please delete ("+fName+") to re-download.")

#		with open(DEBUG_FILE, 'a') as dbugF:
#			dbugF.write(str(result))
#			dbugF.write("\t"+epObj['title'])
#			dbugF.write("\t"+epObj['url']) # note: this is only the original url
#			dbugF.write("\t"+epObj['filename'])
#			dbugF.write('\n')

		# go to the next line of the file (next episode in the download list)
		line = downloadsList.readline()