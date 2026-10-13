import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/mongodb';
import Expense from '../../../models/Expense';
import { writeAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();

    const required = ['labId', 'branchId', 'amount', 'description'];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'amount must be a valid number >= 0' }, { status: 400 });
    }

    const paymentMethod = String(body.paymentMethod || 'cash').toLowerCase();
    if (!['cash', 'transfer', 'pos', 'other'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'paymentMethod must be cash, transfer, pos, or other' }, { status: 400 });
    }

    const businessDate = body.businessDate ? new Date(body.businessDate) : new Date();
    if (Number.isNaN(businessDate.getTime())) {
      return NextResponse.json({ error: 'Invalid businessDate' }, { status: 400 });
    }

    const expense = await Expense.create({
      labId: body.labId,
      branchId: body.branchId,
      amount,
      paymentMethod,
      description: body.description,
      category: body.category || 'general',
      businessDate,
      user: body.user || undefined,
      note: body.note || undefined,
      isCancelled: false,
    });

    await writeAuditLog(req, {
      action: 'create',
      entityType: 'Expense',
      entityId: expense._id,
      labId: body.labId,
      branchId: body.branchId,
      changes: { amount, paymentMethod, description: body.description, category: body.category || 'general' },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const labId = req.nextUrl.searchParams.get('labId');
    const branchId = req.nextUrl.searchParams.get('branchId');
    const date = req.nextUrl.searchParams.get('date');
    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');

    if (!labId && !branchId) {
      return NextResponse.json({ error: 'Either labId or branchId is required' }, { status: 400 });
    }

    let start: Date;
    let end: Date;
    if (from || to) {
      const startDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
      const endDate = to ? new Date(`${to}T00:00:00.000Z`) : null;
      if (
        !from ||
        !to ||
        Number.isNaN(startDate?.getTime()) ||
        Number.isNaN(endDate?.getTime()) ||
        startDate?.toISOString().slice(0, 10) !== from ||
        endDate?.toISOString().slice(0, 10) !== to
      ) {
        return NextResponse.json({ error: 'Valid from and to dates are required. Use YYYY-MM-DD' }, { status: 400 });
      }
      if (startDate > endDate) {
        return NextResponse.json({ error: 'from date must be before or equal to to date' }, { status: 400 });
      }
      start = startDate;
      end = new Date(endDate);
      end.setUTCDate(end.getUTCDate() + 1);
    } else {
      if (date) {
        start = new Date(`${date}T00:00:00.000Z`);
        if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== date) {
          return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
        }
      } else {
        start = new Date();
        start.setHours(0, 0, 0, 0);
      }
      end = new Date(start);
      if (date) end.setUTCDate(start.getUTCDate() + 1);
      else end.setDate(start.getDate() + 1);
    }

    const query: any = {
      isCancelled: false,
      businessDate: { $gte: start, $lt: end },
    };
    if (branchId) query.branchId = branchId;
    if (labId) query.labId = labId;

    const expenses = await Expense.find(query)
      .sort({ businessDate: -1, createdAt: -1 })
      .lean();

    const totalExpenses = expenses.reduce((sum, row: any) => sum + Number(row?.amount || 0), 0);

    return NextResponse.json(
      {
        totalExpenses,
        count: expenses.length,
        expenses,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    const id = String(body?.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Expense id is required" }, { status: 400 });
    }

    const expense = await Expense.findByIdAndUpdate(id, { isCancelled: true }, { new: true });
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await writeAuditLog(req, {
      action: "delete",
      entityType: "Expense",
      entityId: expense._id,
      labId: expense.labId,
      branchId: expense.branchId,
      changes: { description: expense.description, amount: expense.amount, isCancelled: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Failed to delete expense" }, { status: 500 });
  }
}
