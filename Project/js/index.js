if (document.readyState !== "loading") {
    console.log("Document is ready!");
    initializeCode();
} else {
    document.addEventListener("DOMContentLoaded", function () {
        console.log("Document is ready after waiting!");
        initializeCode();
    })
}

let map;

const weatherDescriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snowfall",
    73: "Moderate snowfall",
    75: "Heavy snowfall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Slight thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
};

function convertTemp(tempC, unit) { // Converts temperature to wanted unit
    if (unit === "fahrenheit") {
        return (tempC * 9 / 5) + 32;
    } else if (unit === "kelvin") {
        return tempC + 273.15;
    } else {
        return tempC;
    }
}

function buildChart(weatherApiData, omDayTempsData) { // Builds the day temperature forecast chart 
    let weatherApiForecastData = weatherApiData.forecast.forecastday[0].hour;
    let openMeteoForecastData = omDayTempsData.hourly.temperature_2m;
    let hours = [];
    let weatherApiTemps = [];
    let openMeteoTemps = [];

    let tempSum = 0;

    const selectedUnit = document.querySelector('input[name="temp-unit"]:checked').value; // Checks the selected radio button for unit conversion

    for (i = 0; i < 24; i++) {
        hours.push(`${i.toString().padStart(2, '0')}`);

        let weatherApiTempC = weatherApiForecastData[i].temp_c
        let openMeteoTempC = openMeteoForecastData[i]
        let weatherApiDisplayTemp;
        let openMeteoDisplayTemp;

        weatherApiDisplayTemp = convertTemp(weatherApiTempC, selectedUnit);
        openMeteoDisplayTemp = convertTemp(openMeteoTempC, selectedUnit);

        tempSum += weatherApiTempC;
        weatherApiTemps.push(weatherApiDisplayTemp.toFixed(1));
        openMeteoTemps.push(openMeteoDisplayTemp.toFixed(1));
    }

    let averageTemp = tempSum / 24;
    let color;
    let color2;
    if (averageTemp < 0) {
        color = "#1100ff";
        color2 = "#0e00cc";
    } else if (averageTemp >= 0 && averageTemp < 10) {
        color = "#47bfff";
        color2 = "#3a9bdb";
    } else if (averageTemp >= 10 && averageTemp < 20) {
        color = "#ffd500";
        color2 = "#e6c200";
    } else if (averageTemp >= 20 && averageTemp < 30) {
        color = "#ff8400";
        color2 = "#db6b00";
    } else {
        color = "#ff462e";
        color2 = "#d63d28";
    }

    const chartData = {
        labels: hours,
        datasets: [
            {
                name: "Weather API",
                values: weatherApiTemps,
            },
            {
                name: "Open Meteo",
                values: openMeteoTemps,
            }
        ]
    }

    chart = new frappe.Chart("#chart", {
        title: `Hourly temperature forecast in ${weatherApiData.location.name}`,
        data: chartData,
        type: "line",
        height: 250,
        colors: [color, color2]
    })
}

function buildWeekTemps(omWeekTempsData) { // Builds 7 days worth of min and max temperatures
    let dailyMaxTemps = omWeekTempsData.daily.temperature_2m_max;
    let dailyMinTemps = omWeekTempsData.daily.temperature_2m_min;
    let weatherCodes = omWeekTempsData.daily.weather_code;
    let dates = omWeekTempsData.daily.time;
    console.log(omWeekTempsData)

    const container = document.getElementById("week-forecast-container");
    document.getElementById("open-meteo-info-text").innerText = "Weekly Temperatures From Open Meteo";
    container.innerHTML = "";

    const selectedUnit = document.querySelector('input[name="temp-unit"]:checked').value; // Checks the selected radio button for unit conversion

    for (let i = 0; i < dailyMaxTemps.length; i++) {
        const dayDiv = document.createElement("div");
        dayDiv.classList.add("day-forecast");

        const dateDiv = document.createElement("div");
        let month = dates[i].split("-")[1];
        let day = dates[i].split("-")[2];
        dateDiv.innerText = `${day}.${month}`;
        dateDiv.classList.add("forecast-date");

        let displayMaxTemp;
        let displayMinTemp;

        const maxTempDiv = document.createElement("div");
        maxTempDiv.classList.add("temp-div");
        const minTempDiv = document.createElement("div");
        minTempDiv.classList.add("temp-div");

        displayMaxTemp = convertTemp(dailyMaxTemps[i], selectedUnit);
        displayMinTemp = convertTemp(dailyMinTemps[i], selectedUnit);
        let unitString;

        if (selectedUnit === "fahrenheit") {
            unitString = "°F";
        } else if (selectedUnit === "kelvin") {
            unitString = "K";
        } else {
            unitString = "°C";
        }

        maxTempDiv.innerText = `High: ${displayMaxTemp.toFixed(1)}${unitString}`;
        minTempDiv.innerText = `Low: ${displayMinTemp.toFixed(1)}${unitString}`;

        let weatherDescription = weatherDescriptions[weatherCodes[i]];

        const weatherConditionDiv = document.createElement("div");
        weatherConditionDiv.innerText = weatherDescription;
        weatherConditionDiv.classList.add("condition-div")

        dayDiv.appendChild(dateDiv);
        dayDiv.appendChild(maxTempDiv);
        dayDiv.appendChild(minTempDiv);
        dayDiv.appendChild(weatherConditionDiv);

        container.appendChild(dayDiv);
    }
}

// Gets the data from apis and creates the weather elements. 
const processData = async (url) => { 
    const loadingElement = document.getElementById("loading");
    loadingElement.style.visibility = "visible";

    const locationNameElement = document.getElementById("location-name");
    const locationRegionCountry = document.getElementById("location-region-country");
    const locationLocalTimeElement = document.getElementById("location-local-time")
    const currentTempElement = document.getElementById("current-temperature");
    const currentConditionElement = document.getElementById("current-condition");
    const iconDiv = document.getElementById("icon-div");
    const infoDiv = document.getElementById("weather-api-info");

    try {
        const res = await fetch(url);
        const weatherApiData = await res.json();

        let locationName = weatherApiData.location.name;
        let locationRegion = weatherApiData.location.region;
        let locationCountry = weatherApiData.location.country;
        let currentTempC = weatherApiData.current.temp_c;
        let currentCondition = weatherApiData.current.condition.text;

        let lat = weatherApiData.location.lat;
        let lon = weatherApiData.location.lon;

        let omDayTempsURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&timezone=auto&forecast_days=1`
        const omDayTempsres = await fetch(omDayTempsURL);
        const omDayTempsData = await omDayTempsres.json();

        locationNameElement.innerText = locationName;
        locationRegionCountry.innerText = `${locationRegion}, ${locationCountry}`

        const selectedUnit = document.querySelector('input[name="temp-unit"]:checked').value;
        let displayTemp = convertTemp(currentTempC, selectedUnit);
        let unitString;
        if (selectedUnit === "fahrenheit") {
            unitString = "°F";
        } else if (selectedUnit === "kelvin") {
            unitString = "K";
        } else {
            unitString = "°C";
        }
        currentTempElement.innerText = `${displayTemp.toFixed(1)}${unitString}`;

        currentConditionElement.innerText = currentCondition;

        let currentConditionIcon = weatherApiData.current.condition.icon;
        const iconElement = document.createElement("img");
        iconElement.src = `https:${currentConditionIcon}`;
        iconDiv.innerHTML = "";
        iconDiv.appendChild(iconElement);

        infoDiv.style.fontSize = "10px"
        infoDiv.innerText = "Current weather provided by Weather API"

        buildChart(weatherApiData, omDayTempsData);

        let omWeekTempsURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
        const omWeekTempsres = await fetch(omWeekTempsURL);
        const omWeekTempsData = await omWeekTempsres.json();

        buildWeekTemps(omWeekTempsData);

        let timestamp = weatherApiData.location.localtime;
        let localTime = timestamp.split(" ")[1];
        locationLocalTimeElement.innerText = timestamp; 
        updateLooks(currentTempC, localTime);

        // Builds a temperature map with openweathermap and openstreetmap
        if (!map) {
            map = L.map('map', {
                center: [lat, lon],
                zoom: 10,
            });
            const weatherMapAPIKEY = "8c9107883bfdf71075576847dc60473b"
            let osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "© OpenStreetMap"
            }).addTo(map);
            L.tileLayer(`https://tile.openweathermap.org/map/temp/{z}/{x}/{y}.png?appid=${weatherMapAPIKEY}`, {
                opacity: 0.6
            }).addTo(map)
        } else {
            map.setView([lat, lon], 10);
        }
        const owmInfoDiv = document.getElementById("openweathermap-info");
        owmInfoDiv.innerText = "Temperature map by openweathermap.org and OpenStreetMap"


    } catch (e) {
        alert("Failed to fetch data. Try again");
    } finally {
        loadingElement.style.visibility = "hidden";
    }

}

function updateLooks(tempC, localTime) { // Updates the look and feel of the website
    const currentWeatherDataContainer = document.getElementById("current-weather-data-container");
    const weekForecastContainer = document.getElementById("week-forecast-container");
    const body = document.body
    const hour = parseInt(localTime.split(":")[0]);
    let tempColor;
    if (tempC < 0) {
        tempColor = "#1100ff"
    } else if (tempC >= 0 && tempC < 10) {
        tempColor = "#47bfff"
    } else if (tempC >= 10 && tempC < 20) {
        tempColor = "#ffd500"
    } else if (tempC >= 20 && tempC < 30) {
        tempColor = "#ff8400"
    } else {
        tempColor = "#ff462e"
    }
    currentWeatherDataContainer.style.color = tempColor
    weekForecastContainer.style.color = tempColor

    if (hour <= 6 || hour >= 18) {
        body.style.backgroundColor = "#1a1a1a";
        body.style.color = "white";
    } else {
        body.style.backgroundColor = "white";
        body.style.color = "black";
    }
}

function initializeCode() {
    const API_KEY = "e33f650cdc414a8c997134936241610";
    const baseUrl = "http://api.weatherapi.com/v1"
    const searchButton = document.getElementById("search-button");
    const userLocationButton = document.getElementById("user-location-button");
    const tempUnitRadioButtons = document.querySelectorAll('input[name="temp-unit"]');


    let lastSearchedCity = "";
    let useGeolocation = false;

    searchButton.addEventListener("click", () => {
        let city = document.getElementById("search-input").value;
        lastSearchedCity = city;
        useGeolocation = false;
        let url = `${baseUrl}/forecast.json?key=${API_KEY}&q=${city}`;
        document.getElementById("search-input").value = "";
        processData(url);
    });

    userLocationButton.addEventListener("click", () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude.toFixed(2);
                const lon = position.coords.longitude.toFixed(2);
                useGeolocation = true;
                let url = `${baseUrl}/forecast.json?key=${API_KEY}&q=${lat},${lon}`;
                document.getElementById("search-input").value = "";
                processData(url);
            }, (error) => {
                alert("Couldn't get your location.")
            });
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    });

    tempUnitRadioButtons.forEach((radio) => { // This is for handling the change of temp units so it knows to update the page
        radio.addEventListener("change", () => {
            if (useGeolocation) {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(async (position) => {
                        const lat = position.coords.latitude.toFixed(2);
                        const lon = position.coords.longitude.toFixed(2);
                        let url = `${baseUrl}/forecast.json?key=${API_KEY}&q=${lat},${lon}`;
                        processData(url);
                    }, (error) => {
                        alert("Couldn't get your location.");
                    });
                }
            } else if (lastSearchedCity) {
                let url = `${baseUrl}/forecast.json?key=${API_KEY}&q=${lastSearchedCity}`;
                processData(url);
            }
        });
    });
}