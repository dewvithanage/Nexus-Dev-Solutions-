import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ShoppingCartPage from "@/app/cart/page";
import OrderFormPage from "@/app/checkout/[businessId]/page";
import { POST as placeOrder } from "@/app/api/orders/route";
import { GET as getOrder } from "@/app/api/orders/[orderId]/route";
import type { CartItem } from "@/lib/cart-context";
import { prisma } from "@/lib/prisma";
import { createEntrepreneur, createProduct, jsonRequest, resetDatabase, routeParams } from "./helpers";

// Shopping Cart page, Checkout (Order Form) page, and the order API the
// checkout form submits to.

// The cart lives in the browser's localStorage behind a React context; the
// pages are rendered here with whatever cart the test puts in `cart.items`.
const cart = vi.hoisted(() => ({ items: [] as CartItem[], businessId: "" }));

vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    items: cart.items,
    totalItemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    addItem: () => {},
    removeItem: () => {},
    updateQuantity: () => {},
    clearBusinessItems: () => {},
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  usePathname: () => "/cart",
  useParams: () => ({ businessId: cart.businessId }),
}));

beforeEach(async () => {
  await resetDatabase();
  cart.items = [];
  cart.businessId = "";
});

function cartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p1",
    name: "Mug",
    price: 250,
    quantity: 1,
    imageUrl: null,
    businessId: "biz-a",
    businessName: "Alpha Crafts",
    ...overrides,
  };
}

// Server-renders a client page; React's "<!-- -->" text separators are
// dropped so "Mug (x2)" reads as one piece of text.
function render(page: ComponentType) {
  return renderToStaticMarkup(createElement(page)).replace(/<!-- -->/g, "");
}

describe("Shopping Cart page", () => {
  it("shows an empty state with a link back to the marketplace", () => {
    const html = render(ShoppingCartPage);

    expect(html).toContain("Your cart is feeling light");
    expect(html).toContain('href="/marketplace"');
    expect(html).not.toContain("Proceed to Order");
  });

  it("groups items by business, each with its own subtotal and checkout link", () => {
    cart.items = [
      cartItem({ productId: "p1", name: "Mug", price: 250, quantity: 2 }),
      cartItem({ productId: "p2", name: "Coaster", price: 100.5, quantity: 1 }),
      cartItem({ productId: "p3", name: "Brownie", price: 80, quantity: 3, businessId: "biz-b", businessName: "Bake Co" }),
    ];

    const html = render(ShoppingCartPage);

    expect(html.match(/Proceed to Order/g)).toHaveLength(2);
    expect(html).toContain('href="/checkout/biz-a"');
    expect(html).toContain('href="/checkout/biz-b"');
    expect(html).toContain("Alpha Crafts");
    expect(html).toContain("Bake Co");
    expect(html).toContain("Subtotal: Rs.600.50");
    expect(html).toContain("Subtotal: Rs.240.00");
    // Line total = unit price x quantity.
    expect(html).toContain("Unit Price: Rs.250.00");
    expect(html).toContain("Rs.500.00");
  });

  it("shows the product image when the item has one", () => {
    cart.items = [cartItem({ imageUrl: "/uploads/mug.png" })];
    expect(render(ShoppingCartPage)).toMatch(/<img[^>]+alt="Mug"/);
  });
});

describe("Checkout (Order Form) page", () => {
  it("summarises only this business's items and their total", () => {
    cart.businessId = "biz-a";
    cart.items = [
      cartItem({ productId: "p1", name: "Mug", price: 250, quantity: 2 }),
      cartItem({ productId: "p2", name: "Brownie", price: 80, businessId: "biz-b", businessName: "Bake Co" }),
    ];

    const html = render(OrderFormPage);

    expect(html).toContain("Alpha Crafts");
    expect(html).toContain("Mug (x2)");
    expect(html).not.toContain("Brownie");
    expect(html).toMatch(/Total Due<\/span><span[^>]*>Rs\.500\.00/);
  });

  it("has labelled inputs, with name, phone and location required", () => {
    cart.businessId = "biz-a";
    const html = render(OrderFormPage);

    for (const id of ["buyerName", "buyerPhone", "deliveryLocation"]) {
      expect(html).toContain(`for="${id}"`);
      expect(html).toMatch(new RegExp(`id="${id}"[^>]*required`));
    }
    expect(html).toContain('for="messageToEntrepreneur"');
    expect(html).not.toMatch(/id="messageToEntrepreneur"[^>]*required/);
  });

  it("falls back to a generic name and Rs.0.00 when the cart has nothing for this business", () => {
    cart.businessId = "biz-unknown";
    cart.items = [cartItem()];

    const html = render(OrderFormPage);

    expect(html).toContain("this business");
    expect(html).toMatch(/Total Due<\/span><span[^>]*>Rs\.0\.00/);
  });
});

// A seller with products, ready to be ordered from.
async function shop({ stockQuantity = 10 } = {}) {
  const seller = await createEntrepreneur();
  const businessId = seller.entrepreneurProfile!.business!.id;
  const mug = await createProduct(businessId, { price: 250, stockQuantity });
  const lamp = await createProduct(businessId, { price: 1200.5, stockQuantity });
  return { seller, businessId, mug, lamp };
}

function orderBody(businessId: string, items: { productId: string; quantity: number }[], extra: object = {}) {
  return {
    businessId,
    buyerName: "Nimal Perera",
    buyerPhone: "+94 77 123 4567",
    deliveryLocation: "Main library entrance",
    messageToEntrepreneur: "Please bring change",
    items,
    ...extra,
  };
}

const order = (body: unknown) => placeOrder(jsonRequest("/api/orders", "POST", body));
const stockOf = async (id: string) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stockQuantity;

describe("POST /api/orders (checkout)", () => {
  it("creates the order with database prices, reserves stock and notifies the seller", async () => {
    const { seller, businessId, mug, lamp } = await shop();

    const response = await order(
      // A price sent by the browser is not part of the schema at all.
      orderBody(businessId, [
        { productId: mug.id, quantity: 2 },
        { productId: lamp.id, quantity: 1 },
      ])
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.accessToken).toMatch(/^[a-f0-9]{48}$/);

    const saved = await prisma.order.findUniqueOrThrow({ where: { id: body.orderId }, include: { items: true } });
    expect(Number(saved.totalAmount)).toBe(1700.5);
    expect(saved).toMatchObject({ status: "PENDING", buyerName: "Nimal Perera", businessId });
    expect(saved.items).toHaveLength(2);
    expect(await stockOf(mug.id)).toBe(8);
    expect(await stockOf(lamp.id)).toBe(9);
    expect(await prisma.notification.count({ where: { userId: seller.id, type: "ORDER" } })).toBe(1);
  });

  it("refuses a browser-supplied price (400)", async () => {
    const { businessId, mug } = await shop();
    const response = await order(orderBody(businessId, [{ productId: mug.id, quantity: 1, price: 1 } as never]));
    expect(response.status).toBe(400);
  });

  it("refuses more than the stock (409) and reserves nothing", async () => {
    const { businessId, mug, lamp } = await shop({ stockQuantity: 2 });

    const response = await order(
      orderBody(businessId, [
        { productId: mug.id, quantity: 1 },
        { productId: lamp.id, quantity: 3 },
      ])
    );

    expect(response.status).toBe(409);
    expect(await stockOf(mug.id)).toBe(2);
    expect(await stockOf(lamp.id)).toBe(2);
    expect(await prisma.order.count()).toBe(0);
  });

  it("refuses products from another business, unapproved products, and unknown products (400)", async () => {
    const { businessId, mug } = await shop();
    const other = await shop();
    const pending = await createProduct(businessId, { status: "PENDING" });

    for (const productId of [other.mug.id, pending.id, "nope"]) {
      const response = await order(orderBody(businessId, [{ productId, quantity: 1 }]));
      expect(response.status).toBe(400);
    }
    expect(await stockOf(mug.id)).toBe(10);
    expect(await prisma.order.count()).toBe(0);
  });

  it("refuses orders from a seller whose registration isn't approved (400)", async () => {
    const seller = await createEntrepreneur("PENDING");
    const businessId = seller.entrepreneurProfile!.business!.id;
    const product = await createProduct(businessId);

    expect((await order(orderBody(businessId, [{ productId: product.id, quantity: 1 }]))).status).toBe(400);
  });

  it.each([
    ["missing name", { buyerName: "  " }],
    ["missing location", { deliveryLocation: "" }],
    ["invalid phone", { buyerPhone: "call me" }],
    ["no items", { items: [] }],
    ["zero quantity", { items: [{ productId: "p", quantity: 0 }] }],
    ["fractional quantity", { items: [{ productId: "p", quantity: 1.5 }] }],
    ["unknown field", { couponCode: "FREE" }],
  ])("rejects %s with 400", async (_label, extra) => {
    const { businessId, mug } = await shop();
    const response = await order(orderBody(businessId, [{ productId: mug.id, quantity: 1 }], extra));

    expect(response.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it("refuses the same product twice in one order (400)", async () => {
    const { businessId, mug } = await shop();
    const response = await order(
      orderBody(businessId, [
        { productId: mug.id, quantity: 1 },
        { productId: mug.id, quantity: 1 },
      ])
    );
    expect(response.status).toBe(400);
  });

  it("allows 10 orders per hour from one device, then returns 429", async () => {
    const { businessId, mug } = await shop({ stockQuantity: 100 });
    const body = orderBody(businessId, [{ productId: mug.id, quantity: 1 }]);

    for (let i = 0; i < 10; i++) expect((await order(body)).status).toBe(201);
    const blocked = await order(body);

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    expect(await prisma.order.count()).toBe(10);
  });
});

describe("GET /api/orders/[orderId] (after checkout)", () => {
  it("shows the order only with the buyer's access token", async () => {
    const { businessId, mug } = await shop();
    const { orderId, accessToken } = await (
      await order(orderBody(businessId, [{ productId: mug.id, quantity: 2 }]))
    ).json();

    const lookup = (token: string) =>
      getOrder(jsonRequest(`/api/orders/${orderId}?token=${token}`, "GET"), routeParams({ orderId }));

    const ok = await lookup(accessToken);
    expect(ok.status).toBe(200);
    expect((await ok.json()).order).toMatchObject({ id: orderId, entrepreneurWhatsApp: "0771234567" });

    expect((await lookup("")).status).toBe(404);
    expect((await lookup("0".repeat(48))).status).toBe(404);
  });
});
