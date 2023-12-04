//bug: loading of last podcast / category continues if new selection is made before loading completes
//bug: if there is an error in the uploaded xml, the program crashes

//todo: don't allow clicking off the left column (one option must always be selected)
//todo: don't allow double clicking

//todo: add tooltips with instructions
//todo: allow user to set episode filenames (or regex for podcast episode names)
//todo: check keyboard nav for GUI

var displayIndex = 0;
const EPS_PER_PAGE = 10;

//---functions for loading the xml file containing the list of podcasts----------------------

function loadFile(e){

    var reader = new FileReader();
    reader.onerror = function(event){
        console.log("File could not be read! Code " + event.target.error.code)
    };
    reader.onload = function(event){
        var podsXml = reader.result;
        /////////////////////////////
        parseXmlDisplayLeftCol(podsXml);
        /////////////////////////////
    }
    reader.readAsText(e.target.files[0]) 
}

function parseXmlDisplayLeftCol(feedsXml){
    var parser = new DOMParser();
    var xmlDocument = parser.parseFromString(feedsXml,"text/xml");
    //var catsNdLst = xmlDocument.documentElement.childNodes;
    //todo: try out .children, which skips some stuff?
    var catsNdLst = xmlDocument.getElementsByTagName("body")[0].childNodes;
    catsNdLst.forEach(function(currCatNd){
        //ignore whitespace in xml (which is included in the NodeList as a Node.TEXT_NODE)
        if(currCatNd.nodeType == Node.ELEMENT_NODE){            //Category Level XML
            var catObj = {};
            catObj['title'] = currCatNd.attributes['title'].value;
            catObj['feedUrls'] = [];
            var catFeedsNdLst = currCatNd.childNodes;
            catFeedsNdLst.forEach(function(currFeedNd){
                if(currFeedNd.nodeType == Node.ELEMENT_NODE){   //Feed Level XML
                    catObj['feedUrls'].push(currFeedNd.attributes['xmlUrl'].value);
                }
            });
            /////////////////////
            addCategoryButton(catObj);
            /////////////////////
            catFeedsNdLst.forEach(function(currFeedNd){
                if(currFeedNd.nodeType == Node.ELEMENT_NODE){   //Feed Level XML
                    var podObj = {};
                    podObj['feedUrl'] = currFeedNd.attributes['xmlUrl'].value;
                    /////////////////////
                    addPodcastButton(podObj);
                    /////////////////////
                }
            });
        }
    });
}

//---functions for adding buttons to the page------------------------------------------------

function addCategoryButton(catObj){
    const catButton = document.createElement("a");
                                            ///////////////
    catButton.addEventListener('mousedown', selectCategory)
    //display                               ///////////////
    catButton.href = "#";
    catButton.text = catObj.title;
    catButton.classList.add("list-group-item", "list-group-item-action", "list-group-item-primary");
    //add custom data
    catButton['info'] = catObj;
    //add to the screen
    document.getElementById("podcastArea").appendChild(catButton);
}

function addPodcastButton(podObj){
    const podButton = document.createElement("a");
                                            //////////////
    podButton.addEventListener('mousedown', selectPodcast)
    //display                               //////////////
    podButton.href = "#";
    podButton.text = podObj.feedUrl;
    podButton.classList.add("list-group-item", "list-group-item-action", "list-group-item-secondary");
    //add custom data
    podButton['info'] = podObj;
    //add to the screen
    //todo: disable until the podcast info arrives
    document.getElementById("podcastArea").appendChild(podButton);

    //load the info of the podcast. I don't know how this works when it's async, but it does... (a closure?)
    feednami.load(podButton.info.feedUrl).then(res => {
            podButton.info['title'] = res.meta.title;
            podButton.info['desc'] = res.meta.description;
            podButton.info['link'] = res.meta.link;
            podButton.info['imgUrl'] = res.meta.image.url;
            podButton.info['text'] = res.meta.title;
            podButton.text = podButton.info.title //update display
        });
}

function addEpisodeButton(epObj){
    const epButton = document.createElement("a");
                                            //////////////
    epButton.addEventListener('mousedown', selectEpisode)
    //display                               //////////////
    epButton.href = "#";
    epButton.text = epObj.title;
    epButton.classList.add("list-group-item", "list-group-item-action", "list-group-item-secondary");
    //add custom data
    epButton['info'] = epObj;
    //add to the screen
    document.getElementById("episodeArea").appendChild(epButton);
}

function addEpisodeDownloadButton(epObj){
    const epButton = document.createElement("a");
    epButton.href = "#";
    epButton.text = epObj.title;
    epButton.classList.add("list-group-item", "list-group-item-action", "list-group-item-secondary");
    //add custom data
    epButton['info'] = epObj;
    //add to the screen
    document.getElementById("downloadArea").appendChild(epButton);
}

//---event handlers for when the buttons are clicked on--------------------------------------

function selectCategory(){
    displayIndex = 0; //todo: maybe save the pagination?
    const selectionTitle = document.createElement("h1");
    const selectionTitleText = document.createTextNode("Category: " + this.info.title);
    selectionTitle.appendChild(selectionTitleText);
    document.getElementById("podcastDescArea").replaceChildren(selectionTitle);
    document.getElementById("episodeDescArea").replaceChildren();
    document.getElementById("episodeArea").replaceChildren();
    ////////////////////
    loadEpisodesByCategory(this.info.feedUrls)
    ////////////////////
}

function selectPodcast(){
    displayIndex = 0;
    const selectionTitle = document.createElement("h1");
    const selectionTitleText = document.createTextNode(this.info.title);
    selectionTitle.appendChild(selectionTitleText);
    document.getElementById("podcastDescArea").replaceChildren(selectionTitle);
    document.getElementById("episodeDescArea").replaceChildren();
    document.getElementById("episodeArea").replaceChildren();
    //todo: add the description & other stuff
    ////////////////////
    loadEpisodesByPodcast(this.info.feedUrl)
    ////////////////////
}

function selectEpisode(){
    const selectionTitle = document.createElement("h1");
    const selectionTitleText = document.createTextNode(this.info.title);
    selectionTitle.appendChild(selectionTitleText);
    document.getElementById("episodeDescArea").replaceChildren(selectionTitle);
    //todo: add the description & other stuff
    ////////////////////
    addEpisodeDownloadButton(this.info)
    ////////////////////
}

function clearDownloadEpisodes(){
    document.getElementById("downloadArea").replaceChildren();
}

//---functions that request data-------------------------------------------------------------
//todo: separate out the data requests (one is contained in addPodcastButton)

function loadEpisodesByPodcast(feedUrl){
    feednami.load(feedUrl).then(feed => {
        //todo: shorten title if necessary
        var podTitle = feed.meta.title;
        var i;
        for(i=displayIndex; i<(displayIndex+EPS_PER_PAGE); i++){
            epObj = {};
            epObj['podTitle'] = podTitle;
            epObj['title'] = feed.entries[i].title;
            epObj['date'] = feed.entries[i].pubdate;
            epObj['desc'] = feed.entries[i].description;
            //todo try origlink
            epObj['link'] = feed.entries[i].link
            epObj['url'] = feed.entries[i].enclosures[0].url
            //todo set backup filename
            epObj['sugFilename'] = suggestFilename(epObj['url']);
            ////////////////////
            addEpisodeButton(epObj);
            ////////////////////
        }
        numEpsDisplayed = i-displayIndex;
    });
}

function loadEpisodesByCategory(feedUrls){
    feedUrls.forEach(function(feedUrl){
        //TODO: won't be in order
        feednami.load(feedUrl).then(feed => {
            i = displayIndex;
            epObj = {};
            epObj['podTitle'] = feed.meta.title;
            epObj['title'] = feed.entries[i].title;
            epObj['date'] = feed.entries[i].pubdate;
            epObj['desc'] = feed.entries[i].description;
            //todo try origlink
            epObj['link'] = feed.entries[i].link
            epObj['url'] = feed.entries[i].enclosures[0].url
            //todo set backup filename
            epObj['sugFilename'] = suggestFilename(epObj['url']);
            ////////////////////
            addEpisodeButton(epObj);
            ////////////////////
        });
    });                      
}

//---functions that generate the files-------------------------------------------------------

function generateTextfile(){
    const downloadList = document.getElementById("downloadArea").children
    var fileContent = "";
    for (const episode of downloadList) {
        fileContent = fileContent + JSON.stringify({'url':episode.info.url, 
                                                    'title':episode.info.title,
                                                    'podTitle':episode.info.podTitle}) + '\n';
    }
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent));
    element.setAttribute('download', 'episodes.json');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function generateHtmlfile(){
    const downloadList = document.getElementById("downloadArea").children
    var fileContent = "<html><body>";
    for (const episode of downloadList) {
        fileContent = fileContent + `<a href="${episode.info.url}">${episode.info.title} - ${episode.info.podTitle}</a><br />`;
    }
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(fileContent));
    element.setAttribute('download', 'episodes.html');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

//---unused functions------------------------------------------------------------------------

function formatDate(date){
    return 0;
}
/*
def formatDate(date):
    datetimeObj = datetime.strptime(date, '%a, %d %b %Y %H:%M:%S %z')
    dateStr = datetimeObj.strftime("%a %d-%b-%y")
    return dateStr
*/

function suggestFilename(url){
    return 0;
}
/*
def suggestFilename(url):
    urlPieces = url.split('/')
    numPieces = len(urlPieces)
    lastUrlPiece = urlPieces[numPieces-1]
    filename = re.match("^.*\.mp3", lastUrlPiece).group(0)
    return filename
*/