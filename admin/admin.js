// ==========================================
// ADMIN SECURITY
// Separate session from Driver App
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


async function secureInitializeAdmin() {

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

    window.location.href =
      "./login.html";

    return;
  }

  const {
    data:
      adminRole,
    error
  } =
    await adminSupabaseClient
      .from("admin_users")
      .select(
        "auth_user_id,email,is_active"
      )
      .eq(
        "auth_user_id",
        session.user.id
      )
      .eq(
        "is_active",
        true
      )
      .maybeSingle();

  if (
    error ||
    !adminRole
  ) {

    await adminSupabaseClient.auth
      .signOut();

    window.location.href =
      "./login.html";

    return;
  }

  setupAdminSessionUI(
    session.user.email ||
    adminRole.email ||
    "Admin"
  );

  await initializeAdmin();
}


function setupAdminSessionUI(
  email
) {

  const headerActions =
    document.querySelector(
      ".header-actions"
    );

  if (
    !headerActions
  ) {
    return;
  }

  const existing =
    document.getElementById(
      "adminLogoutBtn"
    );

  if (
    existing
  ) {
    return;
  }

  const accountInfo =
    document.createElement(
      "span"
    );

  accountInfo.textContent =
    email;

  accountInfo.style.cssText =
    [
      "color:#777",
      "font-size:10px",
      "max-width:180px",
      "overflow:hidden",
      "text-overflow:ellipsis",
      "white-space:nowrap"
    ].join(";");


  const logoutButton =
    document.createElement(
      "button"
    );

  logoutButton.id =
    "adminLogoutBtn";

  logoutButton.textContent =
    "DIL";

  logoutButton.className =
    "secondary-btn";

  logoutButton.style.borderColor =
    "#6b1a1a";

  logoutButton.style.color =
    "#ff8a8a";


  logoutButton.addEventListener(
    "click",
    async function () {

      await adminSupabaseClient.auth
        .signOut();

      window.location.href =
        "./login.html";
    }
  );


  headerActions.prepend(
    accountInfo
  );

  headerActions.appendChild(
    logoutButton
  );
}


// ==========================================
// TAXI CLUB ALBANIA
// ADMIN CONTROL CENTER
// FULL RIDE STATUS WORKFLOW
// ==========================================



// ==========================================
// DRIVER APPROVALS UI
// ==========================================

function setupApprovalsUi() {

  const driversNav =
    document.querySelector(
      '.nav-item[data-view="drivers"]'
    );

  if (
    driversNav &&
    !document.querySelector(
      '.nav-item[data-view="approvals"]'
    )
  ) {

    const button =
      document.createElement(
        "button"
      );

    button.className =
      "nav-item";

    button.dataset.view =
      "approvals";

    button.innerHTML = `
      <span>✓</span>
      Aprovime
      <b
        id="pendingApprovalsBadge"
        class="admin-approval-count hidden"
      >0</b>
    `;

    driversNav.parentNode.insertBefore(
      button,
      driversNav
    );
  }

  const driversView =
    document.getElementById(
      "driversView"
    );

  if (
    driversView &&
    !document.getElementById(
      "approvalsView"
    )
  ) {

    const section =
      document.createElement(
        "section"
      );

    section.id =
      "approvalsView";

    section.className =
      "view-section";

    section.innerHTML = `
      <div class="panel">

        <div class="panel-header admin-approval-header">

          <div>
            <h2>Aprovimet e Shoferëve</h2>
            <span>
              Regjistrimet e reja që kërkojnë verifikim
            </span>
          </div>

          <div class="admin-approval-filters">
            <button
              id="showPendingApprovalsBtn"
              class="admin-approval-chip active"
            >
              Pending
            </button>

            <button
              id="showRejectedApprovalsBtn"
              class="admin-approval-chip"
            >
              Refuzuar
            </button>

            <button
              id="showApprovedApprovalsBtn"
              class="admin-approval-chip"
            >
              Aprovuar
            </button>
          </div>

        </div>

        <div
          id="approvalsList"
          class="admin-approvals-list"
        ></div>

      </div>
    `;

    driversView.parentNode.insertBefore(
      section,
      driversView
    );
  }

  injectApprovalStyles();

  approvalsList =
    document.getElementById(
      "approvalsList"
    );

  pendingApprovalsBadge =
    document.getElementById(
      "pendingApprovalsBadge"
    );

  showPendingApprovalsBtn =
    document.getElementById(
      "showPendingApprovalsBtn"
    );

  showRejectedApprovalsBtn =
    document.getElementById(
      "showRejectedApprovalsBtn"
    );

  showApprovedApprovalsBtn =
    document.getElementById(
      "showApprovedApprovalsBtn"
    );

  showPendingApprovalsBtn?.addEventListener(
    "click",
    function () {
      setApprovalFilter(
        "pending"
      );
    }
  );

  showRejectedApprovalsBtn?.addEventListener(
    "click",
    function () {
      setApprovalFilter(
        "rejected"
      );
    }
  );

  showApprovedApprovalsBtn?.addEventListener(
    "click",
    function () {
      setApprovalFilter(
        "approved"
      );
    }
  );
}


function injectApprovalStyles() {

  if (
    document.getElementById(
      "adminApprovalStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "adminApprovalStyles";

  style.textContent = `
    .admin-approval-count {
      margin-left: auto;
      min-width: 21px;
      height: 21px;
      padding: 0 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: #d60000;
      color: white;
      font-size: 9px;
    }

    .admin-approval-filters {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .admin-approval-chip {
      min-height: 30px;
      padding: 0 10px;
      border: 1px solid #343434;
      border-radius: 999px;
      background: #181818;
      color: #888;
      cursor: pointer;
      font-size: 10px;
    }

    .admin-approval-chip.active {
      background: #3a0000;
      border-color: #760000;
      color: white;
    }

    .admin-approvals-list {
      padding: 14px;
      display: grid;
      gap: 10px;
    }

    .admin-approval-card {
      display: grid;
      grid-template-columns:
        minmax(200px, 1.3fr)
        minmax(150px, .8fr)
        minmax(190px, 1fr)
        auto;
      gap: 12px;
      align-items: center;
      padding: 14px;
      border: 1px solid #2d2d2d;
      border-radius: 11px;
      background: #181818;
    }

    .admin-approval-person {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .admin-approval-avatar {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #250000;
      border: 1px solid #5b1515;
      font-size: 20px;
    }

    .admin-approval-person strong,
    .admin-approval-info strong {
      display: block;
      font-size: 12px;
    }

    .admin-approval-person span,
    .admin-approval-info span {
      display: block;
      margin-top: 4px;
      color: #777;
      font-size: 10px;
    }

    .admin-approval-email {
      overflow-wrap: anywhere;
    }

    .admin-approval-status {
      display: inline-flex !important;
      width: fit-content;
      margin-top: 6px !important;
      padding: 4px 7px;
      border-radius: 999px;
      font-size: 9px !important;
      font-weight: bold;
    }

    .admin-approval-status.pending {
      background: #493100;
      color: #ffc14c !important;
    }

    .admin-approval-status.approved {
      background: #07391b;
      color: #61df86 !important;
    }

    .admin-approval-status.rejected {
      background: #3b0d0d;
      color: #ff7777 !important;
    }

    .admin-approval-actions {
      display: flex;
      gap: 7px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .admin-approve-btn,
    .admin-reject-btn,
    .admin-restore-btn {
      min-height: 36px;
      padding: 0 12px;
      border: 0;
      border-radius: 8px;
      color: white;
      cursor: pointer;
      font-size: 10px;
      font-weight: bold;
    }

    .admin-approve-btn {
      background: #146d35;
    }

    .admin-reject-btn {
      background: #800000;
    }

    .admin-restore-btn {
      background: #6b4b00;
    }

    .admin-approval-empty {
      padding: 42px 20px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }

    @media (max-width: 1050px) {
      .admin-approval-card {
        grid-template-columns: 1fr 1fr;
      }

      .admin-approval-actions {
        justify-content: flex-start;
      }
    }

    @media (max-width: 700px) {
      .admin-approval-card {
        grid-template-columns: 1fr;
      }

      .admin-approval-header {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `;

  document.head.appendChild(
    style
  );
}


function setApprovalFilter(
  status
) {

  approvalFilter =
    status;

  [
    showPendingApprovalsBtn,
    showRejectedApprovalsBtn,
    showApprovedApprovalsBtn
  ]
    .forEach(
      button =>
        button?.classList.remove(
          "active"
        )
    );

  if (
    status === "pending"
  ) {
    showPendingApprovalsBtn?.classList.add(
      "active"
    );
  }

  else if (
    status === "rejected"
  ) {
    showRejectedApprovalsBtn?.classList.add(
      "active"
    );
  }

  else {
    showApprovedApprovalsBtn?.classList.add(
      "active"
    );
  }

  renderApprovals();
}


function renderApprovals() {

  if (
    !approvalsList ||
    !pendingApprovalsBadge
  ) {
    return;
  }

  const pendingCount =
    drivers.filter(
      driver =>
        driver.auth_user_id &&
        driver.account_status ===
          "pending"
    ).length;

  pendingApprovalsBadge.textContent =
    pendingCount;

  pendingApprovalsBadge.classList.toggle(
    "hidden",
    pendingCount === 0
  );

  approvalsList.innerHTML =
    "";

  const filtered =
    drivers
      .filter(
        driver =>
          driver.auth_user_id &&
          driver.account_status ===
            approvalFilter
      )
      .sort(
        (a, b) =>
          new Date(
            b.created_at
          )
          -
          new Date(
            a.created_at
          )
      );

  if (
    filtered.length === 0
  ) {

    approvalsList.innerHTML = `
      <div class="admin-approval-empty">
        ${
          approvalFilter === "pending"
            ? "Nuk ka regjistrime të reja në pritje."
            : approvalFilter === "rejected"
              ? "Nuk ka shoferë të refuzuar."
              : "Nuk ka shoferë të aprovuar për t'u shfaqur."
        }
      </div>
    `;

    return;
  }

  filtered.forEach(
    driver => {

      const card =
        document.createElement(
          "div"
        );

      card.className =
        "admin-approval-card";

      card.innerHTML = `
        <div class="admin-approval-person">

          <div class="admin-approval-avatar">
            🚕
          </div>

          <div>
            <strong>
              ${escapeHtml(driver.name || "-")}
            </strong>

            <span>
              ${escapeHtml(driver.vehicle_plate || "Pa targë")}
            </span>

            <span
              class="admin-approval-status ${escapeHtml(driver.account_status)}"
            >
              ${escapeHtml(driver.account_status)}
            </span>
          </div>

        </div>

        <div class="admin-approval-info">
          <span>Telefon</span>
          <strong>
            ${escapeHtml(driver.phone || "-")}
          </strong>
        </div>

        <div class="admin-approval-info">
          <span>Email</span>
          <strong class="admin-approval-email">
            ${escapeHtml(driver.email || "-")}
          </strong>

          <span>
            Regjistruar:
            ${formatDate(driver.created_at)}
          </span>
        </div>

        <div class="admin-approval-actions">
          ${buildApprovalButtons(driver)}
        </div>
      `;

      bindApprovalCardActions(
        card,
        driver
      );

      approvalsList.appendChild(
        card
      );
    }
  );
}


function buildApprovalButtons(
  driver
) {

  if (
    driver.account_status ===
    "pending"
  ) {

    return `
      <button
        class="admin-approve-btn"
        data-approval-action="approve"
      >
        APROVO
      </button>

      <button
        class="admin-reject-btn"
        data-approval-action="reject"
      >
        REFUZO
      </button>
    `;
  }

  if (
    driver.account_status ===
    "rejected"
  ) {

    return `
      <button
        class="admin-restore-btn"
        data-approval-action="restore"
      >
        KTHEJE NË PENDING
      </button>

      <button
        class="admin-approve-btn"
        data-approval-action="approve"
      >
        APROVO
      </button>
    `;
  }

  return `
    <button
      class="admin-reject-btn"
      data-approval-action="reject"
    >
      ÇAKTIVIZO / REFUZO
    </button>
  `;
}


function bindApprovalCardActions(
  card,
  driver
) {

  card
    .querySelector(
      '[data-approval-action="approve"]'
    )
    ?.addEventListener(
      "click",
      async function () {
        await updateDriverApproval(
          driver,
          "approved"
        );
      }
    );

  card
    .querySelector(
      '[data-approval-action="reject"]'
    )
    ?.addEventListener(
      "click",
      async function () {
        await updateDriverApproval(
          driver,
          "rejected"
        );
      }
    );

  card
    .querySelector(
      '[data-approval-action="restore"]'
    )
    ?.addEventListener(
      "click",
      async function () {
        await updateDriverApproval(
          driver,
          "pending"
        );
      }
    );
}


async function updateDriverApproval(
  driver,
  newStatus
) {

  const messages = {
    approved:
      "Ta aprovojmë këtë shofer?",

    rejected:
      "Ta refuzojmë/çaktivizojmë këtë shofer?",

    pending:
      "Ta kthejmë këtë shofer në pritje?"
  };

  if (
    !confirm(
      messages[newStatus]
    )
  ) {
    return;
  }

  const updateData = {
    account_status:
      newStatus
  };

  if (
    newStatus !==
    "approved"
  ) {
    updateData.is_online =
      false;

    updateData.is_available =
      false;
  }

  const {
    error
  } =
    await adminSupabaseClient
      .from("drivers")
      .update(
        updateData
      )
      .eq(
        "id",
        driver.id
      );

  if (
    error
  ) {
    console.error(error);

    alert(
      "Nuk u ndryshua statusi: " +
      error.message
    );

    return;
  }

  await loadDrivers();

  renderApprovals();
  renderDrivers();
  renderSummary();
  renderMap();

  if (
    newStatus ===
    "approved"
  ) {
    alert(
      driver.name +
      " u aprovua. Tani mund të hyjë në Driver App."
    );
  }
}



// ==========================================
// RAPORTE & STATISTIKA REALE
// Burimi: tabela rides (jo driver_stats)
// ==========================================

let reportStatusFilter = "all";
let reportDriverFilter = "all";
let reportDateFrom = "";
let reportDateTo = "";

let reportStatusSelect = null;
let reportDriverSelect = null;
let reportDateFromInput = null;
let reportDateToInput = null;
let reportResetBtn = null;
let reportExportBtn = null;
let reportSummaryGrid = null;
let reportDriverTable = null;
let reportRideTable = null;
let reportRideCount = null;

const REPORT_COMMISSION_RATE = 0.15;

function setupReportsUi() {

  const offersNav =
    document.querySelector(
      '.nav-item[data-view="offers"]'
    );

  if (
    offersNav &&
    !document.querySelector(
      '.nav-item[data-view="reports"]'
    )
  ) {
    const button =
      document.createElement("button");

    button.className = "nav-item";
    button.dataset.view = "reports";
    button.innerHTML = `
      <span>▦</span>
      Raporte
    `;

    offersNav.insertAdjacentElement(
      "afterend",
      button
    );
  }

  const offersView =
    document.getElementById(
      "offersView"
    );

  if (
    offersView &&
    !document.getElementById(
      "reportsView"
    )
  ) {
    const section =
      document.createElement("section");

    section.id = "reportsView";
    section.className = "view-section";

    section.innerHTML = `
      <div class="tc-report-toolbar panel">
        <div class="tc-report-toolbar-title">
          <div>
            <strong>Raporte reale nga udhëtimet</strong>
            <p>Të ardhurat dhe komisioni llogariten vetëm nga udhëtimet e përfunduara.</p>
          </div>
          <button id="reportExportBtn" class="secondary-btn">EKSPORTO CSV</button>
        </div>

        <div class="tc-report-filters">
          <label>
            Nga data
            <span class="tc-report-date-field">
              <input id="reportDateFrom" type="date">
              <button
                id="reportDateFromPickerBtn"
                class="tc-report-calendar-btn"
                type="button"
                aria-label="Zgjidh datën e fillimit"
                title="Hap kalendarin"
              >📅</button>
            </span>
          </label>

          <label>
            Deri më
            <span class="tc-report-date-field">
              <input id="reportDateTo" type="date">
              <button
                id="reportDateToPickerBtn"
                class="tc-report-calendar-btn"
                type="button"
                aria-label="Zgjidh datën e fundit"
                title="Hap kalendarin"
              >📅</button>
            </span>
          </label>

          <label>
            Statusi
            <select id="reportStatusFilter">
              <option value="all">Të gjitha</option>
              <option value="completed">Përfunduara</option>
              <option value="cancelled">Anuluara</option>
              <option value="no_driver">Pa shofer</option>
              <option value="pending">Pending</option>
              <option value="driver_arriving">Taxi po vjen</option>
              <option value="driver_arrived">Taxi mbërriti</option>
              <option value="client_onboard">Në udhëtim</option>
            </select>
          </label>

          <label>
            Shoferi
            <select id="reportDriverFilter">
              <option value="all">Të gjithë shoferët</option>
            </select>
          </label>

          <button id="reportResetBtn" class="secondary-btn tc-report-reset">PASTRO FILTRAT</button>
        </div>
      </div>

      <div id="reportSummaryGrid" class="tc-report-summary"></div>

      <div class="panel tc-report-panel">
        <div class="panel-header">
          <div>
            <h3>Performanca sipas shoferit</h3>
            <p>Vetëm udhëtimet që përputhen me filtrat aktivë.</p>
          </div>
        </div>
        <div class="tc-report-table-wrap">
          <table class="tc-report-table">
            <thead>
              <tr>
                <th>Shoferi</th>
                <th>Targa</th>
                <th>Përfunduara</th>
                <th>Anuluara</th>
                <th>Xhiro</th>
                <th>Komision 15%</th>
                <th>Neto shoferi</th>
              </tr>
            </thead>
            <tbody id="reportDriverTable"></tbody>
          </table>
        </div>
      </div>

      <div class="panel tc-report-panel">
        <div class="panel-header">
          <div>
            <h3>Historiku i udhëtimeve</h3>
            <p id="reportRideCount">0 udhëtime</p>
          </div>
        </div>
        <div class="tc-report-table-wrap">
          <table class="tc-report-table tc-report-rides-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Statusi</th>
                <th>Shoferi</th>
                <th>Nisja</th>
                <th>Destinacioni</th>
                <th>Distanca</th>
                <th>Çmimi</th>
                <th>Komisioni</th>
              </tr>
            </thead>
            <tbody id="reportRideTable"></tbody>
          </table>
        </div>
      </div>
    `;

    offersView.insertAdjacentElement(
      "afterend",
      section
    );
  }

  if (!document.getElementById("tcReportsStyle")) {
    const style = document.createElement("style");
    style.id = "tcReportsStyle";
    style.textContent = `
      .tc-report-toolbar { margin-bottom:14px; padding:16px; }
      .tc-report-toolbar-title { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:14px; }
      .tc-report-toolbar-title strong { display:block; color:#f2f2f2; font-size:15px; }
      .tc-report-toolbar-title p, .tc-report-panel .panel-header p { margin:4px 0 0; color:#777; font-size:11px; }
      .tc-report-filters { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; align-items:end; }
      .tc-report-filters label { color:#8d8d8d; font-size:10px; text-transform:uppercase; letter-spacing:.04em; }
      .tc-report-filters input, .tc-report-filters select { width:100%; margin-top:6px; box-sizing:border-box; background:#0d0d0d; color:#ddd; border:1px solid #2c2c2c; border-radius:7px; padding:10px; outline:none; }
      .tc-report-filters input:focus, .tc-report-filters select:focus { border-color:#7b1515; }
      .tc-report-date-field { display:flex; width:100%; margin-top:6px; border:1px solid #2c2c2c; border-radius:7px; overflow:hidden; background:#0d0d0d; box-sizing:border-box; }
      .tc-report-date-field:focus-within { border-color:#7b1515; }
      .tc-report-date-field input { margin-top:0; border:0; border-radius:0; background:transparent; min-width:0; flex:1; padding-right:8px; }
      .tc-report-date-field input:focus { border-color:transparent; }
      .tc-report-date-field input::-webkit-calendar-picker-indicator { opacity:0; width:0; padding:0; margin:0; }
      .tc-report-calendar-btn { width:42px; min-width:42px; border:0; border-left:1px solid #2c2c2c; background:#151515; color:#f2f2f2; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; transition:background .15s ease,border-color .15s ease; }
      .tc-report-calendar-btn:hover { background:#2a0d0d; border-left-color:#7b1515; }
      .tc-report-calendar-btn:focus-visible { outline:1px solid #b32626; outline-offset:-2px; }
      .tc-report-reset { min-height:38px; }
      .tc-report-summary { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:10px; margin-bottom:14px; }
      .tc-report-stat { background:#111; border:1px solid #242424; border-radius:10px; padding:14px; min-height:76px; }
      .tc-report-stat span { display:block; color:#777; font-size:9px; text-transform:uppercase; letter-spacing:.06em; }
      .tc-report-stat strong { display:block; color:#f4f4f4; font-size:20px; margin-top:8px; }
      .tc-report-stat small { display:block; color:#666; font-size:9px; margin-top:5px; }
      .tc-report-panel { margin-bottom:14px; overflow:hidden; }
      .tc-report-table-wrap { overflow:auto; max-width:100%; }
      .tc-report-table { width:100%; border-collapse:collapse; min-width:820px; }
      .tc-report-table th { position:sticky; top:0; background:#0d0d0d; color:#777; font-size:9px; text-transform:uppercase; letter-spacing:.05em; padding:10px; text-align:left; border-bottom:1px solid #252525; }
      .tc-report-table td { padding:11px 10px; border-bottom:1px solid #1f1f1f; color:#cfcfcf; font-size:11px; vertical-align:top; }
      .tc-report-table tr:hover td { background:#141414; }
      .tc-report-status { display:inline-flex; align-items:center; border-radius:999px; padding:4px 7px; border:1px solid #343434; background:#151515; font-size:9px; white-space:nowrap; }
      .tc-report-status.completed { color:#6bea8c; border-color:#245d34; }
      .tc-report-status.cancelled, .tc-report-status.no_driver { color:#ff8585; border-color:#672d2d; }
      .tc-report-status.pending { color:#ffd36b; border-color:#665329; }
      .tc-report-money { white-space:nowrap; font-weight:700; }
      .tc-report-empty { text-align:center; color:#666 !important; padding:24px !important; }
      @media (max-width:1100px) {
        .tc-report-summary { grid-template-columns:repeat(3,minmax(0,1fr)); }
        .tc-report-filters { grid-template-columns:repeat(2,minmax(0,1fr)); }
      }
      @media (max-width:640px) {
        .tc-report-toolbar-title { align-items:flex-start; flex-direction:column; }
        .tc-report-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .tc-report-filters { grid-template-columns:1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  reportStatusSelect = document.getElementById("reportStatusFilter");
  reportDriverSelect = document.getElementById("reportDriverFilter");
  reportDateFromInput = document.getElementById("reportDateFrom");
  reportDateToInput = document.getElementById("reportDateTo");
  const reportDateFromPickerBtn = document.getElementById("reportDateFromPickerBtn");
  const reportDateToPickerBtn = document.getElementById("reportDateToPickerBtn");
  reportResetBtn = document.getElementById("reportResetBtn");
  reportExportBtn = document.getElementById("reportExportBtn");
  reportSummaryGrid = document.getElementById("reportSummaryGrid");
  reportDriverTable = document.getElementById("reportDriverTable");
  reportRideTable = document.getElementById("reportRideTable");
  reportRideCount = document.getElementById("reportRideCount");

  reportStatusSelect?.addEventListener("change", function () {
    reportStatusFilter = this.value;
    renderReports();
  });

  reportDriverSelect?.addEventListener("change", function () {
    reportDriverFilter = this.value;
    renderReports();
  });

  reportDateFromInput?.addEventListener("change", function () {
    reportDateFrom = this.value;
    renderReports();
  });

  reportDateToInput?.addEventListener("change", function () {
    reportDateTo = this.value;
    renderReports();
  });

  function openDatePicker(input) {
    if (!input) return;

    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    }
    catch (error) {
      console.warn("Calendar picker fallback:", error);
    }

    input.focus();
    input.click();
  }

  reportDateFromPickerBtn?.addEventListener("click", function () {
    openDatePicker(reportDateFromInput);
  });

  reportDateToPickerBtn?.addEventListener("click", function () {
    openDatePicker(reportDateToInput);
  });

  reportResetBtn?.addEventListener("click", function () {
    reportStatusFilter = "all";
    reportDriverFilter = "all";
    reportDateFrom = "";
    reportDateTo = "";

    if (reportStatusSelect) reportStatusSelect.value = "all";
    if (reportDriverSelect) reportDriverSelect.value = "all";
    if (reportDateFromInput) reportDateFromInput.value = "";
    if (reportDateToInput) reportDateToInput.value = "";

    renderReports();
  });

  reportExportBtn?.addEventListener("click", exportReportsCsv);
}

function getReportFilteredRides() {
  let result = [...rides];

  if (reportStatusFilter !== "all") {
    result = result.filter(ride => ride.status === reportStatusFilter);
  }

  if (reportDriverFilter !== "all") {
    result = result.filter(ride => ride.assigned_driver_id === reportDriverFilter);
  }

  if (reportDateFrom) {
    const from = new Date(reportDateFrom + "T00:00:00");
    result = result.filter(ride => ride.created_at && new Date(ride.created_at) >= from);
  }

  if (reportDateTo) {
    const to = new Date(reportDateTo + "T23:59:59.999");
    result = result.filter(ride => ride.created_at && new Date(ride.created_at) <= to);
  }

  return result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function getRidePriceNumber(ride) {
  const value = Number(ride?.price_lek || 0);
  return Number.isFinite(value) ? value : 0;
}

function formatLek(value) {
  return Math.round(Number(value || 0)).toLocaleString("sq-AL") + " LEK";
}

function renderReports() {
  if (!reportSummaryGrid || !reportDriverTable || !reportRideTable) return;

  // Rifresko listën e shoferëve duke ruajtur filtrin aktual.
  const previousDriver = reportDriverFilter;
  reportDriverSelect.innerHTML = '<option value="all">Të gjithë shoferët</option>';

  drivers
    .filter(driver => !driver.is_archived)
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "sq"))
    .forEach(driver => {
      const option = document.createElement("option");
      option.value = driver.id;
      option.textContent = `${driver.name || "Pa emër"} • ${driver.vehicle_plate || "Pa targë"}`;
      reportDriverSelect.appendChild(option);
    });

  if ([...reportDriverSelect.options].some(option => option.value === previousDriver)) {
    reportDriverSelect.value = previousDriver;
  } else {
    reportDriverFilter = "all";
    reportDriverSelect.value = "all";
  }

  const filtered = getReportFilteredRides();
  const completed = filtered.filter(ride => ride.status === "completed");
  const cancelled = filtered.filter(ride => ride.status === "cancelled");
  const noDriver = filtered.filter(ride => ride.status === "no_driver");
  const active = filtered.filter(ride => isRideActive(ride.status) || ride.status === "pending");

  const revenue = completed.reduce((sum, ride) => sum + getRidePriceNumber(ride), 0);
  const commission = Math.round(revenue * REPORT_COMMISSION_RATE);
  const driverNet = revenue - commission;

  reportSummaryGrid.innerHTML = `
    ${reportStatCard("Udhëtime", filtered.length, "sipas filtrave")}
    ${reportStatCard("Përfunduara", completed.length, "completed")}
    ${reportStatCard("Aktive", active.length, "pending + aktive")}
    ${reportStatCard("Anuluara / pa shofer", cancelled.length + noDriver.length, `${cancelled.length} anuluara • ${noDriver.length} pa shofer`)}
    ${reportStatCard("Xhiro", formatLek(revenue), "vetëm completed")}
    ${reportStatCard("Komision 15%", formatLek(commission), `Neto shoferë: ${formatLek(driverNet)}`)}
  `;

  renderReportDriverPerformance(filtered);
  renderReportRideHistory(filtered);
}

function reportStatCard(label, value, note) {
  return `
    <div class="tc-report-stat">
      <span>${escapeHtml(String(label))}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <small>${escapeHtml(String(note || ""))}</small>
    </div>
  `;
}

function renderReportDriverPerformance(filtered) {
  const rows = drivers
    .filter(driver => !driver.is_archived)
    .map(driver => {
      const driverRides = filtered.filter(ride => ride.assigned_driver_id === driver.id);
      const completed = driverRides.filter(ride => ride.status === "completed");
      const cancelled = driverRides.filter(ride => ride.status === "cancelled");
      const revenue = completed.reduce((sum, ride) => sum + getRidePriceNumber(ride), 0);
      const commission = Math.round(revenue * REPORT_COMMISSION_RATE);
      return {
        driver,
        total: driverRides.length,
        completed: completed.length,
        cancelled: cancelled.length,
        revenue,
        commission,
        net: revenue - commission
      };
    })
    .filter(row => reportDriverFilter === "all" ? row.total > 0 : row.driver.id === reportDriverFilter)
    .sort((a, b) => b.revenue - a.revenue || b.completed - a.completed);

  if (!rows.length) {
    reportDriverTable.innerHTML = '<tr><td class="tc-report-empty" colspan="7">Nuk ka të dhëna për filtrat e zgjedhur.</td></tr>';
    return;
  }

  reportDriverTable.innerHTML = rows.map(row => `
    <tr>
      <td><strong>${escapeHtml(row.driver.name || "-")}</strong></td>
      <td>${escapeHtml(row.driver.vehicle_plate || "-")}</td>
      <td>${row.completed}</td>
      <td>${row.cancelled}</td>
      <td class="tc-report-money">${formatLek(row.revenue)}</td>
      <td class="tc-report-money">${formatLek(row.commission)}</td>
      <td class="tc-report-money">${formatLek(row.net)}</td>
    </tr>
  `).join("");
}

function renderReportRideHistory(filtered) {
  reportRideCount.textContent = `${filtered.length} ${filtered.length === 1 ? "udhëtim" : "udhëtime"}`;

  if (!filtered.length) {
    reportRideTable.innerHTML = '<tr><td class="tc-report-empty" colspan="8">Nuk ka udhëtime për filtrat e zgjedhur.</td></tr>';
    return;
  }

  reportRideTable.innerHTML = filtered.map(ride => {
    const driver = getDriver(ride.assigned_driver_id);
    const price = getRidePriceNumber(ride);
    const commission = ride.status === "completed" ? Math.round(price * REPORT_COMMISSION_RATE) : 0;

    return `
      <tr data-report-ride-id="${escapeHtml(ride.id)}" style="cursor:pointer">
        <td>${escapeHtml(formatDate(ride.created_at))}</td>
        <td><span class="tc-report-status ${escapeHtml(ride.status || "")}">${escapeHtml(statusLabel(ride.status))}</span></td>
        <td>${escapeHtml(driver?.name || "-")}<br><small>${escapeHtml(driver?.vehicle_plate || "")}</small></td>
        <td title="${escapeHtml(ride.pickup_address || "-")}">${shortText(ride.pickup_address)}</td>
        <td title="${escapeHtml(ride.destination_address || "-")}">${shortText(ride.destination_address)}</td>
        <td>${ride.distance_km != null ? Number(ride.distance_km).toFixed(2) + " km" : "-"}</td>
        <td class="tc-report-money">${formatLek(price)}</td>
        <td class="tc-report-money">${ride.status === "completed" ? formatLek(commission) : "-"}</td>
      </tr>
    `;
  }).join("");

  reportRideTable.querySelectorAll("tr[data-report-ride-id]").forEach(row => {
    row.addEventListener("click", function () {
      const ride = rides.find(item => item.id === this.dataset.reportRideId);
      if (ride) openRideDrawer(ride);
    });
  });
}

function csvCell(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function exportReportsCsv() {
  const filtered = getReportFilteredRides();

  if (!filtered.length) {
    alert("Nuk ka të dhëna për eksport me filtrat aktualë.");
    return;
  }

  const header = [
    "Data",
    "Statusi",
    "Shoferi",
    "Targa",
    "Nisja",
    "Destinacioni",
    "Distanca km",
    "Koha min",
    "Cmimi LEK",
    "Komisioni LEK"
  ];

  const lines = [header.map(csvCell).join(",")];

  filtered.forEach(ride => {
    const driver = getDriver(ride.assigned_driver_id);
    const price = getRidePriceNumber(ride);
    const commission = ride.status === "completed" ? Math.round(price * REPORT_COMMISSION_RATE) : 0;

    lines.push([
      formatDate(ride.created_at),
      statusLabel(ride.status),
      driver?.name || "",
      driver?.vehicle_plate || "",
      ride.pickup_address || "",
      ride.destination_address || "",
      ride.distance_km ?? "",
      ride.duration_minutes ?? "",
      price,
      commission
    ].map(csvCell).join(","));
  });

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `taxi-club-raport-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ==========================================
// MAP
// ==========================================

const adminMap =
  L.map("adminMap").setView(
    [41.3275, 19.8187],
    12
  );

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution:
      "&copy; OpenStreetMap contributors"
  }
).addTo(adminMap);


// ==========================================
// STATE
// ==========================================

let drivers = [];
let rides = [];
let offers = [];
let stats = [];

let driverMarkers = {};
let selectedRide = null;

let realtimeChannel = null;
let mapHasCentered = false;

let approvalFilter = "pending";
let approvalsList = null;
let pendingApprovalsBadge = null;
let showPendingApprovalsBtn = null;
let showRejectedApprovalsBtn = null;
let showApprovedApprovalsBtn = null;


// ==========================================
// HTML
// ==========================================

const onlineDriversCount =
  document.getElementById("onlineDriversCount");

const activeRidesCount =
  document.getElementById("activeRidesCount");

const pendingRidesCount =
  document.getElementById("pendingRidesCount");

const totalRevenue =
  document.getElementById("totalRevenue");

const totalCommission =
  document.getElementById("totalCommission");

const mapOnlineCount =
  document.getElementById("mapOnlineCount");

const liveRidesList =
  document.getElementById("liveRidesList");

const recentRidesTable =
  document.getElementById("recentRidesTable");

const ridesTable =
  document.getElementById("ridesTable");

const ridesCountLabel =
  document.getElementById("ridesCountLabel");

const driversGrid =
  document.getElementById("driversGrid");

const offersTimeline =
  document.getElementById("offersTimeline");

const rideStatusFilter =
  document.getElementById("rideStatusFilter");

const rideSearchInput =
  document.getElementById("rideSearchInput");

const driverSearchInput =
  document.getElementById("driverSearchInput");

const refreshAdminBtn =
  document.getElementById("refreshAdminBtn");

const showAllRidesBtn =
  document.getElementById("showAllRidesBtn");


// DRAWER

const rideDrawer =
  document.getElementById("rideDrawer");

const drawerOverlay =
  document.getElementById("drawerOverlay");

const closeDrawerBtn =
  document.getElementById("closeDrawerBtn");

const drawerRideId =
  document.getElementById("drawerRideId");

const drawerPickup =
  document.getElementById("drawerPickup");

const drawerDestination =
  document.getElementById("drawerDestination");

const drawerDistance =
  document.getElementById("drawerDistance");

const drawerDuration =
  document.getElementById("drawerDuration");

const drawerPrice =
  document.getElementById("drawerPrice");

const drawerCurrentDriver =
  document.getElementById("drawerCurrentDriver");

const manualDriverSelect =
  document.getElementById("manualDriverSelect");

const sendNearestBtn =
  document.getElementById("sendNearestBtn");

const assignManualBtn =
  document.getElementById("assignManualBtn");

const removeDriverBtn =
  document.getElementById("removeDriverBtn");

const cancelRideBtn =
  document.getElementById("cancelRideBtn");

const drawerHistory =
  document.getElementById("drawerHistory");


// ==========================================
// STATUS HELPERS
// ==========================================

const ACTIVE_RIDE_STATUSES =
  [
    "driver_arriving",
    "driver_arrived",
    "client_onboard"
  ];

function isRideActive(
  status
) {

  return ACTIVE_RIDE_STATUSES.includes(
    status
  );
}

function statusLabel(
  status
) {

  const labels = {
    pending:
      "PENDING",

    driver_arriving:
      "TAXI PO VJEN",

    driver_arrived:
      "TAXI MBËRRITI",

    client_onboard:
      "NË UDHËTIM",

    completed:
      "COMPLETED",

    cancelled:
      "CANCELLED",

    no_driver:
      "NO DRIVER"
  };

  return (
    labels[status] ||
    status
  );
}


// ==========================================
// INIT
// ==========================================

secureInitializeAdmin();

async function initializeAdmin() {

  setupApprovalsUi();

  setupDriverManagementUi();

  setupReportsUi();

  await loadAllData();

  subscribeRealtime();

  bindNavigation();
}


// ==========================================
// LOAD DATA
// ==========================================

async function loadAllData() {

  await Promise.all([
    loadDrivers(),
    loadRides(),
    loadOffers(),
    loadStats()
  ]);

  renderEverything();
}


async function loadDrivers() {

  const { data, error } =
    await adminSupabaseClient
      .from("drivers")
      .select("*")
      .order(
        "created_at",
        {
          ascending: true
        }
      );

  if (error) {

    console.error(
      "Drivers:",
      error
    );

    return;
  }

  drivers =
    data || [];
}


async function loadRides() {

  const { data, error } =
    await adminSupabaseClient
      .from("rides")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {

    console.error(
      "Rides:",
      error
    );

    return;
  }

  rides =
    data || [];
}


async function loadOffers() {

  const { data, error } =
    await adminSupabaseClient
      .from("ride_offers")
      .select("*")
      .order(
        "offered_at",
        {
          ascending: false
        }
      )
      .limit(200);

  if (error) {

    console.error(
      "Offers:",
      error
    );

    return;
  }

  offers =
    data || [];
}


async function loadStats() {

  const { data, error } =
    await adminSupabaseClient
      .from("driver_stats")
      .select("*");

  if (error) {

    console.error(
      "Stats:",
      error
    );

    return;
  }

  stats =
    data || [];
}


// ==========================================
// RENDER
// ==========================================

function renderEverything() {

  renderSummary();

  renderApprovals();
  renderMap();
  renderLiveRides();
  renderRecentRides();
  renderRidesTable();
  renderDrivers();
  renderOffers();
  renderReports();
}


function renderSummary() {

  const online =
    drivers.filter(
      driver =>
        driver.is_online
    ).length;

  const active =
    rides.filter(
      ride =>
        isRideActive(
          ride.status
        )
    ).length;

  const pending =
    rides.filter(
      ride =>
        ride.status ===
        "pending"
    ).length;

  // Dashboard: statistika reale nga udhëtimet e përfunduara.
  // Nuk mbështetemi te driver_stats, sepse ride mund të ricaktohet.
  const completedRides =
    rides.filter(
      ride =>
        ride.status ===
        "completed"
    );

  const revenue =
    completedRides.reduce(
      (total, ride) =>
        total +
        Number(
          ride.price_lek ||
          0
        ),
      0
    );

  const commission =
    Math.round(
      revenue *
      REPORT_COMMISSION_RATE
    );

  onlineDriversCount.textContent =
    online;

  activeRidesCount.textContent =
    active;

  pendingRidesCount.textContent =
    pending;

  totalRevenue.textContent =
    revenue +
    " LEK";

  totalCommission.textContent =
    commission +
    " LEK";

  mapOnlineCount.textContent =
    online +
    " online";
}


// ==========================================
// MAP
// ==========================================

function createTaxiIcon(
  driver
) {

  const background =
    driver.is_available
      ? "#08752d"
      : "#b26700";

  const border =
    driver.is_available
      ? "#36e46f"
      : "#ffb13b";

  return L.divIcon({
    className:
      "custom-taxi-marker",

    html:
      `
      <div
        style="
          position:relative;
          display:flex;
          align-items:center;
          justify-content:center;
          width:42px;
          height:42px;
          border-radius:50%;
          background:${background};
          border:3px solid ${border};
          box-shadow:0 3px 12px rgba(0,0,0,.65);
          font-size:21px;
        "
      >
        🚕
        <div
          style="
            position:absolute;
            top:43px;
            left:50%;
            transform:translateX(-50%);
            white-space:nowrap;
            background:#101010;
            border:1px solid #333;
            border-radius:5px;
            padding:3px 6px;
            font-size:9px;
            color:white;
            font-family:Arial;
          "
        >
          ${escapeHtml(
            driver.vehicle_plate ||
            driver.name
          )}
        </div>
      </div>
      `,

    iconSize:
      [42, 58],

    iconAnchor:
      [21, 21],

    popupAnchor:
      [0, -25]
  });
}


function renderMap() {

  const onlineWithGps =
    drivers.filter(
      driver =>
        driver.is_online &&
        driver.lat !== null &&
        driver.lng !== null
    );

  const activeIds =
    new Set();

  onlineWithGps.forEach(
    driver => {

      activeIds.add(
        driver.id
      );

      const position =
        [
          Number(driver.lat),
          Number(driver.lng)
        ];

      if (
        !driverMarkers[
          driver.id
        ]
      ) {

        const marker =
          L.marker(
            position,
            {
              icon:
                createTaxiIcon(
                  driver
                )
            }
          )
            .addTo(
              adminMap
            );

        marker.bindPopup(
          buildDriverPopup(
            driver
          )
        );

        driverMarkers[
          driver.id
        ] =
          marker;
      }

      else {

        const marker =
          driverMarkers[
            driver.id
          ];

        marker.setLatLng(
          position
        );

        marker.setIcon(
          createTaxiIcon(
            driver
          )
        );

        marker.setPopupContent(
          buildDriverPopup(
            driver
          )
        );
      }
    }
  );

  Object.keys(
    driverMarkers
  ).forEach(
    driverId => {

      if (
        !activeIds.has(
          driverId
        )
      ) {

        adminMap.removeLayer(
          driverMarkers[
            driverId
          ]
        );

        delete driverMarkers[
          driverId
        ];
      }
    }
  );

  if (
    !mapHasCentered &&
    onlineWithGps.length > 0
  ) {

    const bounds =
      L.latLngBounds(
        onlineWithGps.map(
          driver => [
            driver.lat,
            driver.lng
          ]
        )
      );

    if (
      onlineWithGps.length === 1
    ) {

      adminMap.setView(
        [
          onlineWithGps[0].lat,
          onlineWithGps[0].lng
        ],
        15
      );
    }

    else {

      adminMap.fitBounds(
        bounds,
        {
          padding:
            [50, 50],

          maxZoom:
            15
        }
      );
    }

    mapHasCentered =
      true;
  }
}


function buildDriverPopup(
  driver
) {

  const driverStats =
    stats.find(
      stat =>
        stat.driver_id ===
        driver.id
    );

  return `
    <div style="min-width:170px;font-family:Arial;">
      <div style="font-size:14px;font-weight:bold;margin-bottom:4px;">
        🚕 ${escapeHtml(driver.name)}
      </div>

      <div style="font-size:11px;color:#555;margin-bottom:8px;">
        ${escapeHtml(driver.vehicle_plate || "-")}
      </div>

      <div style="font-size:11px;margin-bottom:4px;">
        Gjendja:
        <strong>
          ${driver.is_available ? "AVAILABLE" : "BUSY"}
        </strong>
      </div>

      <div style="font-size:11px;margin-bottom:4px;">
        Punë:
        <strong>
          ${driverStats?.total_jobs || 0}
        </strong>
      </div>

      <div style="font-size:11px;">
        Xhiro:
        <strong>
          ${driverStats?.gross_revenue_lek || 0} LEK
        </strong>
      </div>
    </div>
  `;
}


// ==========================================
// LIVE RIDES
// ==========================================

function renderLiveRides() {

  liveRidesList.innerHTML =
    "";

  const live =
    rides.filter(
      ride =>
        ride.status ===
          "pending" ||
        isRideActive(
          ride.status
        )
    );

  if (
    live.length === 0
  ) {

    liveRidesList.innerHTML =
      `
      <div
        style="
          padding:20px;
          text-align:center;
          color:#666;
          font-size:11px;
        "
      >
        Nuk ka punë live.
      </div>
      `;

    return;
  }

  live.forEach(
    ride => {

      const driver =
        getDriver(
          ride.assigned_driver_id
        );

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "live-ride-card " +
        (
          ride.status ===
            "pending"
          ? "pending"
          : "active"
        );

      item.innerHTML =
        `
        <div class="live-ride-top">
          <strong>
            #${ride.id.slice(0, 8)}
          </strong>

          <span>
            ${escapeHtml(
              statusLabel(
                ride.status
              )
            )}
          </span>
        </div>

        <div class="live-ride-route">
          📍 ${escapeHtml(
            ride.pickup_address ||
            "-"
          )}
          <br>
          🏁 ${escapeHtml(
            ride.destination_address ||
            "-"
          )}
        </div>

        <div class="live-ride-driver">
          ${
            driver
              ?
              "🚕 " +
              escapeHtml(
                driver.name
              )
              :
              "Duke kërkuar taxi..."
          }
        </div>
        `;

      item.addEventListener(
        "click",
        function () {

          openRideDrawer(
            ride.id
          );
        }
      );

      liveRidesList.appendChild(
        item
      );
    }
  );
}


// ==========================================
// TABLES
// ==========================================

function renderRecentRides() {

  recentRidesTable.innerHTML =
    "";

  rides
    .slice(0, 8)
    .forEach(
      ride => {

        recentRidesTable.appendChild(
          buildRideRow(
            ride,
            false
          )
        );
      }
    );
}


function renderRidesTable() {

  ridesTable.innerHTML =
    "";

  const filter =
    rideStatusFilter.value;

  const search =
    rideSearchInput
      .value
      .trim()
      .toLowerCase();

  const filtered =
    rides.filter(
      ride => {

        const statusOk =
          filter === "all"
          ||
          ride.status === filter;

        const text =
          (
            ride.pickup_address ||
            ""
          )
          +
          " "
          +
          (
            ride.destination_address ||
            ""
          );

        return (
          statusOk &&
          text
            .toLowerCase()
            .includes(
              search
            )
        );
      }
    );

  ridesCountLabel.textContent =
    filtered.length +
    " ride";

  filtered.forEach(
    ride => {

      ridesTable.appendChild(
        buildRideRow(
          ride,
          true
        )
      );
    }
  );
}


function buildRideRow(
  ride,
  detailed
) {

  const driver =
    getDriver(
      ride.assigned_driver_id
    );

  const tr =
    document.createElement(
      "tr"
    );

  const statusClass =
    ride.status ===
      "driver_arriving" ||
    ride.status ===
      "driver_arrived" ||
    ride.status ===
      "client_onboard"
      ? "accepted"
      : ride.status;

  if (detailed) {

    tr.innerHTML =
      `
      <td>#${ride.id.slice(0, 8)}</td>
      <td>${shortText(ride.pickup_address)}</td>
      <td>${shortText(ride.destination_address)}</td>
      <td>${driver ? escapeHtml(driver.name) : "-"}</td>
      <td>${ride.distance_km || 0} km</td>
      <td>${ride.duration_minutes || 0} min</td>
      <td>${ride.price_lek || 0} LEK</td>
      <td>
        <span class="status-pill ${statusClass}">
          ${escapeHtml(statusLabel(ride.status))}
        </span>
      </td>
      <td>
        <button class="row-action-btn">
          Menaxho
        </button>
      </td>
      `;
  }

  else {

    tr.innerHTML =
      `
      <td>#${ride.id.slice(0, 8)}</td>
      <td>${shortText(ride.pickup_address)}</td>
      <td>${shortText(ride.destination_address)}</td>
      <td>${driver ? escapeHtml(driver.name) : "-"}</td>
      <td>${ride.price_lek || 0} LEK</td>
      <td>
        <span class="status-pill ${statusClass}">
          ${escapeHtml(statusLabel(ride.status))}
        </span>
      </td>
      <td>
        <button class="row-action-btn">
          Menaxho
        </button>
      </td>
      `;
  }

  tr.addEventListener(
    "click",
    function () {

      openRideDrawer(
        ride.id
      );
    }
  );

  return tr;
}


// ==========================================
// DRIVERS
// ==========================================

function renderDrivers() {

  driversGrid.innerHTML =
    "";

  const search =
    driverSearchInput
      .value
      .trim()
      .toLowerCase();

  drivers

    .filter(
      driver =>
        !driver.account_status ||
        driver.account_status === "approved"
    )

    .filter(
      driver => {

        const text =
          (
            driver.name ||
            ""
          )
          +
          " "
          +
          (
            driver.vehicle_plate ||
            ""
          );

        return text
          .toLowerCase()
          .includes(
            search
          );
      }
    )

    .forEach(
      driver => {

        const driverStats =
          stats.find(
            stat =>
              stat.driver_id ===
              driver.id
          );

        const card =
          document.createElement(
            "div"
          );

        card.className =
          "driver-admin-card";

        card.innerHTML =
          `
          <div class="driver-card-head">
            <div class="driver-avatar-admin">
              🚕
            </div>

            <div class="driver-title">
              <strong>
                ${escapeHtml(driver.name)}
              </strong>

              <span>
                ${escapeHtml(
                  driver.vehicle_plate ||
                  "-"
                )}
              </span>
            </div>

            <div
              class="
                driver-state
                ${driver.is_online ? "online" : "offline"}
              "
            >
              ${driver.is_online ? "ONLINE" : "OFFLINE"}
            </div>
          </div>

          <div class="driver-card-stats">
            <div>
              <span>Punë</span>
              <strong>
                ${driverStats?.total_jobs || 0}
              </strong>
            </div>

            <div>
              <span>Xhiro</span>
              <strong>
                ${driverStats?.gross_revenue_lek || 0}
              </strong>
            </div>

            <div>
              <span>Gjendja</span>
              <strong>
                ${driver.is_available ? "Free" : "Busy"}
              </strong>
            </div>
          </div>
          `;

        card.addEventListener(
          "click",
          function () {

            if (
              driver.lat !== null &&
              driver.lng !== null
            ) {

              switchView(
                "dashboard"
              );

              setTimeout(
                function () {

                  adminMap.setView(
                    [
                      driver.lat,
                      driver.lng
                    ],
                    17
                  );

                  driverMarkers[
                    driver.id
                  ]
                    ?.openPopup();
                },
                150
              );
            }
          }
        );

        driversGrid.appendChild(
          card
        );
      }
    );
}


// ==========================================
// OFFERS
// ==========================================

function renderOffers() {

  offersTimeline.innerHTML =
    "";

  offers.forEach(
    offer => {

      const driver =
        getDriver(
          offer.driver_id
        );

      const ride =
        rides.find(
          item =>
            item.id ===
            offer.ride_id
        );

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "offer-row";

      row.innerHTML =
        `
        <div class="offer-time">
          ${formatDate(
            offer.offered_at
          )}
        </div>

        <div class="offer-main">
          <strong>
            ${driver ? escapeHtml(driver.name) : "Shofer"}
          </strong>

          <span>
            ${ride ? shortText(ride.destination_address) : "Ride"}
          </span>
        </div>

        <div
          class="
            offer-result
            ${offer.status}
          "
        >
          ${offer.status}
        </div>
        `;

      offersTimeline.appendChild(
        row
      );
    }
  );
}


// ==========================================
// DRAWER
// ==========================================

function openRideDrawer(
  rideId
) {

  selectedRide =
    rides.find(
      ride =>
        ride.id ===
        rideId
    );

  if (!selectedRide) {
    return;
  }

  renderDrawer();

  rideDrawer.classList.add(
    "open"
  );

  drawerOverlay.classList.add(
    "open"
  );
}


function renderDrawer() {

  const ride =
    selectedRide;

  if (!ride) {
    return;
  }

  const driver =
    getDriver(
      ride.assigned_driver_id
    );

  drawerRideId.textContent =
    "#" +
    ride.id.slice(
      0,
      8
    );

  drawerPickup.textContent =
    ride.pickup_address ||
    "-";

  drawerDestination.textContent =
    ride.destination_address ||
    "-";

  drawerDistance.textContent =
    (
      ride.distance_km ||
      0
    ) +
    " km";

  drawerDuration.textContent =
    (
      ride.duration_minutes ||
      0
    ) +
    " min";

  drawerPrice.textContent =
    (
      ride.price_lek ||
      0
    ) +
    " LEK";

  if (driver) {

    drawerCurrentDriver.innerHTML =
      `
      🚕
      <strong>
        ${escapeHtml(driver.name)}
      </strong>
      <br>
      ${escapeHtml(
        driver.vehicle_plate ||
        ""
      )}
      <br>
      <span style="color:#888;font-size:10px;">
        ${driver.is_online ? "Online" : "Offline"}
        ·
        ${driver.is_available ? "Available" : "Busy"}
        ·
        ${escapeHtml(statusLabel(ride.status))}
      </span>
      `;
  }

  else {

    drawerCurrentDriver.textContent =
      "Nuk ka shofer të caktuar";
  }

  renderManualDriverOptions();
  renderDrawerHistory();

  const manageable =
    ride.status ===
      "pending"
    ||
    isRideActive(
      ride.status
    );

  sendNearestBtn.disabled =
    !manageable;

  assignManualBtn.disabled =
    !manageable;

  removeDriverBtn.disabled =
    !ride.assigned_driver_id;

  cancelRideBtn.disabled =
    !manageable;
}


function renderManualDriverOptions() {

  manualDriverSelect.innerHTML =
    "";

  const ride =
    selectedRide;

  const candidates =
    drivers

      .filter(
        driver =>
          driver.is_online &&
          driver.id !==
            ride.assigned_driver_id
      )

      .map(
        driver => ({
          ...driver,

          distance:
            (
              driver.lat !== null &&
              driver.lng !== null
            )
              ?
              getDistanceKm(
                ride.pickup_lat,
                ride.pickup_lng,
                driver.lat,
                driver.lng
              )
              :
              null
        })
      )

      .sort(
        (
          a,
          b
        ) => {

          if (
            a.distance === null
          ) {
            return 1;
          }

          if (
            b.distance === null
          ) {
            return -1;
          }

          return (
            a.distance -
            b.distance
          );
        }
      );

  if (
    candidates.length === 0
  ) {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      "";

    option.textContent =
      "Nuk ka shoferë online";

    manualDriverSelect.appendChild(
      option
    );

    return;
  }

  candidates.forEach(
    driver => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        driver.id;

      option.textContent =
        driver.name +
        " — " +
        (
          driver.distance !== null
            ?
            driver.distance.toFixed(2) +
            " km"
            :
            "pa GPS"
        )
        +
        (
          driver.is_available
            ?
            " — AVAILABLE"
            :
            " — BUSY"
        );

      option.disabled =
        !driver.is_available;

      manualDriverSelect.appendChild(
        option
      );
    }
  );
}


function renderDrawerHistory() {

  drawerHistory.innerHTML =
    "";

  const rideOffers =
    offers
      .filter(
        offer =>
          offer.ride_id ===
          selectedRide.id
      )
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            a.offered_at
          )
          -
          new Date(
            b.offered_at
          )
      );

  if (
    rideOffers.length === 0
  ) {

    drawerHistory.innerHTML =
      `
      <div class="history-item">
        Nuk ka histori ofertash.
      </div>
      `;

    return;
  }

  rideOffers.forEach(
    offer => {

      const driver =
        getDriver(
          offer.driver_id
        );

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "history-item";

      item.innerHTML =
        `
        <strong>
          ${
            driver
              ?
              escapeHtml(
                driver.name
              )
              :
              "Shofer"
          }
          —
          ${escapeHtml(
            offer.status
          )}
        </strong>

        <span>
          ${formatDate(
            offer.responded_at ||
            offer.offered_at
          )}
        </span>
        `;

      drawerHistory.appendChild(
        item
      );
    }
  );
}


// ==========================================
// ADMIN ACTIONS
// ==========================================

sendNearestBtn.addEventListener(
  "click",
  async function () {

    if (!selectedRide) {
      return;
    }

    await sendToNearestDriver(
      selectedRide
    );
  }
);


assignManualBtn.addEventListener(
  "click",
  async function () {

    if (!selectedRide) {
      return;
    }

    const driverId =
      manualDriverSelect.value;

    if (!driverId) {

      alert(
        "Zgjidh një shofer."
      );

      return;
    }

    await sendToSpecificDriver(
      selectedRide,
      driverId
    );
  }
);


removeDriverBtn.addEventListener(
  "click",
  async function () {

    if (!selectedRide) {
      return;
    }

    await releaseDriver(
      selectedRide
    );
  }
);


cancelRideBtn.addEventListener(
  "click",
  async function () {

    if (!selectedRide) {
      return;
    }

    await cancelRide(
      selectedRide
    );
  }
);


// ==========================================
// TRANSFER HELPERS
// ==========================================

async function prepareTransfer(
  ride
) {

  if (
    ride.assigned_driver_id
  ) {

    await adminSupabaseClient
      .from("drivers")
      .update({
        is_available:
          true
      })
      .eq(
        "id",
        ride.assigned_driver_id
      );

    await adminSupabaseClient
      .from("ride_offers")
      .update({
        status:
          "reassigned",

        responded_at:
          new Date().toISOString()
      })
      .eq(
        "ride_id",
        ride.id
      )
      .eq(
        "driver_id",
        ride.assigned_driver_id
      )
      .eq(
        "status",
        "accepted"
      );
  }

  await adminSupabaseClient
    .from("ride_offers")
    .update({
      status:
        "cancelled",

      responded_at:
        new Date().toISOString()
    })
    .eq(
      "ride_id",
      ride.id
    )
    .eq(
      "status",
      "offered"
    );

  const { error } =
    await adminSupabaseClient
      .from("rides")
      .update({
        status:
          "pending",

        assigned_driver_id:
          null,

        accepted_at:
          null
      })
      .eq(
        "id",
        ride.id
      );

  if (error) {
    throw error;
  }
}


async function sendToNearestDriver(
  ride
) {

  const confirmed =
    confirm(
      "Ta ridërgojmë punën te taksisti tjetër më i afërt?"
    );

  if (!confirmed) {
    return;
  }

  try {

    const oldDriverId =
      ride.assigned_driver_id;

    await prepareTransfer(
      ride
    );

    const {
      data: previousOffers
    } =
      await adminSupabaseClient
        .from("ride_offers")
        .select(
          "driver_id,status"
        )
        .eq(
          "ride_id",
          ride.id
        );

    const excluded =
      new Set();

    if (oldDriverId) {

      excluded.add(
        oldDriverId
      );
    }

    (
      previousOffers ||
      []
    ).forEach(
      offer => {

        if (
          [
            "declined",
            "timeout",
            "reassigned"
          ]
            .includes(
              offer.status
            )
        ) {

          excluded.add(
            offer.driver_id
          );
        }
      }
    );

    const {
      data: availableDrivers
    } =
      await adminSupabaseClient
        .from("drivers")
        .select("*")
        .eq(
          "is_online",
          true
        )
        .eq(
          "is_available",
          true
        )
        .not(
          "lat",
          "is",
          null
        )
        .not(
          "lng",
          "is",
          null
        );

    const candidates =
      (
        availableDrivers ||
        []
      )
        .filter(
          driver =>
            !excluded.has(
              driver.id
            )
        )
        .map(
          driver => ({
            ...driver,

            distance:
              getDistanceKm(
                ride.pickup_lat,
                ride.pickup_lng,
                driver.lat,
                driver.lng
              )
          })
        )
        .sort(
          (
            a,
            b
          ) =>
            a.distance -
            b.distance
        );

    if (
      candidates.length === 0
    ) {

      alert(
        "Nuk ka taksist tjetër available."
      );

      await loadAllData();

      return;
    }

    const driver =
      candidates[0];

    await createOffer(
      ride.id,
      driver.id
    );

    alert(
      "Puna iu dërgua " +
      driver.name +
      "."
    );

    closeDrawer();

    await loadAllData();
  }

  catch (error) {

    console.error(error);

    alert(
      "Gabim gjatë ridërgimit."
    );
  }
}


async function sendToSpecificDriver(
  ride,
  driverId
) {

  const driver =
    getDriver(
      driverId
    );

  if (!driver) {
    return;
  }

  if (!driver.is_online) {

    alert(
      "Shoferi është offline."
    );

    return;
  }

  if (!driver.is_available) {

    alert(
      "Shoferi është i zënë."
    );

    return;
  }

  const confirmed =
    confirm(
      "T'ia kalojmë punën " +
      driver.name +
      "?"
    );

  if (!confirmed) {
    return;
  }

  try {

    await prepareTransfer(
      ride
    );

    await createOffer(
      ride.id,
      driver.id
    );

    alert(
      "Oferta iu dërgua " +
      driver.name +
      "."
    );

    closeDrawer();

    await loadAllData();
  }

  catch (error) {

    console.error(error);

    alert(
      "Transferimi dështoi."
    );
  }
}


async function createOffer(
  rideId,
  driverId
) {

  const { error } =
    await adminSupabaseClient
      .from("ride_offers")
      .insert({
        ride_id:
          rideId,

        driver_id:
          driverId,

        status:
          "offered"
      });

  if (error) {
    throw error;
  }
}


async function releaseDriver(
  ride
) {

  if (
    !ride.assigned_driver_id
  ) {
    return;
  }

  const confirmed =
    confirm(
      "T'ia heqim këtë punë shoferit aktual?"
    );

  if (!confirmed) {
    return;
  }

  await prepareTransfer(
    ride
  );

  closeDrawer();

  await loadAllData();
}


async function cancelRide(
  ride
) {

  const confirmed =
    confirm(
      "Ta anulojmë këtë udhëtim?"
    );

  if (!confirmed) {
    return;
  }

  if (
    ride.assigned_driver_id
  ) {

    await adminSupabaseClient
      .from("drivers")
      .update({
        is_available:
          true
      })
      .eq(
        "id",
        ride.assigned_driver_id
      );
  }

  await adminSupabaseClient
    .from("ride_offers")
    .update({
      status:
        "cancelled",

      responded_at:
        new Date().toISOString()
    })
    .eq(
      "ride_id",
      ride.id
    )
    .eq(
      "status",
      "offered"
    );

  await adminSupabaseClient
    .from("rides")
    .update({
      status:
        "cancelled",

      assigned_driver_id:
        null
    })
    .eq(
      "id",
      ride.id
    );

  closeDrawer();

  await loadAllData();
}


// ==========================================
// NAV
// ==========================================

function bindNavigation() {

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          function () {

            switchView(
              button.dataset.view
            );
          }
        );
      }
    );
}


function switchView(
  view
) {

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(
      item =>
        item.classList.remove(
          "active"
        )
    );

  document
    .querySelector(
      `.nav-item[data-view="${view}"]`
    )
    ?.classList
    .add(
      "active"
    );

  document
    .querySelectorAll(
      ".view-section"
    )
    .forEach(
      section =>
        section.classList.remove(
          "active-view"
        )
    );

  document
    .getElementById(
      view +
      "View"
    )
    ?.classList
    .add(
      "active-view"
    );

  const titles = {
    dashboard:
      "Dashboard",

    approvals:
      "Aprovime",

    drivers:
      "Shoferët",

    rides:
      "Punët",

    offers:
      "Historiku",

    reports:
      "Raporte & Statistika"
  };

  document.getElementById(
    "pageTitle"
  ).textContent =
    titles[view];

  if (
    view ===
    "reports"
  ) {
    renderReports();
  }

  if (
    view ===
    "dashboard"
  ) {

    setTimeout(
      function () {

        adminMap.invalidateSize();
      },
      100
    );
  }
}


// ==========================================
// DRAWER CLOSE
// ==========================================

function closeDrawer() {

  rideDrawer.classList.remove(
    "open"
  );

  drawerOverlay.classList.remove(
    "open"
  );

  selectedRide = null;
}

closeDrawerBtn.addEventListener(
  "click",
  closeDrawer
);

drawerOverlay.addEventListener(
  "click",
  closeDrawer
);


// ==========================================
// FILTERS
// ==========================================

rideStatusFilter.addEventListener(
  "change",
  renderRidesTable
);

rideSearchInput.addEventListener(
  "input",
  renderRidesTable
);

driverSearchInput.addEventListener(
  "input",
  renderDrivers
);

refreshAdminBtn.addEventListener(
  "click",
  loadAllData
);

showAllRidesBtn.addEventListener(
  "click",
  function () {

    switchView(
      "rides"
    );
  }
);


// ==========================================
// REALTIME
// ==========================================

function subscribeRealtime() {

  if (
    realtimeChannel
  ) {

    adminSupabaseClient.removeChannel(
      realtimeChannel
    );
  }

  realtimeChannel =
    adminSupabaseClient
      .channel(
        "admin-control-center-live"
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drivers"
        },
        function (payload) {

          if (
            payload.eventType ===
              "UPDATE"
          ) {

            const index =
              drivers.findIndex(
                driver =>
                  driver.id ===
                  payload.new.id
              );

            if (
              index !== -1
            ) {

              drivers[index] =
                payload.new;
            }

            else {

              drivers.push(
                payload.new
              );
            }
          }

          if (
            payload.eventType ===
              "INSERT"
          ) {

            drivers.push(
              payload.new
            );
          }

          if (
            payload.eventType ===
              "DELETE"
          ) {

            drivers =
              drivers.filter(
                driver =>
                  driver.id !==
                  payload.old.id
              );
          }

          renderMap();
          renderSummary();
          renderDrivers();
          renderLiveRides();
          renderReports();

          if (
            selectedRide
          ) {

            renderDrawer();
          }
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rides"
        },
        async function () {

          await loadRides();

          renderSummary();
          renderLiveRides();
          renderRecentRides();
          renderRidesTable();
          renderReports();

          if (
            selectedRide
          ) {

            selectedRide =
              rides.find(
                ride =>
                  ride.id ===
                  selectedRide.id
              );

            if (
              selectedRide
            ) {

              renderDrawer();
            }
          }
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ride_offers"
        },
        async function () {

          await loadOffers();

          renderOffers();

          if (
            selectedRide
          ) {

            renderDrawerHistory();
          }
        }
      )

      .subscribe();
}


// ==========================================
// HELPERS
// ==========================================

function getDriver(
  id
) {

  if (!id) {
    return null;
  }

  return drivers.find(
    driver =>
      driver.id === id
  );
}


function shortText(
  value
) {

  const text =
    value ||
    "-";

  if (
    text.length <= 34
  ) {

    return escapeHtml(
      text
    );
  }

  return escapeHtml(
    text.slice(
      0,
      31
    )
    +
    "..."
  );
}


function formatDate(
  value
) {

  if (!value) {
    return "-";
  }

  return new Date(
    value
  ).toLocaleString(
    "sq-AL"
  );
}


function escapeHtml(
  value
) {

  return String(
    value ??
    ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


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
// DRIVER MANAGEMENT UI
// ==========================================

var selectedManagedDriver = null;
var driverManagementStatusFilter = "active";

function setupDriverManagementUi() {

  if (
    document.getElementById(
      "driverManagementStyles"
    )
  ) {
    return;
  }

  const driversHeader =
    document.querySelector(
      "#driversView .panel-header"
    );

  if (driversHeader) {

    const existingSearch =
      document.getElementById(
        "driverSearchInput"
      );

    const tools =
      document.createElement(
        "div"
      );

    tools.className =
      "driver-management-tools";

    const filter =
      document.createElement(
        "select"
      );

    filter.id =
      "driverManagementFilter";

    filter.innerHTML = `
      <option value="active">Aktivë</option>
      <option value="all">Të gjithë</option>
      <option value="online">Online</option>
      <option value="offline">Offline</option>
      <option value="suspended">Pezulluar</option>
      <option value="archived">Arkivuar</option>
    `;

    filter.addEventListener(
      "change",
      function () {
        driverManagementStatusFilter =
          filter.value;
        renderDrivers();
      }
    );

    if (existingSearch) {
      existingSearch.parentNode.insertBefore(
        tools,
        existingSearch
      );
      tools.appendChild(filter);
      tools.appendChild(existingSearch);
    }
  }

  const overlay =
    document.createElement(
      "div"
    );

  overlay.id =
    "driverManagementOverlay";

  overlay.className =
    "driver-management-overlay";

  const drawer =
    document.createElement(
      "aside"
    );

  drawer.id =
    "driverManagementDrawer";

  drawer.className =
    "driver-management-drawer";

  drawer.innerHTML = `
    <div class="driver-management-head">
      <div>
        <span>SHOFER</span>
        <h2 id="managedDriverTitle">Menaxho Shoferin</h2>
      </div>
      <button id="closeManagedDriverBtn">✕</button>
    </div>

    <div class="driver-management-body">

      <div class="driver-management-section">
        <h3>TË DHËNAT</h3>

        <label>Emri dhe Mbiemri</label>
        <input id="managedDriverName" type="text">

        <label>Telefoni</label>
        <input id="managedDriverPhone" type="text">

        <label>Targa</label>
        <input id="managedDriverPlate" type="text">

        <label>Email</label>
        <input id="managedDriverEmail" type="email" readonly>

        <button
          id="saveManagedDriverBtn"
          class="managed-action managed-save"
        >
          RUAJ NDRYSHIMET
        </button>
      </div>

      <div class="driver-management-section">
        <h3>STATUSI</h3>
        <div id="managedDriverStatus" class="managed-status-box"></div>
      </div>

      <div class="driver-management-section">
        <h3>ADMINISTRIM</h3>

        <button
          id="suspendManagedDriverBtn"
          class="managed-action managed-warning"
        >
          PEZULLO SHOFERIN
        </button>

        <button
          id="reactivateManagedDriverBtn"
          class="managed-action managed-save hidden"
        >
          RIAKTIVIZO SHOFERIN
        </button>

        <button
          id="archiveManagedDriverBtn"
          class="managed-action managed-danger"
        >
          ARKIVO SHOFERIN
        </button>

        <button
          id="restoreManagedDriverBtn"
          class="managed-action managed-warning hidden"
        >
          RIKTHE NGA ARKIVA
        </button>

        <p class="managed-help">
          Arkivimi është soft-delete: shoferi hiqet nga përdorimi normal,
          del offline dhe bllokohet nga Driver App. Llogaria Auth nuk fshihet.
        </p>
      </div>

    </div>
  `;

  document.body.appendChild(
    overlay
  );

  document.body.appendChild(
    drawer
  );

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "driverManagementStyles";

  style.textContent = `
    .driver-management-tools {
      display:flex;
      align-items:center;
      gap:8px;
      margin-left:auto;
    }

    .driver-management-tools select {
      min-height:38px;
      padding:0 10px;
      border:1px solid #333;
      border-radius:7px;
      background:#191919;
      color:white;
      outline:none;
    }

    .driver-admin-card.driver-archived {
      opacity:.55;
    }

    .driver-management-card-actions {
      margin-top:10px;
    }

    .driver-management-card-actions button {
      width:100%;
      min-height:34px;
      border:1px solid #3a3a3a;
      border-radius:7px;
      background:#242424;
      color:white;
      cursor:pointer;
      font-size:10px;
      font-weight:bold;
    }

    .driver-state.suspended,
    .driver-state.archived {
      color:#ff7171;
    }

    .driver-management-overlay {
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.65);
      opacity:0;
      pointer-events:none;
      transition:.25s;
      z-index:1900;
    }

    .driver-management-overlay.open {
      opacity:1;
      pointer-events:auto;
    }

    .driver-management-drawer {
      position:fixed;
      top:0;
      right:0;
      bottom:0;
      width:390px;
      max-width:92vw;
      background:#111;
      border-left:1px solid #2c2c2c;
      transform:translateX(100%);
      transition:.25s;
      z-index:2000;
      overflow-y:auto;
    }

    .driver-management-drawer.open {
      transform:translateX(0);
    }

    .driver-management-head {
      min-height:74px;
      padding:15px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      border-bottom:1px solid #292929;
    }

    .driver-management-head span {
      color:#777;
      font-size:9px;
    }

    .driver-management-head h2 {
      margin:3px 0 0;
      font-size:18px;
    }

    .driver-management-head button {
      width:35px;
      height:35px;
      border:1px solid #333;
      border-radius:8px;
      background:#191919;
      color:white;
      cursor:pointer;
    }

    .driver-management-body {
      padding:15px;
    }

    .driver-management-section {
      margin-bottom:22px;
      display:grid;
      gap:7px;
    }

    .driver-management-section h3 {
      margin:0 0 4px;
      color:#aaa;
      font-size:11px;
    }

    .driver-management-section label {
      color:#777;
      font-size:10px;
      margin-top:4px;
    }

    .driver-management-section input {
      min-height:40px;
      padding:0 9px;
      border:1px solid #383838;
      border-radius:7px;
      background:#191919;
      color:white;
      outline:none;
    }

    .driver-management-section input[readonly] {
      opacity:.6;
    }

    .managed-status-box {
      padding:12px;
      border-radius:9px;
      background:#151515;
      border:1px solid #303030;
      color:#bbb;
      font-size:11px;
      line-height:1.7;
    }

    .managed-action {
      width:100%;
      min-height:42px;
      border:0;
      border-radius:8px;
      color:white;
      font-size:11px;
      font-weight:bold;
      cursor:pointer;
    }

    .managed-save { background:#146d35; }
    .managed-warning { background:#674b00; }
    .managed-danger { background:#790000; }

    .managed-help {
      color:#777;
      font-size:10px;
      line-height:1.5;
    }

    @media(max-width:760px) {
      .driver-management-tools {
        width:100%;
        flex-direction:column;
        align-items:stretch;
      }
      .driver-management-tools select,
      .driver-management-tools input {
        width:100%;
      }
    }
  `;

  document.head.appendChild(
    style
  );

  document
    .getElementById(
      "closeManagedDriverBtn"
    )
    .addEventListener(
      "click",
      closeManagedDriver
    );

  overlay.addEventListener(
    "click",
    closeManagedDriver
  );

  document
    .getElementById(
      "saveManagedDriverBtn"
    )
    .addEventListener(
      "click",
      saveManagedDriver
    );

  document
    .getElementById(
      "suspendManagedDriverBtn"
    )
    .addEventListener(
      "click",
      suspendManagedDriver
    );

  document
    .getElementById(
      "reactivateManagedDriverBtn"
    )
    .addEventListener(
      "click",
      reactivateManagedDriver
    );

  document
    .getElementById(
      "archiveManagedDriverBtn"
    )
    .addEventListener(
      "click",
      archiveManagedDriver
    );

  document
    .getElementById(
      "restoreManagedDriverBtn"
    )
    .addEventListener(
      "click",
      restoreManagedDriver
    );
}


function openManagedDriver(
  driverId
) {

  selectedManagedDriver =
    drivers.find(
      driver =>
        driver.id ===
        driverId
    );

  if (
    !selectedManagedDriver
  ) {
    return;
  }

  renderManagedDriver();

  document
    .getElementById(
      "driverManagementDrawer"
    )
    .classList.add(
      "open"
    );

  document
    .getElementById(
      "driverManagementOverlay"
    )
    .classList.add(
      "open"
    );
}


function closeManagedDriver() {

  document
    .getElementById(
      "driverManagementDrawer"
    )
    ?.classList.remove(
      "open"
    );

  document
    .getElementById(
      "driverManagementOverlay"
    )
    ?.classList.remove(
      "open"
    );

  selectedManagedDriver =
    null;
}


function renderManagedDriver() {

  if (
    !selectedManagedDriver
  ) {
    return;
  }

  const driver =
    selectedManagedDriver;

  const driverStats =
    stats.find(
      stat =>
        stat.driver_id ===
        driver.id
    );

  document
    .getElementById(
      "managedDriverTitle"
    )
    .textContent =
      driver.name ||
      "Shofer";

  document
    .getElementById(
      "managedDriverName"
    )
    .value =
      driver.name ||
      "";

  document
    .getElementById(
      "managedDriverPhone"
    )
    .value =
      driver.phone ||
      "";

  document
    .getElementById(
      "managedDriverPlate"
    )
    .value =
      driver.vehicle_plate ||
      "";

  document
    .getElementById(
      "managedDriverEmail"
    )
    .value =
      driver.email ||
      "";

  const status =
    driver.is_archived
      ? "ARKIVUAR"
      : (
          driver.account_status ||
          "approved"
        ).toUpperCase();

  document
    .getElementById(
      "managedDriverStatus"
    )
    .innerHTML = `
      <strong>${escapeHtml(status)}</strong>
      <br>
      Online: ${driver.is_online ? "PO" : "JO"}
      <br>
      Available: ${driver.is_available ? "PO" : "JO"}
      <br>
      Punë: ${driverStats?.total_jobs || 0}
      <br>
      Xhiro: ${driverStats?.gross_revenue_lek || 0} LEK
    `;

  const suspend =
    document.getElementById(
      "suspendManagedDriverBtn"
    );

  const reactivate =
    document.getElementById(
      "reactivateManagedDriverBtn"
    );

  const archive =
    document.getElementById(
      "archiveManagedDriverBtn"
    );

  const restore =
    document.getElementById(
      "restoreManagedDriverBtn"
    );

  const save =
    document.getElementById(
      "saveManagedDriverBtn"
    );

  suspend.classList.toggle(
    "hidden",
    driver.is_archived ||
    driver.account_status ===
      "suspended"
  );

  reactivate.classList.toggle(
    "hidden",
    driver.is_archived ||
    driver.account_status !==
      "suspended"
  );

  archive.classList.toggle(
    "hidden",
    !!driver.is_archived
  );

  restore.classList.toggle(
    "hidden",
    !driver.is_archived
  );

  save.disabled =
    !!driver.is_archived;
}


async function saveManagedDriver() {

  if (
    !selectedManagedDriver
  ) {
    return;
  }

  const name =
    document
      .getElementById(
        "managedDriverName"
      )
      .value
      .trim();

  const phone =
    document
      .getElementById(
        "managedDriverPhone"
      )
      .value
      .trim();

  const plate =
    document
      .getElementById(
        "managedDriverPlate"
      )
      .value
      .trim()
      .toUpperCase();

  if (
    !name ||
    !plate
  ) {

    alert(
      "Emri dhe targa janë të detyrueshme."
    );

    return;
  }

  const duplicate =
    drivers.some(
      driver =>
        driver.id !==
          selectedManagedDriver.id
        &&
        !driver.is_archived
        &&
        String(
          driver.vehicle_plate ||
          ""
        ).toUpperCase() ===
          plate
    );

  if (
    duplicate
  ) {

    alert(
      "Kjo targë ekziston te një shofer tjetër."
    );

    return;
  }

  const {
    error
  } =
    await adminSupabaseClient
      .from(
        "drivers"
      )
      .update({
        name,
        phone,
        vehicle_plate:
          plate,
        updated_at:
          new Date()
            .toISOString()
      })
      .eq(
        "id",
        selectedManagedDriver.id
      );

  if (
    error
  ) {

    alert(
      error.message
    );

    return;
  }

  await refreshManagedDriver(
    selectedManagedDriver.id
  );

  alert(
    "Të dhënat u ruajtën."
  );
}


async function suspendManagedDriver() {

  if (
    !selectedManagedDriver ||
    !confirm(
      "Ta pezullojmë këtë shofer? Do të dalë offline dhe nuk do të mund të hyjë në punë."
    )
  ) {
    return;
  }

  await updateManagedDriverState(
    {
      account_status:
        "suspended",
      is_online:
        false,
      is_available:
        false
    }
  );
}


async function reactivateManagedDriver() {

  if (
    !selectedManagedDriver
  ) {
    return;
  }

  await updateManagedDriverState(
    {
      account_status:
        "approved",
      is_online:
        false,
      is_available:
        false
    }
  );
}


async function archiveManagedDriver() {

  if (
    !selectedManagedDriver
  ) {
    return;
  }

  const activeRide =
    rides.find(
      ride =>
        ride.assigned_driver_id ===
          selectedManagedDriver.id
        &&
        isRideActive(
          ride.status
        )
    );

  if (
    activeRide
  ) {

    alert(
      "Ky shofer ka një udhëtim aktiv. Përfundoje ose transferoje punën para arkivimit."
    );

    return;
  }

  if (
    !confirm(
      "Ta arkivojmë këtë shofer?"
    )
  ) {
    return;
  }

  await updateManagedDriverState(
    {
      is_archived:
        true,
      account_status:
        "suspended",
      is_online:
        false,
      is_available:
        false
    }
  );
}


async function restoreManagedDriver() {

  if (
    !selectedManagedDriver ||
    !confirm(
      "Ta rikthejmë këtë shofer nga arkiva?"
    )
  ) {
    return;
  }

  await updateManagedDriverState(
    {
      is_archived:
        false,
      account_status:
        "approved",
      is_online:
        false,
      is_available:
        false
    }
  );
}


async function updateManagedDriverState(
  changes
) {

  const id =
    selectedManagedDriver.id;

  const {
    error
  } =
    await adminSupabaseClient
      .from(
        "drivers"
      )
      .update({
        ...changes,
        updated_at:
          new Date()
            .toISOString()
      })
      .eq(
        "id",
        id
      );

  if (
    error
  ) {

    alert(
      error.message
    );

    return;
  }

  await refreshManagedDriver(
    id
  );
}


async function refreshManagedDriver(
  driverId
) {

  await loadDrivers();

  renderSummary();
  renderApprovals();
  renderMap();
  renderDrivers();

  selectedManagedDriver =
    drivers.find(
      driver =>
        driver.id ===
        driverId
    ) ||
    null;

  if (
    selectedManagedDriver
  ) {
    renderManagedDriver();
  }
}


// Replace only the visual driver-list renderer.
renderDrivers = function () {

  driversGrid.innerHTML =
    "";

  const search =
    driverSearchInput
      .value
      .trim()
      .toLowerCase();

  const filtered =
    drivers.filter(
      driver => {

        const text =
          `${driver.name || ""} ${driver.vehicle_plate || ""} ${driver.phone || ""}`
            .toLowerCase();

        if (
          !text.includes(
            search
          )
        ) {
          return false;
        }

        if (
          driverManagementStatusFilter ===
          "archived"
        ) {
          return !!driver.is_archived;
        }

        if (
          driver.is_archived
        ) {
          return driverManagementStatusFilter ===
            "all";
        }

        const accountStatus =
          driver.account_status ||
          "approved";

        if (
          driverManagementStatusFilter ===
          "active"
        ) {
          return accountStatus ===
            "approved";
        }

        if (
          driverManagementStatusFilter ===
          "online"
        ) {
          return accountStatus ===
            "approved"
            &&
            driver.is_online;
        }

        if (
          driverManagementStatusFilter ===
          "offline"
        ) {
          return accountStatus ===
            "approved"
            &&
            !driver.is_online;
        }

        if (
          driverManagementStatusFilter ===
          "suspended"
        ) {
          return accountStatus ===
            "suspended";
        }

        return true;
      }
    );

  if (
    filtered.length ===
    0
  ) {

    driversGrid.innerHTML = `
      <div style="padding:30px;color:#666;">
        Nuk ka shoferë për këtë filtër.
      </div>
    `;

    return;
  }

  filtered.forEach(
    driver => {

      const driverStats =
        stats.find(
          stat =>
            stat.driver_id ===
            driver.id
        );

      const accountStatus =
        driver.account_status ||
        "approved";

      let state =
        driver.is_online
          ? "ONLINE"
          : "OFFLINE";

      let stateClass =
        driver.is_online
          ? "online"
          : "offline";

      if (
        accountStatus ===
        "suspended"
      ) {
        state = "SUSPENDED";
        stateClass = "suspended";
      }

      if (
        driver.is_archived
      ) {
        state = "ARCHIVED";
        stateClass = "archived";
      }

      const card =
        document.createElement(
          "div"
        );

      card.className =
        "driver-admin-card" +
        (
          driver.is_archived
            ? " driver-archived"
            : ""
        );

      card.innerHTML = `
        <div class="driver-card-head">

          <div class="driver-avatar-admin">
            🚕
          </div>

          <div class="driver-title">
            <strong>${escapeHtml(driver.name || "-")}</strong>
            <span>${escapeHtml(driver.vehicle_plate || "-")}</span>
            <span>${escapeHtml(driver.phone || "-")}</span>
          </div>

          <div class="driver-state ${stateClass}">
            ${state}
          </div>

        </div>

        <div class="driver-card-stats">

          <div>
            <span>Punë</span>
            <strong>${driverStats?.total_jobs || 0}</strong>
          </div>

          <div>
            <span>Xhiro</span>
            <strong>${driverStats?.gross_revenue_lek || 0}</strong>
          </div>

          <div>
            <span>Gjendja</span>
            <strong>${driver.is_available ? "Free" : "Busy"}</strong>
          </div>

        </div>

        <div class="driver-management-card-actions">
          <button>MENAXHO SHOFERIN</button>
        </div>
      `;

      card
        .querySelector(
          ".driver-management-card-actions button"
        )
        .addEventListener(
          "click",
          function () {
            openManagedDriver(
              driver.id
            );
          }
        );

      driversGrid.appendChild(
        card
      );
    }
  );
};
