import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Order from "@/models/Order";
import mongoose from "mongoose";
import Bill from "@/models/Bill";
import BillPayment from "@/models/BillPayment";
import Payment from "@/models/Payment";
import ReferralLedger from "@/models/ReferralLedger";

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
    }

    if (typeof body.referralId === "string") {
      update.referralId = body.referralId;
    }

    if (body.cancelOrder === true) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
      }

      const orderObjectId = new mongoose.Types.ObjectId(id);
      const orderIdMatchers = [orderObjectId, id];

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
            { isCancelled: true, status: "cancelled" },
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
              { $set: { isCancelled: true } },
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

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No valid update fields provided" },
        { status: 400 }
      );
    }

    const updated = await Order.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
