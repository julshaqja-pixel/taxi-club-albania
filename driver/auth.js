// ==========================================
// TAXI CLUB ALBANIA
// DRIVER AUTH
// Secure registration via Auth metadata
// ==========================================

const loginTabBtn =
  document.getElementById(
    "loginTabBtn"
  );

const registerTabBtn =
  document.getElementById(
    "registerTabBtn"
  );

const loginForm =
  document.getElementById(
    "loginForm"
  );

const registerForm =
  document.getElementById(
    "registerForm"
  );

const authMessage =
  document.getElementById(
    "authMessage"
  );


checkSession();


async function checkSession() {

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth
      .getSession();

  if (
    !session
  ) {
    return;
  }

  const canEnter =
    await checkDriverAccount(
      session.user.id
    );

  if (
    canEnter
  ) {

    window.location.href =
      "./index.html";
  }
}


loginTabBtn.addEventListener(
  "click",
  showLogin
);


registerTabBtn.addEventListener(
  "click",
  showRegister
);


function showLogin() {

  loginTabBtn.classList.add(
    "active"
  );

  registerTabBtn.classList.remove(
    "active"
  );

  loginForm.classList.remove(
    "hidden"
  );

  registerForm.classList.add(
    "hidden"
  );

  clearMessage();
}


function showRegister() {

  registerTabBtn.classList.add(
    "active"
  );

  loginTabBtn.classList.remove(
    "active"
  );

  registerForm.classList.remove(
    "hidden"
  );

  loginForm.classList.add(
    "hidden"
  );

  clearMessage();
}


// ==========================================
// LOGIN
// ==========================================

loginForm.addEventListener(
  "submit",
  async function (
    event
  ) {

    event.preventDefault();

    clearMessage();

    const email =
      document
        .getElementById(
          "loginEmail"
        )
        .value
        .trim();

    const password =
      document
        .getElementById(
          "loginPassword"
        )
        .value;

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .signInWithPassword({
          email,
          password
        });

    if (
      error
    ) {

      setMessage(
        error.message,
        "error"
      );

      return;
    }

    if (
      !data.user
    ) {

      setMessage(
        "Nuk u krye hyrja.",
        "error"
      );

      return;
    }

    const canEnter =
      await checkDriverAccount(
        data.user.id
      );

    if (
      canEnter
    ) {

      window.location.href =
        "./index.html";
    }
  }
);


async function checkDriverAccount(
  userId
) {

  const {
    data:
      driver,
    error
  } =
    await supabaseClient
      .from("drivers")
      .select(
        "id,account_status,is_archived"
      )
      .eq(
        "auth_user_id",
        userId
      )
      .maybeSingle();

  if (
    error
  ) {

    console.error(
      error
    );
  }

  if (
    !driver
  ) {

    await supabaseClient.auth
      .signOut();

    setMessage(
      "Profili i shoferit nuk u gjet.",
      "error"
    );

    return false;
  }

  if (
    driver.is_archived
  ) {

    await supabaseClient.auth
      .signOut();

    setMessage(
      "Kjo llogari është arkivuar nga administratori.",
      "error"
    );

    return false;
  }

  if (
    driver.account_status !==
    "approved"
  ) {

    await supabaseClient.auth
      .signOut();

    let message =
      "Llogaria është në pritje të aprovimit nga administratori.";

    if (
      driver.account_status ===
      "rejected"
    ) {

      message =
        "Regjistrimi është refuzuar nga administratori.";
    }

    if (
      driver.account_status ===
      "suspended"
    ) {

      message =
        "Llogaria është pezulluar nga administratori.";
    }

    setMessage(
      message,
      "error"
    );

    return false;
  }

  return true;
}


// ==========================================
// REGISTER
// Driver profile is created by a database
// trigger on auth.users.
// ==========================================

registerForm.addEventListener(
  "submit",
  async function (
    event
  ) {

    event.preventDefault();

    clearMessage();

    const name =
      document
        .getElementById(
          "registerName"
        )
        .value
        .trim();

    const phone =
      document
        .getElementById(
          "registerPhone"
        )
        .value
        .trim();

    const vehiclePlate =
      document
        .getElementById(
          "registerPlate"
        )
        .value
        .trim()
        .toUpperCase();

    const email =
      document
        .getElementById(
          "registerEmail"
        )
        .value
        .trim()
        .toLowerCase();

    const password =
      document
        .getElementById(
          "registerPassword"
        )
        .value;

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .signUp({
          email,
          password,

          options: {
            data: {
              registration_type:
                "driver",

              name,

              phone,

              vehicle_plate:
                vehiclePlate
            }
          }
        });

    if (
      error
    ) {

      setMessage(
        error.message,
        "error"
      );

      return;
    }

    if (
      !data.user
    ) {

      setMessage(
        "Nuk u krijua përdoruesi.",
        "error"
      );

      return;
    }

    await supabaseClient.auth
      .signOut();

    registerForm.reset();

    setMessage(
      "Regjistrimi u krye. Konfirmo email-in nëse kërkohet dhe prit aprovimin e administratorit.",
      "success"
    );
  }
);


// ==========================================
// MESSAGE
// ==========================================

function clearMessage() {

  authMessage.textContent =
    "";

  authMessage.className =
    "auth-message";
}


function setMessage(
  message,
  type
) {

  authMessage.textContent =
    message;

  authMessage.className =
    "auth-message " +
    type;
}
