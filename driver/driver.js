// ==========================================
// TAXI CLUB ALBANIA
// DRIVER APP - AUTHENTICATED DRIVER
// ==========================================

const COMMISSION_PERCENT = 15;


// ==========================================
// MAP
// ==========================================

const driverMap =
  L.map("driverMap").setView(
    [41.3275, 19.8187],
    13
  );

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution:
      "&copy; OpenStreetMap contributors"
  }
).addTo(driverMap);


// ==========================================
// STATE
// ==========================================

let currentUser = null;
let currentDriver = null;

let isOnline = false;

let gpsWatchId = null;
let driverMarker = null;

let currentRide = null;
let currentOffer = null;

let offersChannel = null;
let activeRideChannel = null;

let countdownInterval = null;
let countdownValue = 15;


// ==========================================
// HTML
// ==========================================

const logoutBtn =
  document.getElementById("logoutBtn");

const onlineSwitch =
  document.getElementById("onlineSwitch");

const statusText =
  document.getElementById("statusText");

const connectionBadge =
  document.getElementById("connectionBadge");

const gpsStatus =
  document.getElementById("gpsStatus");

const latitudeEl =
  document.getElementById("latitude");

const longitudeEl =
  document.getElementById("longitude");

const jobCard =
  document.getElementById("jobCard");

const jobCountdownEl =
  document.getElementById("jobCountdown");

const jobPickup =
  document.getElementById("jobPickup");

const jobDestination =
  document.getElementById("jobDestination");

const jobDistance =
  document.getElementById("jobDistance");

const jobDuration =
  document.getElementById("jobDuration");

const jobPrice =
  document.getElementById("jobPrice");

const jobDriverIncome =
  document.getElementById("jobDriverIncome");

const acceptJobBtn =
  document.getElementById("acceptJobBtn");

const rejectJobBtn =
  document.getElementById("rejectJobBtn");

const activeRideCard =
  document.getElementById("activeRideCard");

const activeRideTitle =
  document.getElementById("activeRideTitle");

const activeRideDestination =
  document.getElementById("activeRideDestination");

const activeRideStatus =
  document.getElementById("activeRideStatus");

const arrivedClientBtn =
  document.getElementById("arrivedClientBtn");

const startRideBtn =
  document.getElementById("startRideBtn");

const completeRideBtn =
  document.getElementById("completeRideBtn");

const todayJobs =
  document.getElementById("todayJobs");

const todayAccepted =
  document.getElementById("todayAccepted");

const todayRejected =
  document.getElementById("todayRejected");

const todayRevenue =
  document.getElementById("todayRevenue");

const grossRevenue =
  document.getElementById("grossRevenue");

const commissionAmount =
  document.getElementById("commissionAmount");

const netRevenue =
  document.getElementById("netRevenue");


// ==========================================
// INIT
// ==========================================

initializeDriver();

async function initializeDriver() {

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth.getSession();

  if (
    !session ||
    !session.user
  ) {

    window.location.href =
      "./login.html";

    return;
  }

  currentUser =
    session.user;

  const {
    data,
    error
  } =
    await supabaseClient
      .from("drivers")
      .select("*")
      .eq(
        "auth_user_id",
        currentUser.id
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {

    console.error(error);

    alert(
      "Profili i shoferit nuk u gjet."
    );

    await supabaseClient.auth
      .signOut();

    window.location.href =
      "./login.html";

    return;
  }

  if (
    data.is_archived
  ) {

    alert(
      "Llogaria është arkivuar nga administratori."
    );

    await supabaseClient.auth
      .signOut();

    window.location.href =
      "./login.html";

    return;
  }

  if (
    data.account_status !==
    "approved"
  ) {

    alert(
      "Llogaria nuk është aprovuar ende nga administratori."
    );

    await supabaseClient.auth
      .signOut();

    window.location.href =
      "./login.html";

    return;
  }

  currentDriver =
    data;

  subscribeDriverAccountStatus();

  document
    .getElementById("driverDisplayName")
    .textContent =
      data.name;

  document
    .getElementById("driverDisplayPlate")
    .textContent =
      data.vehicle_plate;

  await loadStats();
}


// ==========================================
// LOGOUT
// ==========================================

logoutBtn.addEventListener(
  "click",
  async function () {

    if (
      currentDriver
    ) {

      await goOffline();
    }

    await supabaseClient.auth
      .signOut();

    window.location.href =
      "./login.html";
  }
);


// ==========================================
// ADMIN ACCOUNT STATUS WATCH
// ==========================================

let driverAccountChannel = null;

function subscribeDriverAccountStatus() {

  if (
    driverAccountChannel
  ) {
    supabaseClient.removeChannel(
      driverAccountChannel
    );
  }

  driverAccountChannel =
    supabaseClient
      .channel(
        "driver-account-status-" +
        currentDriver.id
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drivers",
          filter:
            "id=eq." +
            currentDriver.id
        },
        async function (
          payload
        ) {

          currentDriver =
            payload.new;

          document
            .getElementById(
              "driverDisplayName"
            )
            .textContent =
              currentDriver.name;

          document
            .getElementById(
              "driverDisplayPlate"
            )
            .textContent =
              currentDriver.vehicle_plate;

          if (
            currentDriver.is_archived ||
            currentDriver.account_status !==
              "approved"
          ) {

            if (
              gpsWatchId !== null
            ) {
              navigator.geolocation.clearWatch(
                gpsWatchId
              );
              gpsWatchId = null;
            }

            alert(
              currentDriver.is_archived
                ?
                "Llogaria u arkivua nga administratori."
                :
                "Llogaria u pezullua nga administratori."
            );

            await supabaseClient.auth
              .signOut();

            window.location.href =
              "./login.html";
          }
        }
      )
      .subscribe();
}


// ==========================================
// ONLINE / OFFLINE
// ==========================================

onlineSwitch.addEventListener(
  "change",
  async function () {

    if (
      onlineSwitch.checked
    ) {

      await goOnline();
    }

    else {

      await goOffline();
    }
  }
);


async function goOnline() {

  if (
    !currentDriver
  ) {

    onlineSwitch.checked =
      false;

    return;
  }

  const { data: freshDriver } =
    await supabaseClient
      .from("drivers")
      .select("*")
      .eq("id", currentDriver.id)
      .maybeSingle();

  if (
    !freshDriver ||
    freshDriver.is_archived ||
    freshDriver.account_status !==
      "approved"
  ) {

    onlineSwitch.checked =
      false;

    alert(
      "Llogaria nuk është aktive."
    );

    await supabaseClient.auth
      .signOut();

    window.location.href =
      "./login.html";

    return;
  }

  currentDriver =
    freshDriver;

  if (
    !navigator.geolocation
  ) {

    alert(
      "GPS nuk mbështetet."
    );

    onlineSwitch.checked =
      false;

    return;
  }

  isOnline = true;

  statusText.textContent =
    "Je Online";

  connectionBadge.textContent =
    "ONLINE";

  connectionBadge.classList.remove(
    "offline"
  );

  connectionBadge.classList.add(
    "online"
  );

  await supabaseClient
    .from("drivers")
    .update({
      is_online: true,
      is_available: true
    })
    .eq(
      "id",
      currentDriver.id
    );

  startGpsTracking();

  subscribeToOffers();

  await checkExistingOffer();

  await checkExistingActiveRide();
}


async function goOffline() {

  isOnline = false;

  onlineSwitch.checked =
    false;

  statusText.textContent =
    "Je Offline";

  connectionBadge.textContent =
    "OFFLINE";

  connectionBadge.classList.remove(
    "online"
  );

  connectionBadge.classList.add(
    "offline"
  );

  gpsStatus.textContent =
    "Jo aktiv";

  latitudeEl.textContent =
    "--";

  longitudeEl.textContent =
    "--";

  if (
    gpsWatchId !== null
  ) {

    navigator.geolocation.clearWatch(
      gpsWatchId
    );

    gpsWatchId = null;
  }

  if (
    offersChannel
  ) {

    supabaseClient.removeChannel(
      offersChannel
    );

    offersChannel = null;
  }

  if (
    activeRideChannel
  ) {

    supabaseClient.removeChannel(
      activeRideChannel
    );

    activeRideChannel = null;
  }

  if (
    currentDriver
  ) {

    await supabaseClient
      .from("drivers")
      .update({
        is_online: false,
        is_available: false
      })
      .eq(
        "id",
        currentDriver.id
      );
  }
}


// ==========================================
// GPS
// ==========================================

function startGpsTracking() {

  gpsStatus.textContent =
    "Duke kërkuar GPS...";

  if (
    gpsWatchId !== null
  ) {

    navigator.geolocation.clearWatch(
      gpsWatchId
    );
  }

  gpsWatchId =
    navigator.geolocation
      .watchPosition(

        async function (
          position
        ) {

          const lat =
            position.coords.latitude;

          const lng =
            position.coords.longitude;

          gpsStatus.textContent =
            "Aktiv";

          latitudeEl.textContent =
            lat.toFixed(6);

          longitudeEl.textContent =
            lng.toFixed(6);

          updateDriverMarker(
            lat,
            lng
          );

          await supabaseClient
            .from("drivers")
            .update({
              lat,
              lng,
              last_location_update:
                new Date()
                  .toISOString()
            })
            .eq(
              "id",
              currentDriver.id
            );
        },

        function (
          error
        ) {

          console.error(error);

          gpsStatus.textContent =
            "Gabim GPS";
        },

        {
          enableHighAccuracy:
            true,

          timeout:
            15000,

          maximumAge:
            3000
        }
      );
}


function updateDriverMarker(
  lat,
  lng
) {

  if (
    !driverMarker
  ) {

    driverMarker =
      L.marker([
        lat,
        lng
      ])
        .addTo(
          driverMap
        )
        .bindPopup(
          "🚕 " +
          currentDriver.name
        );

    driverMap.setView(
      [
        lat,
        lng
      ],
      16
    );
  }

  else {

    driverMarker.setLatLng([
      lat,
      lng
    ]);
  }
}


// ==========================================
// OFFERS
// ==========================================

function subscribeToOffers() {

  if (
    offersChannel
  ) {

    supabaseClient.removeChannel(
      offersChannel
    );
  }

  offersChannel =
    supabaseClient
      .channel(
        "driver-offers-" +
        currentDriver.id
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ride_offers",
          filter:
            "driver_id=eq." +
            currentDriver.id
        },
        function (
          payload
        ) {

          if (
            !isOnline ||
            currentRide
          ) {
            return;
          }

          loadOffer(
            payload.new
          );
        }
      )
      .subscribe();
}


async function checkExistingOffer() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("ride_offers")
      .select("*")
      .eq(
        "driver_id",
        currentDriver.id
      )
      .eq(
        "status",
        "offered"
      )
      .order(
        "offered_at",
        {
          ascending:
            false
        }
      )
      .limit(1);

  if (error) {

    console.error(error);

    return;
  }

  if (
    data &&
    data.length > 0
  ) {

    await loadOffer(
      data[0]
    );
  }
}


async function loadOffer(
  offer
) {

  if (
    currentRide
  ) {
    return;
  }

  const {
    data:
      ride,
    error
  } =
    await supabaseClient
      .from("rides")
      .select("*")
      .eq(
        "id",
        offer.ride_id
      )
      .eq(
        "status",
        "pending"
      )
      .maybeSingle();

  if (
    error ||
    !ride
  ) {
    return;
  }

  currentOffer =
    offer;

  showRideOffer(
    ride
  );
}


function showRideOffer(
  ride
) {

  currentRide =
    ride;

  jobPickup.textContent =
    ride.pickup_address ||
    "Pozicioni klientit";

  jobDestination.textContent =
    ride.destination_address ||
    "Destinacioni";

  jobDistance.textContent =
    Number(
      ride.distance_km
    ).toFixed(2) +
    " km";

  jobDuration.textContent =
    ride.duration_minutes +
    " min";

  jobPrice.textContent =
    ride.price_lek +
    " LEK";

  const commission =
    Math.round(
      ride.price_lek *
      COMMISSION_PERCENT /
      100
    );

  const income =
    ride.price_lek -
    commission;

  jobDriverIncome.textContent =
    income +
    " LEK";

  jobCard.classList.remove(
    "hidden"
  );

  startCountdown();
}


function startCountdown() {

  clearCountdown();

  countdownValue = 15;

  jobCountdownEl.textContent =
    countdownValue;

  countdownInterval =
    setInterval(
      function () {

        countdownValue -= 1;

        jobCountdownEl.textContent =
          countdownValue;

        if (
          countdownValue <= 0
        ) {

          rejectRide(true);
        }
      },
      1000
    );
}


function clearCountdown() {

  if (
    countdownInterval
  ) {

    clearInterval(
      countdownInterval
    );

    countdownInterval = null;
  }
}


// ==========================================
// ACCEPT / REJECT
// ==========================================

acceptJobBtn.addEventListener(
  "click",
  acceptRide
);


async function acceptRide() {

  if (
    !currentRide ||
    !currentDriver ||
    !currentOffer
  ) {
    return;
  }

  clearCountdown();

  const {
    data:
      offerData,
    error:
      offerError
  } =
    await supabaseClient
      .from("ride_offers")
      .update({
        status:
          "accepted",

        responded_at:
          new Date()
            .toISOString()
      })
      .eq(
        "id",
        currentOffer.id
      )
      .eq(
        "status",
        "offered"
      )
      .select();

  if (
    offerError ||
    !offerData ||
    offerData.length === 0
  ) {

    alert(
      "Oferta nuk është më aktive."
    );

    resetOffer();

    return;
  }

  const {
    data:
      rideData,
    error:
      rideError
  } =
    await supabaseClient
      .from("rides")
      .update({
        status:
          "driver_arriving",

        assigned_driver_id:
          currentDriver.id,

        accepted_at:
          new Date()
            .toISOString()
      })
      .eq(
        "id",
        currentRide.id
      )
      .eq(
        "status",
        "pending"
      )
      .select();

  if (
    rideError ||
    !rideData ||
    rideData.length === 0
  ) {

    alert(
      "Kërkesa nuk është më e disponueshme."
    );

    resetOffer();

    return;
  }

  await supabaseClient
    .from("drivers")
    .update({
      is_available:
        false
    })
    .eq(
      "id",
      currentDriver.id
    );

  currentRide =
    rideData[0];

  jobCard.classList.add(
    "hidden"
  );

  showActiveRideState(
    currentRide
  );

  subscribeToActiveRide(
    currentRide.id
  );

  await incrementStats(
    "accepted"
  );
}


rejectJobBtn.addEventListener(
  "click",
  function () {

    rejectRide(false);
  }
);


async function rejectRide(
  timeout
) {

  if (
    !currentRide ||
    !currentOffer
  ) {
    return;
  }

  clearCountdown();

  await supabaseClient
    .from("ride_offers")
    .update({
      status:
        timeout
          ? "timeout"
          : "declined",

      responded_at:
        new Date()
          .toISOString()
    })
    .eq(
      "id",
      currentOffer.id
    )
    .eq(
      "status",
      "offered"
    );

  await incrementStats(
    "rejected"
  );

  resetOffer();
}


function resetOffer() {

  clearCountdown();

  jobCard.classList.add(
    "hidden"
  );

  currentRide = null;
  currentOffer = null;
}


// ==========================================
// RESTORE ACTIVE RIDE
// ==========================================

async function checkExistingActiveRide() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("rides")
      .select("*")
      .eq(
        "assigned_driver_id",
        currentDriver.id
      )
      .in(
        "status",
        [
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
      .limit(1);

  if (error) {

    console.error(error);

    return;
  }

  if (
    data &&
    data.length > 0
  ) {

    currentRide =
      data[0];

    showActiveRideState(
      currentRide
    );

    subscribeToActiveRide(
      currentRide.id
    );
  }
}


// ==========================================
// ACTIVE RIDE UI
// ==========================================

function showActiveRideState(
  ride
) {

  activeRideCard.classList.remove(
    "hidden"
  );

  activeRideDestination.textContent =
    ride.destination_address ||
    "Destinacioni";

  arrivedClientBtn.classList.add(
    "hidden"
  );

  startRideBtn.classList.add(
    "hidden"
  );

  completeRideBtn.classList.add(
    "hidden"
  );

  if (
    ride.status ===
    "driver_arriving"
  ) {

    activeRideTitle.textContent =
      "PO SHKON TE KLIENTI";

    activeRideStatus.textContent =
      "Nisuni drejt pikës së klientit.";

    arrivedClientBtn.classList.remove(
      "hidden"
    );
  }

  else if (
    ride.status ===
    "driver_arrived"
  ) {

    activeRideTitle.textContent =
      "MBËRRITËT TE KLIENTI";

    activeRideStatus.textContent =
      "Prisni klientin dhe nisni udhëtimin kur të hipë.";

    startRideBtn.classList.remove(
      "hidden"
    );
  }

  else if (
    ride.status ===
    "client_onboard"
  ) {

    activeRideTitle.textContent =
      "UDHËTIMI NË PROCES";

    activeRideStatus.textContent =
      "Klienti është në taxi. Vazhdoni drejt destinacionit.";

    completeRideBtn.classList.remove(
      "hidden"
    );
  }
}


// ==========================================
// STATUS ACTIONS
// ==========================================

arrivedClientBtn.addEventListener(
  "click",
  async function () {

    await updateRideStatus(
      "driver_arrived"
    );
  }
);


startRideBtn.addEventListener(
  "click",
  async function () {

    await updateRideStatus(
      "client_onboard"
    );
  }
);


async function updateRideStatus(
  newStatus
) {

  if (
    !currentRide
  ) {
    return;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("rides")
      .update({
        status:
          newStatus
      })
      .eq(
        "id",
        currentRide.id
      )
      .eq(
        "assigned_driver_id",
        currentDriver.id
      )
      .select()
      .single();

  if (error) {

    console.error(error);

    alert(
      "Statusi nuk u përditësua."
    );

    return;
  }

  currentRide =
    data;

  showActiveRideState(
    currentRide
  );
}


// ==========================================
// COMPLETE RIDE
// ==========================================

completeRideBtn.addEventListener(
  "click",
  completeRide
);


async function completeRide() {

  if (
    !currentRide
  ) {
    return;
  }

  const ridePrice =
    Number(
      currentRide.price_lek ||
      0
    );

  const {
    data,
    error
  } =
    await supabaseClient
      .from("rides")
      .update({
        status:
          "completed",

        completed_at:
          new Date()
            .toISOString()
      })
      .eq(
        "id",
        currentRide.id
      )
      .eq(
        "assigned_driver_id",
        currentDriver.id
      )
      .select();

  if (
    error ||
    !data ||
    data.length === 0
  ) {

    console.error(error);

    alert(
      "Udhëtimi nuk mund të përfundohej."
    );

    return;
  }

  await supabaseClient
    .from("drivers")
    .update({
      is_available:
        true
    })
    .eq(
      "id",
      currentDriver.id
    );

  await addRevenue(
    ridePrice
  );

  activeRideCard.classList.add(
    "hidden"
  );

  if (
    activeRideChannel
  ) {

    supabaseClient.removeChannel(
      activeRideChannel
    );

    activeRideChannel = null;
  }

  currentRide = null;
  currentOffer = null;

  await loadStats();

  alert(
    "Udhëtimi u përfundua me sukses."
  );
}


// ==========================================
// ACTIVE RIDE REALTIME
// ==========================================

function subscribeToActiveRide(
  rideId
) {

  if (
    activeRideChannel
  ) {

    supabaseClient.removeChannel(
      activeRideChannel
    );
  }

  activeRideChannel =
    supabaseClient
      .channel(
        "driver-active-" +
        rideId
      )
      .on(
        "postgres_changes",
        {
          event:
            "UPDATE",

          schema:
            "public",

          table:
            "rides",

          filter:
            "id=eq." +
            rideId
        },
        async function (
          payload
        ) {

          const ride =
            payload.new;

          const stillMine =
            ride.assigned_driver_id ===
              currentDriver.id
            &&
            [
              "driver_arriving",
              "driver_arrived",
              "client_onboard"
            ]
              .includes(
                ride.status
              );

          if (
            stillMine
          ) {

            currentRide =
              ride;

            showActiveRideState(
              currentRide
            );

            return;
          }

          if (
            ride.status ===
            "completed"
          ) {

            return;
          }

          activeRideCard.classList.add(
            "hidden"
          );

          await supabaseClient
            .from("drivers")
            .update({
              is_available:
                true
            })
            .eq(
              "id",
              currentDriver.id
            );

          if (
            ride.status ===
            "cancelled"
          ) {

            alert(
              "Kjo punë u anulua nga administratori."
            );
          }

          else {

            alert(
              "Kjo punë ju është hequr nga administratori."
            );
          }

          currentRide = null;
          currentOffer = null;
        }
      )
      .subscribe();
}


// ==========================================
// STATS
// ==========================================

async function incrementStats(
  type
) {

  const {
    data
  } =
    await supabaseClient
      .from("driver_stats")
      .select("*")
      .eq(
        "driver_id",
        currentDriver.id
      )
      .maybeSingle();

  const row =
    data ||
    {
      total_jobs: 0,
      accepted_jobs: 0,
      rejected_jobs: 0,
      gross_revenue_lek: 0,
      commission_lek: 0,
      net_revenue_lek: 0
    };

  row.total_jobs += 1;

  if (
    type === "accepted"
  ) {

    row.accepted_jobs += 1;
  }

  if (
    type === "rejected"
  ) {

    row.rejected_jobs += 1;
  }

  await supabaseClient
    .from("driver_stats")
    .upsert({
      driver_id:
        currentDriver.id,

      total_jobs:
        row.total_jobs,

      accepted_jobs:
        row.accepted_jobs,

      rejected_jobs:
        row.rejected_jobs,

      gross_revenue_lek:
        row.gross_revenue_lek,

      commission_lek:
        row.commission_lek,

      net_revenue_lek:
        row.net_revenue_lek,

      updated_at:
        new Date()
          .toISOString()
    },
    {
      onConflict:
        "driver_id"
    });

  await loadStats();
}


async function addRevenue(
  price
) {

  const {
    data
  } =
    await supabaseClient
      .from("driver_stats")
      .select("*")
      .eq(
        "driver_id",
        currentDriver.id
      )
      .maybeSingle();

  const gross =
    (
      data?.gross_revenue_lek ||
      0
    )
    +
    price;

  const commission =
    Math.round(
      gross *
      COMMISSION_PERCENT /
      100
    );

  const net =
    gross -
    commission;

  await supabaseClient
    .from("driver_stats")
    .upsert({
      driver_id:
        currentDriver.id,

      total_jobs:
        data?.total_jobs ||
        0,

      accepted_jobs:
        data?.accepted_jobs ||
        0,

      rejected_jobs:
        data?.rejected_jobs ||
        0,

      gross_revenue_lek:
        gross,

      commission_lek:
        commission,

      net_revenue_lek:
        net,

      updated_at:
        new Date()
          .toISOString()
    },
    {
      onConflict:
        "driver_id"
    });
}


async function loadStats() {

  if (
    !currentDriver
  ) {
    return;
  }

  const {
    data
  } =
    await supabaseClient
      .from("driver_stats")
      .select("*")
      .eq(
        "driver_id",
        currentDriver.id
      )
      .maybeSingle();

  if (
    !data
  ) {

    todayJobs.textContent =
      "0";

    todayAccepted.textContent =
      "0";

    todayRejected.textContent =
      "0";

    todayRevenue.textContent =
      "0 LEK";

    grossRevenue.textContent =
      "0 LEK";

    commissionAmount.textContent =
      "0 LEK";

    netRevenue.textContent =
      "0 LEK";

    return;
  }

  todayJobs.textContent =
    data.total_jobs;

  todayAccepted.textContent =
    data.accepted_jobs;

  todayRejected.textContent =
    data.rejected_jobs;

  todayRevenue.textContent =
    data.gross_revenue_lek +
    " LEK";

  grossRevenue.textContent =
    data.gross_revenue_lek +
    " LEK";

  commissionAmount.textContent =
    data.commission_lek +
    " LEK";

  netRevenue.textContent =
    data.net_revenue_lek +
    " LEK";
}
