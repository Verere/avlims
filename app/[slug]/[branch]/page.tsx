"use client";
import React, { useEffect, useState, useMemo, useTransition } from "react";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";
import PatientSelector from "@/components/PatientSelector";
import PatientForm from "@/components/PatientForm/PatientForm";
import TestSelector from "@/components/TestSelector";
import PanelSelector from "@/components/PanelSelector";
import ReferrerSelector from "@/components/ReferrerSelector";
import Cart from "@/components/Cart";
import DiscountPanel from "@/components/DiscountPanel";
import PaymentPanel from "@/components/PaymentPanel";
import { Patient } from "@/types/patient";
import { Referrer } from "@/types/referrer";
import { Facility } from "@/types/facility";
import { LabTest } from "@/types/test";
import { CartItem } from "@/types/cart";
import Navbar from "@/components/Navbar";
import FacilitySelector from "@/components/FacilitySelector";
import ReferrerForm from "@/components/ReferrerForm/ReferrerForm";
import RefClinicForm from "@/components/RefClinicForm/RefClinicForm";



type DiscountMode = "percent" | "fixed";
type PaymentMethod = "cash" | "transfer" | "pos";

export default function LaboratoryRegistrationPage() {
	const pathname = usePathname();
	// Bill To state
	const [billTo, setBillTo] = useState("");
	const [billToRef, setBillToRef] = useState("");
	const [billToName, setBillToName] = useState("");
	// Bill popup state
	const [showBillPopup, setShowBillPopup] = useState(false);
	// Patient state
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [selectedReferrer, setSelectedReferrer] = useState<Referrer | null>(null);
	const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
	const [showAddPatient, setShowAddPatient] = useState(false);
	const [addingPatient, setAddingPatient] = useState(false);
	const [patientRefreshKey, setPatientRefreshKey	] = useState(0);
	const [facilityRefreshKey, setFacilityRefreshKey] = useState(0);
	const [referrerRefreshKey, setReferrerRefreshKey] = useState(0);

	// Cart state
	const [cart, setCart] = useState<CartItem[]>([]);
	const [itemBonuses, setItemBonuses] = useState<Record<string, number>>({});
	const [selectorMode, setSelectorMode] = useState<"test" | "panel">("test");

	// Referrer state
	const [referrer, setReferrer] = useState<Referrer>({ id: "walkin", name: "Walk-in", organization: "" });
	const [facility, setFacility] = useState<Facility>({ id: "private", name: "Private", address: "" });
	const [showAddReferrer, setShowAddReferrer] = useState(false);
	const [addingReferrer, setAddingReferrer] = useState(false);
	const [newReferrerForm, setNewReferrerForm] = useState({ name: "", address: "", phone: "", organization: "", bank:"", account:"", email:"" });
	// Cart referrer/clinic state
	const [showAddFacility, setShowAddFacility] = useState(false);
	const [addingFacility, setAddingFacility] = useState(false);
	const [newFacilityForm, setNewFacilityForm] = useState({ name: "", address: "" });
	// Cart referrer/clinic state
	const [cartReferrer, setCartReferrer] = useState<{ referrer?: Referrer; refClinic?: string }>({});
 const [refClinics, setRefClinics] = useState([]);
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);


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
		return Object.values(itemBonuses).reduce((sum, value) => sum + Number(value || 0), 0);
	}, [itemBonuses, cartReferrer.referrer?.id, referrer.id]);
	const discount = useMemo(() => {
		if (!discountEnabled) return 0;
		if (discountMode === "percent") return Math.round((discountValue / 100) * subtotal);
		return discountValue;
	}, [discountEnabled, discountMode, discountValue, subtotal]);
	const total = useMemo(() => Math.max(subtotal - discount, 0), [subtotal, discount]);
	const revenue = useMemo(() => Math.max(total - bonus, 0), [total, bonus]);
	const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
	const balance = useMemo(() => total - totalPaid, [total, totalPaid]);
	const showBonus = useMemo(() => {
		const effectiveReferrerId = (cartReferrer.referrer?.id || referrer.id || "").toLowerCase();
		return !!effectiveReferrerId && effectiveReferrerId !== "walkin";
	}, [cartReferrer.referrer?.id, referrer.id]);

	useEffect(() => {
		const effectiveReferrerId = (cartReferrer.referrer?.id || referrer.id || "").toLowerCase();
		const hasReferrerBonus = effectiveReferrerId !== "walkin";
		const next: Record<string, number> = {};

		const seenPanels = new Set<string>();
		for (const item of cart) {
			if (item.panel) {
				const key = `panel:${item.panel.id}`;
				if (seenPanels.has(key)) continue;
				seenPanels.add(key);
				const base = Math.round(Number(item.panel.price || 0) * 0.1);
				next[key] = hasReferrerBonus ? (itemBonuses[key] ?? base) : 0;
				continue;
			}

			const key = `test:${item.test.id}`;
			const base = Math.round(Number(item.test.price || 0) * Number(item.quantity || 1) * 0.1);
			next[key] = hasReferrerBonus ? (itemBonuses[key] ?? base) : 0;
		}

		setItemBonuses(next);
	}, [cart, cartReferrer.referrer?.id, referrer.id]);

	const handleItemBonusChange = (itemKey: string, value: number) => {
		setItemBonuses((prev) => ({
			...prev,
			[itemKey]: Number.isFinite(value) && value > 0 ? value : 0,
		}));
	};

	const ledgerTests = useMemo(() => {
		const entries: Array<{
			testId: string;
			testName: string;
			panelId?: string;
			panelName?: string;
			quantity: number;
			amount: number;
			bonus: number;
		}> = [];

		const seenPanels = new Set<string>();
		for (const item of cart) {
			if (item.panel) {
				const panelKey = `panel:${item.panel.id}`;
				if (seenPanels.has(panelKey)) continue;
				seenPanels.add(panelKey);

				entries.push({
					testId: String(item.panel.id),
					testName: String(item.panel.name),
					panelId: String(item.panel.id),
					panelName: String(item.panel.name),
					quantity: 1,
					amount: Number(item.panel.price || 0),
					bonus: Number(itemBonuses[panelKey] || 0),
				});
				continue;
			}

			const testKey = `test:${item.test.id}`;
			entries.push({
				testId: String(item.test.id),
				testName: String(item.test.name),
				quantity: Number(item.quantity || 1),
				amount: Number(item.test.price || 0) * Number(item.quantity || 1),
				bonus: Number(itemBonuses[testKey] || 0),
			});
		}

		return entries;
	}, [cart, itemBonuses]);

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
		receiptTitle?: string;
		billTo?: string;
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
					<title>${escapeHtml(payload.receiptTitle || "Payment Receipt")}</title>
					<style>
						@page { size: 80mm auto; margin: 0; }
						* { box-sizing: border-box; }
						body { width: 80mm; margin: 0 auto; padding: 5mm 4mm 7mm; font-family: "Courier New", Courier, monospace; color: #172033; font-size: 13px; font-weight: 600; line-height: 1.45; }
						.receipt-header { padding-bottom: 10px; border-bottom: 2px solid #172033; text-align: center; }
						.receipt-type { display: inline-block; margin-bottom: 5px; padding: 2px 7px; border: 1px solid #172033; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
						.lab-name { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 21px; font-weight: 800; line-height: 1.15; }
						.branch-name { margin-top: 4px; color: #475569; font-size: 12px; font-weight: 800; text-transform: uppercase; }
						.contact { margin: 5px 0 0; color: #475569; font-size: 11px; font-weight: 700; }
						.details { display: grid; grid-template-columns: 1fr; gap: 3px; margin-top: 11px; padding-bottom: 10px; border-bottom: 1px dashed #64748b; }
						.detail { display: flex; justify-content: space-between; gap: 10px; }
						.detail-label { flex-shrink: 0; color: #64748b; font-weight: 800; }
						.detail-value { text-align: right; font-weight: 800; overflow-wrap: anywhere; }
						.section { margin-top: 13px; }
						.section-title { margin: 0 0 5px; color: #334155; font-size: 12px; font-weight: 800; letter-spacing: 0.7px; text-transform: uppercase; }
						table { width: 100%; border-collapse: collapse; }
						th, td { padding: 7px 2px; border-bottom: 1px solid #d5dbe5; font-size: 12px; }
						th { color: #475569; border-top: 1px solid #172033; background: #f4f6f8; font-size: 11px; font-weight: 800; letter-spacing: 0.4px; text-align: left; text-transform: uppercase; }
						th:last-child, td:last-child { text-align: right !important; white-space: nowrap; }
						.summary td { padding: 4px 2px; border: 0; }
						.summary .total-row td { padding-top: 9px; border-top: 1px solid #172033; font-size: 15px; font-weight: 800; }
						.summary .balance-row td { padding: 7px; background: #172033; color: white; font-size: 13px; font-weight: 800; }
						.footer { margin-top: 17px; padding-top: 10px; border-top: 1px dashed #64748b; color: #475569; font-size: 11px; font-weight: 700; text-align: center; }
					</style>
				</head>
				<body>
					<header class="receipt-header">
						<div class="receipt-type">${escapeHtml(payload.receiptTitle || "Payment Receipt")}</div>
						<div class="lab-name">${escapeHtml(payload.labName || "Laboratory")}</div>
						<div class="branch-name">${escapeHtml(payload.branchName || "-")}</div>
						<p class="contact">${escapeHtml(payload.address || "-")} | ${escapeHtml(payload.branchPhone || "-")}</p>
					</header>

					<div class="details">
						<div class="detail"><span class="detail-label">Patient</span><span class="detail-value">${escapeHtml(payload.patientName || "-")}</span></div>
						${payload.billTo ? `<div class="detail"><span class="detail-label">Bill To</span><span class="detail-value">${escapeHtml(payload.billTo)}</span></div>` : ""}
						<div class="detail"><span class="detail-label">Reference</span><span class="detail-value">${escapeHtml(payload.transactionId || "-")}</span></div>
						<div class="detail"><span class="detail-label">Issued</span><span class="detail-value">${escapeHtml(new Date(payload.date).toLocaleString())}</span></div>
					</div>

					<div class="section">
						<div class="section-title">Investigations</div>
						<table>
							<thead><tr><th>Item</th><th style="text-align:right;">Amount</th></tr></thead>
							<tbody>${itemsHtml || "<tr><td>-</td><td style='text-align:right;'>N0</td></tr>"}</tbody>
						</table>
					</div>

					<div class="section">
						<div class="section-title">Payment Methods</div>
						<table>
							<thead><tr><th>Method</th><th style="text-align:right;">Amount</th></tr></thead>
							<tbody>${paymentsHtml || "<tr><td>-</td><td style='text-align:right;'>N0</td></tr>"}</tbody>
						</table>
					</div>

					<div class="section">
						<div class="section-title">Summary</div>
						<table class="summary">
							<tbody>
								<tr><td>Subtotal</td><td style="text-align:right;">${formatMoney(payload.subtotalAmount)}</td></tr>
								<tr><td>Discount</td><td style="text-align:right;">${formatMoney(payload.discountAmount)}</td></tr>
								<tr class="total-row"><td>Total</td><td style="text-align:right;">${formatMoney(payload.totalAmount)}</td></tr>
								<tr class="balance-row"><td>Balance Due</td><td style="text-align:right;">${formatMoney(payload.balanceAmount)}</td></tr>
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
				transactionId: orderData.transId,
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
				transactionId: String(orderData.transId || paymentData?.transactionId || "-"),
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
					tests: ledgerTests,
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
			setItemBonuses({});
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
		if (totalPaid >= total) {
			toast.warn("Bill To is only available when the amount paid is less than the total.");
			return;
		}
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

		const receiptWindow = window.open("", "_blank", "width=900,height=700");
		if (receiptWindow) {
			receiptWindow.document.open();
			receiptWindow.document.write("<p style='font-family:Arial;padding:16px;'>Preparing bill receipt...</p>");
			receiptWindow.document.close();
		}

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
				transId: orderData.transId,
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
			const billData = await billRes.json();

			if (totalPaid > 0) {
				const paymentRes = await fetch("/api/payments", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						labId: branchDoc.lab || branchDoc._id,
						name: selectedPatient.name,
						amount: totalPaid,
						userId: user.id,
						user: user.name,
						branchId,
						payments: payments.filter((payment) => payment.amount > 0),
						branch: pathname.split("/")[2],
						patient: selectedPatient.id,
						slug: branchSlug,
						orderId: orderData._id || orderData.id,
						bDate: orderData.bDate,
						transactionId: orderData.transId,
					}),
				});
				if (!paymentRes.ok) {
					const err = await paymentRes.json();
					throw new Error(err.error || "Payment failed");
				}
			}

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
				receiptTitle: "Bill Receipt",
				billTo: `${billToForBill}: ${resolvedBillToName}`,
				transactionId: String(orderData.transId || "-"),
				patientName: selectedPatient.name,
				branchName: String(branchDoc?.branch || pathname.split("/")[2] || "-"),
				branchPhone: String(branchDoc?.phone || "-"),
				labName: String(pathname.split("/")[1] || "Laboratory"),
				address: String(branchDoc?.address || "-"),
				date: String(billData?.businessDate || orderData?.bDate || new Date().toISOString()),
				items: Array.from(groupedItems.values()),
				paymentsMade: payments.filter((payment) => payment.amount > 0),
				subtotalAmount: subtotal,
				discountAmount: discountEnabled ? discount : 0,
				totalAmount: total,
				bonusAmount: bonus,
				revenueAmount: revenue,
				balanceAmount: Number(billData?.balance ?? balance),
			}, receiptWindow);


		

			// 8. Send referral ledger entry only if referrer is not 'Walk-in'
			if (cartReferrer.referrer?.name !== 'Walk-in') {
				const referralLedgerPayload = {
					order: orderData._id || orderData.id,
					referrer: cartReferrer.referrer?.id,
					tests: ledgerTests,
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
			setItemBonuses({});
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
	const handleAddNewFacility = () => {
		setShowAddFacility(true);
	};
	const handleAddNewReferrer = () => {
		setShowAddReferrer(true);
	};

	const handleSaveNewReferrer = async (newReferrerForm: any) => {
		// console.log("referrer form submitted")
		// console.log('newReferrerForm:', newReferrerForm);
		if (!newReferrerForm.name.trim()) {
			toast.error("Referrer name is required.");
			return;
		}

		setAddingReferrer(true);
		try {
			const pathname = window.location.pathname;
			const pathParts = pathname.split("/").filter(Boolean);
			const labSlug = pathParts[0] || "";
			const branchSlug = pathParts[1] || "";

			if (!labSlug || !branchSlug) {
				throw new Error("Invalid URL. Missing lab or branch.");
			}

			const [branchRes, labRes] = await Promise.all([
				fetch(`/api/branches/${branchSlug}`),
				fetch(`/api/labs/${labSlug}`),
			]);

			if (!branchRes.ok || !labRes.ok) {
				throw new Error("Unable to resolve lab/branch details.");
			}

			const [branchDoc, labDoc] = await Promise.all([branchRes.json(), labRes.json()]);
			if (!branchDoc?._id || !labDoc?._id) {
				throw new Error("Invalid lab/branch record.");
			}
			console.log("printing payload", newReferrerForm)

			const payload = {
				name: newReferrerForm.name.trim(),
				phone: newReferrerForm.phone.trim(),
				address: newReferrerForm.address.trim(),
				bank: newReferrerForm.bank.trim(),
				account: newReferrerForm.account.trim(),
				email: newReferrerForm.email.trim(),
				refClinic: newReferrerForm.refClinic.trim(),
				branch: branchDoc._id,
				branchId: branchDoc._id,
				labId: labDoc._id,
				slug: labSlug,
			};

			console.log("Creating referrer with payload:", payload);
			const createRes = await fetch("/api/referrers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const data = await createRes.json();
			console.log("Create referrer response:", { status: createRes.status, data });

			if (!createRes.ok) {
				throw new Error(data?.error || "Failed to create referrer");
			}

			const createdReferrer: Referrer = {
				id: String(data?.id || data?._id || ""),
				name: String(data?.name || payload.name),
				refClinic: String(data?.refClinic || data?.organization || payload.refClinic ||""),
			};

			setSelectedReferrer(createdReferrer);
			setReferrer(createdReferrer);
			setCartReferrer({
				referrer: createdReferrer,
				refClinic: createdReferrer.refClinic || createdReferrer.organization || "",
			});
			setReferrerRefreshKey((prev) => prev + 1);
			setShowAddReferrer(false);
			setNewReferrerForm({ name: "", phone: "", address: "", organization: "", bank: "", account: "", email: "" });
			toast.success("Referrer added successfully.");
		} catch (error: any) {
			toast.error(error?.message || "Failed to add referrer.");
		} finally {
			setAddingReferrer(false);
		}
	};

	const handleCancelAddReferrer = () => {
		if (addingReferrer) return;
		setShowAddReferrer(false);
	};

	const handleSaveNewFacility = async (newFacilityForm: any) => {
		if (!newFacilityForm.name.trim()) {
			toast.error("Facility name is required.");
			return;
		}

		setAddingFacility(true);
		try {
			const pathname = window.location.pathname;
			const pathParts = pathname.split("/").filter(Boolean);
			const labSlug = pathParts[0] || "";
			const branchSlug = pathParts[1] || "";

			if (!labSlug || !branchSlug) {
				throw new Error("Invalid URL. Missing lab or branch.");
			}

			const [branchRes, labRes] = await Promise.all([
				fetch(`/api/branches/${branchSlug}`),
				fetch(`/api/labs/${labSlug}`),
			]);

			if (!branchRes.ok || !labRes.ok) {
				throw new Error("Unable to resolve lab/branch details.");
			}

			const [branchDoc, labDoc] = await Promise.all([branchRes.json(), labRes.json()]);
			if (!branchDoc?._id || !labDoc?._id) {
				throw new Error("Invalid lab/branch record.");
			}

			const payload = {
				name: newFacilityForm.name.trim(),
				address: newFacilityForm.address.trim(),
				
				branch: branchDoc._id,
				branchId: branchDoc._id,
				labId: labDoc._id,
				slug: labSlug,
			};

			const createRes = await fetch("/api/ref-clinics", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const data = await createRes.json();

			if (!createRes.ok) {
				throw new Error(data?.error || "Failed to create facility");
			}

			const createdFacility: Referrer = {
				id: String(data?.id || data?._id || ""),
				name: String(data?.name || payload.name),
				address: String(data?.address || payload.address || ""),
			};

			setFacility(createdFacility);
			// setCartReferrer({
			// 	refClinic: createdFacility.address || createdFacility.name || "",
			// });
			setFacilityRefreshKey((prev) => prev + 1);
			setShowAddFacility(false);
			setNewFacilityForm({ name: "", address: "" });
			toast.success("Facility added successfully.");
		} catch (error: any) {
			toast.error(error?.message || "Failed to add facility.");
		} finally {
			setAddingFacility(false);
		}
	};

	const handleCancelAddFacility = () => {
		if (addingFacility) return;
		setShowAddFacility(false);
	};
	const handleSaveNewPatient = async (form: any) => {
		setAddingPatient(true);
		try {
			const pathname = window.location.pathname;
			const pathParts = pathname.split("/").filter(Boolean);
			const labSlug = pathParts[0] || "";
			const branchSlug = pathParts[1] || "";
			console.log("Lab Slug:", labSlug, "Branch Slug:", branchSlug);

			if (!labSlug || !branchSlug) {
				throw new Error("Invalid URL. Missing lab or branch.");
			}

			const [branchRes, labRes] = await Promise.all([
				fetch(`/api/branches/${branchSlug}`),
				fetch(`/api/labs/${labSlug}`),
			]);

			if (!branchRes.ok || !labRes.ok) {
				throw new Error("Unable to resolve lab/branch details.");
			}

			const [branchDoc, labDoc] = await Promise.all([branchRes.json(), labRes.json()]);
			if (!branchDoc?._id || !labDoc?._id) {
				throw new Error("Invalid lab/branch record.");
			}

			const payload = {
				...form,
				age: form.age ? Number(form.age) : undefined,
				branch: branchDoc._id,
				labId: labDoc._id,
				slug: labSlug,
			};

			const createRes = await fetch("/api/patients", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const data = await createRes.json();
			if (!createRes.ok) {
				throw new Error(data?.error || "Failed to create patient");
			}

			setSelectedPatient({
				id: data.id,
				name: data.name,
				age: data.age ? Number(data.age) : undefined,
				number: data.number || "",
			});
			setPatientRefreshKey((prev) => prev + 1);
			setShowAddPatient(false);
			toast.success("Patient added successfully.");
		} catch (error: any) {
			toast.error(error?.message || "Failed to add patient.");
		} finally {
			setAddingPatient(false);
		}
	};
	const handleCancelAddPatient = () => {
		if (addingPatient) return;
		setShowAddPatient(false);
	};

	useEffect(() => {
		if (!showAddPatient) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				handleCancelAddPatient();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [showAddPatient, addingPatient]);

	useEffect(() => {
		if (!showAddReferrer) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				handleCancelAddReferrer();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [showAddReferrer, addingReferrer]);

async function fetchBranchBySlug(branch: any) {
  try {
    const res = await fetch(`/api/branches/${branch}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchRefClinicsByBranchId(branchId: any) {
  try {
    const res = await fetch(`/api/ref-clinics?branchId=${branchId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

const pathParts = (pathname || "").split("/").filter(Boolean);
const branch = pathParts[1] || "";

  useEffect(() => {
	

	async function loadRefClinics() {
	  try {
		const branchDoc = await fetchBranchBySlug(branch);
		if (branchDoc && branchDoc._id) {
		  const clinics = await fetchRefClinicsByBranchId(branchDoc._id);
		  setRefClinics(clinics);
		} else {
		  setRefClinics([]);
		}
	  } catch {
		setRefClinics([]);
	  
	}}
	loadRefClinics();
  }, [branch]);


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
							refreshKey={patientRefreshKey}
						/>
					
					</div>
				
					<div className="bg-white rounded shadow p-4">
						<FacilitySelector
							selected={selectedFacility}
							onSelect={(facility) => {
								setSelectedFacility(facility);
								setCartReferrer((prev) => ({
									...prev,
									refClinic: facility?.name || "",
								}));
							}}
							onAddNew={handleAddNewFacility}
							refreshKey={facilityRefreshKey}
						/>
						
						
						
					</div>
					<div className="bg-white rounded shadow p-4">
						<ReferrerSelector
							selected={selectedReferrer}
							onSelect={(selected) => {
								setCart([]);
								setItemBonuses({});
								setSelectedReferrer(selected);
								setReferrer(selected);
							
							setCartReferrer((prev) => ({
								...prev,
								referrer: selected,
							}));
							}}
							onAddNew={handleAddNewReferrer}
							refreshKey={referrerRefreshKey}
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
				</div>
				{/* Right Panel */}
				<div className="w-full md:w-1/2 space-y-4">
					<div className="bg-white rounded shadow p-4">
												<div className="mb-2">
													{selectedPatient?.name && (
														<div className="font-bold text-blue-700 text-base mb-1 text-center">Patient: {selectedPatient.name}</div>
													)}
															{cartReferrer.refClinic && (
																<div className="text-xs text-gray-700 text-center">
																	<div>Facility: <span className="font-semibold">{cartReferrer.refClinic}</span></div>
																</div>
															)}
													{cartReferrer.referrer && (
														<div className="text-xs text-gray-700 text-center">
															<div>Referrer: <span className="font-semibold">{cartReferrer.referrer.name}</span></div>
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
													showBonus={showBonus}
													itemBonuses={itemBonuses}
													onItemBonusChange={handleItemBonusChange}
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

			{showAddPatient && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
					onClick={handleCancelAddPatient}
				>
					<div className="relative w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
						<button
							type="button"
							onClick={handleCancelAddPatient}
							className="absolute right-4 top-4 z-10 rounded bg-gray-100 px-2 py-1 text-sm text-gray-700 hover:bg-gray-200"
						>
							Close
						</button>
						<PatientForm onSubmit={handleSaveNewPatient} loading={addingPatient} />
					</div>
				</div>
			)}

			{showAddFacility && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
					onClick={handleCancelAddFacility}
				>
					<div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(event) => event.stopPropagation()}>
						<button
							type="button"
							onClick={handleCancelAddFacility}
							className="absolute right-3 top-3 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
							aria-label="Close add referrer form"
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</button>

						<RefClinicForm onSubmit={handleSaveNewFacility} loading={addingFacility} />
					</div>
				</div>
			)} 
			{showAddReferrer && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
					onClick={handleCancelAddReferrer}
				>
					<div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(event) => event.stopPropagation()}>
						<button
							type="button"
							onClick={handleCancelAddReferrer}
							className="absolute right-3 top-3 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
							aria-label="Close add referrer form"
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</button>

						<ReferrerForm onSubmit={handleSaveNewReferrer} loading={addingReferrer} refClinics={refClinics}/>
					</div>
				</div>
			)} 
		</div>
	);
}
