import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { writeAuditLog } from "@/lib/audit";
import { dbConnect } from "@/lib/mongodb";
import BillPayment from "@/models/BillPayment";
import CashMovement from "@/models/CashMovement";
import EndOfDayClosing from "@/models/EndOfDayClosing";
import Expense from "@/models/Expense";
import LabMembership from "@/models/LabMembership";
import Payment from "@/models/Payment";

function getBusinessDay(value: unknown): string | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function getDayRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  return { start, end };
}

async function authorizeBranch(request: NextRequest, branchId: string) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const userId = String(token?.id || "");
  if (!mongoose.Types.ObjectId.isValid(userId)) return { error: "Unauthorized", status: 401 as const };
  if (!mongoose.Types.ObjectId.isValid(branchId)) return { error: "Invalid branchId", status: 400 as const };

  const membership = await LabMembership.exists({ user: userId, branchId, status: "active" });
  if (!membership) return { error: "Forbidden", status: 403 as const };
  return { userId };
}

async function calculateExpectedCash(branchId: string, businessDate: string) {
  const { start, end } = getDayRange(businessDate);
  const [payments, billPayments, expenses, cashMovements] = await Promise.all([
    Payment.find({ branchId, isCancelled: { $ne: true }, status: "completed" }).select("businessDate createdAt payments").lean(),
    BillPayment.find({ branchId, isCancelled: { $ne: true }, status: "posted", createdAt: { $gte: start, $lte: end } }).select("lines").lean(),
    Expense.find({ branchId, isCancelled: { $ne: true }, businessDate: { $gte: start, $lte: end } }).select("amount paymentMethod").lean(),
    CashMovement.find({ branchId, businessDate: { $gte: start, $lte: end } }).select("amount type").lean(),
  ]);

  const paymentCash = payments.reduce((total, payment: any) => {
    if (getBusinessDay(payment.businessDate || payment.createdAt) !== businessDate) return total;
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
  const cashBanked = cashMovements.reduce((total, movement: any) =>
    movement.type === "cash_to_bank" ? total + Number(movement.amount || 0) : total,
  0);
  const cashReturnedFromBank = cashMovements.reduce((total, movement: any) =>
    movement.type === "bank_to_cash" ? total + Number(movement.amount || 0) : total,
  0);

  return paymentCash + billPaymentCash - cashExpenses - cashBanked + cashReturnedFromBank;
}

export async function GET(request: NextRequest) {
  const branchId = request.nextUrl.searchParams.get("branchId") || "";
  const businessDate = request.nextUrl.searchParams.get("businessDate") || request.nextUrl.searchParams.get("date") || "";
  if (!branchId || !businessDate) return NextResponse.json({ error: "branchId and businessDate are required" }, { status: 400 });
  if (!getBusinessDay(businessDate)) return NextResponse.json({ error: "Invalid businessDate. Use YYYY-MM-DD" }, { status: 400 });

  await dbConnect();
  const authorization = await authorizeBranch(request, branchId);
  if ("error" in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { start, end } = getDayRange(businessDate);
  const closing = await EndOfDayClosing.findOne({ branchId, businessDate: { $gte: start, $lte: end } }).lean();
  return NextResponse.json(closing || null);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const branchId = String(body?.branchId || "").trim();
    const businessDate = String(body?.businessDate || "").trim();
    const actualCashCounted = Number(body?.actualCashCounted);
    if (!branchId || !businessDate || body?.actualCashCounted === undefined) {
      return NextResponse.json({ error: "branchId, businessDate and actualCashCounted are required" }, { status: 400 });
    }
    if (!getBusinessDay(businessDate)) return NextResponse.json({ error: "Invalid businessDate. Use YYYY-MM-DD" }, { status: 400 });
    if (!Number.isFinite(actualCashCounted) || actualCashCounted < 0) {
      return NextResponse.json({ error: "actualCashCounted must be a valid non-negative number" }, { status: 400 });
    }

    await dbConnect();
    const authorization = await authorizeBranch(request, branchId);
    if ("error" in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });

    const { start, end } = getDayRange(businessDate);
    const existing = await EndOfDayClosing.exists({ branchId, businessDate: { $gte: start, $lte: end } });
    if (existing) return NextResponse.json({ error: "End Of Day has already been closed for this branch and date" }, { status: 409 });

    const expectedCashAtHand = await calculateExpectedCash(branchId, businessDate);
    const cashDifference = actualCashCounted - expectedCashAtHand;
    const status = cashDifference === 0 ? "balanced" : cashDifference > 0 ? "cash_over" : "cash_short";
    const closing = await EndOfDayClosing.create({
      branchId,
      businessDate: start,
      expectedCashAtHand,
      actualCashCounted,
      cashDifference,
      status,
      closedBy: authorization.userId,
      closedAt: new Date(),
    });

    await writeAuditLog(request, {
      action: "create",
      entityType: "EndOfDayClosing",
      entityId: closing._id,
      branchId,
      changes: { businessDate, expectedCashAtHand, actualCashCounted, cashDifference, status },
    });
    return NextResponse.json(closing, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "End Of Day has already been closed for this branch and date" }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || "Failed to close End Of Day" }, { status: 500 });
  }
}