import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    animal: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    weighing: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    sale: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../src/server/db", () => ({ prisma: prismaMock }));

import { listAnimals, createAnimal } from "../src/server/services/animals";
import { listWeighings, recordWeighing } from "../src/server/services/weighings";
import { createSale, listSales } from "../src/server/services/sales";

const farmA = "11111111-1111-4111-8111-111111111111";
const farmB = "22222222-2222-4222-8222-222222222222";
const animalA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const context = (farmId: string, role: "OWNER" | "READER" = "OWNER") => ({
  userId: "99999999-9999-4999-8999-999999999999",
  farmId,
  organizationId: "33333333-3333-4333-8333-333333333333",
  role,
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
});

describe("farm isolation", () => {
  it("always scopes animal listing to the session farm", async () => {
    prismaMock.animal.findMany.mockResolvedValue([]);

    await listAnimals(context(farmA), "ear");

    expect(prismaMock.animal.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ farmId: farmA, deletedAt: null }),
    }));
    expect(prismaMock.animal.findMany.mock.calls[0][0].where.farmId).not.toBe(farmB);
  });

  it("writes a new animal into the session farm, regardless of input", async () => {
    prismaMock.animal.create.mockResolvedValue({ id: animalA, farmId: farmA });

    await createAnimal(context(farmA), {
      internalId: "A-001",
      breed: "Nelore",
      sex: "FEMALE",
      category: "VACA",
      origin: "BORN_ON_FARM",
    });

    expect(prismaMock.animal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ farmId: farmA }),
    }));
  });

  it("rejects a weighing for an animal belonging to another farm", async () => {
    prismaMock.animal.findFirst.mockResolvedValue(null);

    await expect(recordWeighing(context(farmA), {
      animalId: animalA,
      date: "2026-09-23",
      weightKg: 420,
      type: "ROUTINE",
    })).rejects.toThrow("NOT_FOUND");

    expect(prismaMock.animal.findFirst).toHaveBeenCalledWith({
      where: { id: animalA, farmId: farmA, deletedAt: null },
    });
    expect(prismaMock.weighing.create).not.toHaveBeenCalled();
  });

  it("rejects a sale when any animal is outside the session farm", async () => {
    prismaMock.animal.findMany.mockResolvedValue([]);

    await expect(createSale(context(farmA), {
      date: "2026-09-23",
      buyerName: "Comprador",
      priceMode: "PER_HEAD",
      totalAmount: 1000000,
      items: [{ animalId: animalA, unitPrice: 1000000, lineTotal: 1000000 }],
    })).rejects.toThrow("ANIMAL_NOT_AVAILABLE");

    expect(prismaMock.animal.findMany).toHaveBeenCalledWith({
      where: { id: { in: [animalA] }, farmId: farmA, deletedAt: null, status: "ACTIVE" },
    });
    expect(prismaMock.sale.create).not.toHaveBeenCalled();
  });

  it("scopes weighing and sales listings to the session farm", async () => {
    prismaMock.weighing.findMany.mockResolvedValue([]);
    prismaMock.sale.findMany.mockResolvedValue([]);

    await listWeighings(context(farmB));
    await listSales(context(farmB));

    expect(prismaMock.weighing.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ farmId: farmB }),
    }));
    expect(prismaMock.sale.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ farmId: farmB }),
    }));
  });
});
