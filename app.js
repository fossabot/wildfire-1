/**
 * Created by ian on 24/04/2016.
 */

var events = [];
var recording_start_time = 0;
var recording_end_time = 0;
var simulating = false;

document.addEventListener('visibilitychange', function(){
    if (!document.hidden) {
        populateEvents();
    }
});

function populateEvents() {
    chrome.storage.local.get('events', function (result) {
        events = result.events;
        document.getElementById('events').innerHTML = ""; // reset table

        if (events.length<1) {
            var eventNode = document.createElement("tr");
            eventNode.innerHTML = '<tr><td style="text-align: center;" colspan="5">No events yet!</td></tr>';
            document.getElementById('events').appendChild(eventNode);
        } else {
            recording_start_time = events[0].time;
        }

        for (var i=0; i<events.length; i++) {
            /* Event Time */
            var event_time = ((events[i].time-recording_start_time)/1000).toFixed(1) + "s";

            /* Event Type */
            var event_type = "";
            switch (events[i].evt) {
                case 'begin_recording':
                    event_type = "Begun Recording";
                    event_time = "-";
                    break;
                case 'end_recording':
                    event_type = "Ended Recording";
                    break;
                case 'mousedown':
                    event_type = "Mouse Down";
                    break;
                case 'mouseup':
                    event_type = "Mouse Up";
                    break;
                case 'click':
                    event_type = "Mouse Clicked";
                    break;
                case 'keydown':
                    event_type = "Key Down";
                    break;
                case 'keyup':
                    event_type = "Key Up";
                    break;
                case 'keypress':
                    event_type = "Key Pressed";
                    break;
                case 'tabchange':
                    event_type = "Changed Tabs";
                    if (events[i].evt_data.url=="chrome://newtab/")
                        event_type = "Opened New Tab";
                    break;
                default:
                    event_type = events[i].evt;
            }

            /* Event URL */
            var event_url = "&nbsp;";
            if (events[i].evt_data.url) {
                event_url = events[i].evt_data.url;
                if (event_url.length>57)
                    event_url = event_url.substr(0, 57) + "...";
            }

            /* Event Details */
            var event_data = "";
            if (events[i].evt=="keydown") {
                event_data = "Pressed down on the '" + String.fromCharCode(events[i].evt_data.keyCode).toLowerCase() + "' key";
            } else if (events[i].evt=="keyup") {
                event_data = "Released the '" + String.fromCharCode(events[i].evt_data.keyCode).toLowerCase() + "' key";
            } else if (events[i].evt=="keypress") {
                event_data = "Pressed the '" + String.fromCharCode(events[i].evt_data.keyCode).toLowerCase() + "' key";
            } else if (events[i].evt=="mousedown") {
                event_data = "Began clicking at coordinates (" + events[i].evt_data.clientX + "," + events[i].evt_data.clientY + ")";
            } else if (events[i].evt=="mouseup") {
                event_data = "Finished clicking at coordinates (" + events[i].evt_data.clientX + "," + events[i].evt_data.clientY + ")";
            } else if (events[i].evt=="click") {
                event_data = "Clicked at coordinates (" + events[i].evt_data.clientX + "," + events[i].evt_data.clientY + ")";
            }

            var innerHTML = "<td class=\"fs15 fw600 hidden-xs\">" + event_time + "</td>" +
                "<td class=\"\">" + event_type + "</td>" +
                "<td class=\"hidden-xs\">" + event_url + "</td>" +
                "<td class=\"hidden-xs\">" + event_data + "</td>" +
                "<td class=\"text-right\">" +
                "<button type=\"button\" class=\"btn btn-xs btn-danger\"><i class=\"fa fa-times\"></i></button>" +
                "</td>";

            var eventNode = document.createElement("tr");
            eventNode.innerHTML = innerHTML;
            document.getElementById('events').appendChild(eventNode);
        }
    });
}

function addListener(element, eventName, handler) {
    if (element.addEventListener) {
        element.addEventListener(eventName, handler, false);
    }
    else if (element.attachEvent) {
        element.attachEvent('on' + eventName, handler);
    }
    else {
        element['on' + eventName] = handler;
    }
}

function removeListener(element, eventName, handler) {
    if (element.addEventListener) {
        element.removeEventListener(eventName, handler, false);
    }
    else if (element.detachEvent) {
        element.detachEvent('on' + eventName, handler);
    }
    else {
        element['on' + eventName] = null;
    }
}

/*
 ** simulate(document.getElementById("btn"), "click", { clientX: 123, clientY: 321 })
 */

function constructElementIdentifier(path) {
    var js_string = "document";
    for (var i=path.length-2; i>=0; i--) {
        js_string += ".childNodes[" + path[i].childIndex + "]";
    }

    return js_string;
}

function runSimulation() {
    if (!simulating && events.length>2) {
        chrome.notifications.create("",{
            type: "basic",
            title: "Wildfire",
            message: "Simulation starting...",
            iconUrl: "icon-128.png"
        });

        simulating = true;
        chrome.windows.create({
            "url":"chrome-extension://" + chrome.runtime.id + "/new.html",
            "focused":true,
            "left":0,
            "top":0,
            "width":1920,
            "height":1080
        },function(new_window) {
            for (var i = 0; i < events.length; i++) {
                switch (events[i].evt) {
                    case 'begin_recording':
                        break;
                    case 'end_recording':
                        setTimeout(function(new_window) {
                            chrome.windows.remove(new_window.id,function(){

                            });
                            chrome.notifications.create("",{
                                type: "basic",
                                title: "Wildfire",
                                message: "Simulation completed",
                                iconUrl: "icon-128.png"
                            });
                        }, events[i].time-recording_start_time, new_window);
                        break;
                    case 'mousedown':
                        setTimeout(function(new_window, events, i) {
                            chrome.tabs.executeScript(new_window.tabs[0].id,{
                                code:"simulate(" +
                                    constructElementIdentifier(events[i].evt_data.path) +
                                    ",'mousedown', { clientX: " +
                                    events[i].evt_data.clientX +
                                    ", clientY: " +
                                    events[i].evt_data.clientX +
                                    " });"
                            });
                        }, events[i].time-recording_start_time, new_window, events, i);
                        break;
                    case 'mouseup':
                        setTimeout(function(new_window, events, i) {
                            chrome.tabs.executeScript(new_window.tabs[0].id,{
                                code:"simulate(" +
                                constructElementIdentifier(events[i].evt_data.path) +
                                ",'mouseup', { clientX: " +
                                events[i].evt_data.clientX +
                                ", clientY: " +
                                events[i].evt_data.clientX +
                                " });"
                            });
                        }, events[i].time-recording_start_time, new_window, events, i);
                        break;
                    case 'click':
                        setTimeout(function(new_window, events, i) {
                            chrome.tabs.executeScript(new_window.tabs[0].id,{
                                code:"simulate(" +
                                constructElementIdentifier(events[i].evt_data.path) +
                                ",'click', { clientX: " +
                                events[i].evt_data.clientX +
                                ", clientY: " +
                                events[i].evt_data.clientX +
                                " });"
                            });
                        }, events[i].time-recording_start_time, new_window, events, i);
                        break;
                    case 'keydown':
                        setTimeout(function(new_window, events, i) {
                            chrome.tabs.executeScript(new_window.tabs[0].id,{
                                code:"simulate(" +
                                constructElementIdentifier(events[i].evt_data.path) +
                                ",'keydown', { clientX: " +
                                events[i].evt_data.clientX +
                                ", clientY: " +
                                events[i].evt_data.clientX +
                                " });"
                            });
                        }, events[i].time-recording_start_time, new_window, events, i);
                        break;
                    case 'keyup':
                        setTimeout(function(new_window, events, i) {
                            chrome.tabs.executeScript(new_window.tabs[0].id,{
                                code:"simulate(" +
                                constructElementIdentifier(events[i].evt_data.path) +
                                ",'keyup', { clientX: " +
                                events[i].evt_data.clientX +
                                ", clientY: " +
                                events[i].evt_data.clientX +
                                " });"
                            });
                        }, events[i].time-recording_start_time, new_window, events, i);
                        break;
                    case 'keypress':
                        setTimeout(function(new_window, events, i) {
                            chrome.tabs.executeScript(new_window.tabs[0].id,{
                                code:"simulate(" +
                                constructElementIdentifier(events[i].evt_data.path) +
                                ",'keypress', { clientX: " +
                                events[i].evt_data.clientX +
                                ", clientY: " +
                                events[i].evt_data.clientX +
                                " });"
                            });
                        }, events[i].time-recording_start_time, new_window, events, i);
                        break;
                    case 'tabchange':
                        setTimeout(function(events, i) {
                            chrome.tabs.update(new_window.tabs[0].id, {
                                url: events[i].evt_data.url
                            }, function(){});
                        }, events[i].time-recording_start_time, events, i);
                        break;
                    default:
                        console.log("Unknown event type: ".events[i].evt);
                }
            }

            setTimeout(function() {
                chrome.windows.remove(new_window.id, function(){});
                chrome.notifications.create("",{
                    type: "basic",
                    title: "Wildfire",
                    message: "Simulation timed out - shutting down simulation",
                    iconUrl: "icon-128.png"
                });
            }, 600000); // 10 minutes
        });
        simulating = false;
    }
}

window.onload = function() {
    populateEvents();
    document.getElementById('simulateButton').addEventListener('click', function() {
        runSimulation();
    });
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
    populateEvents();
});