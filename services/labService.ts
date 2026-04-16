import { dbConnect } from '../lib/mongodb';
import Lab, { ILab } from '../models/Lab';

export async function createLab(data: Partial<ILab>) {
  await dbConnect();
  const lab = new Lab(data);
  return lab.save();
}

export async function getLabs() {
  await dbConnect();
  return Lab.find({});
}

export async function updateLab(id: string, data: Partial<ILab>) {
  await dbConnect();
  return Lab.findByIdAndUpdate(id, data, { new: true });
}

export async function setLabStatus(id: string, status: 'active' | 'inactive') {
  await dbConnect();
  return Lab.findByIdAndUpdate(id, { status }, { new: true });
}
