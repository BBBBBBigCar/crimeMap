var monthNames = [
    "Jan", "Feb", "Mar",
    "Apr", "May", "Jun",
    "Jul", "Aug", "Sep",
    "Oct", "Nov", "Dec"
];

var categories = {
    othertheft: {
        tooltip: '#4B3E4D',
        name: 'Other theft'
    },
    vehiclecrime: {
        tooltip: '#1E8C93',
        name: 'Vehicle crime'
    },
    antisocialbehaviour: {
        tooltip: '#679208',
        name: 'Antisocial behaviour'
    },
    criminaldamagearson: {
        tooltip: '#C4AC30',
        name: 'Criminal Damage or Arson'
    },
    violentcrime: {
        tooltip: '#D31900',
        name: 'Violent crime'
    },
    shoplifting: {
        tooltip: '#305AA1',
        name: 'Shoplifting'
    },
    burglary: {
        tooltip: '#FF6600',
        name: 'Burglary'
    },
    publicorder: {
        tooltip: '#7CB490',
        name: 'Public Order'
    },
    publicdisorderweapons: {
        tooltip: 'grey',
        name: 'Public disorder weapons'
    },
    bicycletheft: {
        tooltip: '#680148',
        name: 'Bicycle Theft'
    },
    drugs: {
        tooltip: '#7DB4B5',
        name: 'Drugs'
    },
    othercrime: {
        tooltip: '#FF1168',
        name: 'Other crime'
    },
    possessionofweapons: {
        tooltip: 'brown',
        name: 'Possession of weopons'
    },
    theftfromtheperson: {
        tooltip: '#DBD8A2',
        name: 'Theft from the person'
    },
    robbery: {
        tooltip: 'silver',
        name: 'Robbery'
    }
};

function CrimeMap(domId, lat_str, lng_str) {
    this.domId = domId; // id of the div for the map
    this.markers = [];
    this.crimeData = {};

    this.lat = lat_str;
    this.lng = lng_str;

    this.isMobile();
    this.renderMap();
    this.setupListeners();
    this.lineData();

    this.getCrimeData1('2017-06');
    this.getLastUpdated();
    this.enableGeoLocation();
}

//get the latest month of crime data by getJSON method
CrimeMap.prototype.getLastUpdated = function () {
    var self = this;
    this.lastUpdated = {};//An object to store the latest date and  current month and year.
    $.getJSON("http://data.police.uk/api/crime-last-updated", function (data) {
        self.lastUpdated.rawDate = new Date(data.date);
        //console.log(self.lastUpdated.rawDate.getFullYear());
        if (self.lastUpdated.rawDate !== 'Invalid Date') {
            self.lastUpdated.curr_month_num = self.lastUpdated.rawDate.getMonth()+1;//getMonth() from 0-11.
            self.lastUpdated.curr_year_num = self.lastUpdated.rawDate.getFullYear();
        }

        self.updateDropdown();
    });
};

//add the latest  month  options once new months uploaded online
CrimeMap.prototype.updateDropdown = function () {
    var lastStaticMonth = 4;//April is the latest month described in HTML
    if (this.lastUpdated.curr_month_num > lastStaticMonth) {
        var monthsToBuild = this.lastUpdated.curr_month_num - lastStaticMonth;
        for (var i = 0; i < monthsToBuild; ++i) {
            //console.log(lastStaticMonth + i + 1);
            var genMonth = lastStaticMonth + i + 1;
            //console.log(typeof (genMonth));
            //if (genMonth < 10) {
            //    //number to string
            //    genMonth = ('0' + genMonth);
            //}
            $('#month').prepend('<option value="2017-' + genMonth + '">' + monthNames[+genMonth - 1] + ' 2017</option>');
        }
    }
   //change the new one month to be a default option
    console.log( $('#month')[0].selectedIndex);
    $('#month')[0].selectedIndex = 0;

};

//initialize the map
CrimeMap.prototype.renderMap = function () {
    var self = this;
    var current = new google.maps.LatLng(self.lat, self.lng);//the current loaction will be loaded when open the website.
    this.map = new google.maps.Map(document.getElementById(this.domId), {
        center: current,
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.LARGE,//convenient for mobile devices to build a zoom control
            position: google.maps.ControlPosition.RIGHT_BOTTOM
        }
    });
};

//clear markers  one by one
CrimeMap.prototype.clearMarkers = function () {
    for (var i = 0; i < this.markers.length; i++) {
        this.markers[i].setMap(null);
    }
    this.markers = new Array();
};

//
CrimeMap.prototype.setupListeners = function () {
    var self = this,
        postcode;

    $('.postcode-form').on('submit', function (e) {
        e.preventDefault();
        self.hideUi();
        postcode = $(this).find('#postcode').val();
        //console.log(postcode);
        if (self.validatePostcode(postcode)) {
            self.hideError($(this));
            if (self.isScottishPostcode(postcode)) {
                self.showScottishPostcodeError();
            }
            else {
                self.hideScottishPostcodeError();
            }
            self.updateLocationMessage(postcode);
            self.geoCode(postcode, self.getCrimeData);
            setTimeout(function(){self.lineData()},15);
            $('#month')[0].selectedIndex = 0;

        } else {
            self.showError('This postcode is not recognised');
        }

    });


    $('#month').on('change', function () {
        self.getCrimeData($(this).val());
    });

    $("input:text:visible:first").focus();
};

CrimeMap.prototype.getCrimeData = function (date, pos) {

    var dateString = '',
        self = this;
    if (date) {
        dateString = '&date=' + date;
    }


    if (pos) {
        this.lat = pos.coords.latitude;
        this.lng = pos.coords.longitude;
    }

    this.showLoader();
    this.hideError();

    //get data
    $.getJSON("http://data.police.uk/api/crimes-street/all-crime?lat=" + this.lat + "&lng=" + this.lng + dateString, function (data) {
        self.crimeData = data;
        if (self.crimeData.length > 0) {
            self.hideError();
            self.organiseData();
            self.plotCrimes();
            self.prepareDataSummary();
        } else {
            self.showError('No results for this location');
        }
    }, function () {
        self.showError('Lookup failed. Try again');
    });
};



CrimeMap.prototype.getCrimeData1 = function (date) {
    var dateString = '',
        self = this;
    if (date) {
        dateString = '&date=' + date;
    }

    this.showLoader();

    $.getJSON("http://data.police.uk/api/crimes-street/all-crime?lat=" + this.lat + "&lng=" + this.lng + dateString, function (data) {
        self.crimeData = data;
        //console.log(self.crimeData);
        if (self.crimeData.length > 0) {
            self.hideError();
            self.organiseData();
            self.plotCrimes();
            self.prepareDataSummary();
        } else {
            self.showError('No results for this location');
        }
    }, function () {
        self.showError('Lookup failed. Try again');
    });
};

//new line chart
CrimeMap.prototype.lineData = function() {
    var totalCrime = new Array();
    var da = [
        //'2014-01', '2014-02', '2014-03', '2014-04', '2014-05', '2014-06', '2014-07', '2014-08', '2014-09', '2014-10', '2014-11', '2014-12',
        '2015-01', '2015-02', '2015-03', '2015-04', '2015-05', '2015-06', '2015-07', '2015-08', '2015-09', '2015-10', '2015-11', '2015-12',
        '2016-01', '2016-02', '2016-03', '2016-04', '2016-05', '2016-06', '2016-07', '2016-08', '2016-09', '2016-10', '2016-11', '2016-12'];

    //var count=$("#count ul").empty();
    //var str="";

    $.ajaxSettings.async = false;
    for (var i=0;i < da.length; i++) {
        var dateStr = '&date=' + da[i];

        $.getJSON("http://data.police.uk/api/crimes-street/all-crime?lat=" + this.lat + "&lng=" + this.lng + dateStr,
            function (data) {
                totalCrime.push(data.length);
                //str += "<li class='lists'>" + data.length + "</li>";
                //count.append(str);
                //str = "";
            });
    }
    this.lineChart(totalCrime);
    $.ajaxSettings.async = true;
};

//generate a line chart
CrimeMap.prototype.lineChart = function(totalCrime)
{
    $("#linechart svg").remove();

    var data = [];

    for(var i= 0,m= 0,year=2015;i<totalCrime.length;i++){
            data.push([new Date(year,m,1),totalCrime[i]]);
            m++;
        if(m==12){
        year=year+1;
            m=0;
    }}
    //console.log(data[0][0]);

    var max = d3.max( data , function(d){
        return d[1]; } );
    var margin = {top: 20, right: 30, bottom: 30, left: 40},
        width = 450 - margin.left - margin.right,
        height = 250 - margin.top - margin.bottom;

    var x = d3.time.scale()
        .domain([new Date(2015, 0, 1), new Date(2017, 0, 1)])
        .range([0, width]);


    var y = d3.scale.linear()
        .domain([100, max])

        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var line = d3.svg.line()
        .interpolate("monotone")
        .x(function(d) { return x(d[0]); })
        .y(function(d) { return y(d[1]); });

    var svg = d3.select("#linechart").append("svg")
        .datum(data)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
        .attr("class", "x axis2")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    var g=svg.append("g")
        .attr("class", "y axis2")
        .call(yAxis);


    svg.selectAll("text").data(data).enter()
        .append("text")
        .text(function(d, i) { return d[1]; })
        .attr("y", 420)
        .attr("x", function(d) { return x(d[0]); })
        .style("font-size", 15)
        .style("font-family", "monospace");


    g.selectAll(".value").data(data).enter()
        .append("text")
        .text(function(d, i) { return d[1]; })
        .attr("class", "value")
        .attr("y", function(d) { return y(d[1])-10; })
        .attr("x", function(d) { return x(d[0])+3;})
        .style("font-size", 15)
        .style("opacity",0)
        .style("font-family", "monospace");

    svg.append("path")
        .attr("class", "line")
        .attr("d", line);



    svg.select("g").selectAll("line").data(data).enter().append("line")
        .attr('x1',function(d) { return x(d[0]); })
        .attr('y1',function(d) { return y(0); })
        .attr('x2',function(d) { return x(d[0]); })
        .attr('y2',function(d) { return y(d[1]); })
        .style("stroke-width", 2)
        .style("stroke", "gray")
        .style("stroke-dasharray", ("2, 2"))
        .style("opacity",1);

    var dot=svg.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", line.x())
        .attr("cy", line.y())
        .attr("r", 4.5)
        .on("mouseover", function(d) {
         d3.select(this).style("fill", "red");
            d3.selectAll(".value").filter(function(e) {
                    return d === e;
                })
                .style("opacity",1);

        })
        .on("mouseout", function(d) {
            d3.select(this).transition().duration(50).style("fill","white");
            d3.selectAll(".value").filter(function(e) {
                    return d === e;
                })
                .style("opacity",0);
        })

};

//statistic data based on latitude
CrimeMap.prototype.organiseData = function () {
    this.crimes = {};
    for(var i = 0; i < this.crimeData.length; ++i) {

        if (!this.crimes[this.crimeData[i].location.latitude]) {

            this.crimes[this.crimeData[i].location.latitude] = [];
            this.crimes[this.crimeData[i].location.latitude].push(this.crimeData[i]);
        } else {
            this.crimes[this.crimeData[i].location.latitude].push(this.crimeData[i]);
        }
    }
    //console.log(this.crimes);
};

CrimeMap.prototype.prepareDataSummary = function () {
    var self = this
        ,mostCommonCrime
        ;

    $('#no-of-crimes').text(this.crimeData.length);

    //mostCommonCrime = Object.keys(this.categories).sort(function (a, b) {
    //
    //    return -(self.categories[a] - self.categories[b]);
    //});

    this.buildPie();
  //  console.log(mostCommonCrime);
  //  mostCommonCrime = mostCommonCrime[0].replace(/\-/g, '');
  //
  //  $('#crime-type').text(categories[mostCommonCrime].name).css('color', categories[mostCommonCrime].tooltip);

    if (!this.isMobile()) {
        $('#details').show();
    }
};

CrimeMap.prototype.buildPie = function () {
    var data = [],
        i,
        width = 200,
        height = 200,
        radius = Math.min(width, height) / 2,
        color,
        arc,
        pie,
        svg,
        g;

    $('#chart').empty();

    for (i in this.categories) {
        data.push({'cat': i, 'no': this.categories[i]});
    }

    color = d3.scale.ordinal()
        .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

    arc = d3.svg.arc()
        .outerRadius(radius - 10)
        .innerRadius(45);

    pie = d3.layout.pie()
        .sort(null)
        .value(function (d) {
            return d.no;
        });

    svg = d3.select("#chart").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 1.9 + "," + height / 2.2 + ")");

    g = svg.selectAll(".arc")
        .data(pie(data))
        .enter().append("g")
        .attr("class", "arc")
        .on(this.ev, function (d) {
            $("#tooltip")
                .html('<p><strong>' + d.data.cat.replace(/\-/g, ' ') + ':</strong> ' + d.data.no + ' crimes</p>')
                .css("top", y + 10)
                .css("left", x + 10)
                .show();
        })
        .on('mousemove', function (d) {
            $("#tooltip")
                .css("top", y + 10)
                .css("left", x + 10);
        })
        .on('mouseout', function (d) {
            $("#tooltip").html('').hide();
        });

    g.append("path")
        .attr("d", arc)
        .style("fill", function (d) {
            return categories[d.data.cat.replace(/\-/g, '')].tooltip;
        });

    g.append("text")
        .attr("transform", function (d) {
            return "translate(" + arc.centroid(d) + ")";
        })
        .attr("dy", ".35em")
        .style("text-anchor", "middle");

    if (!this.isMobile()) {
        $('#chart').show();
    }

    this.buildKey();
};
//total number of crime cases and the frequent occur crime object
CrimeMap.prototype.getCircle = function (size, cat) {
    size = size + 4;
    var colour = categories[cat.replace(/\-/g, '')];//match th regex before getting the category

    var circle = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '' + colour.tooltip + '',
        fillOpacity: 0.6,
        scale: size,
        strokeColor: '#888',
        strokeWeight: 1
    };
    return circle;
};

CrimeMap.prototype.buildKey = function () {
    var key = $('<ul id="key"></ul>'),
        listItem;

    for (var i in this.categories) {
        listItem = $('<li><span class="circle" style="background-color:' + categories[i.replace(/\-/g, '')].tooltip + '"></span><span>' + i.replace(/\-/g, ' ') + '</span></li>');
        key.append(listItem);
    }
    $('#chart').append(key);
};

/* This method should definitely not be doing so much - it should be refactored */
CrimeMap.prototype.plotCrimes = function () {
    var crimes = this.crimes,
        i,
        j,
        marker,
        self = this,
        size,
        loc,
        list,
        crimeType,
        categoriesCurr,//record the number of types of crime in one point
        curr,
        co,
        mode,
        ev,
        point,
        infowindow;

    this.categories = {};
    this.clearMarkers();
    this.hideLoader();
//crimes from organizationData function
    for (i in crimes) {
        mode = {};//calculate the number of each categories
        size = crimes[i].length;
        //console.log(crimes[i]);

        //work out the mean of the returned crimes
        for (j = 0; j < size; ++j) {
            crimeType = crimes[i][j].category;
            if (!this.categories[crimeType]) {

                this.categories[crimeType] = 1;

            } else {

                categoriesCurr = this.categories[crimeType];
                this.categories[crimeType] = categoriesCurr + 1;
            }
           // console.log(mode[crimeType]);
            if (!mode[crimeType]) {
                mode[crimeType] = 1;
            } else {
                curr = mode[crimeType];
                mode[crimeType] = curr + 1;
            }
        }

        //sort the data for the location numerically - greatest to smallest
        co = Object.keys(mode).sort(function (a, b) {
            return -(mode[a] - mode[b])
        });

        loc = new google.maps.LatLng(crimes[i][0].location.latitude, crimes[i][0].location.longitude);

        list = this.buildLocationCrimeList(mode, co);//return  ul list

        var currMonth = $('#month option:selected').text();//get current month and year

        //add the spot
        if (size > 1) {
            crimes[i].markerContent = '<div class="infodiv" style="width: 300px;"><h4><strong>'
                + size + ' crimes reported ' + crimes[i][0].location.street.name + ' in ' + currMonth + '</strong></h4><br />' + ' ' + list + '</div>'
        } else {
            crimes[i].markerContent = '<div class="infodiv" style="width: 300px"><h4><strong>'
                + size + ' crime reported ' + crimes[i][0].location.street.name + ' in ' + currMonth + '</strong></h4><br />' + ' ' + list + '</div>'
        }
        //set a marker
        marker = new google.maps.Marker({
            icon: this.getCircle(size, co[0]),
            position: loc,
            map: this.map,
            zIndex: 400
        });

        this.markers.push(marker);
        point = new google.maps.Point(0, 350);
        infowindow = new google.maps.InfoWindow({
            content: crimes[i].markerContent,
            anchorPoint: point
        });

        google.maps.event.addListener(marker, this.ev, (function (pointer, bubble, mode) {

            return function () {
                self.bubbleChart(bubble);
                bubble.open(self.map, pointer);
            }
        })(marker, infowindow, mode));

        google.maps.event.addListener(marker, 'mouseout', (function (pointer, bubble) {
            return function () {
                bubble.close(self.map);
            }
        })(marker, infowindow));

        this.panAndZoom();
    }
};

//generate the list of crime category shown in information window
CrimeMap.prototype.buildLocationCrimeList = function (modeList, ordered) {
    var i,
        list = '',
        currentCat,
        singlePlural = 's';
    for (i = 0; i < ordered.length; ++i) {
        currentCat = ordered[i].replace(/\-/g, '');
        modeList[ordered[i]] === 1 ? singlePlural = '' : singlePlural = 's';
        list += '<li><span class="circle" style="background-color:' + categories[currentCat].tooltip + '"></span>'
            + modeList[ordered[i]] + ' count' + singlePlural + ' of <span style="color:' + categories[currentCat].tooltip + '">' + ordered[i].replace(/\-/g, ' ') + '</span></li>';
    }

    return '<ul>' + list + '</ul>';
};

CrimeMap.prototype.bubbleChart = function (marker) {
    var svg = d3.select()
        .append("svg")
        .attr("width", 300)
        .attr("height", 300)
        .attr("class", "bubble");
};

CrimeMap.prototype.panAndZoom = function () {
    var ltln = new google.maps.LatLng(this.lat, this.lng);
    this.map.panTo(ltln);

    this.map.setZoom(15);
};

CrimeMap.prototype.enableGeoLocation = function () {
    if ("geolocation" in navigator) {
        $('.current-location').show();
    }
};

//return latitude and longitude
CrimeMap.prototype.geoCode = function (postcode, callback) {
    var geocoder = new google.maps.Geocoder(),//postcode to latitude & longitude
        self = this;

    geocoder.geocode({
        'address': postcode
    }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            self.lat = results[0].geometry.location.lat();
            self.lng = results[0].geometry.location.lng();
            //console.log(self.lat);
            //console.log(self.lng);
            callback.call(self);
        } else {
            $('.postcode-error-text').show();
        }
    });
};

CrimeMap.prototype.isMobile = function () {
    this.isMob = false;
    this.ev = 'mouseover';

    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        this.isMob = true;
        this.ev = 'click';
    }
    return this.isMob;
};

CrimeMap.prototype.validatePostcode = function (input) {
    var postcode = input.replace(/\s/g, '');//delete blank
    return /[a-zA-Z]{1,2}[0-9][0-9A-Za-z]?\s?[0-9][a-zA-Z]{2}/.test(postcode);
};

CrimeMap.prototype.updateLocationMessage = function (str) {
    $('.location-ident').text(str);
};

CrimeMap.prototype.isScottishPostcode = function (postcode) {
    var postcodePrefix = postcode.substring(0, 2);
    var scottishPostcodes = ['AB', 'DD', 'DG', 'EH', 'FK', 'HS', 'IV', 'KA', 'KW', 'KY', 'ML', 'PA', 'PH', 'TD', 'ZE'];
    if (scottishPostcodes.indexOf(postcodePrefix) !== -1) {
        return true;
    } else if (postcode.substring(0, 1).toLowerCase() === 'g' && !isNaN(postcode.substring(1, 1))) {
        return true;
    }
    return false;
};

CrimeMap.prototype.showScottishPostcodeError = function () {
    $('.scottish-postcode-msg').show();
};

CrimeMap.prototype.hideScottishPostcodeError = function () {
    $('.scottish-postcode-msg').hide();
};

CrimeMap.prototype.showError = function (errString) {
    var errContainer = $('.error-text');
    this.hideUi();
    this.hideLoader();
    this.hideScottishPostcodeError();
    errContainer.find('.error-msg').text(errString);
    errContainer.show();
};

CrimeMap.prototype.hideUi = function () {
    $('#chart,#details,.scottish-postcode-msg').hide();
};


CrimeMap.prototype.hideError = function () {
    var errContainer = $('.error-text');
    errContainer.find('error-msg').text('');
    errContainer.hide();
};

CrimeMap.prototype.showLoader = function () {
    $('.loading').show();
};

CrimeMap.prototype.hideLoader = function () {
    $('.loading').hide();
};

$(document).mousemove(function (e) {
    window.x = e.pageX;
    window.y = e.pageY;
});

var cm = null;
$(function () {
// Try HTML5 geolocation.
    //get current location and load the corresponding data
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            //var geo = new google.maps.Geocoder;
            //var latlng = {lat:parseFloat(pos.lng), lng:parseFloat( pos.lat)};
            //console.log(latlng);
            //geo.geocode({'location': latlng}, function(results, status) {
            //
            //        console.log(results);
            //
            //});

            //console.log(pos);
            cm = new CrimeMap('map_canvas', pos.lat.toString(), pos.lng.toString());

        }, function () {
            console.log('geolocation error!');
        });
    } else {
        // Browser doesn't support Geolocation
        //handleLocationError(false, infoWindow, map.getCenter());
        console.log('geolocation error!');
    }
});