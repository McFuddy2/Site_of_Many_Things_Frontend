// Profile page.
//
// Framing deliberately matches the About page. Everything that depends on the
// profile type branches on `effectiveTier`, never on "is someone logged in", so a
// registered-but-unverified account correctly shows Guest perks — while still
// being greeted by name and offered a way to finish verifying.

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../18ProfilePage.css";
import { setMetaDescription, setCanonical } from "../utils/seo";
import { useAuth } from "../auth/AuthContext";
import { GUEST_TIER, getTierLabel, getTierPerks } from "../config/tiers";
import { resendVerification, uploadProfilePicture } from "../API/auth";
import { ERROR_CODES, getUserMessage } from "../API/errors";
import ManageProfileTypeModal from "../components/account/ManageProfileTypeModal";
import SignUpModal from "../components/account/SignUpModal";
import LoginModal from "../components/account/LoginModal";
import ForgotPasswordModal from "../components/account/ForgotPasswordModal";
import fillerProfilePic from "../media/filler-profile-pic.png";

// Checked here for fast feedback. The server enforces the real cap and can still
// answer with file_too_large.
const MAX_PROFILE_PICTURE_BYTES = 5 * 1024 * 1024;
const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

export default function ProfilePage() {
	const location = useLocation();
	const navigate = useNavigate();
	const { user, effectiveTier, isAuthenticated, isUnverified, isBootstrapping, signOut, updateUser } = useAuth();

	const [openModal, setOpenModal] = useState(null);
	const [uploadError, setUploadError] = useState(null);
	const [isUploading, setIsUploading] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);
	const [resendNotice, setResendNotice] = useState(null);
	const fileInputRef = useRef(null);

	useEffect(() => {
		document.title = "Profile | Site of Many Things";
		setMetaDescription("Manage your Site of Many Things profile, profile type and saved data.");
		setCanonical("https://thesiteofmanythings.com/profile");
	}, []);

	// Upgrade prompts elsewhere on the site route here with one of the account
	// modals already open.
	useEffect(() => {
		if (location.state?.openSignup || location.state?.openLogin) {
			setOpenModal(location.state.openSignup ? "signup" : "login");
			navigate(location.pathname, { replace: true, state: {} });
		}
	}, [location.state, location.pathname, navigate]);

	useEffect(() => {
		if (resendCooldown <= 0) return undefined;
		const timeoutId = setTimeout(() => setResendCooldown((seconds) => seconds - 1), 1000);
		return () => clearTimeout(timeoutId);
	}, [resendCooldown]);

	const isGuestTier = effectiveTier === GUEST_TIER;
	const canUploadPicture = !isGuestTier;
	const displayName = user?.username || "Guest";

	const uploadButtonLabel = () => {
		if (isUploading) return "Uploading…";
		if (!isAuthenticated) return "Log in to update picture";
		if (isUnverified) return "Verify your email to update picture";
		return "Update picture";
	};

	const handlePickFile = () => {
		setUploadError(null);
		fileInputRef.current?.click();
	};

	const handleFileSelected = async (event) => {
		const file = event.target.files?.[0];
		// Reset so picking the same file again still fires a change event.
		event.target.value = "";
		if (!file) return;

		if (file.size > MAX_PROFILE_PICTURE_BYTES) {
			setUploadError("That image is too large. Please choose one under 5 MB.");
			return;
		}

		setIsUploading(true);
		setUploadError(null);
		try {
			const result = await uploadProfilePicture(file);
			updateUser({ profile_picture_url: result?.profile_picture_url ?? null });
		} catch (error) {
			setUploadError(getUserMessage(error));
		} finally {
			setIsUploading(false);
		}
	};

	const handleResendVerification = async () => {
		setResendNotice(null);
		try {
			await resendVerification();
			setResendCooldown(DEFAULT_RESEND_COOLDOWN_SECONDS);
			setResendNotice("Verification email sent. Check your inbox.");
		} catch (error) {
			if (error?.code === ERROR_CODES.RATE_LIMITED) {
				setResendCooldown(error.retryAfter || DEFAULT_RESEND_COOLDOWN_SECONDS);
				return;
			}
			setResendNotice(getUserMessage(error));
		}
	};

	const handleLogOut = async () => {
		await signOut();
	};

	// Log out, then open the login modal straight away.
	const handleSwitchAccount = async () => {
		await signOut();
		setOpenModal("login");
	};

	if (isBootstrapping) {
		return (
			<main className="profile-page-wrapper">
				<div className="profile-page-content">
					<h1 className="profile-heading">Loading your profile…</h1>
				</div>
			</main>
		);
	}

	return (
		<main className="profile-page-wrapper">
			<div className="profile-page-content">
				<h1 className="profile-heading">Welcome {displayName}!</h1>

				{isUnverified ? (
					<div className="profile-verify-notice">
						<p>
							<strong>Almost there.</strong> Your Trailblazer perks unlock once you click the link in
							your verification email. Until then your profile works like a Guest profile.
						</p>
						<button
							type="button"
							className="som-btn som-btn-secondary"
							disabled={resendCooldown > 0}
							onClick={handleResendVerification}
						>
							{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
						</button>
						{resendNotice ? <p className="profile-status-message">{resendNotice}</p> : null}
					</div>
				) : null}

				<div className="profile-columns">
					<div className="profile-column-left">
						<img
							className="profile-picture"
							src={user?.profile_picture_url || fillerProfilePic}
							alt={`${displayName}'s profile picture`}
						/>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							hidden
							onChange={handleFileSelected}
						/>
						<button
							type="button"
							className="som-btn som-btn-primary"
							disabled={!canUploadPicture || isUploading}
							onClick={handlePickFile}
						>
							{uploadButtonLabel()}
						</button>
						{canUploadPicture ? (
							<p className="profile-picture-hint">JPG, PNG, GIF or WebP. Up to 5 MB.</p>
						) : null}
						{uploadError ? (
							<p className="profile-status-message profile-status-error">{uploadError}</p>
						) : null}
					</div>

					<div className="profile-column-right">
						<h2 className="profile-tier-heading">You are a {getTierLabel(effectiveTier)}</h2>
						<ul className="profile-perks">
							{getTierPerks(effectiveTier).map((perk) => (
								<li key={perk}>{perk}</li>
							))}
						</ul>
						<button
							type="button"
							className="som-btn som-btn-gold"
							onClick={() => setOpenModal("manage-type")}
						>
							Manage Profile Type
						</button>
					</div>
				</div>

				<div className="profile-actions">
					<button
						type="button"
						className="som-btn som-btn-secondary"
						disabled={!isAuthenticated}
						onClick={handleSwitchAccount}
					>
						Switch Account
					</button>
					<button
						type="button"
						className="som-btn som-btn-danger"
						disabled={!isAuthenticated}
						onClick={handleLogOut}
					>
						Log Out
					</button>
				</div>
			</div>

			<ManageProfileTypeModal
				isOpen={openModal === "manage-type"}
				onClose={() => setOpenModal(null)}
				effectiveTier={effectiveTier}
				username={user?.username}
				onSignUpWithEmail={() => setOpenModal("signup")}
			/>

			<SignUpModal
				isOpen={openModal === "signup"}
				onClose={() => setOpenModal(null)}
				onSwitchToLogin={() => setOpenModal("login")}
			/>

			<LoginModal
				isOpen={openModal === "login"}
				onClose={() => setOpenModal(null)}
				onSwitchToSignUp={() => setOpenModal("signup")}
				onForgotPassword={() => setOpenModal("forgot-password")}
			/>

			<ForgotPasswordModal
				isOpen={openModal === "forgot-password"}
				onClose={() => setOpenModal(null)}
				onBackToLogin={() => setOpenModal("login")}
			/>
		</main>
	);
}
