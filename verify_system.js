const http = require("http");

const CONFIG = {
  commandServiceParams: {
    hostname: "localhost",
    port: 8080,
  },
  queryServiceParams: {
    hostname: "localhost",
    port: 8081,
  },
};

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runVerification() {
  console.log("🚀 Starting System Verification...\n");

  try {
    // 1. Health Checks
    console.log("1. Checking Service Health...");
    const cmdHealth = await request({
      ...CONFIG.commandServiceParams,
      path: "/health",
      method: "GET",
    });
    const queryHealth = await request({
      ...CONFIG.queryServiceParams,
      path: "/health",
      method: "GET",
    });

    if (cmdHealth.status !== 200 || queryHealth.status !== 200) {
      throw new Error(
        `Services unhealthy. Command: ${cmdHealth.status}, Query: ${queryHealth.status}`,
      );
    }
    console.log("✅ Services are healthy\n");

    // 2. Create Product
    console.log("2. Creating Product...");
    const productData = {
      name: "Test Laptop",
      category: "Electronics",
      price: 1500.0,
      stock: 100,
    };

    const prodRes = await request(
      {
        ...CONFIG.commandServiceParams,
        path: "/api/products",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      productData,
    );

    if (prodRes.status !== 201)
      throw new Error(
        `Failed to create product: ${JSON.stringify(prodRes.body)}`,
      );
    const productId = prodRes.body.productId;
    console.log(`✅ Product created with ID: ${productId}\n`);

    // 3. Create Order
    console.log("3. Creating Order...");
    const orderData = {
      customerId: 123,
      items: [{ productId, quantity: 2, price: 1500.0 }],
    };

    const orderRes = await request(
      {
        ...CONFIG.commandServiceParams,
        path: "/api/orders",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      orderData,
    );

    if (orderRes.status !== 201)
      throw new Error(
        `Failed to create order: ${JSON.stringify(orderRes.body)}`,
      );
    const orderId = orderRes.body.orderId;
    console.log(`✅ Order created with ID: ${orderId}\n`);

    // 4. Wait for Processing
    console.log("4. Waiting 5s for event processing...");
    await delay(5000);

    // 5. Verify Analytics
    console.log("\n5. Verifying Analytics...");

    // Product Sales
    const salesRes = await request({
      ...CONFIG.queryServiceParams,
      path: `/api/analytics/products/${productId}/sales`,
      method: "GET",
    });

    if (salesRes.status === 200 && salesRes.body.totalQuantitySold === 2) {
      console.log("✅ Product Sales view updated correctly");
    } else {
      console.error("❌ Product Sales view incorrect:", salesRes.body);
    }

    // Checking Sync Status
    const syncRes = await request({
      ...CONFIG.queryServiceParams,
      path: "/api/analytics/sync-status",
      method: "GET",
    });

    if (syncRes.status === 200 && syncRes.body.lagSeconds !== null) {
      console.log(
        `✅ Sync Status operational (Lag: ${syncRes.body.lagSeconds}s)`,
      );
    } else {
      console.error("❌ Sync Status check failed:", syncRes.body);
    }

    console.log("\n✨ Verification Complete!");
  } catch (error) {
    console.error("\n❌ Verification Failed:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error(
        "   (Ensure Docker containers are running with `docker-compose up`)",
      );
    }
  }
}

runVerification();
