import mongoose from 'mongoose';
import { dbConnect } from '../lib/mongodb';

export async function getDailyLabSummary({ date }: { date: Date }) {
  await dbConnect();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  // Run aggregation on TestOrderItem collection
  const TestOrderItem = mongoose.connection.collection('testorderitems');
  const pipeline = [
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$lab", totalTests: { $sum: 1 }, totalRevenue: { $sum: "$price" } } },
    { $lookup: {
        from: "inventoryledgers",
        let: { labId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [
            { $eq: ["$lab", "$$labId"] },
            { $gte: ["$createdAt", start] },
            { $lt: ["$createdAt", end] }
          ] } } },
          { $group: { _id: "$category", totalUsed: { $sum: "$quantity" } } }
        ],
        as: "inventoryUsage"
      }
    },
    { $lookup: {
        from: "invoices",
        let: { labId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [
            { $eq: ["$lab", "$$labId"] },
            { $gte: ["$createdAt", start] },
            { $lt: ["$createdAt", end] },
            { $gt: ["$balance", 0] }
          ] } } },
          { $group: { _id: null, outstanding: { $sum: "$balance" } } }
        ],
        as: "outstandingBalances"
      }
    },
    { $lookup: {
        from: "referralledgers",
        let: { labId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [
            { $eq: ["$lab", "$$labId"] },
            { $eq: ["$type", "BONUS"] },
            { $gte: ["$createdAt", start] },
            { $lt: ["$createdAt", end] }
          ] } } },
          { $group: { _id: null, totalBonuses: { $sum: "$amount" } } }
        ],
        as: "referralBonuses"
      }
    },
    { $project: {
        lab: "$_id",
        totalTests: 1,
        totalRevenue: 1,
        consumablesUsed: {
          $arrayElemAt: [
            { $filter: { input: "$inventoryUsage", as: "usage", cond: { $eq: ["$$usage._id", "consumable"] } } }, 0
          ]
        },
        reagentsUsed: {
          $arrayElemAt: [
            { $filter: { input: "$inventoryUsage", as: "usage", cond: { $eq: ["$$usage._id", "reagent"] } } }, 0
          ]
        },
        labWearUsed: {
          $arrayElemAt: [
            { $filter: { input: "$inventoryUsage", as: "usage", cond: { $eq: ["$$usage._id", "lab wear"] } } }, 0
          ]
        },
        outstandingBalance: { $ifNull: [ { $arrayElemAt: [ "$outstandingBalances.outstanding", 0 ] }, 0 ] },
        referralBonuses: { $ifNull: [ { $arrayElemAt: [ "$referralBonuses.totalBonuses", 0 ] }, 0 ] }
      }
    }
  ];

  return TestOrderItem.aggregate(pipeline).toArray();
}
