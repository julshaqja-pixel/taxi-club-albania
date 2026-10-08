// ==========================================
// TAXI CLUB ALBANIA
// CLIENT APP - SERVER DISPATCH + CLIENT OWNERSHIP
// ==========================================


// ==========================================
// CLIENT AUTH
// Separate storage from Driver/Admin sessions.
// ==========================================

const clientSupabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        storageKey:
          "taxi-club-albania-client-auth",
        persistSession:
          true,
        autoRefreshToken:
          true,
        detectSessionInUrl:
          false
      }
    }
  );

let clientSession = null;

async function ensureClientSession() {

  const { data: { session } } =
    await clientSupabaseClient.auth.getSession();

  if (session) {
    clientSession = session;
    return session;
  }

  const { data, error } =
    await clientSupabaseClient.auth.signInAnonymously();

  if (error) {
    console.error("Anonymous sign-in:", error);
    alert("Aktivizo Anonymous Sign-Ins në Supabase para testimit.");
    return null;
  }

  clientSession = data.session;
  return data.session;
}


// ==========================================
// MAP
// ==========================================

const map =
  L.map("map").setView(
    [41.3275, 19.8187],
    13
  );

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution:
      "&copy; OpenStreetMap contributors"
  }
).addTo(map);


// ==========================================
// STATE
// ==========================================

let pointA = null;
let pointB = null;

let pointAMarker = null;
let pointBMarker = null;

let routeLine = null;
let driverMarker = null;

let currentRoute = null;
let currentRideData = null;
let currentRideId = null;
let currentRideStatus = null;

let activePoint =
  "destination";

let pickupTimer = null;
let destinationTimer = null;

let rideChannel = null;
let offerChannel = null;
let driverChannel = null;

// Driver -> Client ETA throttling
let lastDriverRouteAt = 0;
let lastDriverRouteLat = null;
let lastDriverRouteLng = null;
let driverRouteRequestRunning = false;

const DRIVER_ROUTE_MIN_INTERVAL_MS =
  8000;

const DRIVER_ROUTE_MIN_MOVE_METERS =
  60;


// ==========================================
// HTML
// ==========================================

const pickupInput =
  document.getElementById("pickup");

const destinationInput =
  document.getElementById("destination");

const pickupSuggestions =
  document.getElementById("pickupSuggestions");

const destinationSuggestions =
  document.getElementById("destinationSuggestions");

const currentLocationBtn =
  document.getElementById("currentLocationBtn");

const distanceEl =
  document.getElementById("distance");

const durationEl =
  document.getElementById("duration");

const priceEl =
  document.getElementById("price");

const routeStatus =
  document.getElementById("routeStatus");

const requestRideBtn =
  document.getElementById("requestRideBtn");

const driverInfo =
  document.getElementById("driverInfo");

const driverName =
  document.getElementById("driverName");

const driverPlate =
  document.getElementById("driverPlate");


requestRideBtn.disabled =
  true;


// ==========================================
// CLIENT ACTIONS + HISTORY UI
// Injected here so index.html does not need to change.
// ==========================================

const clientUi =
  installClientAccountUi();

const cancelRideBtn =
  clientUi.cancelRideBtn;

const historyToggleBtn =
  clientUi.historyToggleBtn;

const historyPanel =
  clientUi.historyPanel;

const historyList =
  clientUi.historyList;

const historyEmpty =
  clientUi.historyEmpty;

const historyCloseBtn =
  clientUi.historyCloseBtn;

let historyLoaded =
  false;


// ==========================================
// INPUT FOCUS
// ==========================================

pickupInput.addEventListener(
  "focus",
  function () {

    activePoint =
      "pickup";
  }
);


destinationInput.addEventListener(
  "focus",
  function () {

    activePoint =
      "destination";
  }
);


// ==========================================
// AUTOCOMPLETE
// ==========================================

pickupInput.addEventListener(
  "input",
  function () {

    clearTimeout(
      pickupTimer
    );

    const query =
      pickupInput.value.trim();

    if (
      query.length < 3
    ) {

      pickupSuggestions.style.display =
        "none";

      return;
    }

    pickupTimer =
      setTimeout(
        () =>
          searchAddress(
            query,
            "pickup"
          ),
        500
      );
  }
);


destinationInput.addEventListener(
  "input",
  function () {

    clearTimeout(
      destinationTimer
    );

    const query =
      destinationInput.value.trim();

    if (
      query.length < 3
    ) {

      destinationSuggestions.style.display =
        "none";

      return;
    }

    destinationTimer =
      setTimeout(
        () =>
          searchAddress(
            query,
            "destination"
          ),
        500
      );
  }
);


// ==========================================
// ADDRESS SEARCH
// ==========================================

async function searchAddress(
  query,
  type
) {

  try {

    const url =
      "https://nominatim.openstreetmap.org/search" +
      "?format=json" +
      "&limit=6" +
      "&countrycodes=al" +
      "&addressdetails=1" +
      "&q=" +
      encodeURIComponent(query);

    const response =
      await fetch(url);

    const results =
      await response.json();

    showSuggestions(
      results,
      type
    );
  }

  catch (error) {

    console.error(
      "Address search:",
      error
    );
  }
}


function showSuggestions(
  results,
  type
) {

  const container =
    type === "pickup"
      ? pickupSuggestions
      : destinationSuggestions;

  container.innerHTML =
    "";

  if (
    !results ||
    results.length === 0
  ) {

    container.style.display =
      "none";

    return;
  }

  results.forEach(
    result => {

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "suggestion-item";

      item.textContent =
        result.display_name;

      item.addEventListener(
        "click",
        function () {

          const lat =
            parseFloat(
              result.lat
            );

          const lng =
            parseFloat(
              result.lon
            );

          if (
            type === "pickup"
          ) {

            pickupInput.value =
              result.display_name;

            setPointA(
              lat,
              lng,
              false
            );

            activePoint =
              "destination";

            destinationInput.focus();
          }

          else {

            destinationInput.value =
              result.display_name;

            setPointB(
              lat,
              lng,
              false
            );
          }

          container.style.display =
            "none";

          map.setView(
            [lat, lng],
            15
          );
        }
      );

      container.appendChild(
        item
      );
    }
  );

  container.style.display =
    "block";
}


// ==========================================
// CLIENT GPS
// ==========================================

currentLocationBtn.addEventListener(
  "click",
  function () {

    if (
      !navigator.geolocation
    ) {

      alert(
        "GPS nuk mbështetet."
      );

      return;
    }

    currentLocationBtn.textContent =
      "Duke kërkuar pozicionin...";

    navigator.geolocation
      .getCurrentPosition(

        function (
          position
        ) {

          const lat =
            position.coords.latitude;

          const lng =
            position.coords.longitude;

          currentLocationBtn.textContent =
            "Përdor pozicionin aktual";

          setPointA(
            lat,
            lng,
            true
          );

          map.setView(
            [lat, lng],
            16
          );

          activePoint =
            "destination";

          destinationInput.focus();
        },

        function (
          error
        ) {

          console.error(
            error
          );

          currentLocationBtn.textContent =
            "Përdor pozicionin aktual";

          alert(
            "Nuk mundëm të marrim GPS."
          );
        },

        {
          enableHighAccuracy:
            true,

          timeout:
            10000,

          maximumAge:
            0
        }
      );
  }
);


// ==========================================
// MAP CLICK
// ==========================================

map.on(
  "click",
  function (
    e
  ) {

    if (
      activePoint ===
      "pickup"
    ) {

      setPointA(
        e.latlng.lat,
        e.latlng.lng,
        true
      );

      activePoint =
        "destination";

      destinationInput.focus();
    }

    else {

      setPointB(
        e.latlng.lat,
        e.latlng.lng,
        true
      );
    }
  }
);


// ==========================================
// POINTS
// ==========================================

function setPointA(
  lat,
  lng,
  updateInput = true
) {

  pointA = {
    lat,
    lng
  };

  if (
    pointAMarker
  ) {

    map.removeLayer(
      pointAMarker
    );
  }

  pointAMarker =
    L.marker([
      lat,
      lng
    ])
      .addTo(map)
      .bindPopup(
        "A - Nisja"
      );

  if (
    updateInput
  ) {

    pickupInput.value =
      lat.toFixed(5) +
      ", " +
      lng.toFixed(5);
  }

  updateRoute();
}


function setPointB(
  lat,
  lng,
  updateInput = true
) {

  pointB = {
    lat,
    lng
  };

  if (
    pointBMarker
  ) {

    map.removeLayer(
      pointBMarker
    );
  }

  pointBMarker =
    L.marker([
      lat,
      lng
    ])
      .addTo(map)
      .bindPopup(
        "B - Destinacioni"
      );

  if (
    updateInput
  ) {

    destinationInput.value =
      lat.toFixed(5) +
      ", " +
      lng.toFixed(5);
  }

  updateRoute();
}


// ==========================================
// CUSTOMER ROUTE
// ==========================================

function updateRoute() {

  if (
    !pointA ||
    !pointB
  ) {

    requestRideBtn.disabled =
      true;

    return;
  }

  calculateCustomerRoute();
}


async function calculateCustomerRoute() {

  requestRideBtn.disabled =
    true;

  routeStatus.textContent =
    "Duke llogaritur rrugën...";

  const route =
    await getRoadRoute(
      pointA.lat,
      pointA.lng,
      pointB.lat,
      pointB.lng
    );

  if (
    !route
  ) {

    routeStatus.textContent =
      "Nuk u llogarit dot rruga";

    return;
  }

  currentRoute =
    route;

  const distanceKm =
    route.distance /
    1000;

  const durationMinutes =
    Math.ceil(
      route.duration /
      60
    );

  const price =
    Math.round(
      300 +
      distanceKm *
      70
    );

  currentRideData = {
    distanceKm,
    durationMinutes,
    priceLek:
      price
  };

  distanceEl.textContent =
    distanceKm.toFixed(2) +
    " km";

  durationEl.textContent =
    durationMinutes +
    " min";

  priceEl.textContent =
    price +
    " LEK";

  drawRouteGeometry(
    route.geometry,
    true
  );

  routeStatus.textContent =
    "Rruga u llogarit sipas rrjetit rrugor";

  requestRideBtn.disabled =
    false;
}


// ==========================================
// GENERIC OSRM ROUTE
// ==========================================

async function getRoadRoute(
  startLat,
  startLng,
  endLat,
  endLng
) {

  const start =
    startLng +
    "," +
    startLat;

  const end =
    endLng +
    "," +
    endLat;

  const url =
    "https://router.project-osrm.org/route/v1/driving/" +
    start +
    ";" +
    end +
    "?overview=full" +
    "&geometries=geojson";

  try {

    const response =
      await fetch(url);

    const data =
      await response.json();

    if (
      data.code !== "Ok" ||
      !data.routes?.length
    ) {

      return null;
    }

    return data.routes[0];
  }

  catch (error) {

    console.error(
      "OSRM:",
      error
    );

    return null;
  }
}


// ==========================================
// DRAW ROUTE
// ==========================================

function drawRouteGeometry(
  geometry,
  fit = false
) {

  if (
    routeLine
  ) {

    map.removeLayer(
      routeLine
    );
  }

  const coordinates =
    geometry.coordinates.map(
      coordinate => [
        coordinate[1],
        coordinate[0]
      ]
    );

  routeLine =
    L.polyline(
      coordinates,
      {
        weight: 6,
        opacity: 0.85
      }
    )
      .addTo(map);

  if (
    fit
  ) {

    map.fitBounds(
      routeLine.getBounds(),
      {
        padding:
          [40, 40]
      }
    );
  }
}


// ==========================================
// CREATE RIDE
// ==========================================

requestRideBtn.addEventListener(
  "click",
  createRide
);


async function createRide() {

  const session =
    clientSession ||
    await ensureClientSession();

  if (!session) {
    return;
  }

  if (
    !pointA ||
    !pointB ||
    !currentRideData
  ) {
    return;
  }

  requestRideBtn.disabled =
    true;

  requestRideBtn.textContent =
    "DUKE KËRKUAR TAXI...";

  const {
    data: ride,
    error
  } =
    await clientSupabaseClient
      .from("rides")
      .insert({
        client_user_id:
          session.user.id,

        pickup_address:
          pickupInput.value,

        destination_address:
          destinationInput.value,

        pickup_lat:
          pointA.lat,

        pickup_lng:
          pointA.lng,

        destination_lat:
          pointB.lat,

        destination_lng:
          pointB.lng,

        distance_km:
          currentRideData.distanceKm,

        duration_minutes:
          currentRideData.durationMinutes,

        price_lek:
          currentRideData.priceLek,

        status:
          "pending"
      })
      .select()
      .single();

  if (error) {

    console.error(error);

    requestRideBtn.disabled =
      false;

    requestRideBtn.textContent =
      "KËRKO TAXI";

    return;
  }

  currentRideId =
    ride.id;

  currentRideStatus =
    ride.status;

  subscribeRide(
    ride.id
  );

  subscribeOffers(
    ride.id
  );

  routeStatus.textContent =
    "Po kërkojmë taksistin më të afërt...";

  updateClientActionButtons();

  // E rëndësishme: trigger-i i databazës mund ta ketë
  // ndryshuar statusin para se Realtime të abonohet.
  // Prandaj e trajtojmë menjëherë rreshtin e kthyer.
  await handleRideUpdate(
    ride
  );

  await loadRideHistory(
    true
  );

  // Dispatch-i tani bëhet automatikisht nga databaza.
}


// ==========================================
// OFFER WATCHER
// Serveri dërgon automatikisht ofertën tjetër.
// ==========================================

function subscribeOffers(
  rideId
) {

  if (
    offerChannel
  ) {

    clientSupabaseClient.removeChannel(
      offerChannel
    );
  }

  offerChannel =
    clientSupabaseClient
      .channel(
        "client-offers-" +
        rideId
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ride_offers",
          filter:
            "ride_id=eq." +
            rideId
        },
        async function (
          payload
        ) {

          const offer =
            payload.new;

          if (
            offer.status ===
              "declined"
          ) {

            routeStatus.textContent =
              "Taksisti refuzoi. Serveri po kërkon automatikisht një tjetër...";
          }

          if (
            offer.status ===
              "timeout"
          ) {

            routeStatus.textContent =
              "Taksisti nuk u përgjigj. Serveri po kërkon automatikisht një tjetër...";
          }
        }
      )
      .subscribe();
}


// ==========================================
// RIDE WATCHER
// ==========================================

function subscribeRide(
  rideId
) {

  if (
    rideChannel
  ) {

    clientSupabaseClient.removeChannel(
      rideChannel
    );
  }

  rideChannel =
    clientSupabaseClient
      .channel(
        "client-ride-" +
        rideId
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rides",
          filter:
            "id=eq." +
            rideId
        },
        async function (
          payload
        ) {

          await handleRideUpdate(
            payload.new
          );
        }
      )
      .subscribe();
}


// ==========================================
// RIDE STATUS UI
// ==========================================

async function handleRideUpdate(
  ride
) {

  currentRideStatus =
    ride.status;

  if (
    ride.id
  ) {
    currentRideId =
      ride.id;
  }

  updateClientActionButtons();

  if (
    ride.status ===
      "pending" &&
    !ride.assigned_driver_id
  ) {

    routeStatus.textContent =
      "Po ju caktojmë një taksist tjetër...";

    requestRideBtn.textContent =
      "DUKE KËRKUAR TAXI...";

    removeCurrentDriverFromClient();

    // While reassigning, show original trip again.
    await redrawPassengerTrip();

    return;
  }

  if (
    ride.status ===
      "driver_arriving" &&
    ride.assigned_driver_id
  ) {

    requestRideBtn.textContent =
      "TAXI PO VJEN";

    await loadDriver(
      ride.assigned_driver_id
    );

    subscribeDriver(
      ride.assigned_driver_id
    );

    return;
  }

  if (
    ride.status ===
    "driver_arrived"
  ) {

    routeStatus.textContent =
      "Taksisti ka mbërritur. Dilni te pika e nisjes.";

    requestRideBtn.textContent =
      "TAXI MBËRRITI";

    // Show the passenger trip route again.
    await redrawPassengerTrip();

    return;
  }

  if (
    ride.status ===
    "client_onboard"
  ) {

    routeStatus.textContent =
      "Udhëtimi filloi. Po udhëtoni drejt destinacionit.";

    requestRideBtn.textContent =
      "UDHËTIM NË PROCES";

    await redrawPassengerTrip();

    return;
  }

  if (
    ride.status ===
    "completed"
  ) {

    routeStatus.textContent =
      "Udhëtimi përfundoi.";

    requestRideBtn.textContent =
      "KËRKO TAXI TJETËR";

    requestRideBtn.disabled =
      !currentRideData;

    updateClientActionButtons();

    await redrawPassengerTrip();
    await loadRideHistory(true);

    return;
  }

  if (
    ride.status ===
    "cancelled"
  ) {

    routeStatus.textContent =
      "Udhëtimi u anulua.";

    requestRideBtn.textContent =
      "KËRKO TAXI TJETËR";

    requestRideBtn.disabled =
      !currentRideData;

    removeCurrentDriverFromClient();
    updateClientActionButtons();

    await redrawPassengerTrip();
    await loadRideHistory(true);

    return;
  }

  if (
    ride.status ===
    "no_driver"
  ) {

    routeStatus.textContent =
      "Nuk u gjet taxi e disponueshme.";

    requestRideBtn.textContent =
      "PROVO PËRSËRI";

    requestRideBtn.disabled =
      !currentRideData;

    removeCurrentDriverFromClient();
    updateClientActionButtons();

    await redrawPassengerTrip();
    await loadRideHistory(true);
  }
}


// ==========================================
// DRIVER LOAD
// ==========================================

async function loadDriver(
  driverId
) {

  const {
    data,
    error
  } =
    await clientSupabaseClient
      .from("drivers")
      .select("*")
      .eq(
        "id",
        driverId
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    return;
  }

  driverInfo.style.display =
    "block";

  driverName.textContent =
    data.name;

  driverPlate.textContent =
    data.vehicle_plate ||
    "";

  updateDriverMarker(
    data
  );

  if (
    currentRideStatus ===
    "driver_arriving"
  ) {

    await updateDriverToPickupRoute(
      data,
      true
    );
  }
}


// ==========================================
// DRIVER REALTIME GPS
// ==========================================

function subscribeDriver(
  driverId
) {

  if (
    driverChannel
  ) {

    clientSupabaseClient.removeChannel(
      driverChannel
    );
  }

  driverChannel =
    clientSupabaseClient
      .channel(
        "client-driver-" +
        driverId
      )
      .on(
        "postgres_changes",
        {
          event:
            "UPDATE",

          schema:
            "public",

          table:
            "drivers",

          filter:
            "id=eq." +
            driverId
        },
        async function (
          payload
        ) {

          const driver =
            payload.new;

          updateDriverMarker(
            driver
          );

          if (
            currentRideStatus ===
            "driver_arriving"
          ) {

            await updateDriverToPickupRoute(
              driver,
              false
            );
          }
        }
      )
      .subscribe();
}


// ==========================================
// DRIVER MARKER
// ==========================================

function updateDriverMarker(
  driver
) {

  if (
    driver.lat === null ||
    driver.lng === null
  ) {
    return;
  }

  const position =
    [
      Number(
        driver.lat
      ),
      Number(
        driver.lng
      )
    ];

  if (
    !driverMarker
  ) {

    const taxiIcon =
      L.divIcon({
        className:
          "client-taxi-marker",

        html:
          `
          <div
            style="
              width:42px;
              height:42px;
              display:flex;
              align-items:center;
              justify-content:center;
              border-radius:50%;
              background:#101010;
              border:3px solid #e00000;
              box-shadow:0 3px 12px rgba(0,0,0,.55);
              font-size:22px;
            "
          >
            🚕
          </div>
          `,

        iconSize:
          [42, 42],

        iconAnchor:
          [21, 21],

        popupAnchor:
          [0, -24]
      });

    driverMarker =
      L.marker(
        position,
        {
          icon:
            taxiIcon
        }
      )
        .addTo(map)
        .bindPopup(
          "🚕 " +
          driver.name
        );
  }

  else {

    driverMarker.setLatLng(
      position
    );
  }
}


// ==========================================
// DRIVER -> CLIENT ETA + ROUTE
// ==========================================

async function updateDriverToPickupRoute(
  driver,
  force = false
) {

  if (
    !pointA ||
    driver.lat === null ||
    driver.lng === null
  ) {
    return;
  }

  if (
    driverRouteRequestRunning
  ) {
    return;
  }

  const now =
    Date.now();

  const movedMeters =
    (
      lastDriverRouteLat === null ||
      lastDriverRouteLng === null
    )
      ?
      Infinity
      :
      getDistanceKm(
        lastDriverRouteLat,
        lastDriverRouteLng,
        Number(driver.lat),
        Number(driver.lng)
      ) *
      1000;

  const intervalPassed =
    now -
    lastDriverRouteAt >=
    DRIVER_ROUTE_MIN_INTERVAL_MS;

  const movedEnough =
    movedMeters >=
    DRIVER_ROUTE_MIN_MOVE_METERS;

  if (
    !force &&
    !intervalPassed &&
    !movedEnough
  ) {
    return;
  }

  driverRouteRequestRunning =
    true;

  try {

    const route =
      await getRoadRoute(
        Number(driver.lat),
        Number(driver.lng),
        pointA.lat,
        pointA.lng
      );

    if (
      !route
    ) {
      return;
    }

    lastDriverRouteAt =
      Date.now();

    lastDriverRouteLat =
      Number(driver.lat);

    lastDriverRouteLng =
      Number(driver.lng);

    const etaMinutes =
      Math.max(
        1,
        Math.ceil(
          route.duration /
          60
        )
      );

    const etaDistanceKm =
      route.distance /
      1000;

    routeStatus.textContent =
      "Taksisti po vjen • " +
      etaMinutes +
      " min • " +
      etaDistanceKm.toFixed(1) +
      " km larg";

    // Keep original trip metrics below.
    // Only routeStatus changes to pickup ETA.

    drawRouteGeometry(
      route.geometry,
      false
    );

    // Fit taxi + pickup so both are visible.
    const taxiLatLng =
      [
        Number(driver.lat),
        Number(driver.lng)
      ];

    const pickupLatLng =
      [
        pointA.lat,
        pointA.lng
      ];

    map.fitBounds(
      L.latLngBounds([
        taxiLatLng,
        pickupLatLng
      ]),
      {
        padding:
          [55, 55],

        maxZoom:
          16
      }
    );
  }

  finally {

    driverRouteRequestRunning =
      false;
  }
}


// ==========================================
// RESTORE CLIENT -> DESTINATION ROUTE
// ==========================================

async function redrawPassengerTrip() {

  if (
    !pointA ||
    !pointB
  ) {
    return;
  }

  let route =
    currentRoute;

  if (
    !route
  ) {

    route =
      await getRoadRoute(
        pointA.lat,
        pointA.lng,
        pointB.lat,
        pointB.lng
      );
  }

  if (
    !route
  ) {
    return;
  }

  currentRoute =
    route;

  drawRouteGeometry(
    route.geometry,
    true
  );
}


// ==========================================
// REMOVE DRIVER
// ==========================================

function removeCurrentDriverFromClient() {

  driverInfo.style.display =
    "none";

  if (
    driverMarker
  ) {

    map.removeLayer(
      driverMarker
    );

    driverMarker =
      null;
  }

  if (
    driverChannel
  ) {

    clientSupabaseClient.removeChannel(
      driverChannel
    );

    driverChannel =
      null;
  }

  lastDriverRouteAt =
    0;

  lastDriverRouteLat =
    null;

  lastDriverRouteLng =
    null;
}


// ==========================================
// DISTANCE
// ==========================================

function getDistanceKm(
  lat1,
  lng1,
  lat2,
  lng2
) {

  const R =
    6371;

  const dLat =
    toRadians(
      lat2 -
      lat1
    );

  const dLng =
    toRadians(
      lng2 -
      lng1
    );

  const a =
    Math.sin(
      dLat / 2
    ) ** 2

    +

    Math.cos(
      toRadians(
        lat1
      )
    )

    *

    Math.cos(
      toRadians(
        lat2
      )
    )

    *

    Math.sin(
      dLng / 2
    ) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(
        1 - a
      )
    );

  return R * c;
}


function toRadians(
  value
) {

  return (
    value *
    Math.PI /
    180
  );
}


// ==========================================
// CLIENT UI - CANCEL + HISTORY
// ==========================================

function installClientAccountUi() {

  const style =
    document.createElement(
      "style"
    );

  style.textContent = `
    .client-secondary-action {
      width: 100%;
      min-height: 42px;
      margin-top: 8px;
      border: 1px solid #3b3b3b;
      border-radius: 8px;
      background: #171717;
      color: #f4f4f4;
      font-weight: 700;
      cursor: pointer;
    }

    .client-secondary-action:hover {
      background: #202020;
    }

    .client-cancel-action {
      display: none;
      width: 100%;
      min-height: 42px;
      margin-top: 8px;
      border: 1px solid #8b0000;
      border-radius: 8px;
      background: #320000;
      color: #ffffff;
      font-weight: 800;
      cursor: pointer;
    }

    .client-cancel-action:hover {
      background: #4b0000;
    }

    .client-cancel-action:disabled {
      opacity: .55;
      cursor: not-allowed;
    }

    .client-history-panel {
      display: none;
      margin-top: 10px;
      border: 1px solid #303030;
      border-radius: 10px;
      background: #101010;
      color: #f4f4f4;
      overflow: hidden;
      text-align: left;
    }

    .client-history-panel.open {
      display: block;
    }

    .client-history-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px;
      border-bottom: 1px solid #2c2c2c;
      background: #161616;
    }

    .client-history-title {
      font-weight: 800;
      font-size: 14px;
    }

    .client-history-close {
      border: 0;
      background: transparent;
      color: #bdbdbd;
      font-size: 18px;
      cursor: pointer;
    }

    .client-history-list {
      max-height: 330px;
      overflow-y: auto;
    }

    .client-history-item {
      padding: 12px 14px;
      border-bottom: 1px solid #252525;
    }

    .client-history-item:last-child {
      border-bottom: 0;
    }

    .client-history-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }

    .client-history-date {
      color: #9b9b9b;
      font-size: 11px;
      margin-bottom: 6px;
    }

    .client-history-route {
      font-size: 12px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }

    .client-history-meta {
      margin-top: 7px;
      color: #c7c7c7;
      font-size: 11px;
    }

    .client-history-status {
      flex: 0 0 auto;
      padding: 4px 7px;
      border-radius: 999px;
      background: #2a2a2a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .client-history-status.completed {
      background: #123d22;
    }

    .client-history-status.cancelled,
    .client-history-status.no_driver {
      background: #4c1111;
    }

    .client-history-empty {
      display: none;
      padding: 16px 14px;
      color: #a6a6a6;
      font-size: 12px;
      text-align: center;
    }
  `;

  document.head.appendChild(
    style
  );

  const cancelRideBtn =
    document.createElement(
      "button"
    );

  cancelRideBtn.type =
    "button";

  cancelRideBtn.className =
    "client-cancel-action";

  cancelRideBtn.textContent =
    "ANULO UDHËTIMIN";

  const historyToggleBtn =
    document.createElement(
      "button"
    );

  historyToggleBtn.type =
    "button";

  historyToggleBtn.className =
    "client-secondary-action";

  historyToggleBtn.textContent =
    "HISTORIKU I UDHËTIMEVE";

  const historyPanel =
    document.createElement(
      "section"
    );

  historyPanel.className =
    "client-history-panel";

  historyPanel.innerHTML = `
    <div class="client-history-header">
      <div class="client-history-title">Historiku i udhëtimeve</div>
      <button class="client-history-close" type="button" aria-label="Mbyll historikun">×</button>
    </div>
    <div class="client-history-list"></div>
    <div class="client-history-empty">Nuk ka ende udhëtime në këtë pajisje.</div>
  `;

  requestRideBtn.insertAdjacentElement(
    "afterend",
    cancelRideBtn
  );

  cancelRideBtn.insertAdjacentElement(
    "afterend",
    historyToggleBtn
  );

  historyToggleBtn.insertAdjacentElement(
    "afterend",
    historyPanel
  );

  return {
    cancelRideBtn,
    historyToggleBtn,
    historyPanel,
    historyList:
      historyPanel.querySelector(
        ".client-history-list"
      ),
    historyEmpty:
      historyPanel.querySelector(
        ".client-history-empty"
      ),
    historyCloseBtn:
      historyPanel.querySelector(
        ".client-history-close"
      )
  };
}


function canClientCancelRide(
  status
) {

  return [
    "pending",
    "driver_arriving",
    "driver_arrived"
  ].includes(
    status
  );
}


function updateClientActionButtons() {

  const canCancel =
    Boolean(
      currentRideId &&
      canClientCancelRide(
        currentRideStatus
      )
    );

  cancelRideBtn.style.display =
    canCancel
      ? "block"
      : "none";

  cancelRideBtn.disabled =
    false;
}


cancelRideBtn.addEventListener(
  "click",
  async function () {

    if (
      !currentRideId ||
      !canClientCancelRide(
        currentRideStatus
      )
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Dëshiron ta anulosh këtë udhëtim?"
      );

    if (!confirmed) {
      return;
    }

    cancelRideBtn.disabled =
      true;

    cancelRideBtn.textContent =
      "DUKE ANULUAR...";

    const rideId =
      currentRideId;

    const {
      error
    } =
      await clientSupabaseClient
        .rpc(
          "cancel_client_ride",
          {
            p_ride_id:
              rideId
          }
        );

    if (error) {

      console.error(
        "Cancel ride:",
        error
      );

      alert(
        error.message ||
        "Udhëtimi nuk u anulua."
      );

      cancelRideBtn.disabled =
        false;

      cancelRideBtn.textContent =
        "ANULO UDHËTIMIN";

      return;
    }

    const {
      data: ride,
      error: rideError
    } =
      await clientSupabaseClient
        .from(
          "rides"
        )
        .select(
          "*"
        )
        .eq(
          "id",
          rideId
        )
        .maybeSingle();

    cancelRideBtn.textContent =
      "ANULO UDHËTIMIN";

    if (
      rideError
    ) {
      console.error(
        "Reload cancelled ride:",
        rideError
      );
    }

    if (ride) {
      await handleRideUpdate(
        ride
      );
    }

    await loadRideHistory(
      true
    );
  }
);


historyToggleBtn.addEventListener(
  "click",
  async function () {

    const opening =
      !historyPanel.classList.contains(
        "open"
      );

    historyPanel.classList.toggle(
      "open"
    );

    if (opening) {
      await loadRideHistory(
        true
      );
    }
  }
);


historyCloseBtn.addEventListener(
  "click",
  function () {

    historyPanel.classList.remove(
      "open"
    );
  }
);


async function loadRideHistory(
  force = false
) {

  if (
    historyLoaded &&
    !force
  ) {
    return;
  }

  const session =
    clientSession ||
    await ensureClientSession();

  if (!session) {
    return;
  }

  const {
    data: rides,
    error
  } =
    await clientSupabaseClient
      .from(
        "rides"
      )
      .select(
        "id,pickup_address,destination_address,distance_km,duration_minutes,price_lek,status,created_at"
      )
      .eq(
        "client_user_id",
        session.user.id
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      )
      .limit(
        15
      );

  if (error) {
    console.error(
      "Ride history:",
      error
    );
    return;
  }

  historyLoaded =
    true;

  renderRideHistory(
    rides || []
  );
}


function renderRideHistory(
  rides
) {

  historyList.innerHTML =
    "";

  historyEmpty.style.display =
    rides.length
      ? "none"
      : "block";

  rides.forEach(
    ride => {

      const item =
        document.createElement(
          "article"
        );

      item.className =
        "client-history-item";

      const statusClass =
        String(
          ride.status || ""
        )
          .replace(
            /[^a-z0-9_-]/gi,
            ""
          );

      const price =
        Number.isFinite(
          Number(
            ride.price_lek
          )
        )
          ? Number(
              ride.price_lek
            ) +
            " LEK"
          : "—";

      const distance =
        ride.distance_km !== null &&
        ride.distance_km !== undefined
          ? Number(
              ride.distance_km
            ).toFixed(1) +
            " km"
          : "—";

      item.innerHTML = `
        <div class="client-history-row">
          <div>
            <div class="client-history-date">${escapeHtml(formatRideDate(ride.created_at))}</div>
            <div class="client-history-route">
              <strong>Nisja:</strong> ${escapeHtml(ride.pickup_address || "—")}<br>
              <strong>Destinacioni:</strong> ${escapeHtml(ride.destination_address || "—")}
            </div>
            <div class="client-history-meta">${escapeHtml(distance)} • ${escapeHtml(price)}</div>
          </div>
          <span class="client-history-status ${statusClass}">${escapeHtml(rideStatusLabel(ride.status))}</span>
        </div>
      `;

      historyList.appendChild(
        item
      );
    }
  );
}


function rideStatusLabel(
  status
) {

  const labels = {
    pending:
      "Në pritje",
    driver_arriving:
      "Taxi po vjen",
    driver_arrived:
      "Taxi mbërriti",
    client_onboard:
      "Në udhëtim",
    completed:
      "Përfunduar",
    cancelled:
      "Anuluar",
    no_driver:
      "Pa taxi"
  };

  return labels[status] ||
    status ||
    "—";
}


function formatRideDate(
  value
) {

  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(
      "sq-AL",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    ).format(
      new Date(
        value
      )
    );
  }

  catch (_) {
    return String(
      value
    );
  }
}


function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


// ==========================================
// RESTORE ACTIVE RIDE AFTER REFRESH
// ==========================================

async function restoreActiveRide() {

  const session =
    clientSession ||
    await ensureClientSession();

  if (!session) {
    return;
  }

  const {
    data: ride,
    error
  } =
    await clientSupabaseClient
      .from(
        "rides"
      )
      .select(
        "*"
      )
      .eq(
        "client_user_id",
        session.user.id
      )
      .in(
        "status",
        [
          "pending",
          "driver_arriving",
          "driver_arrived",
          "client_onboard"
        ]
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      )
      .limit(
        1
      )
      .maybeSingle();

  if (error) {
    console.error(
      "Restore active ride:",
      error
    );
    return;
  }

  if (!ride) {
    updateClientActionButtons();
    return;
  }

  currentRideId =
    ride.id;

  currentRideStatus =
    ride.status;

  pickupInput.value =
    ride.pickup_address ||
    "";

  destinationInput.value =
    ride.destination_address ||
    "";

  if (
    ride.pickup_lat !== null &&
    ride.pickup_lng !== null
  ) {
    setPointA(
      Number(
        ride.pickup_lat
      ),
      Number(
        ride.pickup_lng
      ),
      false
    );
  }

  if (
    ride.destination_lat !== null &&
    ride.destination_lng !== null
  ) {
    setPointB(
      Number(
        ride.destination_lat
      ),
      Number(
        ride.destination_lng
      ),
      false
    );
  }

  currentRideData = {
    distanceKm:
      Number(
        ride.distance_km ||
        0
      ),
    durationMinutes:
      Number(
        ride.duration_minutes ||
        0
      ),
    priceLek:
      Number(
        ride.price_lek ||
        0
      )
  };

  distanceEl.textContent =
    Number(
      ride.distance_km ||
      0
    ).toFixed(2) +
    " km";

  durationEl.textContent =
    Number(
      ride.duration_minutes ||
      0
    ) +
    " min";

  priceEl.textContent =
    Number(
      ride.price_lek ||
      0
    ) +
    " LEK";

  requestRideBtn.disabled =
    true;

  subscribeRide(
    ride.id
  );

  subscribeOffers(
    ride.id
  );

  await handleRideUpdate(
    ride
  );
}


async function initializeClientExperience() {

  const session =
    await ensureClientSession();

  if (!session) {
    return;
  }

  await restoreActiveRide();
  await loadRideHistory(true);
}


initializeClientExperience();


// ==========================================
// CLOSE SUGGESTIONS
// ==========================================

document.addEventListener(
  "click",
  function (
    event
  ) {

    if (
      !pickupInput.contains(
        event.target
      ) &&
      !pickupSuggestions.contains(
        event.target
      )
    ) {

      pickupSuggestions.style.display =
        "none";
    }

    if (
      !destinationInput.contains(
        event.target
      ) &&
      !destinationSuggestions.contains(
        event.target
      )
    ) {

      destinationSuggestions.style.display =
        "none";
    }
  }
);
