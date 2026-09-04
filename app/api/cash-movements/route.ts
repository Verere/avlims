import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { writeAuditLog } from "@/lib/audit";
import { dbConnect } from "@/lib/mongodb";
import BillPayment from "@/models/BillPayment";
import CashMovement from "@/models/CashMovement";
import Expense from "@/models/Expense";
import LabMembership from "@/models/LabMembership";
import Payment from "@/models/Payment";

const MOVEMENT_TYPES = ["cash_to_bank", "bank_to_cash"] as const;

function getBusinessDay(value: unknown): string | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

async function getAvailableCash(branchId: string, businessDate: Date) {
  const date = businessDate.toISOString().slice(0, 10);
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  const [payments, billPayments, expenses, movements] = await Promise.all([
    Payment.find({ branchId, isCancelled: { $ne: true }, status: "completed" }).select("businessDate createdAt payments").lean(),
    BillPayment.find({ branchId, isCancelled: { $ne: true }, status: "posted", createdAt: { $gte: start, $lte: end } }).select("lines").lean(),
    Expense.find({ branchId, isCancelled: { $ne: true }, businessDate: { $gte: start, $lte: end } }).select("amount paymentMethod").lean(),
    CashMovement.find({ branchId, businessDate: { $gte: start, $lte: end } }).select("amount type").lean(),
  ]);

  const cashPayments = payments.reduce((total, payment: any) => {
    if (getBusinessDay(payment.businessDate || payment.createdAt) !== date) return total;
    return total + (payment.payments || []).reduce((sum: number, line: any) =>
      String(line?.method || "").toLowerCase() === "cash" ? sum + Number(line?.amount || 0) : sum,
    0);
  }, 0);
  const billPaymentCash = billPayments.reduce((total, payment: any) => total + (payment.lines || []).reduce((sum: number, line: any) =>
    String(line?.method || "").toLowerCase() === "cash" ? sum + Number(line?.amount || 0) : sum,
  0), 0);
  const cashExpenses = expenses.reduce((total, expense: any) =>
    String(expense.paymentMethod || "").toLowerCase() === "cash" ? total + Number(expense.amount || 0) : total,
  0);
  const cashBanked = movements.reduce((total, movement: any) =>
    movement.type === "cash_to_bank" ? total + Number(movement.amount || 0) : total,
  0);
  const cashReturnedFromBank = movements.reduce((total, movement: any) =>
    movement.type === "bank_to_cash" ? total + Number(movement.amount || 0) : total,
  0);

  return cashPayments + billPaymentCash - cashExpenses - cashBanked + cashReturnedFromBank;
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const userId = String(token?.id || "");
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = request.nextUrl.searchParams.get("branchId");
  const date = request.nextUrl.searchParams.get("date");

  if (!branchId) {
    return NextResponse.json({ error: "branchId is required" }, { status: 400 });
  }
  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    return NextResponse.json({ error: "Invalid branchId" }, { status: 400 });
  }

  const filter: Record<string, unknown> = { branchId };
  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
    }
    filter.businessDate = { $gte: start, $lte: end };
  }

  await dbConnect();
  const membership = await LabMembership.exists({ user: userId, branchId, status: "active" });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const movements = await CashMovement.find(filter)
    .populate("createdBy", "name email")
    .sort({ businessDate: -1, createdAt: -1 })
    .lean();
  return NextResponse.json(movements);
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const createdBy = String(token?.id || "");
  if (!mongoose.Types.ObjectId.isValid(createdBy)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const branchId = String(body?.branchId || "").trim();
    const type = String(body?.type || "").trim();
    const amount = Number(body?.amount || 0);
    const businessDate = body?.businessDate ? new Date(body.businessDate) : null;

    if (!branchId || !body?.businessDate || !type) {
      return NextResponse.json({ error: "branchId, businessDate and type are required" }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return NextResponse.json({ error: "Invalid branchId" }, { status: 400 });
    }
    if (!MOVEMENT_TYPES.includes(type as (typeof MOVEMENT_TYPES)[number])) {
      return NextResponse.json({ error: "type must be cash_to_bank or bank_to_cash" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount must be greater than zero" }, { status: 400 });
    }
    if (!businessDate || Number.isNaN(businessDate.getTime())) {
      return NextResponse.json({ error: "Invalid businessDate" }, { status: 400 });
    }

    await dbConnect();
    const membership = await LabMembership.exists({ user: createdBy, branchId, status: "active" });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (type === "cash_to_bank") {
      const availableCash = await getAvailableCash(branchId, businessDate);
      if (amount > availableCash) {
        return NextResponse.json({ error: "Insufficient cash available for this bank deposit." }, { status: 400 });
      }
    }

    const movement = await CashMovement.create({
      branchId,
      businessDate,
      type,
      amount,
      bankName: body?.bankName ? String(body.bankName) : undefined,
      reference: body?.reference ? String(body.reference) : undefined,
      note: body?.note ? String(body.note) : undefined,
      createdBy,
    });

    await writeAuditLog(request, {
      action: "create",
      entityType: "CashMovement",
      entityId: movement._id,
      branchId,
      changes: { type, amount, bankName: movement.bankName, reference: movement.reference },
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Failed to record cash movement" }, { status: 500 });
  }
}