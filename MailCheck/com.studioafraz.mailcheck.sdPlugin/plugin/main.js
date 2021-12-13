let websocket = null,
    pluginUUID = null,
    apiKey = "",
    provider = "";

var fetchTimer;

function connectElgatoStreamDeckSocket(
    inPort,
    inPluginUUID,
    inRegisterEvent,
    inInfo
) {
    pluginUUID = inPluginUUID;

    // Open the web socket
    websocket = new WebSocket("ws://localhost:" + inPort);

    websocket.onopen = function () {
        // WebSocket is connected, register the plugin
        const json = {
            event: inRegisterEvent,
            uuid: inPluginUUID,
        };

        websocket.send(JSON.stringify(json));
    };

    websocket.onmessage = function (evt) {
        // Received message from Stream Deck
        const jsonObj = JSON.parse(evt.data);
        const context = jsonObj["context"];
		
		let fetcherURL = "";
		let backgroundFetching = "true";
		let frequency = 1000 * 60 * 3;
		let imapServers = "";
		let imapUsers = "";
		let imapPasswords = "";
		
		let allowAnimations = "true";
		let styleIconColorDefault = "transparent";
		let styleIconColorUnread = "#007aff";
		let styleTitleDisplayType = "true";
		let styleTitleCustomText = "";
		let styleTitleCustomPosition = "over";
		
		
		
        if (jsonObj["event"] === "didReceiveSettings" || jsonObj["event"] === "willAppear" || jsonObj["event"] === "keyDown") { //After updating the settings via Property Inspector OR when the plugin just gets displayed OR on Button Press

			if ( //Check if all required settings were set
				jsonObj.payload.settings != null &&
				jsonObj.payload.settings.hasOwnProperty("fetcherURL") &&
				jsonObj.payload.settings.hasOwnProperty("imapServers") &&
				jsonObj.payload.settings.hasOwnProperty("imapUsers") &&
				jsonObj.payload.settings.hasOwnProperty("imapPasswords")

			) {
				fetcherURL = jsonObj.payload.settings["fetcherURL"];
				backgroundFetching = jsonObj.payload.settings["backgroundFetching"];
				
				
				imapServers = jsonObj.payload.settings["imapServers"];
				imapUsers = jsonObj.payload.settings["imapUsers"];
				imapPasswords = jsonObj.payload.settings["imapPasswords"];
				
				if (jsonObj.payload.settings["frequency"] != "3" && jsonObj.payload.settings["frequency"] != ""){ //Check for custom value
					frequency = 1000 * 60 * Number(jsonObj.payload.settings["frequency"]);
				}
				
				allowAnimations = jsonObj.payload.settings["allowAnimations"];
				
				if (jsonObj.payload.settings["styleIconColorDefault"] != "transparent" && jsonObj.payload.settings["styleIconColorDefault"] != ""){ //Check for custom value
					styleIconColorDefault = jsonObj.payload.settings["styleIconColorDefault"];
				}
				
				if (jsonObj.payload.settings["styleIconColorUnread"] != "#007aff" && jsonObj.payload.settings["styleIconColorUnread"] != ""){ //Check for custom value
					styleIconColorUnread = jsonObj.payload.settings["styleIconColorUnread"];
				}
				
				styleTitleDisplayType = jsonObj.payload.settings["styleTitleDisplayType"];
				
				if (jsonObj.payload.settings["styleTitleCustomText"] != ""){ //Check for custom value
					styleTitleCustomText = jsonObj.payload.settings["styleTitleCustomText"];
				}
				
				styleTitleCustomPosition = jsonObj.payload.settings["styleTitleCustomPosition"];
			}
            
			clearInterval(fetchTimer); // Stop timer with old values to start new timer with new values
			
			sendRequest(context,fetcherURL,imapServers,imapUsers,imapPasswords,allowAnimations,styleIconColorDefault,styleIconColorUnread,styleTitleDisplayType,styleTitleCustomText,styleTitleCustomPosition);
			
			if (backgroundFetching != "false"){ //Check if Background Fetching is not disabled
				fetchTimer = setInterval(function() { sendRequest(context,fetcherURL,imapServers,imapUsers,imapPasswords,allowAnimations,styleIconColorDefault,styleIconColorUnread,styleTitleDisplayType,styleTitleCustomText,styleTitleCustomPosition); },frequency);
			}
			
        }
		
		if (jsonObj["event"] === "keyDown") { //For debugging
			//START Debug
			let jsonDeck = {
				event: "setTitle",
				context,
				payload: {
					title: frequency.toString(),
				},
			};

			 //websocket.send(JSON.stringify(jsonDeck));
			//END Debug
		}
		
    };
}



function sendRequest(context,fetcherURL,imapServers,imapUsers,imapPasswords,allowAnimations,styleIconColorDefault,styleIconColorUnread,styleTitleDisplayType,styleTitleCustomText,styleTitleCustomPosition) {

	let url = fetcherURL;
	var servers = imapServers;
	var users = imapUsers;
	var passwords = imapPasswords;	
	
	if (/\r|\n/.exec(servers)){ //Check if multiple values entered
		let dataArray = [];
		dataArray = servers.split(/\r|\n/); //Split into array
		servers = dataArray.join("splitMarker"); //Join and use "splitMarker" as seperator
	}
	
	if (/\r|\n/.exec(users)){ //Check if multiple values entered
		let dataArray = [];
		dataArray = users.split(/\r|\n/); //Split into array
		users = dataArray.join("splitMarker"); //Join and use "splitMarker" as seperator
	}
	
	if (/\r|\n/.exec(passwords)){ //Check if multiple values entered
		let dataArray = [];
		dataArray = passwords.split(/\r|\n/); //Split into array
		passwords = dataArray.join("splitMarker"); //Join and use "splitMarker" as seperator
	}
	
	let params = "?servers=" + servers + "&users=" + users + "&passwords=" + passwords;
	let allowAnimationsStatus = allowAnimations;
	let styleIconColorDefaultValue = styleIconColorDefault;
	let styleIconColorUnreadValue = styleIconColorUnread;
	let styleTitleDisplayTypeValue = styleTitleDisplayType;
	let styleTitleCustomTextValue = styleTitleCustomText;
	let styleTitleCustomPositionValue = styleTitleCustomPosition;
	
	let request = new XMLHttpRequest();	
    request.open("POST", url + params);
	request.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    request.send();
	
    request.onreadystatechange = function () {
        if (request.readyState === XMLHttpRequest.DONE) {
            if (request.status === 200) {
				let titleContent = request.responseText;
				let titleContentWording = "";
				
				if ( !isNaN(titleContent) ) { //Check if url response contains only a number
					
					if (titleContent > 0) { //At least one unread mail found
					
						if (titleContent == 1) {
							titleContentWording = "\nMail";
						}
						else {
							titleContentWording = "\nMails";
						}
						
						if (allowAnimationsStatus == "true"){ //Animations enabled
							let canvas = document.getElementById("idCanvas");
							let ctx = canvas.getContext("2d");
							 
							function drawCircle(x){
								ctx.lineWidth = 2;
								ctx.beginPath();
								ctx.arc(36,36,x+3,0,2*Math.PI);
								ctx.strokeStyle = styleIconColorUnreadValue;
								ctx.stroke();
								
							}

							ctx.clearRect(0,0,72,72);
							drawCircle(54/3);
						  
							let dataUrl = canvas.toDataURL();
							let jsonDeckImg = {
								event: "setImage",
								context,
								payload: {
									image: dataUrl,
								},
							};
							websocket.send(JSON.stringify(jsonDeckImg));
							
							setTimeout(function (){

								ctx.clearRect(0,0,72,72);
								drawCircle(72/3);	
								dataUrl = canvas.toDataURL();
								jsonDeckImg = {
									event: "setImage",
									context,
									payload: {
										image: dataUrl,
									},
								};
								websocket.send(JSON.stringify(jsonDeckImg));

							}, 100);
						
						}
						else { //Animations disabled
							let jsonDeck = {
							event: "setImage",
							context,
							payload: {
								image: "data:image/svg+xml;charset=utf8,<svg height=\"72\" width=\"72\"><rect x=\"0\" y=\"0\" width=\"72\" height=\"72\" fill=\"" + styleIconColorUnreadValue + "\" /></svg>"
								},
							};

							websocket.send(JSON.stringify(jsonDeck));
						}
						
					}
					else { //No unread mails found
						titleContentWording = "\nMails";
					
						let jsonDeck = {
						event: "setImage",
						context,
						payload: {
							image: "data:image/svg+xml;charset=utf8,<svg height=\"72\" width=\"72\"><rect x=\"0\" y=\"0\" width=\"72\" height=\"72\" fill=\""+ styleIconColorDefaultValue +"\" /></svg>"
								},
						};

						websocket.send(JSON.stringify(jsonDeck));
					}
				
					if (styleTitleDisplayTypeValue == "false") { //Check if Title Display is disabled
						let jsonDeck = {
							event: "setTitle",
							context,
							payload: {
								title: titleContent,
							},
						};

						websocket.send(JSON.stringify(jsonDeck));
					}
					else { //Title Display enabled
						if (styleTitleCustomTextValue != ""){
							if (styleTitleCustomPositionValue == "over"){
								titleContent = styleTitleCustomTextValue + "\n" + titleContent;
							}
							else {
								titleContent = titleContent + "\n" + styleTitleCustomTextValue;
							}
						}
						else {
							titleContent = titleContent + titleContentWording;
						}
						
						let jsonDeck = {
							event: "setTitle",
							context,
							payload: {
								title: titleContent,
							},
						};

						websocket.send(JSON.stringify(jsonDeck));
					}								
				
				}
				else {
					let titleContent = "Config\nError";
					let json = {
						event: "setTitle",
						context,
						payload: {
							title: titleContent,
						},
					};
					websocket.send(JSON.stringify(json));
					
					let jsonDeck = {
					event: "setImage",
					context,
					payload: {
						image: "data:image/svg+xml;charset=utf8,<svg height=\"72\" width=\"72\"><rect x=\"0\" y=\"0\" width=\"72\" height=\"72\" fill=\"#ff3b30\" /></svg>"
						},
					};

					websocket.send(JSON.stringify(jsonDeck));
				}

            } else {
				let titleContent = "Status\nError";
                let json = {
                    event: "setTitle",
                    context,
					payload: {
                        title: titleContent,
                    },
                };
                websocket.send(JSON.stringify(json));
				
				let jsonDeck = {
				event: "setImage",
				context,
				payload: {
					image: "data:image/svg+xml;charset=utf8,<svg height=\"72\" width=\"72\"><rect x=\"0\" y=\"0\" width=\"72\" height=\"72\" fill=\"#ff3b30\" /></svg>"
					},
				};

				websocket.send(JSON.stringify(jsonDeck));
            }
        }
    };
}

