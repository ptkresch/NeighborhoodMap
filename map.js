var map, google, service, bound, infowindow, ViewModel, loadingDone, self;
var markers = [];
var placeId = [];
var request = {};
var delay = 3000;
var index = 0;
var ErrorCounter = 0;
var Model = {
    businesses: [],
    businesslist: [],
    details: [],
    imagesrcs: [],
    reviews: [],
    reviewsimg: []
};

function initMap() {
    loadingDone = ko.observable(false);
    //If Google Maps can't be loaded either due to internet connection or other unforeseen error
    if (typeof(google) == 'undefined') {
        var reloadMap = document.createElement('script');
        var src = 'http://maps.googleapis.com/maps/api/js?key=AIzaSyCSvlguX2axX4hGDPmlp2c99BeAX4sjtwE&libraries=places&callback=initMap';
        reloadMap.src = src;
        reloadMap.onerror = function() {
            ko.applyBindings(new ViewModel());
            loadingDone(true);
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
    loadingDone(false);
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < results.length; i++) {
            Model.businesses[i] = results[i];
            Model.businesses[i].currentMarker = ko.observable(false);
            Model.businesslist[i] = results[i];
            Model.businesses[i].idnum = i;
            Model.businesses[i].listClass = ko.observable('none');
            placeId[i] = Model.businesses[i].place_id;
            //Test Invalid Google Places Request by using a wrong id for Places lookup.
            // placeId.push('0');
            createMarker(Model.businesses[i], i);
        }
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
}

GooglePlacesRequest = function(index, ErrorCounter) {
    request.placeId = placeId[index];
    if (request.placeId !== undefined) {
        service.getDetails(request, function(place, status) {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                place.idnum = index;
                Model.details.push(place);
                index++;
                if (index <= placeId.length) {
                    GooglePlacesRequest(index);
                }
                ErrorCounter = 0;
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                console.log('NO RESULTS');
                Model.details.push({
                    idnum: index
                });
                index++;
                if (index <= placeId.length) {
                    GooglePlacesRequest(index);
                }
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
                    }
                }
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
                    }
                }
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
                }
            } else if (status === google.maps.places.PlacesServiceStatus.INVALID_REQUEST) {
                console.log('INVALID REQUEST');
                Model.details.push({
                    idnum: index
                });
                index++;
                if (index <= placeId.length) {
                    GooglePlacesRequest(index);
                }
            }
        });
    } else {
        GooglePlacesGetPhotoUrls();
        console.log('Google Places has finished loading.');
        loadingDone(true);
    }
};

GooglePlacesGetPhotoUrls = function() {
    Model.details.forEach(function(detailobj, i) {
        var src;
        if (detailobj.hasOwnProperty('photos') && detailobj.photos.length > 0) {
            src = detailobj.photos[0].getUrl({
                'maxWidth': 200,
                'maxHeight': 100
            });
            Model.imagesrcs.push(src);
        } else if (Model.businesses[i].hasOwnProperty('photos') && Model.businesses[i].photos.length > 0) {
            src = Model.businesses[i].photos[0].getUrl({
                'maxWidth': 200,
                'maxHeight': 100
            });
            Model.imagesrcs.push(src);
        } else {
            Model.imagesrcs.push('');
        }
    });
};

function ViewModel() {
    self = this;
    //Observables
    this.businesses = ko.observableArray(Model.businesses);
    this.details = [];
    this.errorHTML = ko.observable();
    this.errorVisible = ko.observable(false);
    this.loaderVisible = ko.observable(true);
    this.currentObject = ko.observable();
    this.placeholder = ko.observable('Loading...');

    //Search Bar
    this.query = ko.observable('');
    this.search = ko.computed(function() {
        self.currentObject('');
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
        if (infowindow !== undefined) {
            infowindow.close();
        }
    }, this);

    //If google maps successfully loads, set Map properties
    if (google !== undefined) {
        //Map Recentering
        var currCenter = map.getCenter();

        google.maps.event.addDomListener(window, "resize", function(e) {
            map.fitBounds(bound);
            google.maps.event.trigger(map, "resize");
        });

        google.maps.event.addDomListener(map, 'recenter', function() {
            map.setCenter(currCenter);
        });
    }
    this.load = ko.observable('load');
    this.navdisplay = ko.observable('display-nav');

    this.toggleNavigation = function() {
        google.maps.event.trigger(map, 'recenter');
        if (this.navdisplay() == 'display-nav') {
            self.navdisplay('remove-nav');
        } else {
            self.navdisplay('display-nav');
        }
    };

    this.containerClass = ko.observable('active');
    this.slideClass = ko.observable('fa-minus');

    this.loading = ko.computed(function() {
        //If google maps loads successfully
        if (google !== undefined && loadingDone() === true) {
            self.loaderVisible(false);
            self.placeholder('Select a restaurant from the map or list.');
            //If google maps fails to load
        } else if (google === undefined && loadingDone() === true) {
            var errorText = '<h2>No data could be loaded! Please check internet connection before refreshing the page.</h2>';
            self.errorHTML(errorText);
            self.errorVisible(true);
            self.loaderVisible(false);
            self.placeholder('Whoops! Something went wrong.');
        }
    });

    this.toggleList = function() {
        if (self.slideClass() == 'fa-plus') {
            self.containerClass('active');
            self.slideClass('fa-minus');
            $('#toggle ul').slideToggle();
        } else {
            self.containerClass('');
            self.slideClass('fa-plus');
            $('#toggle ul').slideToggle();
        }
    };

    //Current Selection Logic

    //Enable List Selection
    this.currentSelectionLogic = function(data) {
        Model.businesses.forEach(function(business) {
            business.currentMarker(false);
        });
        data.currentMarker(true);
        self.currentObject(data);
    };

    //Enable Marker Selection
    this.markerSelection = ko.computed(function() {
        markers.forEach(function(marker) {
            google.maps.event.addListener(marker, 'click', function() {
                self.currentObject(Model.businesslist[marker.id]);
            });
        });
    });

    this.currentSelection = ko.computed(function() {
        if (typeof(self.currentObject()) == 'object') {
            var index = self.currentObject().idnum;
            var currentBusiness = Model.businesses[index];
            Model.businesses.forEach(function(business) {
                markers[business.idnum].setAnimation(null);
                business.listClass('none');
            });
            //Update Marker & List View
            markers[index].setAnimation(google.maps.Animation.BOUNCE);
            self.currentObject().listClass('active');
            self.placeholder(self.currentObject().name);

            // Filter for the case where Google Places responds with an Invalid Request Error, Valid Response,
            //Request Denied Error, or Zero Results were returned for the given place.
            // Google Places returned a valid response, uses detail object 
            if (Model.details[index].hasOwnProperty('formatted_address')) {
                self.currentObject(Model.details[index]);
                self.YelpRequest(self.currentObject());
                //Google Places returned an error - uses Google Maps Object instead.
            } else {
                self.currentObject(Model.businesses[index]);
                self.YelpRequest(self.currentObject());
            }
        }
    }, this);

    //Yelp Requests

    var auth = {
        consumerKey: "lD2MMgGYV897NrXUeO0yEw",
        consumerSecret: "zdScmshgUyGbQBftQ_nwAu9dAEU",
        accessToken: "DhdwKqheVW1g5putE65ij4TRdq8XMkE0",
        accessTokenSecret: "tJkO7O03alkN9cIWb9r-qJZm1z4"
    };

    function nonce_generate() {
        return (Math.floor(Math.random() * 1e12).toString());
    }

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

    this.YelpRequest = function(object) {
        //If Google Places is successful, use the details objects for a phone search.
        var term, parameters, encodedSignature;
        if (object.hasOwnProperty('international_phone_number')) {
            var str = object.international_phone_number.replace(/-/g, '');
            var str2 = str.replace(/ /g, '');
            term = object.name;
            parameters = new parameter(str2, term, 'undefined', 'undefined');
            encodedSignature = oauthSignature.generate('GET', yelp_url, parameters, auth.consumerSecret, auth.accessTokenSecret);
            parameters.oauth_signature = encodedSignature;
            settings.data = parameters;
            settings.url = yelp_url;
            $.jsonp(settings);
            //If Google Places fails, use the google maps objects for a location search (less accurate).
        } else {
            var lat = object.geometry.location.lat();
            var lng = object.geometry.location.lng();
            var cll = '' + lat + ',' + lng;
            term = object.name;
            var location = object.vicinity;
            parameters = new parameter('undefined', term, location, cll);
            encodedSignature = oauthSignature.generate('GET', yelp_url2, parameters, auth.consumerSecret, auth.accessTokenSecret);
            parameters.oauth_signature = encodedSignature;
            settings.data = parameters;
            settings.url = yelp_url2;
            $.jsonp(settings);
        }
    };

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
                var objectName = self.currentObject().name.toLowerCase();
                var objectId = self.currentObject().idnum;

                function addToReview(result, idnum) {
                        result.idnum = idnum;
                        Model.reviews[result.idnum] = result;
                        var reviewimg = document.createElement('img');
                        reviewimg.src = result.rating_img_url;
                        Model.reviewsimg[result.idnum] = reviewimg;
                        self.infoWindowdiv(self.currentObject());
                    }
                    //Note: The long function below is used for matching Yelp results with Google's.
                    //Yelp (more often than not) reports multiple (different) businesses having the same phone number and
                    //the same address. Several results also had similar names, requiring the names for each business reported 
                    //by Yelp to be split into different key words in order to compare with Google's reported name.
                    //The filter below attempts to match based on address and name, using a different word if the preceding
                    //one fails. If all those fail, then there was an issue with Yelp's reported address or name, and so a final
                    //attempt is made based solely on the name.

                var resultInReviews = Model.reviews.filter(function(e) {
                    return e.name == result.name;
                }).length;
                var resultInReviewsId = Model.reviews.filter(function(e) {
                    return e.id == result.id;
                }).length;

                // If Google Places successfully returns a detail object, compare results with more accurate phone search.
                if (self.currentObject().hasOwnProperty('international_phone_number')) {
                    var objectStreet = self.currentObject().formatted_address.split(',')[0];
                    //Three different keywords are used for matching purposes (key1, key2, and key3).
                    if (yelpStreet == objectStreet && objectName.indexOf(key1) >= 0) {
                        addToReview(result, objectId);
                    } else if (yelpStreet == objectStreet && key2 !== undefined && key2 !== '' && objectName.indexOf(key2) >= 0) {
                        addToReview(result, objectId);
                    } else if (yelpStreet == objectStreet && key3 !== undefined && key3 !== '' && objectName.indexOf(key3) >= 0) {
                        addToReview(result, objectId);
                        //If Yelp's data for addresses do not match google's and yelp reports 
                        //multiple businesses with the same phone number - use best match
                    } else if (yelpStreet !== objectStreet && objectName.indexOf(key1) >= 0) {
                        if (resultInReviews > -1) {
                            addToReview(result, objectId);
                        }
                    }
                    //If Google Places fails due to an error, compare results with less accurate location search.
                } else {
                    var business = self.currentObject();
                    var businessName = business.name.toLowerCase();
                    var businessAddress1 = business.vicinity.toLowerCase().replace(/west/g, 'w');
                    var businessAddress2 = businessAddress1.toLowerCase().replace(/east/g, 'e');
                    var resultAddress = result.location.address[0].toLowerCase();
                    //In the event that some of Google Places requests are successful (but not all), check results with
                    //all review objects stored to ensure copies are not added and compare by Address.
                    if (resultInReviewsId === 0 && businessAddress2.indexOf(resultAddress) >= 0) {
                        //Three different keywords are used for matching purposes (key1, key2, and key3).
                        if (businessName.indexOf(key1) >= 0) {
                            addToReview(result, objectId);
                        } else if (key2 !== undefined && key2 !== '' && businessName.indexOf(key2) >= 0) {
                            addToReview(result, objectId);
                        } else if (key3 !== undefined && key3 !== '' && businessName.indexOf(key3) >= 0) {
                            addToReview(result, objectId);
                        }
                        //If Address comparison fails (google maps only has a 'vicinity' parameter to check against, not 
                        //full address) then compare strictly by name.
                    } else if (resultInReviews === 0 && businessName.indexOf(key1) >= 0) {
                        addToReview(result, objectId);
                        //If Yelp's data for addresses do not match google's and yelp reports 
                        //multiple businesses with the same phone number - use best match
                    } else {
                        var nameInReviews = Model.reviews.filter(function(e) {
                            return $.inArray(businessName, reviewid5);
                        });
                        if (nameInReviews > -1) {
                            addToReview(result, objectId);
                        }
                    }
                }
            });
        },
        error: function(response) {
            console.log('Yelp Request failed - Check internet connection');
            Model.reviews[self.currentObject().idnum] = 'Error';
            self.infoWindowdiv(self.currentObject());
        }
    };

    //InfoWindow Generator

    var fullcontent;
    var placeimg = document.createElement('img');

    this.infoWindowdiv = function(place) {
        var content = '<div id="content">' + '<h3>' + place.name + '</h3>';
        var contentend = '</div>';
        var review = Model.reviews[place.idnum];
        var reviewimg = Model.reviewsimg[place.idnum];
        var reviewnumber, reviewurl, ratingimg, yelpimg, contentweb, contentaddress, yelperror, contentimg;
        if (review !== undefined && typeof(review) == "object") {
            reviewnumber = review.review_count;
            reviewurl = review.url;
            ratingimg = '<div><img alt="alt" src="' + reviewimg.src + '">' + ' Based On ' + reviewnumber + ' reviews. Read more on <a href="' + reviewurl + '">Yelp!</a>' + '</img></div>';
            yelpimg = '<div><img alt="alt" src="yelp_review_btn_red.png"></img></div>';
        }
        //Google Places Object Returned by Current Selection
        if (place.hasOwnProperty('formatted_address')) {
            contentaddress = '<h4>' + place.formatted_address + '</h4>';
            //Yelp successful
            if (typeof(review) == "object") {
                fullcontent = content + contentaddress + ratingimg + yelpimg;
                //Yelp failed
            } else if (review === 'Error') {
                yelperror = '<div><h4>Yelp data could not be loaded</h4></div>';
                fullcontent = content + contentaddress + yelperror;
            }
            //Has Photos
            if (Model.imagesrcs[place.idnum] !== '') {
                placeimg.src = Model.imagesrcs[place.idnum];
                contentimg = '<div id="content-photo">' + '<img alt="alt" src="' + placeimg.src + '">' + '</img>' + '</div>';
                //Has Website
                if (place.hasOwnProperty('website') && place.website !== undefined) {
                    contentweb = '<a href="' + place.website + '">' + place.website + '</a>';
                    fullcontent += contentweb + contentimg + contentend;
                    //No Website
                } else {
                    fullcontent += contentimg + contentend;
                }
                //No Photos
            } else {
                //Has Website
                if (place.hasOwnProperty('website') && place.website !== undefined) {
                    contentweb = '<a href="' + place.website + '">' + place.website + '</a>';
                    fullcontent += contentweb + contentend;
                    //No Website
                } else {
                    fullcontent += contentend;
                }
            }
            //Maps Object Returned by Current Selection
        } else {
            contentaddress = '<h4>' + place.vicinity + '</h4>';
            //Yelp successful
            if (typeof(Model.reviews[place.idnum]) == "object") {
                fullcontent = content + contentaddress + ratingimg + yelpimg;
                //Yelp failed
            } else if (Model.reviews[place.idnum] == 'Error') {
                yelperror = '<div><h4>Yelp data could not be loaded</h4></div>';
                fullcontent = content + contentaddress + yelperror;
            }
            //Has Photos
            if (Model.imagesrcs[place.idnum] !== '') {
                placeimg.src = Model.imagesrcs[place.idnum];
                contentimg = '<div id="content-photo">' + '<img alt="alt" src="' + placeimg.src + '">' + '</img>' + '</div>';
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
        infowindow.open(map, markers[place.idnum]);
    };
}