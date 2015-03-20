//https://github.com/Leaflet/Leaflet.markercluster
//http://consumerinsight.which.co.uk/maps/hygiene
//


var FSA_APP = {}


L.Icon.Default.imagePath = "images/"
//Make sure we're looking in the right place for icons

FSA_APP.csv_files = [{
        layerName: "OS Places API",
        layerNameShort: "Places API",
        layerCsv: "data/data/API.csv",
        type: "match",
        ref: "API",
        color: "#CE0005"
    }, {
        layerName: "Custom matching algorithm",
        layerNameShort: "Custom",
        layerCsv: "data/data/MatchingAlgorithm.csv",
        type: "match",
        ref: "custom",
        color: "#58CC02"

    }, {
        layerName: "FHRS Original",
        layerNameShort: "FHRS",
        layerCsv: "data/data/FHRS_only.csv",
        type: "fhrs",
        ref: "fhrs",
        color: "#0693C8"

    }, 
    ]

$(function() {

    setCSSSize()
    createMap()

    $(window).resize(setCSSSize);

    add_checkboxes()

    $(".checkbox").change(function() {
        showHideLayers(this)
    })

    $("#csvselect").change(function() {
        addLayers()
    })

    addLayers()

})


function add_checkboxes() {
     var source = $("#checkbox-template").html();

      var template = Handlebars.compile(source)

      var html = template({layers: FSA_APP.csv_files})

      $(".controls").html(html)


      _.each( FSA_APP.csv_files, function(this_layer) {
        $("#checkbox_"+this_layer["ref"]).parent().css("color",this_layer["color"])
      })

}

function setCSSSize() {

    $("#map").css("width", $(window).width() - 400);
    $("#map").css("height", $(window).height() - 300);

}



function addLayers(lat, lng) {

    _.each(FSA_APP.layers, function(this_layer) {
        this_layer.remove()
    })

    _.forEach(FSA_APP.csv_files, function(this_file) {

        d3.csv(this_file["layerCsv"], function(data) {

            addToMap(data, "plot_lat", "plot_lng", this_file)
            this_file["data"] = data

            showHideLayers()

        });


    })

   



    function addToMap(data, lat_key, lng_key, layerInfo) {

        var markerArray = [];



        var source = $("#popup-template").html();

        var template = Handlebars.compile(source)

        for (var i = 0; i < data.length; i++) {

            d = data[i]
            
            lat = d[lat_key]
            lng = d[lng_key]

           
            template_data = d
            if (layerInfo["ref"] != "fhrs") { 
                template_data["has_match"] = true
            } 

            template_data["layerName"] = layerInfo["layerName"]

            if (typeof lat === 'undefined' || typeof lng === 'undefined') {
                continue
            };

            style = {

                "weight": 0,
                "fillColor": layerInfo["color"],
                "fillOpacity": 0.8,
                "radius": 6

            };

            var m = L.circleMarker([lat, lng], style)

            var html = template(template_data)

            // m.bindPopup(html, {
            //     "offset": L.point(0, -10)
            // })

            m.on("mouseover", function() {
                this.openPopup();
                this.setStyle({
                    "weight": 4,
                    "radius": 14,
                    "fillOpacity": 1
                })
                
                list_overlapping(this)
                show_all_addresses(this)
                add_line(this)

            });
            m.on("mouseout", function() {

                this.setStyle({
                    "weight": 0,
                    "radius": 6,
                    "fillOpacity": 0.8
                })
                this.closePopup();
                remove_line()
            })

            m.on("click", function() {

                this.bringToBack()
            })
            


            m.__layerParent = layerInfo["ref"]
            m.__fhrs_address = d["fhrs_address"]
            m.__plot_address = d["plot_address"] 
            m.__plot_lat = d["plot_lat"] 
            m.__plot_lng = d["plot_lng"] 


        

            markerArray.push(m);
         
        };

        FSA_APP.layers[layerInfo["ref"]] = L.featureGroup(markerArray).addTo(map)

        FSA_APP.map.fitBounds(FSA_APP.layers[layerInfo["ref"]].getBounds())


    }


}

function list_overlapping(marker) {

  thisLayer = FSA_APP.layers[marker.__layerParent] 
    $("#overlapping").html("")
    _.each(thisLayer._layers, function(marker2) {
        
        latDiff = Math.abs(marker._latlng.lat - marker2._latlng.lat)
        lngDiff = Math.abs(marker._latlng.lng - marker2._latlng.lng)  

        if (Math.pow(Math.pow(latDiff,2) + Math.pow(lngDiff,2),0.5)<0.00003) {
        
        $("#overlapping").html($("#overlapping").html() + "<p>"+  marker2.__plot_address + "</p>")
        }
     })

    for_table = []

     _.each(FSA_APP.csv_files, function(csv_info) {

        _.each(csv_info["data"], function(data_point) {

            latDiff = Math.abs(marker._latlng.lat - data_point["plot_lat"])
            lngDiff = Math.abs(marker._latlng.lng - data_point["plot_lng"])  

            if (Math.pow(Math.pow(latDiff,2) + Math.pow(lngDiff,2),0.5)<0.00003) {

                for_table.push({"layerNameShort" : csv_info["layerNameShort"],"address" : data_point["plot_address"]})

            }
        


        })

    })

      for_table.sort(function(a,b) {
        if (a["layerNameShort"] + a["plot_address"]  < b["layerNameShort"] + b["plot_address"] ) return 1;
            if (b["layerNameShort"] + b["plot_address"]  < a["layerNameShort"] + a["plot_address"] ) return -1;
            return 0; 
    })

    var source = $("#overlapping-table-template").html();

    var template = Handlebars.compile(source)

    var html = template({addresses: for_table})

    $("#overlapping").html(html)



   
}

function show_all_addresses(marker) {

    thisFHRSAddress = marker.__fhrs_address

    table_array = []

    _.each(FSA_APP.csv_files, function(csv_info) {

        var data_point = _.find(csv_info["data"], function(data){ return data["fhrs_address"]==thisFHRSAddress});
        
        if (csv_info["ref"] == "fhrs"){
            matchType = "Original"
        } else {
            matchType = "Matched"
        }

        if (data_point["plot_address"]) {
        table_array.push({"layerName": data_point["layerName"], "address":data_point["plot_address"], "matchType": matchType})
        } else {
        table_array.push({"layerName": csv_info["layerName"], "address":"No match", "matchType": matchType})
        } 
    })

    var source = $("#address-table-template").html();

    var template = Handlebars.compile(source)

    table_array.sort(function(a,b) {
        if (a["matchType"] < b["matchType"]) return 1;
            if (b["matchType"] < a["matchType"]) return -1;
            return 0; 
    })

    var html = template({addresses: table_array})

    $("#addresses").html(html)
}


var polylines
function add_line(marker) {

    var lines = []

    thisFHRSAddress = marker.__fhrs_address



    //First find FHRS match and then draw coloured lines to all other layers from that point

    _.each(FSA_APP.csv_files, function(csv_info) {

        if (csv_info["ref"] == "fhrs") {

            var data_point = _.find(csv_info["data"], function(data){ return data["fhrs_address"]==thisFHRSAddress});
         
            if (data_point) {
                var lat = (data_point["plot_lat"]);
                var lng = (data_point["plot_lng"]);
                var newLatLng = new L.LatLng(lat, lng);
                fhrs_point = newLatLng
            } 

        }
    })


    _.each(FSA_APP.csv_files, function(csv_info,i) {

        if (csv_info["ref"] != "fhrs") {

            var data_point = _.find(csv_info["data"], function(data){ return data["fhrs_address"]==thisFHRSAddress});
            
            if (data_point) {
                var lat = (data_point["plot_lat"]);
                var lng = (data_point["plot_lng"]);
                var newLatLng = new L.LatLng(lat, lng);
            } 



             var polyline_options = {
            color: csv_info["color"],
            dashArray: [8,8],
            dashOffset:[i*8]
      };

            lines.push(L.polyline([fhrs_point,newLatLng], polyline_options))  

        }
    })





   

    polylines =  L.featureGroup(lines).addTo(map)

    
    
   
}

function remove_line(){
    map.removeLayer(polylines)

}


function showHideLayers(click_object) {

    layersArr = []


    _.each(FSA_APP.csv_files,function(layer) {
        layersArr.push({
        "selector": "#checkbox_"+layer["ref"],
        "layer": FSA_APP.layers[layer["ref"]]
        })
    })

    
    for (var i = 0; i < layersArr.length; i++) {

        try {
            var d = layersArr[i]
            if ($(d["selector"]).is(':checked')) {
                FSA_APP.map.addLayer(d["layer"])
                console.log("adding layer " + d["layer"])
            } else {
                FSA_APP.map.removeLayer(d["layer"])
                console.log("removing layer " + d["layer"])
            }
        } catch (err) {
            console.log(err)
        }
    }


};


function createMap() {

    FSA_APP.map = L.map('map').setView([51.505, -0.09], 10);
    map = FSA_APP.map


    FSA_APP.layers = {}
    //add an OpenStreetMap tile layer

      L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
        maxZoom: 18
    }).addTo(map);

}

function highlightMapCentre() {

    var h = $("#map").height() / 2

    var w = $("#map").width() / 2

    simulateClick(w, h)


}

function simulateClick(x, y) {

    var clickEvent = document.createEvent('MouseEvents');
    clickEvent.initMouseEvent(
        'click', true, true, window, 0,
        0, 0, x, y, false, false,
        false, false, 0, null
    );
    document.elementFromPoint(x, y).dispatchEvent(clickEvent);

}

