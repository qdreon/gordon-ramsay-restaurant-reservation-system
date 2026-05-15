const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const {
  chromium,
} = require("../gordon-ramsay-reservations/node_modules/playwright");

const rootDir = path.resolve(__dirname, "..");
const appDir = path.join(rootDir, "gordon-ramsay-reservations");
const outputDir = path.join(rootDir, "submission", "screenshot-outputs");
const screenshotDir = path.join(outputDir, "screenshots");
const pdfPath = path.join(
  outputDir,
  "GRRRS_Authenticated_Screenshot_Outputs.pdf",
);
const baseUrl = "http://127.0.0.1:3000";

const ADMIN_EMAIL = "test-admin@example.com";
const ADMIN_PASSWORD = "TestPassword123!";
const CUSTOMER_EMAIL = "test-customer@example.com";
const CUSTOMER_PASSWORD = "TestPassword123!";

const adminPages = [
  { path: "/admin/crm", title: "Admin CRM", fileSlug: "admin-crm" },
  {
    path: "/admin/waitlist",
    title: "Admin Waitlist",
    fileSlug: "admin-waitlist",
  },
  {
    path: "/admin/floorplan",
    title: "Admin Floor Plan",
    fileSlug: "admin-floorplan",
  },
  {
    path: "/admin/menu",
    title: "Admin Menu Management",
    fileSlug: "admin-menu-management",
  },
  {
    path: "/admin/reservations",
    title: "Admin Reservations",
    fileSlug: "admin-reservations",
  },
  {
    path: "/admin/dashboard",
    title: "Admin Dashboard",
    fileSlug: "admin-dashboard",
  },
  { path: "/admin", title: "Admin Home", fileSlug: "admin-home" },
];

const customerPages = [
  {
    path: "/customer/dashboard",
    title: "Customer Dashboard",
    fileSlug: "customer-dashboard",
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {}
    await wait(1000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function safeName(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function imageToDataUri(filePath) {
  const data = fs.readFileSync(filePath).toString("base64");
  return `data:image/png;base64,${data}`;
}

async function loginAs(page, email, password, roleName) {
  await page.goto(`${baseUrl}/auth/login`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(admin|customer)\//, { timeout: 45000 });

  if (page.url().includes("/auth/login")) {
    throw new Error(`${roleName} login did not leave the login page.`);
  }
}

async function capturePage(page, item, index) {
  const url = `${baseUrl}${item.path}`;
  const fileName = `${String(index + 1).padStart(2, "0")}-${item.fileSlug || safeName(item.title)}.png`;
  const filePath = path.join(screenshotDir, fileName);

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page
    .waitForLoadState("networkidle", { timeout: 45000 })
    .catch(() => {});
  await wait(2500);
  await page.screenshot({ path: filePath, fullPage: true });

  const finalUrl = page.url();
  const status = finalUrl.includes("/auth/login")
    ? "Captured login redirect warning: authentication was not active for this page."
    : "Captured authenticated page";

  return { ...item, url, finalUrl, fileName, filePath, status };
}

async function captureAuthenticatedPage(
  browser,
  item,
  index,
  email,
  password,
  roleName,
) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  try {
    await loginAs(page, email, password, roleName);
    return await capturePage(page, item, index);
  } finally {
    await context.close().catch(() => {});
  }
}

async function main() {
  if (fs.existsSync(screenshotDir)) {
    fs.rmSync(screenshotDir, { recursive: true, force: true });
  }
  ensureDir(screenshotDir);

  const server = spawn("npx", ["next", "dev", "--webpack"], {
    cwd: appDir,
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: baseUrl,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });

  let serverLog = "";
  server.stdout.on("data", (chunk) => {
    serverLog += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverLog += chunk.toString();
  });

  try {
    await waitForServer(baseUrl, 90000);

    const browser = await chromium.launch({ headless: true });
    const captured = [];

    for (let index = 0; index < adminPages.length; index += 1) {
      const item = adminPages[index];
      try {
        captured.push(
          await captureAuthenticatedPage(
            browser,
            item,
            index,
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
            "Admin",
          ),
        );
      } catch (error) {
        captured.push({
          ...item,
          url: `${baseUrl}${item.path}`,
          finalUrl: "capture failed",
          fileName: `${String(index + 1).padStart(2, "0")}-${item.fileSlug}.png`,
          filePath: "",
          status: `Capture failed: ${error.message}`,
        });
      }
    }

    for (let index = 0; index < customerPages.length; index += 1) {
      const item = customerPages[index];
      const captureIndex = adminPages.length + index;
      try {
        captured.push(
          await captureAuthenticatedPage(
            browser,
            item,
            captureIndex,
            CUSTOMER_EMAIL,
            CUSTOMER_PASSWORD,
            "Customer",
          ),
        );
      } catch (error) {
        captured.push({
          ...item,
          url: `${baseUrl}${item.path}`,
          finalUrl: "capture failed",
          fileName: `${String(captureIndex + 1).padStart(2, "0")}-${item.fileSlug}.png`,
          filePath: "",
          status: `Capture failed: ${error.message}`,
        });
      }
    }

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>GRRRS Authenticated Screenshot Outputs</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .subtitle { color: #4b5563; margin: 0 0 18px; font-size: 13px; }
    .page { page-break-after: always; }
    .meta { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin: 0 0 8px; }
    .meta h2 { margin: 0; font-size: 18px; }
    .meta p { margin: 0; font-size: 11px; color: #4b5563; }
    img { width: 100%; max-height: 665px; object-fit: contain; border: 1px solid #d1d5db; border-radius: 8px; }
    .cover { display: flex; flex-direction: column; justify-content: center; min-height: 700px; }
    .toc { font-size: 13px; line-height: 1.55; }
  </style>
</head>
<body>
  <section class="page cover">
    <h1>Gordon Ramsay Restaurant Reservation System</h1>
    <p class="subtitle">Authenticated admin and customer screenshot outputs for project submission</p>
    <div class="toc">
      <strong>Included screenshots:</strong>
      <ol>
        ${captured.map((item) => `<li>${item.title} — ${item.path} — ${item.status}</li>`).join("")}
      </ol>
    </div>
  </section>
  ${captured
    .map(
      (item, index) => `
    <section class="page">
      <div class="meta">
        <h2>${index + 1}. ${item.title}</h2>
        <p>${item.finalUrl || item.url}</p>
      </div>
      ${item.filePath ? `<img src="${imageToDataUri(item.filePath)}" alt="${item.title}" />` : `<p>${item.status}</p>`}
    </section>
  `,
    )
    .join("")}
</body>
</html>`;

    const pdfPage = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    await pdfPage.setContent(html, { waitUntil: "load" });
    await pdfPage.pdf({
      path: pdfPath,
      printBackground: true,
      preferCSSPageSize: true,
    });
    await browser.close();

    fs.writeFileSync(
      path.join(outputDir, "screenshot-manifest.json"),
      JSON.stringify(captured, null, 2),
    );
    fs.writeFileSync(path.join(outputDir, "server-log.txt"), serverLog);
    console.log(`Created ${pdfPath}`);
  } finally {
    if (!server.killed) {
      server.kill("SIGTERM");
      await wait(1500);
      if (!server.killed) {
        server.kill("SIGKILL");
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
