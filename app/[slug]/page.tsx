"use client";
import React, { useState, useMemo } from "react";
import PatientSelector from "../../components/PatientSelector";
import TestSelector from "../../components/TestSelector";
import ReferrerSelector from "../../components/ReferrerSelector";
import Cart from "../../components/Cart";
import DiscountPanel from "../../components/DiscountPanel";
import PaymentPanel from "../../components/PaymentPanel";
import { Patient } from "../../types/patient";
import { LabTest } from "../../types/test";
import { CartItem } from "../../types/cart";

type Referrer = {
	id: string;
	name: string;
	organization: string;
};

type DiscountMode = "percent" | "fixed";
type PaymentMethod = "cash" | "transfer" | "pos";

export default function LaboratoryRegistrationPage() {
	// Patient state
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [showAddPatient, setShowAddPatient] = useState(false);

	// Cart state
	const [cart, setCart] = useState<CartItem[]>([]);

	// Referrer state
	const [referrer, setReferrer] = useState<Referrer>({ id: "walkin", name: "Walk-in", organization: "" });

	// Discount state
	const [discountEnabled, setDiscountEnabled] = useState(false);
	const [discountMode, setDiscountMode] = useState<DiscountMode>("percent");
	const [discountValue, setDiscountValue] = useState(0);
	const [discountError, setDiscountError] = useState<string | null>(null);

	// Payment state
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
	const [amountPaid, setAmountPaid] = useState(0);

	// Cart logic
	const handleAddTest = (test: LabTest) => {
		setCart(prev => {
			const idx = prev.findIndex(item => item.test.id === test.id);
			if (idx !== -1) {
				// Increase quantity
				return prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item);
			}
			return [...prev, { test, quantity: 1 }];
		});
	};
	const handleRemoveTest = (id: string) => {
		setCart(prev => prev.filter(item => item.test.id !== id));
	};

	// Totals
	const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.test.price * item.quantity, 0), [cart]);
	const discount = useMemo(() => {
		if (!discountEnabled) return 0;
		if (discountMode === "percent") return Math.round((discountValue / 100) * subtotal);
		return discountValue;
	}, [discountEnabled, discountMode, discountValue, subtotal]);
	const total = useMemo(() => Math.max(subtotal - discount, 0), [subtotal, discount]);
	const balance = useMemo(() => total - amountPaid, [total, amountPaid]);

	// Discount validation
	React.useEffect(() => {
		if (!discountEnabled) {
			setDiscountError(null);
			return;
		}
		if (discountMode === "percent") {
			if (discountValue < 0 || discountValue > 100) setDiscountError("Enter 0-100%.");
			else setDiscountError(null);
		} else {
			if (discountValue < 0 || discountValue > subtotal) setDiscountError("Invalid discount amount.");
			else setDiscountError(null);
		}
	}, [discountEnabled, discountMode, discountValue, subtotal]);

	// Payment actions
	const handleCompletePayment = () => {
		alert("Payment completed! (mock)");
	};
	const handleSavePending = () => {
		alert("Saved as pending! (mock)");
	};

	// Add new patient UI (mock)
	const handleAddNewPatient = () => {
		setShowAddPatient(true);
	};
	const handleSaveNewPatient = (p: Patient) => {
		setSelectedPatient(p);
		setShowAddPatient(false);
	};
	const handleCancelAddPatient = () => setShowAddPatient(false);

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col">
			<div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-6 py-6 px-2 md:px-0">
				{/* Left Panel */}
				<div className="w-full md:w-1/2 space-y-4">
					<div className="bg-white rounded shadow p-4">
						<PatientSelector
							selected={selectedPatient}
							onSelect={setSelectedPatient}
							onAddNew={handleAddNewPatient}
						/>
						{/* Add New Patient Modal (mock) */}
						{showAddPatient && (
							<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
								<div className="bg-white rounded shadow-lg p-6 w-80">
									<h2 className="font-semibold mb-2">Add New Patient</h2>
									{/* Mock form: just create a patient with random ID */}
									<button
										className="w-full bg-blue-700 text-white py-2 rounded mt-2"
										onClick={() => handleSaveNewPatient({ id: `P${Math.floor(Math.random()*10000)}`, name: "New Patient", phone: "" })}
									>Save (Mock)</button>
									<button
										className="w-full bg-gray-300 text-gray-700 py-2 rounded mt-2"
										onClick={handleCancelAddPatient}
									>Cancel</button>
								</div>
							</div>
						)}
					</div>
					<div className="bg-white rounded shadow p-4">
						<TestSelector cart={cart} onAdd={handleAddTest} />
					</div>
					<div className="bg-white rounded shadow p-4">
						<ReferrerSelector selected={referrer} onSelect={setReferrer} />
					</div>
				</div>
				{/* Right Panel */}
				<div className="w-full md:w-1/2 space-y-4">
					<div className="bg-white rounded shadow p-4">
						<Cart
							cart={cart}
							onRemove={handleRemoveTest}
							subtotal={subtotal}
							discount={discount}
							total={total}
						/>
						<DiscountPanel
							enabled={discountEnabled}
							mode={discountMode}
							value={discountValue}
							subtotal={subtotal}
							onToggle={() => setDiscountEnabled(e => !e)}
							onModeChange={setDiscountMode}
							onValueChange={setDiscountValue}
							error={discountError}
						/>
						<PaymentPanel
							method={paymentMethod}
							onMethodChange={setPaymentMethod}
							amountPaid={amountPaid}
							onAmountPaidChange={setAmountPaid}
							total={total}
							balance={balance}
							onComplete={handleCompletePayment}
							onPending={handleSavePending}
							disabled={cart.length === 0 || !!discountError}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
