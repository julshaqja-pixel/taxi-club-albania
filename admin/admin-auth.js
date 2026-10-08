// ==========================================
// TAXI CLUB ALBANIA
// ADMIN AUTH
// Separate auth storage from Driver App
// ==========================================

const adminSupabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        storageKey:
          "taxi-club-albania-admin-auth",

        persistSession:
          true,

        autoRefreshToken:
          true,

        detectSessionInUrl:
          true
      }
    }
  );


const adminLoginForm =
  document.getElementById(
    "adminLoginForm"
  );

const adminLoginBtn =
  document.getElementById(
    "adminLoginBtn"
  );

const adminAuthMessage =
  document.getElementById(
    "adminAuthMessage"
  );


checkExistingAdminSession();


async function checkExistingAdminSession() {

  const {
    data: {
      session
    }
  } =
    await adminSupabaseClient.auth
      .getSession();

  if (
    !session
  ) {
    return;
  }

  const isAdmin =
    await verifyAdmin(
      session.user.id
    );

  if (
    isAdmin
  ) {

    window.location.href =
      "./index.html";

    return;
  }

  await adminSupabaseClient.auth
    .signOut();
}


adminLoginForm.addEventListener(
  "submit",
  async function (
    event
  ) {

    event.preventDefault();

    setMessage(
      "",
      ""
    );

    adminLoginBtn.disabled =
      true;

    adminLoginBtn.textContent =
      "DUKE HYRË...";

    const email =
      document
        .getElementById(
          "adminEmail"
        )
        .value
        .trim();

    const password =
      document
        .getElementById(
          "adminPassword"
        )
        .value;

    const {
      data,
      error
    } =
      await adminSupabaseClient.auth
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

      resetButton();

      return;
    }

    if (
      !data.user
    ) {

      setMessage(
        "Nuk u krye hyrja.",
        "error"
      );

      resetButton();

      return;
    }

    const isAdmin =
      await verifyAdmin(
        data.user.id
      );

    if (
      !isAdmin
    ) {

      await adminSupabaseClient.auth
        .signOut();

      setMessage(
        "Kjo llogari nuk ka rol administratori.",
        "error"
      );

      resetButton();

      return;
    }

    window.location.href =
      "./index.html";
  }
);


async function verifyAdmin(
  userId
) {

  const {
    data,
    error
  } =
    await adminSupabaseClient
      .from("admin_users")
      .select(
        "auth_user_id,is_active"
      )
      .eq(
        "auth_user_id",
        userId
      )
      .eq(
        "is_active",
        true
      )
      .maybeSingle();

  if (
    error
  ) {

    console.error(
      "Admin verification:",
      error
    );

    return false;
  }

  return !!data;
}


function resetButton() {

  adminLoginBtn.disabled =
    false;

  adminLoginBtn.textContent =
    "HYR NË ADMIN";
}


function setMessage(
  text,
  type
) {

  adminAuthMessage.textContent =
    text;

  adminAuthMessage.className =
    "auth-message" +
    (
      type
        ?
        " " + type
        :
        ""
    );
}
