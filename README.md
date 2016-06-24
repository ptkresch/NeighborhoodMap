# Udacity Neighborhood Map Project

##Introduction

My Neighborhood Map project for Udacity uses the Google maps API, Google Places API, and Yelp API to create an interactive application that shows the business information of several restaurants in Santa Barbara. [Knockout's framework](http://knockoutjs.com/) was used for easy User interfacing. [Oauth-signature](https://github.com/bettiolo/oauth-signature-js) was used to help query the Yelp API. [jQuery-JSONP](https://github.com/jaubourg/jquery-jsonp) was also used for error recovery after server failures.

##Running the Application

###Downloading the application
Begin by navigating [here](https://github.com/ptkresch/NeighborhoodMap) to find the Github repository for the application. Select the 'Clone or download' button and choose one of the options: Open in Github desktop, Download ZIP file, or copy the git url to the clipboard. The latter utilizes Github through the terminal or command line. 

If the ZIP file is download, simply extract the folder using an unarchiver program and browse the folder for a file named 'index.html'. Open this file using a web browser (Chrome recommended) and the app will start.

If using Github through the terminal, navigate to the folder you would like to clone the repository to. Then enter the following: 

`$ git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY`

The above url is the one copied to the clipboard from the main repository page, so simply paste the url after typing 'git clone'. Following this, a local repository should be created with all the files necessary to run the app. Navigate to the folder and open 'index.html' inside of it with a web browser (again, Chrome recommended). 

###Testing the application on a server

Download [ngrok](https://ngrok.com/) and open terminal. Unzip the file using the command: 

`$ unzip /path/to/ngrok.zip`

Open another Terminal window or tab and enter the following:

`python -m SimpleHTTPServer YOURPORTNUMBERHERE`

Enter an appropriate number for the port your server will run on (the defualt usually being port 80, according the the official documentation found [here](https://ngrok.com/docs#expose)). Provided the ngrok file is placed in the repository for the portfolio, ngrok can be initialized with the following command in a separate terminal window:

`./ngrok http YOURPORTNUMBERHERE`

When ngrok starts, it will display a url of the tunnel. Copy the url provided and enter it into a web browser to view the app. Now, the application can be tested online.

##Error Handling

###Google Maps

In the event google maps fails to load, a 3 second timer starts. After the timer stops, the application will attempt to retrieve Google maps (and online stylesheets) once more. If it fails again, a message will display onscreen asking the user to check his/her internet connection. Possible reasons for failure include: 
1. No internet connection
2. Timeout due to slow internet
3. Number of queries have exceeded the allowed limit (This should not happen for the Maps API, unless you attempt to run the application using several other Google maps services under the same data plan. Click [here](https://developers.google.com/maps/premium/usage-limits#usage-model-summary) for more information.)

If google maps still fails to load, there is likely a problem with your API key or registration with google. Click [here](https://developers.google.com/maps/documentation/javascript/error-messages#checking-errors) for more information. Checking the DevTools console in your browser should show one of the errors listed in the above link.

###Google Places

Custom error handlers for Google Places were created to ensure the application will still run and display as much data as possible, even if some of the requests fail. Possible error messages (viewable in the console) are: 

1. No Results - No data was returned from the query.
2. Error - There was a problem connecting to Google's servers.
3. Unknown Error - Error triggered by one's own server connection.
4. Over Query Limit - Too many queries were sent to Google at once. Signing up for a higher data plan will allow for more queries per second. 
5. Invalid Request - There was an issue with one of the parameters sent to Google (such as the API key).

In each case, except for the last, the application will wait and attempt to query Google once again. If it fails twice in this way, the console will show a message stating that Google places data could not be loaded. The Google Maps object will then be used for Yelp's queries. 

###Yelp

Yelp's data is loaded through the business information obtained through Google Maps API & Google Places API. Information from Google Places API is used for the Yelp request, as it contains phone numbers for each business (which provides the most accurate results through Yelp's api). In the event that Google Places API fails, however, the Yelp request is carried out using Google Maps data. If the Yelp request fails, the Infowindows displaying business information will note that Yelp data could not be loaded for that business.

If a Google Places object is returned successfully, Yelp's API will be triggered through a phone search. Otherwise, Yelp will be triggered through a location search based on latitude/longitude coordinates and the business name obtained through Google Maps. 

#####*jQuery-JSONP*
Yelp error callbacks failed in the event of a network/server problem. The jQuery-JSONP plugin is used for error recovery in these cases to allow the application to respond to failed requests. The plugin can be found at: [https://github.com/jaubourg/jquery-jsonp]

##Attribution

###Google

#####*Maps*

Map & Location data provided by Google Maps. In the event that Google Places data cannot be obtained, business information and pictures are provided by Google maps API.

#####*Places*

Business information including: business names, addresses, pictures, and business websites are provided by the Google Places API. 

###Yelp

Yelp API provides the following: rating images, review counts, links to Yelp's review page for the business, and Yelp's icon. 
