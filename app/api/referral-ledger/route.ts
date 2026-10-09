
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getToken } from 'next-auth/jwt';
import { dbConnect } from '@/lib/mongodb';
import ReferralLedger from '@/models/ReferralLedger';
import Referrer from '@/models/Referrer';
import Order from '@/models/Order';
import AuditLog from '@/models/AuditLog';
import Lab from '@/models/Lab';

function nextDate(dateValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateValue) return null;
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const fromDate = req.nextUrl.searchParams.get('fromDate');
    const toDate = req.nextUrl.searchParams.get('toDate');
    const date = req.nextUrl.searchParams.get('date');
    const status = req.nextUrl.searchParams.get('status');
    const includeCancelled = req.nextUrl.searchParams.get('includeCancelled') === 'true';

    if (!branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    const filter: any = { branchId };
    if (!includeCancelled) {
      filter.isCancelled = { $ne: true };
    }
    if (status === 'pending' || status === 'paid' || status === 'cancelled') {
      filter.status = status;
    }

    // Support both date-range (fromDate/toDate) and single-date (date) filtering
    if (fromDate && toDate) {
      const dayAfterToDate = nextDate(toDate);
      if (!nextDate(fromDate) || !dayAfterToDate || fromDate > toDate) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
      }
      filter.businessDate = { $gte: fromDate, $lt: dayAfterToDate };
    } else if (date) {
      const dayAfterDate = nextDate(date);
      if (!dayAfterDate) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
      }
      filter.businessDate = { $gte: date, $lt: dayAfterDate };
    }

    const rows = await ReferralLedger.find(filter)
      .populate({ path: 'referrer', select: 'name phone', model: Referrer })
      .populate({ path: 'testOrder', select: 'name transId', model: Order })
      .sort({ businessDate: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching referral ledger:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    // Validate required fields. Zero values are valid for amount/bonus and must not be rejected.
    const required = ['order', 'referrer', 'amount', 'branchId', 'lab', 'user'];
    for (const field of required) {
      const value = body?.[field];
      if (value === undefined || value === null || value === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const bonusValue = Number(body?.bonus ?? 0);
    const amountValue = Number(body?.amount ?? 0);

    // Create referral ledger entry
    const tests = Array.isArray(body.tests)
      ? body.tests
          .filter((t: any) => t && t.testId && t.testName)
          .map((t: any) => ({
            testId: String(t.testId),
            testName: String(t.testName),
            panelId: t.panelId ? String(t.panelId) : undefined,
            panelName: t.panelName ? String(t.panelName) : undefined,
            quantity: Number(t.quantity || 1),
            amount: Number(t.amount || 0),
            bonus: Number(t.bonus || 0),
          }))
      : [];

    const ledger = await ReferralLedger.create({
      testOrder: body.order, // maps to testOrder in schema
      referrer: body.referrer,
      tests,
      amount: amountValue,
      bonus: bonusValue,
      branchId: body.branchId,
      lab: body.lab,
      status: body.status || 'pending',
      user: body.user,
      businessDate: body.businessDate,
    });
    return NextResponse.json(ledger, { status: 201 });
  } catch (error) {
    console.error('Error creating referral ledger entry:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();

    if (body?.action === 'markReferrerPendingPaid') {
      const branchId = String(body.branchId || '').trim();
      const referrerId = String(body.referrerId || '').trim();
      const targetStatus = body.targetStatus || 'paid';
      if (targetStatus !== 'pending' && targetStatus !== 'paid') {
        return NextResponse.json({ error: 'targetStatus must be pending or paid' }, { status: 400 });
      }
      const sourceStatus = targetStatus === 'paid' ? 'pending' : 'paid';
      const ledgerIds: string[] = Array.isArray(body.ledgerIds)
        ? Array.from(new Set<string>(body.ledgerIds.map((id: unknown) => String(id || '').trim())))
        : [];

      if (!mongoose.Types.ObjectId.isValid(branchId) || !mongoose.Types.ObjectId.isValid(referrerId)) {
        return NextResponse.json({ error: 'Valid branchId and referrerId are required' }, { status: 400 });
      }
      if (ledgerIds.length === 0 || ledgerIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return NextResponse.json({ error: 'Valid fetched ledgerIds are required' }, { status: 400 });
      }

      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      const actorId = mongoose.Types.ObjectId.isValid(String(token?.id || ''))
        ? new mongoose.Types.ObjectId(String(token?.id))
        : undefined;
      const forwardedFor = req.headers.get('x-forwarded-for');
      const session = await mongoose.startSession();
      let updatedLedgerIds: string[] = [];

      try {
        await session.withTransaction(async () => {
          const pendingLedgers = await ReferralLedger.find({
            _id: { $in: ledgerIds },
            branchId,
            referrer: referrerId,
            status: sourceStatus,
            isCancelled: { $ne: true },
          }).session(session);

          for (const ledger of pendingLedgers) {
            ledger.status = targetStatus;
            await ledger.save({ session });
          }

          if (pendingLedgers.length > 0) {
            await AuditLog.create(
              pendingLedgers.map((ledger) => ({
                action: 'status_change',
                entityType: 'ReferralLedger',
                entityId: String(ledger._id),
                actorId,
                actorName: typeof token?.name === 'string' ? token.name : undefined,
                actorEmail: typeof token?.email === 'string' ? token.email : undefined,
                labId: ledger.lab,
                branchId: ledger.branchId,
                changes: { status: { from: sourceStatus, to: targetStatus } },
                metadata: {
                  referrerId: String(ledger.referrer),
                  amount: ledger.amount,
                  bonus: ledger.bonus,
                  testOrderId: String(ledger.testOrder),
                },
                requestMethod: req.method,
                requestPath: req.nextUrl.pathname,
                ipAddress: forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined,
                userAgent: req.headers.get('user-agent') || undefined,
              })),
              { session, ordered: true }
            );
          }

          updatedLedgerIds = pendingLedgers.map((ledger) => String(ledger._id));
        });
      } finally {
        await session.endSession();
      }

      return NextResponse.json({
        success: true,
        updatedCount: updatedLedgerIds.length,
        updatedLedgerIds,
      });
    }

    if (body?.action === 'recalculatePending') {
      const branchId = String(body.branchId || '').trim();
      const referrerId = String(body.referrerId || '').trim();
      const testId = String(body.testId || '').trim();
      const percentage = Number(body.percentage);
      const fromDate = String(body.fromDate || '').trim();
      const toDate = String(body.toDate || '').trim();
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return NextResponse.json({ error: 'A valid branchId is required' }, { status: 400 });
      }
      if (referrerId && !mongoose.Types.ObjectId.isValid(referrerId)) {
        return NextResponse.json({ error: 'A valid referrerId is required' }, { status: 400 });
      }
      if (testId && !mongoose.Types.ObjectId.isValid(testId)) {
        return NextResponse.json({ error: 'A valid testId is required' }, { status: 400 });
      }
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        return NextResponse.json({ error: 'Percentage must be between 0 and 100' }, { status: 400 });
      }
      const dayAfterToDate = nextDate(toDate);
      if (!nextDate(fromDate) || !dayAfterToDate || fromDate > toDate) {
        return NextResponse.json({ error: 'A valid fromDate and toDate range is required' }, { status: 400 });
      }

      let createdCount = 0;
      const [orders, referrers] = await Promise.all([
        Order.find({
          branchId,
          isCancelled: { $ne: true },
          bDate: { $gte: fromDate, $lt: dayAfterToDate },
        }).lean(),
        Referrer.find({
          branchId,
          isCancelled: { $ne: true },
          ...(referrerId ? { _id: referrerId } : {}),
        }).select('_id name').lean(),
      ]);
      if (referrerId && referrers.length === 0) {
        return NextResponse.json({ error: 'Referrer not found for this branch' }, { status: 404 });
      }

      const referrersById = new Map(referrers.map((referrer) => [String(referrer._id), referrer]));
      const referrersByName = new Map(
        referrers.map((referrer) => [String(referrer.name || '').trim().toLocaleLowerCase(), referrer])
      );
      const referredOrders = orders.flatMap((order) => {
        const referralName = String(order.referral || '').trim();
        const matchedReferrer = referrersById.get(String(order.referralId || ''))
          || (['', 'walk-in', 'walkin', 'walk in'].includes(referralName.toLocaleLowerCase())
            ? undefined
            : referrersByName.get(referralName.toLocaleLowerCase()));
        return matchedReferrer ? [{ order, referrer: matchedReferrer }] : [];
      });

      if (referredOrders.length > 0) {
        const existingOrderIds = await ReferralLedger.distinct('testOrder', {
          branchId,
          testOrder: { $in: referredOrders.map(({ order }) => order._id) },
        });
        const existingIds = new Set(existingOrderIds.map((id) => String(id)));
        const missingOrders = referredOrders.filter(({ order }) => !existingIds.has(String(order._id)));

        if (missingOrders.length > 0) {
          const labSlugs = Array.from(new Set(missingOrders.map(({ order }) => String(order.slug || '')).filter(Boolean)));
          const labs = await Lab.find({ slug: { $in: labSlugs } }).select('_id slug').lean();
          const labIdsBySlug = new Map(labs.map((lab) => [lab.slug, lab._id]));
          if (missingOrders.some(({ order }) => !labIdsBySlug.has(String(order.slug || '')))) {
            return NextResponse.json({ error: 'One or more matching orders have no valid lab record' }, { status: 400 });
          }

          const newLedgers = missingOrders.flatMap(({ order, referrer }) => {
            const labId = labIdsBySlug.get(String(order.slug || ''));
            if (!labId) throw new Error('A matching order is missing its lab record');

            const tests: Array<{
              testId: string;
              testName: string;
              panelId?: string;
              panelName?: string;
              quantity: number;
              amount: number;
              bonus: number;
            }> = [];
            const seenPanels = new Set<string>();
            for (const item of Array.isArray(order.tests) ? order.tests : []) {
              const panelId = String(item?.panel?.id || '');
              if (panelId) {
                if (seenPanels.has(panelId)) continue;
                seenPanels.add(panelId);
                const amount = Number(item.panel.price || 0);
                tests.push({
                  testId: panelId,
                  testName: String(item.panel.name || item.name || 'Panel'),
                  panelId,
                  panelName: String(item.panel.name || item.name || 'Panel'),
                  quantity: 1,
                  amount,
                  bonus: !testId || testId === panelId
                    ? Math.round((amount * percentage / 100 + Number.EPSILON) * 100) / 100
                    : 0,
                });
                continue;
              }

              const name = String(item?.name || 'Test');
              const itemId = String(item?.id || name);
              const quantity = Math.max(1, Number(item?.quantity || 1));
              const amount = Number(item?.price || 0) * quantity;
              tests.push({
                testId: itemId,
                testName: name,
                quantity,
                amount,
                bonus: !testId || testId === itemId
                  ? Math.round((amount * percentage / 100 + Number.EPSILON) * 100) / 100
                  : 0,
              });
            }

            if (testId && !tests.some((test) => test.testId === testId)) return [];
            const bonus = tests.reduce((sum, test) => sum + test.bonus, 0);
            return [{
              lab: labId,
              referrer: referrer._id,
              testOrder: order._id,
              tests,
              amount: Number(order.amount ?? tests.reduce((sum, test) => sum + test.amount, 0)),
              bonus: tests.length > 0
                ? bonus
                : !testId
                  ? Math.round((Number(order.amount || 0) * percentage / 100 + Number.EPSILON) * 100) / 100
                  : 0,
              status: 'pending' as const,
              isCancelled: false,
              user: String(order.user || 'system'),
              branchId: order.branchId,
              businessDate: order.bDate,
            }];
          });

          if (newLedgers.length > 0) {
            await ReferralLedger.insertMany(newLedgers, { ordered: true });
            createdCount = newLedgers.length;
          }
        }
      }

      const pendingFilter: Record<string, unknown> = {
        branchId,
        status: 'pending',
        isCancelled: { $ne: true },
        businessDate: { $gte: fromDate, $lt: dayAfterToDate },
      };
      if (referrerId) pendingFilter.referrer = referrerId;
      if (testId) pendingFilter['tests.testId'] = testId;
      const pendingLedgers = await ReferralLedger.find(pendingFilter);

      for (const ledger of pendingLedgers) {
        if (Array.isArray(ledger.tests) && ledger.tests.length > 0) {
          for (const test of ledger.tests) {
            if (testId && test.testId !== testId) continue;
            const amount = Number(test.amount || 0);
            test.bonus = Math.round((amount * percentage / 100 + Number.EPSILON) * 100) / 100;
          }
          ledger.bonus = ledger.tests.reduce((sum: number, test: any) => sum + Number(test.bonus || 0), 0);
        } else if (!testId) {
          const amount = Number(ledger.amount || 0);
          ledger.bonus = Math.round((amount * percentage / 100 + Number.EPSILON) * 100) / 100;
        } else {
          continue;
        }
        await ledger.save();
      }

      return NextResponse.json({
        success: true,
        updatedCount: pendingLedgers.length,
        createdCount,
        percentage,
        referrerId: referrerId || undefined,
        testId: testId || undefined,
      });
    }

    const ledgerId = body?.id || body?._id;
    const testIndex = Number(body?.testIndex ?? -1);
    const newBonus = Number(body?.bonus ?? 0);

    if (!ledgerId) {
      return NextResponse.json({ error: 'Ledger id is required' }, { status: 400 });
    }

    const ledger = await ReferralLedger.findById(ledgerId);
    if (!ledger) {
      return NextResponse.json({ error: 'Referral ledger not found' }, { status: 404 });
    }

    if (Array.isArray(ledger.tests) && Number.isInteger(testIndex) && testIndex >= 0 && testIndex < ledger.tests.length) {
      ledger.tests[testIndex].bonus = Number.isFinite(newBonus) ? Math.max(0, newBonus) : Number(ledger.tests[testIndex].bonus || 0);
    } else {
      return NextResponse.json({ error: 'Invalid test index' }, { status: 400 });
    }

    ledger.bonus = Number(ledger.tests.reduce((sum: number, item: any) => sum + Number(item.bonus || 0), 0));
    await ledger.save();

    return NextResponse.json({ success: true, ledger: ledger.toObject() }, { status: 200 });
  } catch (error) {
    console.error('Error updating referral ledger bonus:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
