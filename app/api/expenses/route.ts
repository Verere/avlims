import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/mongodb';
import Expense from '../../../models/Expense';

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

    const businessDate = body.businessDate ? new Date(body.businessDate) : new Date();
    if (Number.isNaN(businessDate.getTime())) {
      return NextResponse.json({ error: 'Invalid businessDate' }, { status: 400 });
    }

    const expense = await Expense.create({
      labId: body.labId,
      branchId: body.branchId,
      amount,
      description: body.description,
      category: body.category || 'general',
      businessDate,
      user: body.user || undefined,
      note: body.note || undefined,
      isCancelled: false,
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

    if (!labId && !branchId) {
      return NextResponse.json({ error: 'Either labId or branchId is required' }, { status: 400 });
    }

    const start = date ? new Date(`${date}T00:00:00.000Z`) : new Date();
    if (!date) start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

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
