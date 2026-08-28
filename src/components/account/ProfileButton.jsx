// Header profile button.
//
// Square with rounded corners, showing the user's picture. Falls back to the
// guest filler image for Guests (including unverified accounts), and to the
// Trailblazer filler image for anyone else who hasn't uploaded one.

import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { GUEST_TIER } from "../../config/tiers";
import fillerProfilePic from "../../media/filler-profile-pic.png";
import guestFillerProfilePic from "../../media/guest-filler-profile-pic.png";

export default function ProfileButton({ variant = "desktop" }) {
	const { user, effectiveTier } = useAuth();
	const pictureUrl =
		user?.profile_picture_url || (effectiveTier === GUEST_TIER ? guestFillerProfilePic : fillerProfilePic);
	const label = user?.username ? `Profile — ${user.username}` : "Profile — Guest";

	return (
		<Link
			to="/profile"
			className={variant === "mobile" ? "header-profile-button-mobile" : "header-profile-button"}
			aria-label={label}
			title={label}
		>
			<img src={pictureUrl} alt="" />
		</Link>
	);
}
