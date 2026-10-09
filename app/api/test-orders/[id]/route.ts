import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Order from "@/models/Order";
import mongoose from "mongoose";
import Bill from "@/models/Bill";
import BillPayment from "@/models/BillPayment";
import Payment from "@/models/Payment";
import ReferralLedger from "@/models/ReferralLedger";
import { getToken } from "next-auth/jwt";
import Referrer from "@/models/Referrer";
import Lab from "@/models/Lab";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  try {
    const { id } = await context.params;
    const order = await Order.findById(id).lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  try {
    const { id } = await context.params;
    const body = await req.json();

    const update: Record<string, any> = {};

    if (typeof body.referral === "string") {
      update.referral = body.referral.trim();
    } else if (typeof body.referrer === "string") {
      update.referral = body.referrer.trim();
    }

    if (typeof body.referralId === "string") {
      update.referralId = body.referralId;
    } else if (typeof body.referrerId === "string") {
      update.referralId = body.referrerId;
    }

    if (body.cancelOrder === true) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
      }

      const orderObjectId = new mongoose.Types.ObjectId(id);
      const orderIdMatchers = [orderObjectId, id];
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      const cancelledBy = typeof token?.name === "string"
        ? token.name
        : typeof token?.email === "string"
          ? token.email
          : undefined;
      const cancelledAt = new Date();

      const session = await mongoose.startSession();
      try {
        let cancelledOrder: any = null;
        let billCount = 0;
        let billPaymentCount = 0;
        let paymentCount = 0;
        let referralLedgerCount = 0;

        await session.withTransaction(async () => {
          cancelledOrder = await Order.findByIdAndUpdate(
            id,
            { $set: {
              isCancelled: true,
              status: "cancelled",
              cancelledAt,
              ...(cancelledBy ? { cancelledBy } : {}),
            } },
            { new: true, runValidators: true, session }
          ).lean();

          if (!cancelledOrder) {
            throw new Error("ORDER_NOT_FOUND");
          }

          const [billResult, billPaymentResult, paymentResult, referralLedgerResult] = await Promise.all([
            Bill.updateMany(
              { orderId: { $in: orderIdMatchers } },
              { $set: { isCancelled: true, isSettled: false } },
              { session }
            ),
            BillPayment.updateMany(
              { orderId: { $in: orderIdMatchers } },
              { $set: { isCancelled: true, status: "reversed" } },
              { session }
            ),
            Payment.updateMany(
              { orderId: { $in: orderIdMatchers } },
              { $set: { isCancelled: true, status: "failed" } },
              { session }
            ),
            ReferralLedger.updateMany(
              { testOrder: { $in: orderIdMatchers } },
              { $set: { isCancelled: true, status: 'cancelled' } },
              { session }
            ),
          ]);

          billCount = billResult.modifiedCount || 0;
          billPaymentCount = billPaymentResult.modifiedCount || 0;
          paymentCount = paymentResult.modifiedCount || 0;
          referralLedgerCount = referralLedgerResult.modifiedCount || 0;
        });

        return NextResponse.json(
          {
            success: true,
            order: cancelledOrder,
            cascaded: {
              bills: billCount,
              billPayments: billPaymentCount,
              payments: paymentCount,
              referralLedgers: referralLedgerCount,
            },
          },
          { status: 200 }
        );
      } catch (error: any) {
        if (error?.message === "ORDER_NOT_FOUND") {
          return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }
        return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
      } finally {
        await session.endSession();
      }
    }

    if (typeof update.referralId === "string" && update.referralId.trim()) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
      }
      if (!mongoose.Types.ObjectId.isValid(update.referralId)) {
        return NextResponse.json({ error: "Invalid referrer id" }, { status: 400 });
      }

      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token?.id) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }

      const session = await mongoose.startSession();
      let updatedOrder: unknown = null;
      let ledgerCreated = false;
      try {
        await session.withTransaction(async () => {
          const order = await Order.findById(id).session(session);
          if (!order) throw new Error("ORDER_NOT_FOUND");
          if (order.isCancelled) throw new Error("ORDER_CANCELLED");
          if (!order.branchId || !mongoose.Types.ObjectId.isValid(order.branchId)) {
            throw new Error("ORDER_BRANCH_MISSING");
          }
          if (!order.slug) throw new Error("ORDER_LAB_MISSING");

          const referrer = await Referrer.findOne({
            _id: update.referralId,
            branchId: order.branchId,
            isCancelled: { $ne: true },
          }).session(session);
          if (!referrer) throw new Error("REFERRER_NOT_FOUND");
          const lab = await Lab.findOne({ slug: order.slug }).select("_id").session(session);
          if (!lab) throw new Error("ORDER_LAB_NOT_FOUND");

          order.referralId = String(referrer._id);
          order.referral = referrer.name;
          await order.save({ session });
          updatedOrder = order.toObject();

          const existingLedger = await ReferralLedger.findOne({ testOrder: order._id }).session(session);
          if (existingLedger) {
            existingLedger.referrer = referrer._id;
            await existingLedger.save({ session });
            return;
          }

          const ledgerTests: Array<{
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
            const panelId = String(item?.panel?.id || "");
            if (panelId) {
              if (seenPanels.has(panelId)) continue;
              seenPanels.add(panelId);
              ledgerTests.push({
                testId: panelId,
                testName: String(item.panel.name || item.name || "Panel"),
                panelId,
                panelName: String(item.panel.name || item.name || "Panel"),
                quantity: 1,
                amount: Number(item.panel.price || 0),
                bonus: 0,
              });
              continue;
            }

            const testName = String(item?.name || "Test");
            const quantity = Math.max(1, Number(item?.quantity || 1));
            ledgerTests.push({
              testId: String(item?.id || testName),
              testName,
              quantity,
              amount: Number(item?.price || 0) * quantity,
              bonus: 0,
            });
          }

          const amount = Number(order.amount ?? ledgerTests.reduce((sum, test) => sum + test.amount, 0));
          const bonus = Number(order.bonus || 0);
          const testAmountTotal = ledgerTests.reduce((sum, test) => sum + test.amount, 0);
          let allocatedBonus = 0;
          ledgerTests.forEach((test, index) => {
            if (index === ledgerTests.length - 1) {
              test.bonus = Number((bonus - allocatedBonus).toFixed(2));
            } else if (testAmountTotal > 0) {
              test.bonus = Number((bonus * test.amount / testAmountTotal).toFixed(2));
              allocatedBonus += test.bonus;
            }
          });

          await ReferralLedger.create([{
            lab: lab._id,
            referrer: referrer._id,
            testOrder: order._id,
            tests: ledgerTests,
            amount,
            bonus,
            status: "pending",
            isCancelled: false,
            user: String(token.id),
            branchId: order.branchId,
            businessDate: order.bDate,
          }], { session });
          ledgerCreated = true;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const response = message === "ORDER_NOT_FOUND"
          ? { error: "Order not found", status: 404 }
          : message === "REFERRER_NOT_FOUND"
            ? { error: "The selected referrer is unavailable for this branch", status: 404 }
            : message === "ORDER_CANCELLED"
              ? { error: "Cannot update the referrer on a cancelled order", status: 400 }
              : message === "ORDER_BRANCH_MISSING" || message === "ORDER_LAB_MISSING" || message === "ORDER_LAB_NOT_FOUND"
                ? { error: "Order branch or lab context is unavailable", status: 400 }
                : { error: "Failed to update referrer and referral ledger", status: 500 };
        return NextResponse.json({ error: response.error }, { status: response.status });
      } finally {
        await session.endSession();
      }

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        referralLedgerCreated: ledgerCreated,
        referralLedgerUpdated: !ledgerCreated,
      }, { status: 200 });
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No valid update fields provided" },
        { status: 400 }
      );
    }

    const existingOrder = await Order.findById(id).lean();
    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updated = await Order.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: updated,
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
