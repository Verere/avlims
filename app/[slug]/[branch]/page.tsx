"use client";
import React, { useState, useMemo } from "react";
import { toast } from "react-toastify";
import PatientSelector from "@/components/PatientSelector";
import TestSelector from "@/components/TestSelector";
import PanelSelector from "@/components/PanelSelector";
import ReferrerSelector from "@/components/ReferrerSelector";
import Cart from "@/components/Cart";
import DiscountPanel from "@/components/DiscountPanel";
import PaymentPanel from "@/components/PaymentPanel";
import { Patient } from "@/types/patient";
import { LabTest } from "@/types/test";
import { CartItem } from "@/types/cart";
import Navbar from "@/components/Navbar";

type Referrer = {
  id: string;
  name: string;
  organization?: string;
  refClinic?: string;
};

type DiscountMode = "percent" | "fixed";
type PaymentMethod = "cash" | "transfer" | "pos";

export default function LaboratoryRegistrationPage() {
	// Bill To state
	const [billTo, setBillTo] = useState("");
	const [billToRef, setBillToRef] = useState("");
	const [billToName, setBillToName] = useState("");
	// Bill popup state
	const [showBillPopup, setShowBillPopup] = useState(false);
	// Patient state
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [showAddPatient, setShowAddPatient] = useState(false);

	// Cart state
	const [cart, setCart] = useState<CartItem[]>([]);
	const [selectorMode, setSelectorMode] = useState<"test" | "panel">("test");

	// Referrer state
	const [referrer, setReferrer] = useState<Referrer>({ id: "walkin", name: "Walk-in", organization: "" });
	// Cart referrer/clinic state
	const [cartReferrer, setCartReferrer] = useState<{ referrer?: Referrer; refClinic?: string }>({});

	// Discount state
	const [discountEnabled, setDiscountEnabled] = useState(false);
	const [discountMode, setDiscountMode] = useState<DiscountMode>("percent");
	const [discountValue, setDiscountValue] = useState(0);
	const [discountError, setDiscountError] = useState<string | null>(null);
	const [authorisedBy, setAuthorisedBy] = useState("");


	// Payment state (multiple payments)
	type PaymentEntry = { method: PaymentMethod; amount: number };
	const [payments, setPayments] = useState<PaymentEntry[]>([{ method: "cash", amount: 0 }]);
	// Loading state for payment
	const [isPaying, setIsPaying] = useState(false);


	// Cart logic
	const handleAddTest = (test: LabTest) => {
		setCart(prev => {
			// If test already in cart, do not add again
			if (prev.some(item => item.test.id === test.id)) {
				return prev;
			}
			return [...prev, { test, quantity: 1 }];
		});
	};
	const handleRemoveTest = (id: string) => {
		if (id.startsWith("panel:")) {
			const panelId = id.slice("panel:".length);
			setCart((prev) => prev.filter((item) => item.panel?.id !== panelId));
			return;
		}
		setCart(prev => prev.filter(item => item.test.id !== id));
	};
	const handleAddPanelTests = (panel: { id: string; name: string; price: number }, tests: LabTest[]) => {
		let addedCount = 0;
		setCart((prev) => {
			const existingIds = new Set(prev.map((item) => item.test.id));
			const additions = tests
				.filter((test) => !existingIds.has(test.id))
				.map((test) => ({ test, quantity: 1, panel }));
			addedCount = additions.length;
			return additions.length > 0 ? [...prev, ...additions] : prev;
		});

		if (addedCount === 0) {
			toast.info(`All tests in ${panel.name} are already in cart.`);
		} else {
			toast.success(`${addedCount} test(s) added from ${panel.name}.`);
		}
	};

	// Totals
	const subtotal = useMemo(() => {
		const seenPanels = new Set<string>();
		return cart.reduce((sum, item) => {
			if (item.panel) {
				if (seenPanels.has(item.panel.id)) return sum;
				seenPanels.add(item.panel.id);
				return sum + Number(item.panel.price || 0);
			}
			return sum + item.test.price * item.quantity;
		}, 0);
	}, [cart]);
	const bonus = useMemo(() => {
		const effectiveReferrerId = (cartReferrer.referrer?.id || referrer.id || "").toLowerCase();
		if (effectiveReferrerId === "walkin") return 0;
		return Math.round(subtotal * 0.1);
	}, [subtotal, cartReferrer.referrer?.id, referrer.id]);
	const discount = useMemo(() => {
		if (!discountEnabled) return 0;
		if (discountMode === "percent") return Math.round((discountValue / 100) * subtotal);
		return discountValue;
	}, [discountEnabled, discountMode, discountValue, subtotal]);
	const total = useMemo(() => Math.max(subtotal - discount, 0), [subtotal, discount]);
	const revenue = useMemo(() => Math.max(total - bonus, 0), [total, bonus]);
	const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
	const balance = useMemo(() => total - totalPaid, [total, totalPaid]);

	const formatMoney = (value: number) => `N${Number(value || 0).toLocaleString()}`;

	const printReceipt = (
		payload: {
		transactionId: string;
		patientName: string;
		branchName: string;
		branchPhone: string;
		labName: string;
		address: string;
		date: string;
		items: Array<{ name: string; amount: number }>;
		paymentsMade: Array<{ method: PaymentMethod; amount: number }>;
		subtotalAmount: number;
		discountAmount: number;
		totalAmount: number;
		bonusAmount: number;
		revenueAmount: number;
		balanceAmount: number;
		},
		targetWindow?: Window | null
	) => {
		const escapeHtml = (value: string) =>
			value
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/\"/g, "&quot;")
				.replace(/'/g, "&#039;");

		const itemsHtml = payload.items
			.map(
				(item) =>
					`<tr><td>${escapeHtml(item.name)}</td><td style="text-align:right;">${formatMoney(item.amount)}</td></tr>`
			)
			.join("");

		const paymentsHtml = payload.paymentsMade
			.map(
				(entry) =>
					`<tr><td>${escapeHtml(entry.method.toUpperCase())}</td><td style="text-align:right;">${formatMoney(entry.amount)}</td></tr>`
			)
			.join("");

		const html = `
			<!doctype html>
			<html>
				<head>
					<meta charset="utf-8" />
					<title>Payment Receipt</title>
					<style>
						@page { size: 80mm auto; margin: 0; }
						body { font-family: Arial, Helvetica, sans-serif; margin: 0 auto; padding: 8px; width: 80mm; color: #0f172a; box-sizing: border-box; }
						h1 { margin: 0 0 4px; font-size: 22px; }
						.lab-name { margin: 2px 0 6px; font-size: 18px; font-weight: 700; }
						p { margin: 3px 0; }
						table { width: 100%; border-collapse: collapse; margin-top: 10px; }
						th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 13px; }
						th { background: #f1f5f9; text-align: left; }
						.section { margin-top: 16px; }
						.summary td:first-child { width: 60%; }
						.footer { margin-top: 24px; font-size: 12px; color: #475569; }
					</style>
				</head>
				<body>
					<h1>Payment Receipt</h1>
					<div class="lab-name">${escapeHtml(payload.labName || "-")}</div>
					<p><strong>Address:</strong> ${escapeHtml(payload.address || "-")}</p>
					<p><strong>Branch:</strong> ${escapeHtml(payload.branchName || "-")}</p>
					<p><strong>Phone:</strong> ${escapeHtml(payload.branchPhone || "-")}</p>
					<p><strong>Patient:</strong> ${escapeHtml(payload.patientName || "-")}</p>
					<p><strong>Transaction ID:</strong> ${escapeHtml(payload.transactionId || "-")}</p>
					<p><strong>Date:</strong> ${escapeHtml(new Date(payload.date).toLocaleString())}</p>

					<div class="section">
						<strong>Investigation</strong>
						<table>
							<thead><tr><th>Item</th><th style="text-align:right;">Amount</th></tr></thead>
							<tbody>${itemsHtml || "<tr><td>-</td><td style='text-align:right;'>N0</td></tr>"}</tbody>
						</table>
					</div>

					<div class="section">
						<strong>Payment Methods</strong>
						<table>
							<thead><tr><th>Method</th><th style="text-align:right;">Amount</th></tr></thead>
							<tbody>${paymentsHtml || "<tr><td>-</td><td style='text-align:right;'>N0</td></tr>"}</tbody>
						</table>
					</div>

					<div class="section">
						<strong>Summary</strong>
						<table class="summary">
							<tbody>
								<tr><td>Subtotal</td><td style="text-align:right;">${formatMoney(payload.subtotalAmount)}</td></tr>
								<tr><td>Discount</td><td style="text-align:right;">${formatMoney(payload.discountAmount)}</td></tr>
								<tr><td>Total</td><td style="text-align:right;"><strong>${formatMoney(payload.totalAmount)}</strong></td></tr>
								<tr><td>Balance</td><td style="text-align:right;">${formatMoney(payload.balanceAmount)}</td></tr>
							</tbody>
						</table>
					</div>

					<div class="footer">Thanks for your Patronage</div>
				</body>
			</html>
		`;

		const popup = targetWindow || window.open("", "_blank", "width=900,height=700,noopener,noreferrer");
		if (!popup) {
			toast.warn("Payment completed, but receipt popup was blocked.");
			return;
		}

		popup.document.open();
		popup.document.write(html);
		popup.document.close();
		popup.focus();
		window.setTimeout(() => popup.print(), 350);
	};

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

				
	const handleCompletePayment = async () => {
		if (discountEnabled && authorisedBy.trim() === "") {
			toast.error("Who authorised this discount?");
			return;
		}
		if (!selectedPatient?.name) {
			toast.error("You have not selected any name.");
			return;
		}
		if (cart.length === 0) {
			toast.error("You have not selected any test.");
			return;
		}
		if (totalPaid < total) {
			toast.warn("Payment not complete. Use the Bill button.");
			return;
		}
		if (totalPaid > total) {
			toast.warn("Overpayment detected. Please Check again.");
			return;
		}

		// Open receipt tab immediately from the click event so browsers don't block it later.
		const receiptWindow = window.open("", "_blank", "width=900,height=700");
		if (receiptWindow) {
			receiptWindow.document.open();
			receiptWindow.document.write("<p style='font-family:Arial;padding:16px;'>Preparing receipt...</p>");
			receiptWindow.document.close();
		}

		setIsPaying(true);
		try {
			// 1. Get branch slug from URL
			const pathname = window.location.pathname;
			const pathParts = pathname.split("/").filter(Boolean);
			const branchSlug = pathParts[1];
			if (!branchSlug) {
				toast.error("Branch not found in URL.");
				return;
			}
			// 2. Fetch branchId
			const branchRes = await fetch(`/api/branches/${branchSlug}`);
			if (!branchRes.ok) {
				toast.error("Branch not found.");
				return;
			}
			const branchDoc = await branchRes.json();
			const branchId = branchDoc._id;
			let labDoc: any = null;
			try {
				const labRes = await fetch(`/api/labs/${pathname.split("/")[1]}`);
				if (labRes.ok) {
					labDoc = await labRes.json();
				}
			} catch {
				labDoc = null;
			}
			// 3. Get user from session
			const sessionRes = await fetch("/api/auth/session");
			const session = await sessionRes.json();
			const user = session?.user;
			if (!user?.name) {
				toast.error("User not found in session.");
				return;
			}

			// 4. Prepare order payload
			const orderPayload = {
				patientId: selectedPatient.id,
				name: selectedPatient.name,
				tests: cart.map(item => ({
					id: item.test.id,
					name: item.test.name,
					price: item.test.price,
					quantity: item.quantity,
					panel: item.panel
						? {
							id: item.panel.id,
							name: item.panel.name,
							price: item.panel.price,
						}
						: undefined,
				})),
				amount: subtotal,
				amountPaid: totalPaid,
				bal: balance,
				clinic: cartReferrer.refClinic || "",
				referral: cartReferrer.referrer?.name || "",
				billTo: billTo || cartReferrer.referrer?.id || "walkin",
				billToName: billToName || cartReferrer.referrer?.name || "Walk-in",
				billToRef: billToRef || cartReferrer.refClinic || "",
				user: user.name,
				status: "REGISTERED",
				slug: pathname.split("/")[1],
				bDate: new Date().toISOString(),
				isCancelled: false,
				branch: pathname.split("/")[2],
				branchId: branchId,
				revenue,
				bonus,
				authorisedBy: authorisedBy || undefined,
				discount: discountEnabled ? discount : 0,
			};

			// 5. Create order first
			const orderRes = await fetch("/api/test-orders", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(orderPayload),
			});
			if (!orderRes.ok) {
				const err = await orderRes.json();
				throw new Error(err.error || "Order creation failed");
			}


			const orderData = await orderRes.json();
			const testOrderItemId = orderData.id || orderData._id;
			if (!testOrderItemId) {
				throw new Error("Order ID not returned from backend");
			}

			

			// 6. Prepare payment payload with testOrderItem and full order
			const paymentPayload = {
				labId: branchDoc.lab || branchDoc._id, // required
				name: selectedPatient.name || (selectedPatient.id ? String(selectedPatient.id) : "Unknown"), // required, fallback if missing
				amount: total, // required
				userId: user.id, // required
				user: user.name, // required for API
				branchId: branchId, // required
				payments, // required
				branch: pathname.split("/")[2], // required (string, not objectId)
				patient: selectedPatient.id, // required
				slug: branchSlug, // required
				orderId: orderData._id || orderData.id, // required
				bDate: orderData.bDate, // required (maps to businessDate)
				// Optional fields
				transactionId: `PAY-${Date.now()}`,
			};

			// 7. Send payment
			const paymentRes = await fetch("/api/payments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(paymentPayload),
			});
			if (!paymentRes.ok) {
				const err = await paymentRes.json();
				throw new Error(err.error || "Payment failed");
			}
			const paymentData = await paymentRes.json();

			const groupedItems = new Map<string, { name: string; amount: number }>();
			for (const entry of cart) {
				const key = entry.panel ? `panel:${entry.panel.id}` : `test:${entry.test.id}`;
				if (!groupedItems.has(key)) {
					groupedItems.set(key, {
						name: entry.panel ? `${entry.panel.name} (Panel)` : entry.test.name,
						amount: entry.panel ? Number(entry.panel.price || 0) : Number(entry.test.price || 0) * Number(entry.quantity || 1),
					});
				}
			}

			printReceipt({
				transactionId: String(paymentData?.transactionId || paymentPayload.transactionId || "-"),
				patientName: selectedPatient.name,
				branchName: String(pathname.split("/")[2] || "-"),
				branchPhone: String(branchDoc?.phone || "-"),
				labName: String(labDoc?.name || "Laboratory"),
				address: String(branchDoc?.address || labDoc?.address || "-"),
				date: String(orderData?.bDate || new Date().toISOString()),
				items: Array.from(groupedItems.values()),
				paymentsMade: payments,
				subtotalAmount: subtotal,
				discountAmount: discountEnabled ? discount : 0,
				totalAmount: total,
				bonusAmount: bonus,
				revenueAmount: revenue,
				balanceAmount: balance,
			}, receiptWindow);

			// 8. Send referral ledger entry only if referrer is not 'Walk-in'
			if (cartReferrer.referrer?.name !== 'Walk-in') {
				const referralLedgerPayload = {
					order: orderData._id || orderData.id,
					referrer: cartReferrer.referrer?.id,
					amount: total,
					bonus,
					branchId: branchId,
					lab: branchDoc.lab || branchDoc._id,
					user: user.id,
					businessDate: orderData.bDate,
					status: "pending",
				};
				await fetch("/api/referral-ledger", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(referralLedgerPayload),
				});
			}

			toast.success("Payment and order completed!");
			// Optionally clear state
			setCart([]);
			setSelectedPatient(null);
			setReferrer({ id: "walkin", name: "Walk-in", organization: "" });
			setCartReferrer({});
			setPayments([{ method: "cash", amount: 0 }]);
			setDiscountEnabled(false);
			setDiscountValue(0);
			setAuthorisedBy("");
			setIsPaying(false);
		} catch (err: any) {
			if (receiptWindow && !receiptWindow.closed) {
				receiptWindow.close();
			}
			toast.error(err.message || "An error occurred.");
			setIsPaying(false);
		}
	};
	const handleSavePending = () => {
		setShowBillPopup(true);
	};

	const handleBillChoice = async (choice: string) => {
		if (discountEnabled && authorisedBy.trim() === "") {
			toast.error("Who authorised this discount?");
			return;
		}
		if (!selectedPatient?.name) {
			toast.error("You have not selected any name.");
			return;
		}
		if (cart.length === 0) {
			toast.error("You have not selected any test.");
			return;
		}
		setShowBillPopup(false);

		let resolvedBillTo = "";
		let resolvedBillToName = "";
		let resolvedBillToRef = "";

		if (choice === "Patient" && selectedPatient) {
			resolvedBillTo = "patient";
			resolvedBillToRef = selectedPatient.id;
			resolvedBillToName = selectedPatient.name;
		} else if (choice === "Clinic" && cartReferrer.refClinic) {
			resolvedBillTo = "ref-clinic";
			resolvedBillToRef = cartReferrer.refClinic;
			resolvedBillToName = cartReferrer.refClinic;
		} else if (choice === "Referrer" && cartReferrer.referrer) {
			resolvedBillTo = "referrer";
			resolvedBillToRef = cartReferrer.referrer.id;
			resolvedBillToName = cartReferrer.referrer.name;
		} else {
			toast.error("Missing data for selected bill type.");
			return;
		}

		// Keep UI state in sync, but use resolved values for API payloads in this run.
		setBillTo(resolvedBillTo);
		setBillToRef(resolvedBillToRef);
		setBillToName(resolvedBillToName);

			// 1. Get branch slug from URL
			const pathname = window.location.pathname;
			const pathParts = pathname.split("/").filter(Boolean);
			const branchSlug = pathParts[1];
			if (!branchSlug) {
				toast.error("Branch not found in URL.");
				return;
			}
			// 2. Fetch branchId
			const branchRes = await fetch(`/api/branches/${branchSlug}`);
			if (!branchRes.ok) {
				toast.error("Branch not found.");
				return;
			}
			const branchDoc = await branchRes.json();
			const branchId = branchDoc._id;
			// 3. Get user from session
			const sessionRes = await fetch("/api/auth/session");
			const session = await sessionRes.json();
			const user = session?.user;
			if (!user?.name) {
				toast.error("User not found in session.");
				return;
			}

			// 4. Prepare order payload
			const orderPayload = {
				patientId: selectedPatient.id,
				name: selectedPatient.name,
				tests: cart.map(item => ({
					id: item.test.id,
					name: item.test.name,
					price: item.test.price,
					quantity: item.quantity,
					panel: item.panel
						? {
							id: item.panel.id,
							name: item.panel.name,
							price: item.panel.price,
						}
						: undefined,
				})),
				amount: subtotal,
				amountPaid: totalPaid,
				bal: balance,
				clinic: cartReferrer.refClinic || "",
				referral: cartReferrer.referrer?.name || "",
				billTo: resolvedBillTo,
				billToName: resolvedBillToName,
				billToRef: resolvedBillToRef,
				user: user.name,
				status: "REGISTERED",
				slug: pathname.split("/")[1],
				bDate: new Date().toISOString(),
				isCancelled: false,
				branch: pathname.split("/")[2],
				branchId: branchId,
				revenue,
				bonus,
				authorisedBy: authorisedBy || undefined,
				discount: discountEnabled ? discount : 0,
			};

			// 5. Create order first
			const orderRes = await fetch("/api/test-orders", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(orderPayload),
			});
			if (!orderRes.ok) {
				const err = await orderRes.json();
				throw new Error(err.error || "Order creation failed");
			}


			const orderData = await orderRes.json();
			const testOrderItemId = orderData.id || orderData._id;
			if (!testOrderItemId) {
				throw new Error("Order ID not returned from backend");
			}

				try {
			const billToForBill =
				resolvedBillTo === "patient"
					? "Patient"
					: resolvedBillTo === "ref-clinic"
						? "RefClinic"
						: "Referrer";
		
			// 6.5. Create bill for this order
			const billPayload = {
				labId: branchDoc.lab || branchDoc._id,
				patient: selectedPatient.name,
				referrer: cartReferrer.referrer?.name || "",
				branchId: branchId,
				amount: subtotal,
				paid: totalPaid,
				balance: balance,
				orderId: orderData._id || orderData.id,
				businessDate: orderData.bDate || new Date().toISOString(),
				billTo: billToForBill,
				billToName: resolvedBillToName,
				billToRef: resolvedBillToRef,
			};
			const billRes = await fetch("/api/bill", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(billPayload),
			});
			if (!billRes.ok) {
				const err = await billRes.json();
				throw new Error(err.error || "Bill creation failed");
			}


		

			// 8. Send referral ledger entry only if referrer is not 'Walk-in'
			if (cartReferrer.referrer?.name !== 'Walk-in') {
				const referralLedgerPayload = {
					order: orderData._id || orderData.id,
					referrer: cartReferrer.referrer?.id,
					amount: total,
					bonus,
					branchId: branchId,
					lab: branchDoc.lab || branchDoc._id,
					user: user.id,
					businessDate: orderData.bDate,
					status: "pending",
				};
				await fetch("/api/referral-ledger", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(referralLedgerPayload),
				});
			}

			toast.success("Bill created!");
			// Optionally clear state
			setCart([]);
			setSelectedPatient(null);
			setReferrer({ id: "walkin", name: "Walk-in", organization: "" });
			setCartReferrer({});
			setPayments([{ method: "cash", amount: 0 }]);
			setDiscountEnabled(false);
			setDiscountValue(0);
			setAuthorisedBy("");
			setIsPaying(false);
		} catch (err: any) {
			toast.error(err.message || "An error occurred.");
			setIsPaying(false);
		}
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
	  <Navbar />

			<div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-6 py-6 px-2 md:px-0">
				{/* Left Panel */}
				<div className="w-full md:w-1/2 space-y-4">
					<div className="bg-white rounded shadow p-4">
						<PatientSelector
							selected={selectedPatient}
							onSelect={setSelectedPatient}
							onAddNew={handleAddNewPatient}
						/>
					
					</div>
					<div className="bg-white rounded shadow p-4">
						<div className="mb-3 inline-flex rounded border border-gray-300 overflow-hidden">
							<button
								type="button"
								onClick={() => setSelectorMode("test")}
								className={`px-3 py-1.5 text-sm font-medium ${selectorMode === "test" ? "bg-blue-700 text-white" : "bg-white text-gray-700"}`}
							>
								Tests
							</button>
							<button
								type="button"
								onClick={() => setSelectorMode("panel")}
								className={`px-3 py-1.5 text-sm font-medium ${selectorMode === "panel" ? "bg-blue-700 text-white" : "bg-white text-gray-700"}`}
							>
								Panels
							</button>
						</div>

						{selectorMode === "test" ? (
							<TestSelector cart={cart} onAdd={handleAddTest} />
						) : (
							<PanelSelector cart={cart} onAddPanelTests={handleAddPanelTests} />
						)}
					</div>
					<div className="bg-white rounded shadow p-4">
						<ReferrerSelector
							selected={referrer}
							onSelect={(r) => {
								setReferrer(r);
								setCartReferrer({
									referrer: r,
									refClinic: (typeof r === "object" && "refClinic" in r && typeof r.refClinic === "string" && r.refClinic)
										? r.refClinic
										: (typeof r.organization === "string" ? r.organization : "")
								});
							}}
						/>
					</div>
				</div>
				{/* Right Panel */}
				<div className="w-full md:w-1/2 space-y-4">
					<div className="bg-white rounded shadow p-4">
												<div className="mb-2">
													{selectedPatient?.name && (
														<div className="font-bold text-blue-700 text-base mb-1 text-center">Patient: {selectedPatient.name}</div>
													)}
													{cartReferrer.referrer && (
														<div className="text-xs text-gray-700 text-center">
															<div>Referrer: <span className="font-semibold">{cartReferrer.referrer.name}</span></div>
															{cartReferrer.refClinic && <div>Ref Clinic: <span className="font-semibold">{cartReferrer.refClinic}</span></div>}
														</div>
													)}
												</div>
												<Cart
													cart={cart}
													onRemove={handleRemoveTest}
													subtotal={subtotal}
													discount={discount}
													total={total}
													bonus={bonus}
													revenue={revenue}
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
							authorisedBy={authorisedBy}
							onAuthorisedByChange={setAuthorisedBy}
						/>
						<PaymentPanel
							payments={payments}
							setPayments={setPayments}
							total={total}
							balance={balance}
							onComplete={handleCompletePayment}
							onPending={handleSavePending}
							disabled={cart.length === 0 || !!discountError || isPaying}
							isPaying={isPaying}
						/>
						{showBillPopup && (
							<div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
								<div className="bg-white rounded shadow-lg p-6 w-80 flex flex-col gap-4">
									<h2 className="font-semibold text-lg mb-2 text-center">Bill To</h2>
									<button
										className="w-full bg-blue-700 text-white py-2 rounded"
										onClick={() => handleBillChoice('Patient')}
									>Patient</button>
									<button
										className="w-full bg-green-700 text-white py-2 rounded"
										onClick={() => handleBillChoice('Referrer')}
									>Referrer</button>
									<button
										className="w-full bg-purple-700 text-white py-2 rounded"
										onClick={() => handleBillChoice('Clinic')}
									>Clinic</button>
									<button
										className="w-full bg-gray-300 text-gray-700 py-2 rounded mt-2"
										onClick={() => setShowBillPopup(false)}
									>Cancel</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
