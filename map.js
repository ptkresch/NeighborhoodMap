var map;
var markers = [];
var service;
var bound;
var ViewModel;
var placeId = [];
var request = {};
var delay = 3000;
var index = 0;
var ErrorCounter = 0;
var yelpFinish = false;
var Model = {
    businesses: [],
    businesslist: [],
    details: [],
    imagesrcs: [],
    reviews: [],
    reviewsimg: []
};

function initMap() {
    //Nav bar functionality
    $(function() {
        $('#toggle ul').slideUp();
        $('.toggle-nav').click(function() {
            toggleNavigation();
        });
    });

    function toggleNavigation() {
        if ($('#container').hasClass('display-nav')) {
            $('#container').removeClass('display-nav');
            $('#container').addClass('remove-nav');
        } else {
            $('#container').addClass('display-nav');
            $('#container').removeClass('remove-nav');
        }
    }

    $("#listcontainer").click(function() {
        var $currIcon = $(this).find("span.the-btn");
        if ($("span.the-btn").hasClass('fa-plus')) {
            $("#listcontainer").addClass('active');
            $("span.the-btn").addClass('fa-minus').removeClass('fa-plus');
        } else {
            $("#listcontainer").removeClass("active");
            $("span.the-btn").addClass('fa-plus').removeClass('fa-minus');
        }
        $(this).next().slideToggle();
    });
    //If Google Maps can't be loaded either due to internet connection or other unforeseen error
    if (typeof(google) == 'undefined') {
        var footer = $('#footer')[0];
        var loader = $('#loader')[0];
        var mapdiv = $('#mapdiv')[0];
        footer.innerHTML = "Could not connect to the internet. Trying again...";
        var reloadMap = document.createElement('script');
        var src = 'http://maps.googleapis.com/maps/api/js?key=AIzaSyCSvlguX2axX4hGDPmlp2c99BeAX4sjtwE&libraries=places&callback=initMap';
        reloadMap.src = src;
        reloadMap.onerror = function() {
            var errorText = document.createElement('h2');
            errorText.innerHTML = 'No data could be loaded! Please check internet connection before refreshing the page.';
            errorText.style.position = 'absolute';
            errorText.style.top = '50%';
            mapdiv.appendChild(errorText);
            footer.innerHTML = 'Whoops! Something went wrong.';
            loader.style.display = 'none';
        };
        //The page waits for 3 seconds and then reloads google map api and online stylesheets.
        //If it fails, reloadMap.onerror fires.
        setTimeout(function() {
            $('script[src="' + src + '"]').remove();
            document.getElementsByTagName('head')[0].appendChild(reloadMap);
            $('link').each(function() {
                if ($(this).attr("type").indexOf("css") > -1) {
                    $(this).attr("href", $(this).attr("href") + "?id=" + new Date().getMilliseconds());
                }
            });
        }, 3000);
    } else {
        var SantaBarbara = {
            lat: 34.42001523545522,
            lng: -119.69982250000004
        };

        map = new google.maps.Map(document.getElementById('map'), {
            center: SantaBarbara,
            zoom: 16,
            mapTypeControl: false,
            scrollwheel: false,
            panControl: false,
            streetViewControl: false,
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_CENTER
            },
            maxZoom: 18,
            minZoom: 14,
            styles: [{
                featureType: "all",
                elementType: "labels",
                stylers: [{
                    visibility: "off"
                }]
            }, {
                featureType: "road",
                elementType: "labels",
                stylers: [{
                    visibility: "on"
                }]
            }]
        });

        bound = new google.maps.LatLngBounds();
        infowindow = new google.maps.InfoWindow();
        service = new google.maps.places.PlacesService(map);
        service.nearbySearch({
            location: SantaBarbara,
            radius: 400,
            type: ['restaurant']
        }, mapcallback);
    }
}

function mapcallback(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < results.length; i++) {
            Model.businesses[i] = results[i];
            Model.businesses[i].currentMarker = ko.observable(false);
            Model.businesslist[i] = results[i];
            Model.businesses[i].idnum = i;
            placeId[i] = Model.businesses[i].place_id;
            //Test Invalid Google Places Request by using a wrong id for Places lookup.
            // placeId.push('0');
            createMarker(Model.businesses[i], i);
        };
        map.fitBounds(bound);
        ko.applyBindings(new ViewModel());
        //To test Unknown Error, turn on throttling in the console. Use the setTimeout function for 
        //Google places request below. Ensure an internet connection to load google maps, then turn off internet after
        //the map has loaded. Then after the console message indicates that place loading has begun, 'unknown' errors 
        //should be reported. If not signed up for better usage limit, Over Query Limit will also trigger. Turn internet 
        //on again before Google Places finishes loading or Yelp data won't load. Use this also to test the case in 
        //which some Places requests are successful, but not all. Yelp data should still lookup through Google maps.
        // setTimeout(function(){GooglePlacesRequest(index);}, 2000);
        console.log('Google Places is loading.');
        GooglePlacesRequest(index);
    }
}

function createMarker(business, i) {
    var marker = new google.maps.Marker({
        map: map,
        position: business.geometry.location,
        title: business.name,
        lat: business.geometry.location.lat(),
        lng: business.geometry.location.lng(),
        id: i,
        animation: google.maps.Animation.DROP
    });
    markers.push(marker);
    bound.extend(marker.getPosition());
};

GooglePlacesRequest = function(index, ErrorCounter) {
    request.placeId = placeId[index];
    if (request.placeId != undefined) {
        service.getDetails(request, function(place, status) {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                place.idnum = index;
                Model.details.push(place);
                index++;
                if (index <= placeId.length) {
                    GooglePlacesRequest(index);
                };
                ErrorCounter = 0;
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                console.log('NO RESULTS');
                Model.details.push({
                    idnum: index
                });
                index++;
                if (index <= placeId.length) {
                    GooglePlacesRequest(index);
                };
            } else if (status === google.maps.places.PlacesServiceStatus.ERROR) {
                console.log('ERROR');
                console.log('There was a problem contacting the Google servers. Trying again...');
                if (ErrorCounter < 3) {
                    setTimeout(function() {
                        GooglePlacesRequest(index);
                    }, delay);
                } else {
                    Model.details.push({
                        idnum: index
                    });
                    console.log('Could not load Google Place data for' + Model.businesses[index].name);
                    index++;
                    if (index <= placeId.length) {
                        GooglePlacesRequest(index);
                    };
                };
                ErrorCounter++;
            } else if (status === google.maps.places.PlacesServiceStatus.UNKNOWN_ERROR) {
                console.log('UNKNOWN_ERROR');
                console.log('The PlacesService request could not be processed due to a server error. Trying again...');
                if (ErrorCounter < 3) {
                    setTimeout(function() {
                        GooglePlacesRequest(index);
                    }, delay);
                } else {
                    Model.details.push({
                        idnum: index
                    });
                    console.log('Could not load Google Place data for ' + Model.businesses[index].name);
                    index++;
                    if (index <= placeId.length) {
                        GooglePlacesRequest(index);
                    };
                };
                ErrorCounter++;
            } else if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
                //Note, signing up for a better plan though google should eliminate over query limit errors. 
                console.log('OVER QUERY LIMIT');
                console.log('Please wait for response.');
                setTimeout(function() {
                    GooglePlacesRequest(index);
                }, delay);
            } else if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
                console.log('REQUEST DENIED');
                Model.details.push({
                    idnum: index
                });
                index++;
                if (index <= placeId.length) {
                    GooglePlacesRequest(index);
                };
            } else if (status === google.maps.places.PlacesServiceStatus.INVALID_REQUEST) {
                console.log('INVALID REQUEST');
                Model.details.push({
                    idnum: index
                });
                index++;
                if (index <= placeId.length) {
                    GooglePlacesRequest(index);
                };
            };
        });
    } else {
        GooglePlacesGetPhotoUrls();
        console.log('Google Places has finished loading.');
        console.log('Loading Yelp data..');
        //Use for testing yelp data request. If the internet is turned off before all data is fetched, the infowindows
        //should display "Yelp data could not be loaded." (see infowindowdiv function in ViewModel).
        // setTimeout(function(){YelpRequest();}, 2000);
        YelpRequest();
        document.getElementById('loader').style.display = 'none';
        document.getElementById('footer').innerHTML = 'Select a restaurant from the map or list.';
    };
};

GooglePlacesGetPhotoUrls = function() {
    Model.details.forEach(function(detailobj, i) {
        if (detailobj.hasOwnProperty('photos') && detailobj.photos.length > 0) {
            var src = detailobj.photos[0].getUrl({
                'maxWidth': 200,
                'maxHeight': 100
            });
            Model.imagesrcs.push(src);
        } else if (Model.businesses[i].hasOwnProperty('photos') && Model.businesses[i].photos.length > 0) {
            var src = Model.businesses[i].photos[0].getUrl({
                'maxWidth': 200,
                'maxHeight': 100
            });
            Model.imagesrcs.push(src);
        } else {
            Model.imagesrcs.push('');
        }
    })
}

var auth = {
    consumerKey: "lD2MMgGYV897NrXUeO0yEw",
    consumerSecret: "zdScmshgUyGbQBftQ_nwAu9dAEU",
    accessToken: "DhdwKqheVW1g5putE65ij4TRdq8XMkE0",
    accessTokenSecret: "tJkO7O03alkN9cIWb9r-qJZm1z4"
};

function nonce_generate() {
    return (Math.floor(Math.random() * 1e12).toString());
};

var yelpBaseUrl = 'http://api.yelp.com/v2/';
var yelp_url = yelpBaseUrl + 'phone_search';
var yelp_url2 = yelpBaseUrl + 'search';

//Phone Search using places data. If places data can't be loaded, Google maps data is used and a 
//regular search using location = Santa Barbara, term = business name, cll = latitude, longitude is used.

var parameter = function(phone, term, location, cll) {
    this.oauth_consumer_key = auth.consumerKey;
    this.oauth_token = auth.accessToken;
    this.oauth_nonce = nonce_generate();
    this.oauth_timestamp = Math.floor(Date.now() / 1000);
    this.oauth_signature_method = 'HMAC-SHA1';
    this.oauth_version = '1.0';
    this.callback = 'cb';
    this.phone = phone;
    this.term = term;
    this.location = location;
    this.cll = cll;
    this.sort = '1';
    this.limit = '3';
};

YelpRequest = function() {
    Model.details.forEach(function(detail) {
        //If Google Places is successful, use the details objects for a phone search.
        if (detail.hasOwnProperty('international_phone_number')) {
            var str = detail.international_phone_number.replace(/-/g, '');
            var str2 = str.replace(/ /g, '');
            var term = detail.name;
            var parameters = new parameter(str2, term, 'undefined', 'undefined');
            var encodedSignature = oauthSignature.generate('GET', yelp_url, parameters, auth.consumerSecret, auth.accessTokenSecret);
            parameters.oauth_signature = encodedSignature;
            settings.data = parameters;
            settings.url = yelp_url;
            $.jsonp(settings);
            //If Google Places fails, use the google maps objects for a location search (less accurate).
        } else {
            Model.businesses.forEach(function(business) {
                if (business.idnum == detail.idnum) {
                    var lat = business.geometry.location.lat();
                    var lng = business.geometry.location.lng();
                    var cll = '' + lat + ',' + lng;
                    var term = business.name;
                    var location = business.vicinity;
                    var parameters = new parameter('undefined', term, location, cll);
                    var encodedSignature = oauthSignature.generate('GET', yelp_url2, parameters, auth.consumerSecret, auth.accessTokenSecret);
                    parameters.oauth_signature = encodedSignature;
                    settings.data = parameters;
                    settings.url = yelp_url2;
                    $.jsonp(settings);
                }
            })
        }
    })
}

var settings = {
    cache: true,
    dataType: 'jsonp',
    callback: 'cb',
    timeout: 5000,
    success: function(results) {
        results.businesses.forEach(function(result) {
            //Parse id's of yelp results to match with data obtained from google.
            var yelpStreet = result.location.address[0];
            var reviewid = result.id.replace(/the-/g, '').toLowerCase();
            var reviewid1 = reviewid.replace(/-/g, ' ');
            var reviewid2 = reviewid1.replace(/santa barbara/g, '');
            var reviewid3 = reviewid2.replace(/the/, '');
            var reviewid4 = reviewid3.replace(/restaurant /g, '');
            var reviewid5 = reviewid4.split(' ');
            var key1 = reviewid4.split(' ')[0];
            var key2 = reviewid4.split(' ')[1];
            var key3 = reviewid4.split(' ')[2];

            function addToReview(result, idnum) {
                    result.idnum = idnum;
                    Model.reviews[result.idnum] = result;
                    var reviewimg = document.createElement('img');
                    reviewimg.src = result.rating_img_url;
                    Model.reviewsimg[result.idnum] = reviewimg;
                }
                //Note: The long function below is used for matching Yelp results with Google's.
                //Yelp (more often than not) reports multiple (different) businesses having the same phone number and
                //the same address. Several results also had similar names, requiring the names for each business reported 
                //by Yelp to be split into different key words in order to compare with Google's reported name.
                //The filter below attempts to match based on address and name, using a different word if the preceding
                //one fails. If all those fail, then there was an issue with Yelp's reported address or name, and so a final
                //attempt is made based solely on the name.
            Model.details.forEach(function(detail) {
                // If Google Places successfully returns a detail object, compare results with more accurate phone search.
                var resultInDetail = Model.details.filter(function(e) {
                    return e.name == result.name;
                }).length;
                var resultInReviews = Model.reviews.filter(function(e) {
                    return e.name == result.name;
                }).length;
                var resultInReviewsId = Model.reviews.filter(function(e) {
                    return e.id == result.id;
                }).length;
                if (detail.hasOwnProperty('international_phone_number')) {
                    var detailName = detail.name.toLowerCase();
                    var detailStreet = detail.formatted_address.split(',')[0];
                    //Three different keywords are used for matching purposes (key1, key2, and key3).
                    if (yelpStreet == detailStreet && detailName.indexOf(key1) >= 0) {
                        addToReview(result, detail.idnum);
                    } else if (yelpStreet == detailStreet && key2 !== undefined && key2 !== '' && detailName.indexOf(key2) >= 0) {
                        addToReview(result, detail.idnum);
                    } else if (yelpStreet == detailStreet && key3 !== undefined && key3 !== '' && detailName.indexOf(key3) >= 0) {
                        addToReview(result, detail.idnum);
                        //If Yelp's data for addresses do not match google's and yelp reports 
                        //multiple businesses with the same phone number - use best match
                    } else if (yelpStreet !== detailStreet && detailName.indexOf(key1) >= 0) {
                        // console.log(result);
                        if (resultInDetail == 1) {
                            if (resultInReviews == 0) {
                                addToReview(result, detail.idnum);
                            }
                        }
                    }
                    //If Google Places fails due to an error, compare results with less accurate location search.
                } else {
                    var business = Model.businesses[detail.idnum];
                    var businessName = business.name.toLowerCase();
                    var businessAddress1 = business.vicinity.toLowerCase().replace(/west/g, 'w');
                    var businessAddress2 = businessAddress1.toLowerCase().replace(/east/g, 'e');
                    var resultAddress = result.location.address[0].toLowerCase();
                    //In the event that some of Google Places requests are successful (but not all), check results with
                    //all review objects stored to ensure copies are not added and compare by Address.
                    if (resultInReviewsId == 0 && businessAddress2.indexOf(resultAddress) >= 0) {
                        //Three different keywords are used for matching purposes (key1, key2, and key3).
                        if (businessName.indexOf(key1) >= 0) {
                            addToReview(result, detail.idnum);
                        } else if (key2 !== undefined && key2 !== '' && businessName.indexOf(key2) >= 0) {
                            addToReview(result, detail.idnum);
                        } else if (key3 !== undefined && key3 !== '' && businessName.indexOf(key3) >= 0) {
                            addToReview(result, detail.idnum);
                        }
                        //If Address comparison fails (google maps only has a 'vicinity' parameter to check against, not 
                        //full address) then compare strictly by name.
                    } else if (resultInReviews == 0 && businessName.indexOf(key1) >= 0) {
                        var resultInBusiness = Model.businesses.filter(function(e) {
                            return e.name == result.name;
                        }).length;
                        if (resultInBusiness == 1) {
                            addToReview(result, detail.idnum);
                            //If Yelp's data for addresses do not match google's and yelp reports 
                            //multiple businesses with the same phone number - use best match
                        } else {
                            var nameInReviews = Model.reviews.filter(function(e) {
                                return $.inArray(businessName, reviewid5);
                            });
                            if (nameInReviews > -1) {
                                addToReview(result, detail.idnum);
                            }
                        }
                    }
                }
            })
        })
    },
    error: function(response) {
        console.log('Yelp Request failed - Check internet connection');
        Model.reviews.push('Error');
    }
};


function ViewModel() {
    var self = this;
    //Observables
    this.businesses = ko.observableArray(Model.businesses);
    this.details = [];
    this.placeholder = ko.observable('Loading...');

    //Search Bar
    var searchbarhtml = document.getElementById('searchbar');
    this.query = ko.observable(searchbarhtml.value);
    this.search = ko.computed(function() {
        self.businesses.removeAll();
        markers.forEach(function(marker) {
            marker.setMap(null);
        });

        for (var x in Model.businesslist) {
            if (Model.businesslist[x].name.toLowerCase().indexOf(self.query().toLowerCase()) >= 0) {
                self.businesses.push(Model.businesslist[x]);
                markers[x].setMap(map);
            }
        }
        infowindow.close();
    }, this);

    //Map Recentering
    var currCenter = map.getCenter();

    google.maps.event.addDomListener(window, "resize", function(e) {
        map.fitBounds(bound);
        google.maps.event.trigger(map, "resize");
    });

    google.maps.event.addDomListener(map, 'recenter', function() {
        map.setCenter(currCenter);
    })

    $('#bars').click(function() {
        google.maps.event.trigger(map, 'recenter');
    });

    //Current Selection Logic
    this.currentSelectionLogic = function(data) {
        Model.businesses.forEach(function(business) { //If no restuarant currently selected, turn on selection
            business.currentMarker(false);
        })
        data.currentMarker(true);
    }

    this.markerSelection = ko.computed(function() {
        markers.forEach(function(marker) {
            google.maps.event.addListener(marker, 'click', function() {
                Model.businesses.forEach(function(business) {
                    business.currentMarker(false);
                });
                for (var i = 0; i < Model.businesses.length; i++) {
                    if (Model.businesses[i].name == marker.title) {
                        Model.businesses[i].currentMarker(true);
                    }
                }
            })
        })
    })

    var listid;

    this.currentSelection = ko.computed(function() {
        for (var i = 0; i < Model.businesses.length; i++) {
            listidname = '#' + Model.businesses[i].idnum;
            listid = $(listidname);
            var indexbusiness = Model.businesses[i].idnum;

            //Update Marker & List View
            if (Model.businesses[i].currentMarker() == true) {
                markers[indexbusiness].setAnimation(google.maps.Animation.BOUNCE);
                listid.addClass('active');
                self.placeholder(Model.businesses[i].name); //Restaurant name Display

                // Filter for the case where Google Places responds with an Invalid Request Error, Valid Response,
                //Request Denied Error, or Zero Results were returned for the given place.
                if (Model.details[indexbusiness].hasOwnProperty('formatted_address')) {
                    // Google Places returned a valid response, uses detail object
                    self.infoWindowdiv(Model.details[indexbusiness], indexbusiness, i);
                } else {
                    //Google Places returned an error - uses Google Maps Object instead.
                    self.infoWindowdiv(Model.businesses[i], indexbusiness, i);
                };
            } else if (Model.businesses[i].currentMarker() == false) {
                markers[indexbusiness].setAnimation(null);
                if (listid !== null) {
                    listid.removeClass('active');
                }
            };
        }
    }, this);

    //InfoWindow Generator

    var fullcontent;
    var placeimg = document.createElement('img');

    this.infoWindowdiv = function(place, index, i) {
        var content = '<div id="content">' + '<h3>' + place.name + '</h3>';
        var contentend = '</div>';
        var reviewnumber;
        var reviewurl;
        var ratingimg;
        var yelpimg;
        Model.reviews.forEach(function(review) {
                if (review !== undefined && review.idnum == place.idnum && typeof(review) == "object") {
                    reviewnumber = review.review_count;
                    reviewurl = review.url;
                    ratingimg = '<div><img alt="alt" src="' + Model.reviewsimg[review.idnum].src + '">' + ' Based On ' + reviewnumber + ' reviews. Read more on <a href="' + reviewurl + '">Yelp!</a>' + '</img></div>';
                    yelpimg = '<div><img alt="alt" src="yelp_review_btn_red.png"></img></div>';
                }
            })
            //Google Places Object Returned by Current Selection
        if (place.hasOwnProperty('formatted_address')) {
            var contentaddress = '<h4>' + place.formatted_address + '</h4>';
            if (typeof(Model.reviews[place.idnum]) == "object") {
                fullcontent = content + contentaddress + ratingimg + yelpimg;
            } else if (Model.reviews[place.idnum] === 'Error') {
                var yelperror = '<div><h4>Yelp data could not be loaded</h4></div>';
                fullcontent = content + contentaddress + yelperror;
            } else {
                var yelperror = '<div><h4>Yelp data is loading. Select this business again in a few moments.</h4></div>';
                fullcontent = content + contentaddress + yelperror;
            }
            //Has Photos
            if (Model.imagesrcs[index] !== '') {
                placeimg.src = Model.imagesrcs[index];
                var contentimg = '<div id="content-photo">' + '<img alt="alt" src="' + placeimg.src + '">' + '</img>' + '</div>';
                //Has Website
                if (place.hasOwnProperty('website') && place.website !== undefined) {
                    var contentweb = '<a href="' + place.website + '">' + place.website + '</a>';
                    fullcontent += contentweb + contentimg + contentend;
                    //No Website
                } else {
                    fullcontent += contentimg + contentend;
                }
                //No Photos
            } else {
                if (place.hasOwnProperty('website') && place.website !== undefined) {
                    var contentweb = '<a href="' + place.website + '">' + place.website + '</a>';
                    fullcontent += contentweb + contentend;
                    //No Website
                } else {
                    fullcontent += contentend;
                }
            }
            //Maps Object Returned by Current Selection
            //add yelp for maps object
        } else {
            var contentaddress = '<h4>' + place.vicinity + '</h4>';
            if (typeof(Model.reviews[place.idnum]) == "object") {
                fullcontent = content + contentaddress + ratingimg + yelpimg;
            } else if (Model.reviews[place.idnum] === 'Error') {
                var yelperror = '<div><h4>Yelp data could not be loaded</h4></div>';
                fullcontent = content + contentaddress + yelperror;
            } else {
                var yelperror = '<div><h4>Yelp data is loading. Select this business again in a few moments.</h4></div>';
                fullcontent = content + contentaddress + yelperror;
            }
            //Has Photos
            if (Model.imagesrcs[index] !== '') {
                placeimg.src = Model.imagesrcs[index];
                var contentimg = '<div id="content-photo">' + '<img alt="alt" src="' + placeimg.src + '">' + '</img>' + '</div>';
                fullcontent += contentimg + contentend;
                //No Photos
            } else {
                fullcontent += contentend;
            }
        }
        //infoWindow Content & Settings 
        infowindow.setContent(fullcontent);
        infowindow.setOptions({
            maxWidth: 300
        });
        infowindow.open(map, markers[index]);
    };
};